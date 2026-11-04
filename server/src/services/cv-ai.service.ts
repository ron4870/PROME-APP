import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import AdmZip from 'adm-zip';
import pdfParse from 'pdf-parse';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface CustomCvGenerateParams {
  candidateName: string;
  categoryName?: string;
  profileTitle?: string;
  jobTitle?: string;
  targetJob?: string;
  customInstructions?: string;
  formatType?: string;
  formatFileBuffer?: Buffer;
  formatFileName?: string;
}

export interface GeneratedCvSection {
  sectionName: string;
  content: string;
}

export interface GeneratedCvResult {
  profileTitle: string;
  candidateName: string;
  formatUsed: string;
  executiveSummary: string;
  sections: GeneratedCvSection[];
  fullMarkdownCv: string;
}

// Memory and Disk Cache for downloaded CV texts
const cvTextCache = new Map<string, string>();
const CACHE_DIR = path.resolve(__dirname, '../data/cv_cache');

if (!fs.existsSync(CACHE_DIR)) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

/**
 * Downloads a buffer from a URL following HTTP 301/302/303/307 redirects
 */
export function downloadBuffer(url: string, maxRedirects = 5): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) return reject(new Error('Too many redirects'));
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const u = new URL(url);
          redirectUrl = u.origin + redirectUrl;
        }
        return resolve(downloadBuffer(redirectUrl, maxRedirects - 1));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed with HTTP status ${res.statusCode}`));
      }
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

/**
 * Extracts plain text from DOCX, PDF, or text buffers
 */
export async function extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
  const ext = path.extname(filename).toLowerCase();
  try {
    if (ext === '.docx') {
      const zip = new AdmZip(buffer);
      const xml = zip.readAsText('word/document.xml');
      return xml
        .replace(/<w:p.*?>/g, '\n')
        .replace(/<.*?>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/\n\s*\n/g, '\n')
        .trim();
    } else if (ext === '.pdf') {
      const data = await pdfParse(buffer);
      return (data.text || '').trim();
    } else {
      // Plain text or fallback
      return buffer.toString('utf-8').trim();
    }
  } catch (err: any) {
    console.error(`Error extracting text from ${filename}:`, err.message);
    return '';
  }
}

/**
 * Fetches and caches text for a candidate's file from Google Drive
 */
export async function getCvTextForFile(fileId: string, fileName: string): Promise<string> {
  if (cvTextCache.has(fileId)) {
    return cvTextCache.get(fileId)!;
  }

  const diskCachePath = path.join(CACHE_DIR, `${fileId}.txt`);
  if (fs.existsSync(diskCachePath)) {
    try {
      const cached = fs.readFileSync(diskCachePath, 'utf-8');
      cvTextCache.set(fileId, cached);
      return cached;
    } catch (e) {
      // ignore
    }
  }

  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  try {
    const buffer = await downloadBuffer(downloadUrl);
    const text = await extractTextFromBuffer(buffer, fileName);
    if (text && text.length > 50) {
      cvTextCache.set(fileId, text);
      try {
        fs.writeFileSync(diskCachePath, text, 'utf-8');
      } catch (e) {
        // ignore
      }
      return text;
    }
  } catch (err: any) {
    console.warn(`Could not download or extract ${fileName} (${fileId}):`, err.message);
  }

  return '';
}

/**
 * Fetches text from all available catalogued CVs for a candidate
 */
export async function getCandidateCvTexts(
  candidateName: string,
  catalogueItems: any[]
): Promise<{ fileName: string; text: string; date?: string; category?: string }[]> {
  const normName = candidateName.toLowerCase().trim();
  // Find matching items by candidateName or fileName
  const matching = catalogueItems.filter((item) => {
    const itemCand = (item.candidateName || '').toLowerCase().trim();
    const itemFile = (item.fileName || '').toLowerCase().trim();
    if (itemCand === normName) return true;
    if (normName.length > 4 && (itemCand.includes(normName) || normName.includes(itemCand))) return true;
    if (itemFile.includes(normName)) return true;
    return false;
  });

  const results: { fileName: string; text: string; date?: string; category?: string }[] = [];

  // Limit to at most 4 most recent / relevant files to avoid excessive download times
  const filesToFetch = matching.slice(0, 4);

  for (const item of filesToFetch) {
    if (item.id) {
      const text = await getCvTextForFile(item.id, item.fileName);
      results.push({
        fileName: item.fileName,
        text: text || `[File: ${item.fileName}, Category: ${item.category}, Date: ${item.date}]`,
        date: item.date,
        category: item.category
      });
    }
  }

  return results;
}

/**
 * Generates a tailored custom CV using Gemini
 */
export async function generateCustomCv(
  params: CustomCvGenerateParams,
  catalogueItems: any[]
): Promise<GeneratedCvResult> {
  const {
    candidateName,
    categoryName = 'Engineering & Consulting',
    profileTitle,
    jobTitle = 'Senior Consultant / Engineer',
    targetJob = 'General Consultancy & Technical Assignment',
    customInstructions = 'Highlight relevant experience, professional registration, and technical capabilities.',
    formatType = 'UNRA Standard Format',
    formatFileBuffer,
    formatFileName
  } = params;

  // 1. Extract format instructions if a format file was uploaded
  let formatTemplateText = '';
  if (formatFileBuffer && formatFileName) {
    formatTemplateText = await extractTextFromBuffer(formatFileBuffer, formatFileName);
  }

  // 2. Fetch existing CV texts for this candidate
  const candidateCvs = await getCandidateCvTexts(candidateName, catalogueItems);

  let candidateSourceContent = '';
  if (candidateCvs.length > 0) {
    candidateSourceContent = candidateCvs
      .map(
        (c, idx) =>
          `=== SOURCE CV ${idx + 1}: ${c.fileName} (Category: ${c.category || 'N/A'}, Date: ${c.date || 'N/A'}) ===\n${c.text}`
      )
      .join('\n\n');
  } else {
    candidateSourceContent = `No full CV text available on file. Candidate Name: ${candidateName}, Category: ${categoryName}. Synthesize a world-class professional CV profile conforming to PROME high-engineering standards.`;
  }

  const prompt = `You are the PROME Integrated Management System (IMS) Senior Bid & HR AI Specialist.
Your mission is to generate a comprehensive, highly-tailored, procurement-compliant Curriculum Vitae (CV) for a specific tender/bidding opportunity.

PROME Consultants is a leading engineering, infrastructure, project management, and environmental consultancy firm in East Africa.

INPUT DETAILS:
- Candidate Name: ${candidateName}
- Discipline / Category: ${categoryName}
- Desired Profile Title: ${profileTitle || `${candidateName} - ${jobTitle}`}
- Target Job / Tender Title: ${jobTitle}
- Tender Scope & Requirements:
${targetJob}
- User Instructions:
${customInstructions}
- Target CV Format: ${formatType}
${
  formatTemplateText
    ? `\n- Attached Target Format Template Text:\n${formatTemplateText.substring(0, 4000)}\n(Strictly adhere to the headings, ordering, and layout of this template!)`
    : ''
}

CANDIDATE SOURCE CVS & EXPERIENCE RECORDS (from PROME Catalogue):
${candidateSourceContent.substring(0, 20000)}

INSTRUCTIONS FOR GENERATION:
1. Synthesize all available candidate experience, academic degrees, professional registrations (e.g. ERB, UIPE, etc.), certifications, and project history.
2. Re-weight and tailor the experience specifically to meet and exceed the target job/tender criteria.
3. Present the experience in reverse chronological order with clear project titles, client, location, duration, role held, and detailed bullet points of tasks performed that directly address the tender requirements.
4. Strictly follow the structure of the selected format (${formatType} or attached format template).
5. For standard procurement formats (UNRA, World Bank, PPDA, AfDB):
   - Include Proposed Position, Name of Firm (PROME Consultants), Name of Staff, Nationality, Education, Membership in Professional Associations, Countries of Work Experience, Languages, Employment Record, and Detailed Tasks Assigned.
   - Include a comprehensive "Work Undertaken that Best Illustrates Capability to Handle the Tasks Assigned" section.
   - Include the standard Undertaking / Declaration and signature block.
6. Return structured JSON with sections corresponding to standard PROME CV book sections:
   - "Cover Page"
   - "Personal Profile"
   - "Key Qualifications"
   - "Education & Training"
   - "Professional Experience"
   - "Key Project Experience"
   - "Languages"
   - "References"
   - "Final CV Document" (Full formatted text of the complete CV)

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "profileTitle": "${profileTitle || `${candidateName} - ${jobTitle}`}",
  "candidateName": "${candidateName}",
  "formatUsed": "${formatType}",
  "executiveSummary": "A concise 2-3 paragraph summary highlighting suitability for this bid...",
  "sections": [
    {
      "sectionName": "Cover Page",
      "content": "..."
    },
    {
      "sectionName": "Personal Profile",
      "content": "..."
    },
    {
      "sectionName": "Key Qualifications",
      "content": "..."
    },
    {
      "sectionName": "Education & Training",
      "content": "..."
    },
    {
      "sectionName": "Professional Experience",
      "content": "..."
    },
    {
      "sectionName": "Key Project Experience",
      "content": "..."
    },
    {
      "sectionName": "Languages",
      "content": "..."
    },
    {
      "sectionName": "References",
      "content": "..."
    },
    {
      "sectionName": "Final CV Document",
      "content": "..."
    }
  ],
  "fullMarkdownCv": "Full complete CV in clean markdown ready for export or printing..."
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const text = response.text || '';
    const parsed = JSON.parse(text);
    return parsed as GeneratedCvResult;
  } catch (err: any) {
    console.error('Failed to generate custom CV with Gemini:', err.message || err);
    throw new Error(`AI Generation failed: ${err.message || 'Unknown error'}`);
  }
}
