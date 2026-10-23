import { GoogleGenAI } from '@google/genai';
// @ts-ignore
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export type ProjectDocCategory = 'correspondence' | 'documents' | 'daily_reports' | 'variations' | 'payment_invoices';

export interface ClassifiedDocFields {
  // Document Date extracted from the letter, report, drawing, or invoice
  documentDate?: string;

  // Common / Documents
  documentNumber?: string;
  title?: string;
  type?: string;
  revision?: string;
  status?: string;
  issueDate?: string;

  // Correspondence
  referenceNumber?: string;
  category?: string; // Letter, MoM, Transmittal, Notice, Email
  subject?: string;
  sender?: string;
  recipient?: string;
  date?: string;

  // Daily Reports
  location?: string;
  weatherCondition?: string;
  manpowerCount?: number;
  equipmentCount?: number;
  summary?: string;

  // Variations & Claims
  description?: string;
  costImpact?: number;
  scheduleImpactDays?: number;

  // Extra generic metadata
  notes?: string;
}

export interface ClassifiedDocResult {
  category: ProjectDocCategory;
  categoryLabel: string;
  confidence: number;
  reasoning: string;
  fields: ClassifiedDocFields;
  unfilledFields: string[];
}

export interface ProjectContextInfo {
  id: number;
  name: string;
  client?: string;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const CATEGORY_LABELS: Record<ProjectDocCategory, string> = {
  correspondence: 'Correspondence',
  documents: 'Documents',
  daily_reports: 'Daily Reports',
  variations: 'Variations & Claims',
  payment_invoices: 'Payments / Invoices'
};

/**
 * Extracts plain text from buffer based on mimetype.
 */
async function extractTextFromBuffer(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
  try {
    if (mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
      const data = await pdfParse(buffer);
      if (data && data.text) {
        return data.text.trim();
      }
    } else if (
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      mimeType === 'application/xml' ||
      filename.toLowerCase().endsWith('.txt') ||
      filename.toLowerCase().endsWith('.csv') ||
      filename.toLowerCase().endsWith('.md')
    ) {
      return buffer.toString('utf-8').trim();
    }
  } catch (err) {
    console.warn(`Text extraction warning for ${filename}:`, err);
  }
  return '';
}

/**
 * Normalizes any date string into standard ISO format (YYYY-MM-DD).
 */
export function parseDateStringToISO(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const months: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  };

  // Pattern 1: DD Month YYYY (e.g. 23rd October 2026, 14-Oct-2025, 5 May 2024)
  const m1 = trimmed.match(/(\d{1,2})(?:st|nd|rd|th)?[\s\/\.-]+([a-zA-Z]{3,})[\s\/\.-]+(\d{4})/);
  if (m1) {
    const day = m1[1].padStart(2, '0');
    const mStr = m1[2].toLowerCase().slice(0, 3);
    const mNum = months[mStr];
    if (mNum) return `${m1[3]}-${String(mNum).padStart(2, '0')}-${day}`;
  }

  // Pattern 2: Month DD, YYYY (e.g. October 23, 2026 or Oct. 23, 2026)
  const m2 = trimmed.match(/([a-zA-Z]{3,})[\s\/\.-]+(\d{1,2})(?:st|nd|rd|th)?[\s,]+(\d{4})/);
  if (m2) {
    const day = m2[2].padStart(2, '0');
    const mStr = m2[1].toLowerCase().slice(0, 3);
    const mNum = months[mStr];
    if (mNum) return `${m2[3]}-${String(mNum).padStart(2, '0')}-${day}`;
  }

  // Pattern 3: DD/MM/YYYY or DD-MM-YYYY (e.g. 23/10/2026)
  const m3 = trimmed.match(/(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
  if (m3) {
    const p1 = parseInt(m3[1], 10);
    const p2 = parseInt(m3[2], 10);
    const year = m3[3];
    if (p1 > 12 && p2 <= 12) {
      // First number is day, second is month
      return `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    } else if (p2 <= 12 && p1 <= 31) {
      // Standard UK/Commonwealth DD/MM/YYYY format
      return `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
  }

  // Pattern 4: YYYY/MM/DD or YYYY.MM.DD
  const m4 = trimmed.match(/(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})/);
  if (m4) {
    const year = m4[1];
    const month = m4[2].padStart(2, '0');
    const day = m4[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const d = new Date(trimmed.replace(/(\d+)(st|nd|rd|th)/gi, '$1'));
  if (!isNaN(d.getTime()) && d.getFullYear() > 1990 && d.getFullYear() < 2100) {
    return d.toISOString().split('T')[0];
  }
  return null;
}

/**
 * Searches the first 4000 characters of document text or filename to extract the written document date.
 */
export function extractDateFromDocumentText(text: string, filename: string = ''): string | null {
  const snippet = (text || '').slice(0, 4000);

  // 1. Look for explicit Date / Dated prefix in text (e.g. Date: 23rd Oct 2026, Dated: 15/09/2026)
  const prefixRegex = /(?:date|dated|date of report|report date|inspection date|meeting date|invoice date|effective date)[:\s]+([^\n\r;,]{5,35})/i;
  const matchPrefix = snippet.match(prefixRegex);
  if (matchPrefix) {
    const parsed = parseDateStringToISO(matchPrefix[1]);
    if (parsed) return parsed;
  }

  // 2. Look for standalone Month DD, YYYY or DD Month YYYY in text
  const monthNames = '(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)';
  const pattern1 = new RegExp(`\\b(\\d{1,2}(?:st|nd|rd|th)?[\\s\\/\\.-]+${monthNames}[\\s\\/\\.-]+\\d{4})\\b`, 'i');
  const m1 = snippet.match(pattern1);
  if (m1) {
    const parsed = parseDateStringToISO(m1[1]);
    if (parsed) return parsed;
  }

  const pattern2 = new RegExp(`\\b(${monthNames}[\\s\\/\\.-]+\\d{1,2}(?:st|nd|rd|th)?[\\s,]+\\d{4})\\b`, 'i');
  const m2 = snippet.match(pattern2);
  if (m2) {
    const parsed = parseDateStringToISO(m2[1]);
    if (parsed) return parsed;
  }

  // 3. Look for standard dates in document text (e.g. 23/10/2026 or 2026-10-23)
  const m3 = snippet.match(/\b(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})\b/);
  if (m3) {
    const parsed = parseDateStringToISO(m3[1]);
    if (parsed) return parsed;
  }

  // 4. Look inside filename for date (e.g. Report_2026-10-23.pdf, 20261023_Letter.docx)
  if (filename) {
    const fnDate = filename.match(/\b(20\d{2}[-_\.]\d{2}[-_\.]\d{2})\b/);
    if (fnDate) {
      const parsed = parseDateStringToISO(fnDate[1].replace(/[_\.]/g, '-'));
      if (parsed) return parsed;
    }
    const fnCompact = filename.match(/\b(20\d{2})(\d{2})(\d{2})\b/);
    if (fnCompact) {
      const parsed = parseDateStringToISO(`${fnCompact[1]}-${fnCompact[2]}-${fnCompact[3]}`);
      if (parsed) return parsed;
    }
  }

  return null;
}

/**
 * Fallback rule-based classifier using file name, text snippets, and user guidance.
 */
export function ruleBasedClassification(filename: string, extractedText: string = '', userHint: string = ''): ClassifiedDocResult {
  const lowerName = filename.toLowerCase();
  const lowerText = extractedText.toLowerCase().slice(0, 3000);
  const lowerHint = (userHint || '').toLowerCase();
  const combined = `${lowerName} ${lowerText} ${lowerHint}`;

  const todayStr = new Date().toISOString().split('T')[0];

  // Extract date of document from text or filename
  const docDate = extractDateFromDocumentText(extractedText, filename);
  const effectiveDate = docDate || todayStr;

  // User category hint checks
  const hintIsDaily = lowerHint.includes('daily') || lowerHint.includes('diary') || lowerHint.includes('site report') || lowerHint.includes('progress report');
  const hintIsPayment = lowerHint.includes('invoice') || lowerHint.includes('ipc') || lowerHint.includes('payment') || lowerHint.includes('fee');
  const hintIsVariation = lowerHint.includes('variation') || lowerHint.includes('claim') || lowerHint.includes('eot') || lowerHint.includes('vo');
  const hintIsCorrespondence = lowerHint.includes('corr') || lowerHint.includes('letter') || lowerHint.includes('memo') || lowerHint.includes('transmittal') || lowerHint.includes('notice') || lowerHint.includes('minute') || lowerHint.includes('mom') || lowerHint.includes('submittal');

  // 1. Daily Reports
  if (
    hintIsDaily ||
    lowerName.includes('daily') ||
    lowerName.includes('site_report') ||
    lowerName.includes('site report') ||
    lowerName.includes('site diary') ||
    lowerName.includes('daily diary') ||
    lowerText.includes('daily report') ||
    lowerText.includes('site diary') ||
    lowerText.includes('weather condition') ||
    lowerText.includes('daily progress report')
  ) {
    const unfilled = [];
    unfilled.push('location');
    if (!docDate) unfilled.push('documentDate');
    return {
      category: 'daily_reports',
      categoryLabel: CATEGORY_LABELS.daily_reports,
      confidence: hintIsDaily ? 0.95 : 0.85,
      reasoning: hintIsDaily 
        ? `Categorized as Daily Report based on user guidance ("${userHint}") and file attributes.`
        : 'Filename/content indicates a daily site progress record or site diary.',
      fields: {
        documentDate: docDate || '',
        date: effectiveDate,
        location: '',
        weatherCondition: 'Fair',
        manpowerCount: 0,
        equipmentCount: 0,
        summary: `Daily site report for ${filename}`
      },
      unfilledFields: unfilled
    };
  }

  // 2. Payments / Invoices / IPC
  if (
    hintIsPayment ||
    lowerName.includes('invoice') ||
    lowerName.includes('ipc') ||
    lowerName.includes('fee note') ||
    lowerName.includes('payment') ||
    lowerName.includes('certificate of payment') ||
    lowerText.includes('interim payment certificate') ||
    lowerText.includes('tax invoice') ||
    lowerText.includes('fee note') ||
    lowerText.includes('ipc no')
  ) {
    const invMatch = combined.match(/(?:inv|ipc|fee)[-_\s#:]*([a-z0-9\/-]+)/i);
    const docNum = invMatch ? invMatch[0].toUpperCase().replace(/\s+/g, '-') : `INV-${Date.now().toString().slice(-6)}`;
    const unfilled = !docDate ? ['documentDate'] : [];
    return {
      category: 'payment_invoices',
      categoryLabel: CATEGORY_LABELS.payment_invoices,
      confidence: hintIsPayment ? 0.95 : 0.88,
      reasoning: hintIsPayment
        ? `Categorized as Payment/Invoice based on user guidance ("${userHint}").`
        : 'Document is identified as a payment application, IPC, or invoice.',
      fields: {
        documentDate: docDate || '',
        documentNumber: docNum,
        title: filename.replace(/\.[^/.]+$/, ''),
        type: lowerName.includes('ipc') ? 'Contractor IPC' : 'Consultant Invoice',
        revision: '1.0',
        status: 'Submitted',
        issueDate: effectiveDate
      },
      unfilledFields: unfilled
    };
  }

  // 3. Variations & Claims
  if (
    hintIsVariation ||
    lowerName.includes('variation') ||
    lowerName.includes('claim') ||
    lowerName.includes('eot') ||
    lowerName.includes('vo-') ||
    lowerName.includes('vo_') ||
    lowerText.includes('variation order') ||
    lowerText.includes('extension of time') ||
    lowerText.includes('claim for additional')
  ) {
    const voMatch = combined.match(/vo[-_\s#:]*([a-z0-9\/-]+)/i);
    const refNum = voMatch ? voMatch[0].toUpperCase().replace(/\s+/g, '-') : `VO-${Date.now().toString().slice(-6)}`;
    const unfilled = ['costImpact', 'description'];
    if (!docDate) unfilled.push('documentDate');
    return {
      category: 'variations',
      categoryLabel: CATEGORY_LABELS.variations,
      confidence: hintIsVariation ? 0.95 : 0.86,
      reasoning: hintIsVariation
        ? `Categorized as Variation/Claim based on user guidance ("${userHint}").`
        : 'Document addresses contractual changes, variations, or claims.',
      fields: {
        documentDate: docDate || '',
        referenceNumber: refNum,
        title: filename.replace(/\.[^/.]+$/, ''),
        description: 'Variation / Claim order details',
        costImpact: 0,
        scheduleImpactDays: 0,
        date: effectiveDate,
        status: 'Proposed'
      },
      unfilledFields: unfilled
    };
  }

  // 4. Formal Correspondence (Letters, Memos, Transmittals, Notices)
  if (
    hintIsCorrespondence ||
    lowerName.includes('letter') ||
    lowerName.includes('memo') ||
    lowerName.includes('transmittal') ||
    lowerName.includes('notice') ||
    lowerName.includes('corr') ||
    lowerName.includes('minutes') ||
    lowerName.includes('email') ||
    lowerText.includes('dear sir') ||
    lowerText.includes('attention:') ||
    lowerText.includes('re:') ||
    lowerText.includes('ref:') ||
    lowerText.includes('transmittal note')
  ) {
    const refMatch = combined.match(/(?:ref|ref\.|reference)[-_\s#:]*([a-z0-9\/-]{4,})/i);
    const refNum = refMatch ? refMatch[1].toUpperCase() : `CORR-${Date.now().toString().slice(-6)}`;
    const unfilled: string[] = [];
    if (!refMatch) unfilled.push('referenceNumber');
    if (!docDate) unfilled.push('documentDate');

    return {
      category: 'correspondence',
      categoryLabel: CATEGORY_LABELS.correspondence,
      confidence: hintIsCorrespondence ? 0.95 : 0.84,
      reasoning: hintIsCorrespondence
        ? `Categorized as Correspondence based on user guidance ("${userHint}").`
        : 'Identified as official project correspondence or communication letter.',
      fields: {
        documentDate: docDate || '',
        referenceNumber: refNum,
        type: lowerName.includes('in') ? 'Incoming' : 'Outgoing',
        category: lowerName.includes('transmittal') ? 'Transmittal' : (lowerName.includes('memo') ? 'Notice' : 'Letter'),
        subject: filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        sender: 'Contractor',
        recipient: 'Consultant',
        date: effectiveDate
      },
      unfilledFields: unfilled
    };
  }

  // 5. Default to Engineering Documents (Drawings, Specs, Plans, Reports)
  let docType = 'Report';
  if (lowerName.includes('dwg') || lowerName.includes('drawing') || lowerName.includes('plan') || lowerName.includes('section')) {
    docType = 'Project Drawing';
  } else if (lowerName.includes('spec')) {
    docType = 'Design Document';
  } else if (lowerName.includes('qa') || lowerName.includes('qc') || lowerName.includes('itp')) {
    docType = 'QA/QC Plan';
  } else if (lowerName.includes('method') || lowerName.includes('statement')) {
    docType = 'Method Statement';
  } else if (lowerName.includes('rfi')) {
    docType = 'RFI';
  } else if (lowerName.includes('contract')) {
    docType = 'Contractual Document';
  }

  const unfilledDocs: string[] = [];
  if (!docDate) unfilledDocs.push('documentDate');

  return {
    category: 'documents',
    categoryLabel: CATEGORY_LABELS.documents,
    confidence: 0.80,
    reasoning: `Categorized under Project Documents (${docType}) based on file properties.`,
    fields: {
      documentDate: docDate || '',
      documentNumber: `DOC-${Date.now().toString().slice(-6)}`,
      title: filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
      type: docType,
      revision: '1.0',
      status: 'Draft',
      issueDate: effectiveDate
    },
    unfilledFields: unfilledDocs
  };
}

/**
 * Analyzes and classifies a single file with Gemini AI, extracting category and structured fields.
 */
export async function classifyProjectDocumentWithAI(
  file: Express.Multer.File,
  project: ProjectContextInfo,
  userHint?: string
): Promise<ClassifiedDocResult> {
  const filename = file.originalname;
  const mimeType = file.mimetype;
  const buffer = file.buffer;

  // Extract text if PDF or text format
  const extractedText = await extractTextFromBuffer(buffer, mimeType, filename);
  const textSnippet = extractedText.slice(0, 10000);

  // If no Gemini API key or text is completely empty and file not sendable, fallback to rule-based
  if (!process.env.GEMINI_API_KEY) {
    return ruleBasedClassification(filename, textSnippet, userHint);
  }

  try {
    const todayStr = new Date().toISOString().split('T')[0];

    const promptText = `You are the PROME Engineering Project Document Classification AI Assistant.
Project Context:
- Project Name: "${project.name}"
- Client: "${project.client || 'Not specified'}"
- Project ID: ${project.id}
- Today's Date: ${todayStr}
${userHint && userHint.trim() ? `
USER-PROVIDED CATEGORY & CONTEXT GUIDANCE:
"${userHint.trim()}"
IMPORTANT INSTRUCTION: The user provided the above category/context guidance for this upload batch. Give this guidance strong priority when determining the target category (correspondence, documents, daily_reports, variations, payment_invoices) and when extracting appropriate metadata fields, unless the document content clearly and undeniably indicates a different category.
` : ''}
Uploaded File Information:
- Original Filename: "${filename}"
- MIME Type: "${mimeType}"
- File Size: ${file.size} bytes

Extracted Document Content / Text (first portion):
"""
${textSnippet || '(No plain text extracted directly - analyze filename and attached inline media)'}
"""

YOUR TASK:
Analyze the document and classify it into EXACTLY ONE of the following 5 project categories:
1. "correspondence" - Formal letters, memos, notices, transmittals, meeting minutes, client/consultant/contractor communications, contractual notifications.
2. "documents" - Engineering drawings, technical specifications, design documents, QA/QC plans, method statements, quality control forms, technical reports, contractual documents, RFIs.
3. "daily_reports" - Daily site diary, daily progress reports, site supervisor records, weather and labor logs, site equipment records.
4. "variations" - Variation orders (VO), claims, extension of time (EOT) requests, cost/schedule impact proposals.
5. "payment_invoices" - Interim Payment Certificates (IPC), Contractor payment applications, Consultant fee notes, invoices, receipts.

Extract all relevant fields accurately based on the text or document header.

DOCUMENT DATE EXTRACTION (CRITICAL REQUIREMENT):
You MUST locate and extract the actual historical date written on or inside the letter, report, transmittal, invoice, drawing, or document (e.g. from the letterhead, header, date line, 'Date: ...', 'Dated: ...', 'Report Date: ...', 'Date of Report: ...', 'Inspection Date: ...', 'Invoice Date: ...', or footer).
- Extract the exact date written on the document.
- Convert that date into standard ISO format "YYYY-MM-DD" and return it in "documentDate".
- Do NOT simply default to today's date if an earlier or specific date is written in the letter/report/document.
- If and only if no date is found anywhere in the text or filename, return "" for documentDate and list "documentDate" in unfilledFields.

Return a STRICT JSON object in this exact schema (no markdown, no extra text):
{
  "category": "correspondence" | "documents" | "daily_reports" | "variations" | "payment_invoices",
  "confidence": 0.95,
  "reasoning": "Clear 1-sentence explanation of why it was placed here and what was found",
  "fields": {
    "documentDate": "YYYY-MM-DD (Date written in the letter, report, drawing, or document. Leave empty string if not found)",

    // For correspondence:
    "referenceNumber": "Official reference number found in document (leave empty string if not found)",
    "type": "Incoming" or "Outgoing",
    "category": "Letter" or "MoM" or "Transmittal" or "Notice" or "Email",
    "subject": "Clear subject or purpose",
    "sender": "Sender entity (e.g. Client, Contractor, Consultant, or specific company/person)",
    "recipient": "Recipient entity (e.g. Client, Contractor, Consultant, or specific company/person)",
    "date": "YYYY-MM-DD",

    // For documents:
    "documentNumber": "Document or drawing number (e.g. DWG-..., SPEC-..., or DOC-...)",
    "title": "Clean document title",
    "type": "Contractual Document" | "Report" | "Design Document" | "Meeting Minutes" | "QA/QC Plan" | "Method Statement" | "Quality Control Form" | "Project Drawing" | "Media" | "RFI",
    "revision": "e.g. 0, 1.0, Rev A",
    "status": "Draft" | "Issued for Review" | "Approved",
    "issueDate": "YYYY-MM-DD",

    // For daily_reports:
    "date": "YYYY-MM-DD",
    "location": "Location / Chainage / Section",
    "weatherCondition": "Sunny" | "Rainy" | "Cloudy" | "Fair",
    "manpowerCount": 0,
    "equipmentCount": 0,
    "summary": "Summary of works and activities",

    // For variations:
    "referenceNumber": "Variation or claim reference number",
    "title": "Variation Title",
    "description": "Scope of variation or claim justification",
    "costImpact": 0,
    "scheduleImpactDays": 0,
    "date": "YYYY-MM-DD",
    "status": "Proposed" | "Under Review" | "Approved" | "Rejected",

    // For payment_invoices:
    "documentNumber": "Invoice or IPC number",
    "title": "Title (e.g. Contractor Interim Payment Certificate No. 3)",
    "type": "Consultant Invoice" | "Contractor IPC" | "Other",
    "revision": "1.0",
    "status": "Draft" | "Submitted" | "Approved" | "Paid" | "Rejected",
    "issueDate": "YYYY-MM-DD"
  },
  "unfilledFields": ["list of key fields that could not be detected from document and should be completed by user"]
}`;

    const parts: any[] = [{ text: promptText }];

    // If PDF text is minimal (e.g. scanned image PDF) or if image file, and buffer is under 8MB, attach inlineData
    if (
      (!textSnippet || textSnippet.length < 100) &&
      (mimeType === 'application/pdf' || mimeType.startsWith('image/')) &&
      buffer.length < 8 * 1024 * 1024
    ) {
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: buffer.toString('base64')
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts }],
      config: {
        temperature: 0.2, // Low temperature for high precision extraction
        responseMimeType: 'application/json'
      }
    });

    const rawOutput = response.text?.trim() || '';
    const cleanedOutput = rawOutput.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

    const parsed = JSON.parse(cleanedOutput);

    const validCategories: ProjectDocCategory[] = ['correspondence', 'documents', 'daily_reports', 'variations', 'payment_invoices'];
    let category: ProjectDocCategory = parsed.category;
    if (!validCategories.includes(category)) {
      category = 'documents';
    }

    const fields = parsed.fields || {};
    
    // Robust Document Date Extraction & Normalization
    const rawDate = fields.documentDate || fields.date || fields.issueDate || '';
    let parsedDate = parseDateStringToISO(rawDate);

    // If Gemini didn't extract a valid date or lazily returned today's date, scan document text and filename with regex
    if (!parsedDate || parsedDate === todayStr) {
      const regexDate = extractDateFromDocumentText(textSnippet, filename);
      if (regexDate) {
        parsedDate = regexDate;
      }
    }

    if (parsedDate) {
      fields.documentDate = parsedDate;
      fields.date = parsedDate;
      fields.issueDate = parsedDate;
    } else {
      fields.documentDate = '';
      fields.date = '';
      fields.issueDate = '';
    }

    // Determine unfilled fields dynamically based on category
    const unfilled: string[] = Array.isArray(parsed.unfilledFields) ? [...parsed.unfilledFields] : [];
    if (!fields.documentDate) {
      unfilled.push('documentDate');
    }
    if (category === 'correspondence') {
      if (!fields.referenceNumber) unfilled.push('referenceNumber');
      if (!fields.subject) unfilled.push('subject');
      if (!fields.sender) unfilled.push('sender');
      if (!fields.recipient) unfilled.push('recipient');
    } else if (category === 'documents') {
      if (!fields.documentNumber) unfilled.push('documentNumber');
      if (!fields.title) unfilled.push('title');
    } else if (category === 'daily_reports') {
      if (!fields.location) unfilled.push('location');
      if (!fields.summary) unfilled.push('summary');
    } else if (category === 'variations') {
      if (!fields.referenceNumber) unfilled.push('referenceNumber');
      if (!fields.title) unfilled.push('title');
      if (!fields.costImpact) unfilled.push('costImpact');
    } else if (category === 'payment_invoices') {
      if (!fields.documentNumber) unfilled.push('documentNumber');
      if (!fields.title) unfilled.push('title');
    }

    // Unique list of unfilled fields
    const uniqueUnfilled = Array.from(new Set(unfilled.filter(Boolean)));

    return {
      category,
      categoryLabel: CATEGORY_LABELS[category] || 'Documents',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.92,
      reasoning: parsed.reasoning || `Classified as ${CATEGORY_LABELS[category]} based on content analysis.`,
      fields,
      unfilledFields: uniqueUnfilled
    };

  } catch (aiErr) {
    console.error(`Gemini classification failed for ${filename}, falling back to rule-based:`, aiErr);
    return ruleBasedClassification(filename, textSnippet, userHint);
  }
}
