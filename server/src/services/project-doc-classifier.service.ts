import { GoogleGenAI } from '@google/genai';
// @ts-ignore
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export type ProjectDocCategory = 'correspondence' | 'documents' | 'daily_reports' | 'variations' | 'payment_invoices';

export interface ClassifiedDocFields {
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
 * Fallback rule-based classifier using file name and text snippets.
 */
export function ruleBasedClassification(filename: string, extractedText: string = ''): ClassifiedDocResult {
  const lowerName = filename.toLowerCase();
  const lowerText = extractedText.toLowerCase().slice(0, 3000);
  const combined = `${lowerName} ${lowerText}`;

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Daily Reports
  if (
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
    return {
      category: 'daily_reports',
      categoryLabel: CATEGORY_LABELS.daily_reports,
      confidence: 0.85,
      reasoning: 'Filename/content indicates a daily site progress record or site diary.',
      fields: {
        date: todayStr,
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
    return {
      category: 'payment_invoices',
      categoryLabel: CATEGORY_LABELS.payment_invoices,
      confidence: 0.88,
      reasoning: 'Document is identified as a payment application, IPC, or invoice.',
      fields: {
        documentNumber: docNum,
        title: filename.replace(/\.[^/.]+$/, ''),
        type: lowerName.includes('ipc') ? 'Contractor IPC' : 'Consultant Invoice',
        revision: '1.0',
        status: 'Submitted',
        issueDate: todayStr
      },
      unfilledFields: []
    };
  }

  // 3. Variations & Claims
  if (
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
    return {
      category: 'variations',
      categoryLabel: CATEGORY_LABELS.variations,
      confidence: 0.86,
      reasoning: 'Document addresses contractual changes, variations, or claims.',
      fields: {
        referenceNumber: refNum,
        title: filename.replace(/\.[^/.]+$/, ''),
        description: 'Variation / Claim order details',
        costImpact: 0,
        scheduleImpactDays: 0,
        date: todayStr,
        status: 'Proposed'
      },
      unfilledFields: ['costImpact', 'description']
    };
  }

  // 4. Formal Correspondence (Letters, Memos, Transmittals, Notices)
  if (
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

    return {
      category: 'correspondence',
      categoryLabel: CATEGORY_LABELS.correspondence,
      confidence: 0.84,
      reasoning: 'Identified as official project correspondence or communication letter.',
      fields: {
        referenceNumber: refNum,
        type: lowerName.includes('in') ? 'Incoming' : 'Outgoing',
        category: lowerName.includes('transmittal') ? 'Transmittal' : (lowerName.includes('memo') ? 'Notice' : 'Letter'),
        subject: filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        sender: 'Contractor',
        recipient: 'Consultant',
        date: todayStr
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

  return {
    category: 'documents',
    categoryLabel: CATEGORY_LABELS.documents,
    confidence: 0.80,
    reasoning: `Categorized under Project Documents (${docType}) based on file properties.`,
    fields: {
      documentNumber: `DOC-${Date.now().toString().slice(-6)}`,
      title: filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
      type: docType,
      revision: '1.0',
      status: 'Draft',
      issueDate: todayStr
    },
    unfilledFields: []
  };
}

/**
 * Analyzes and classifies a single file with Gemini AI, extracting category and structured fields.
 */
export async function classifyProjectDocumentWithAI(
  file: Express.Multer.File,
  project: ProjectContextInfo
): Promise<ClassifiedDocResult> {
  const filename = file.originalname;
  const mimeType = file.mimetype;
  const buffer = file.buffer;

  // Extract text if PDF or text format
  const extractedText = await extractTextFromBuffer(buffer, mimeType, filename);
  const textSnippet = extractedText.slice(0, 10000);

  // If no Gemini API key or text is completely empty and file not sendable, fallback to rule-based
  if (!process.env.GEMINI_API_KEY) {
    return ruleBasedClassification(filename, textSnippet);
  }

  try {
    const todayStr = new Date().toISOString().split('T')[0];

    const promptText = `You are the PROME Engineering Project Document Classification AI Assistant.
Project Context:
- Project Name: "${project.name}"
- Client: "${project.client || 'Not specified'}"
- Project ID: ${project.id}
- Today's Date: ${todayStr}

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

Return a STRICT JSON object in this exact schema (no markdown, no extra text):
{
  "category": "correspondence" | "documents" | "daily_reports" | "variations" | "payment_invoices",
  "confidence": 0.95,
  "reasoning": "Clear 1-sentence explanation of why it was placed here and what was found",
  "fields": {
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
    
    // Ensure dates are valid format or fallback
    if (fields.date && !/^\d{4}-\d{2}-\d{2}$/.test(fields.date)) {
      fields.date = todayStr;
    }
    if (fields.issueDate && !/^\d{4}-\d{2}-\d{2}$/.test(fields.issueDate)) {
      fields.issueDate = todayStr;
    }

    // Determine unfilled fields dynamically based on category
    const unfilled: string[] = Array.isArray(parsed.unfilledFields) ? [...parsed.unfilledFields] : [];
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
    return ruleBasedClassification(filename, textSnippet);
  }
}
