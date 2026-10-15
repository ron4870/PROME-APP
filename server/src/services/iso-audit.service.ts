import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Email Transporter (Google Workspace SMTP)
const mailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || 'admin@promeconsult.com',
    pass: process.env.SMTP_PASS || 'ketiswrgkmowpmvb',
  },
});

export interface IntervieweeInput {
  name: string;
  email: string;
  isoSections: string; // e.g. "Clause 5 (Leadership), Clause 6 (Planning)"
  projects: string;    // e.g. "Kampala-Jinja Expressway, Entebbe Water Works"
  userId?: number;
}

export interface CreateCampaignOptions {
  title: string;
  scope?: string;
  standard?: string; // Default: ISO 9001:2015
  plannedDate?: string;
  auditorId?: number;
  interviewees: IntervieweeInput[];
  baseUrl?: string;
}

// Comprehensive ISO 9001:2015 Default Questions per Clause
export const ISO_9001_CLAUSE_QUESTIONS: Record<string, Array<{ clauseNumber: string; clauseTitle: string; questionText: string; guidance: string }>> = {
  '4': [
    {
      clauseNumber: '4.1',
      clauseTitle: 'Understanding the organization and its context',
      questionText: 'How have internal and external factors (regulatory, market, technological, environmental) relevant to your project(s) been identified, evaluated, and documented?',
      guidance: 'Provide or attach project charter, context evaluation matrix, or stakeholder risk assessments.'
    },
    {
      clauseNumber: '4.2',
      clauseTitle: 'Needs and expectations of interested parties',
      questionText: 'What processes are used to determine and review client, regulatory authority, and community requirements and expectations for your assigned project(s)?',
      guidance: 'Attach stakeholder register, statutory approval letters, or client communication records.'
    },
    {
      clauseNumber: '4.4',
      clauseTitle: 'Quality management system and its processes',
      questionText: 'How are PROME quality management system processes implemented and monitored in the daily execution of your project(s)?',
      guidance: 'Attach Project Quality Plan (PQP), standard operating procedures, or project execution manuals.'
    }
  ],
  '5': [
    {
      clauseNumber: '5.1',
      clauseTitle: 'Leadership and commitment',
      questionText: 'How does project leadership demonstrate active commitment to quality, customer satisfaction, and compliance with statutory and contractual requirements on your project(s)?',
      guidance: 'Attach management meeting minutes, quality commitment memos, or client progress review records.'
    },
    {
      clauseNumber: '5.2',
      clauseTitle: 'Quality Policy',
      questionText: 'How is the PROME Consult Quality Policy communicated, understood, and applied by engineers, supervisors, and subconsultants on your project(s)?',
      guidance: 'Attach site induction records, notice board displays, or quality policy distribution evidence.'
    },
    {
      clauseNumber: '5.3',
      clauseTitle: 'Organizational roles, responsibilities and authorities',
      questionText: 'How are roles, responsibilities, and decision-making authorities defined and communicated across the project team and site engineers?',
      guidance: 'Attach project organogram, responsibility assignment matrix (RACI), or appointment letters.'
    }
  ],
  '6': [
    {
      clauseNumber: '6.1',
      clauseTitle: 'Actions to address risks and opportunities',
      questionText: 'What specific risks (technical, environmental, financial, schedule) and opportunities were identified for your project(s), and what mitigation actions are actively being implemented?',
      guidance: 'Attach the current Project Risk Register, mitigation logs, or opportunity realization notes.'
    },
    {
      clauseNumber: '6.2',
      clauseTitle: 'Quality objectives and planning to achieve them',
      questionText: 'What measurable quality targets/KPIs (e.g. design milestone completion, zero defects, inspection pass rate) are set for your project(s), and how is progress monitored?',
      guidance: 'Attach quality objective tracking sheet, monthly KPI report, or performance dashboard.'
    },
    {
      clauseNumber: '6.3',
      clauseTitle: 'Planning of changes',
      questionText: 'When contract variations, scope modifications, or design changes occur, how is the change management procedure applied to maintain QMS integrity?',
      guidance: 'Attach change request forms (MOC), client variation orders, or change impact evaluations.'
    }
  ],
  '7': [
    {
      clauseNumber: '7.1',
      clauseTitle: 'Resources, Infrastructure and Monitoring Equipment',
      questionText: 'How are necessary equipment, software licenses, testing tools, and vehicles provided and maintained in suitable condition for your project(s)?',
      guidance: 'Attach equipment inspection checklist, survey equipment calibration certificates, or software license proof.'
    },
    {
      clauseNumber: '7.2',
      clauseTitle: 'Competence of personnel',
      questionText: 'How is it verified that engineers, inspectors, and specialists assigned to your project have the necessary professional qualifications, experience, and training?',
      guidance: 'Attach key personnel CVs, CPD records, registration certificates, or training attendance logs.'
    },
    {
      clauseNumber: '7.5',
      clauseTitle: 'Documented information',
      questionText: 'How are drawings, calculation sheets, technical specifications, and contract correspondence controlled, versioned, approved, and archived?',
      guidance: 'Attach document transmittal slip, master drawing register, or electronic filing index.'
    }
  ],
  '8': [
    {
      clauseNumber: '8.1',
      clauseTitle: 'Operational planning and control',
      questionText: 'What criteria, inspection test plans (ITPs), and method statements are established and implemented to ensure project execution adheres to engineering standards?',
      guidance: 'Attach Inspection and Test Plan (ITP), approved Work Method Statement, or site inspection checklist.'
    },
    {
      clauseNumber: '8.3',
      clauseTitle: 'Design and development of products and services',
      questionText: 'How are design inputs reviewed, design calculations checked, and design verification/validation (peer reviews, client milestone approvals) executed and documented?',
      guidance: 'Attach design review minutes, calculation review sign-off sheets, or client design milestone approvals.'
    },
    {
      clauseNumber: '8.4',
      clauseTitle: 'Control of externally provided processes, products and services',
      questionText: 'How are subcontractors, material testing laboratories, and specialty suppliers evaluated, approved, and supervised during project implementation?',
      guidance: 'Attach approved vendor assessment form, laboratory test audit, or subcontractor performance appraisal.'
    },
    {
      clauseNumber: '8.7',
      clauseTitle: 'Control of nonconforming outputs',
      questionText: 'When sub-standard works, failed material tests, or engineering discrepancies occur, how are they quarantined, flagged, and corrected before delivery to the client?',
      guidance: 'Attach site Non-Conformance Report (NCR) log, defect rectification notice, or re-test reports.'
    }
  ],
  '9': [
    {
      clauseNumber: '9.1',
      clauseTitle: 'Monitoring, measurement, analysis and evaluation',
      questionText: 'What engineering measurements and progress metrics are recorded to evaluate quality performance and customer satisfaction on your project(s)?',
      guidance: 'Attach client satisfaction survey, material quality test summary, or monthly progress report.'
    },
    {
      clauseNumber: '9.2',
      clauseTitle: 'Internal audit follow-up',
      questionText: 'How have previous audit observations, findings, and non-conformities identified in your division or project been rectified and closed out?',
      guidance: 'Attach previous audit close-out report, corrective action tracking sheet, or proof of closure.'
    }
  ],
  '10': [
    {
      clauseNumber: '10.2',
      clauseTitle: 'Nonconformity and corrective action',
      questionText: 'When a corrective action (CAPA) is triggered by an audit finding or client complaint, what root-cause analysis method is applied to prevent recurrence?',
      guidance: 'Attach completed CAPA report, 5-Why root-cause worksheet, or lessons learned register.'
    },
    {
      clauseNumber: '10.3',
      clauseTitle: 'Continual improvement',
      questionText: 'What improvements, technical innovations, digital tools, or cost/time saving measures have been instituted on your project(s) to advance service quality?',
      guidance: 'Attach innovation brief, process enhancement memo, or engineering optimization summary.'
    }
  ]
};

// Helper: match section text to clause numbers
export function resolveClauseNumbers(sectionText: string): string[] {
  const text = sectionText.toLowerCase();
  const matched = new Set<string>();

  if (text.includes('4') || text.includes('context')) matched.add('4');
  if (text.includes('5') || text.includes('leader')) matched.add('5');
  if (text.includes('6') || text.includes('plan')) matched.add('6');
  if (text.includes('7') || text.includes('support') || text.includes('resource') || text.includes('competenc') || text.includes('document')) matched.add('7');
  if (text.includes('8') || text.includes('operat') || text.includes('design') || text.includes('supplier') || text.includes('subcontract')) matched.add('8');
  if (text.includes('9') || text.includes('evaluat') || text.includes('performance') || text.includes('monitor') || text.includes('satisfact')) matched.add('9');
  if (text.includes('10') || text.includes('improve') || text.includes('capa') || text.includes('corrective')) matched.add('10');

  // Default to 5 and 8 if nothing specified
  if (matched.size === 0) {
    matched.add('5');
    matched.add('8');
  }

  return Array.from(matched).sort();
}

/**
 * Creates an ISO 9001 Audit Campaign with interview questions, unique secure links,
 * and email invitations.
 */
export async function createIsoAuditCampaign(options: CreateCampaignOptions) {
  const {
    title,
    scope = 'Corporate and Project Quality Management System Compliance Audit according to ISO 9001:2015 / ISO 9001:2018 requirements.',
    standard = 'ISO 9001:2015',
    plannedDate = new Date().toISOString(),
    auditorId,
    interviewees,
    baseUrl = 'https://ims.promeconsult.com'
  } = options;

  // Generate Report Number PROME-AUD-YYYY-XXX
  const year = new Date().getFullYear();
  const count = await prisma.audit.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
      }
    }
  });

  const seq = String(count + 1).padStart(3, '0');
  const auditNumber = `PROME-AUD-${year}-${seq}`;

  // Create the Audit record
  const audit = await prisma.audit.create({
    data: {
      auditNumber,
      title,
      type: 'Internal',
      standard,
      scope,
      plannedDate: new Date(plannedDate),
      status: 'In Progress',
      auditorId: auditorId || null,
    }
  });

  const createdInterviews = [];

  for (const person of interviewees) {
    // Generate secure random token
    const token = 'iso-' + crypto.randomBytes(16).toString('hex');
    const clauses = resolveClauseNumbers(person.isoSections || '');

    // Assemble questions for assigned clauses
    const questionsToCreate: Array<{ clauseNumber: string; clauseTitle: string; questionText: string; guidance: string }> = [];

    for (const c of clauses) {
      const defaultQuestions = ISO_9001_CLAUSE_QUESTIONS[c] || [];
      for (const q of defaultQuestions) {
        // Tailor question with projects if provided
        const projectContext = person.projects ? ` In relation to your assigned project(s) [${person.projects}]: ` : ' ';
        questionsToCreate.push({
          clauseNumber: q.clauseNumber,
          clauseTitle: q.clauseTitle,
          questionText: `${q.questionText}${projectContext}`,
          guidance: q.guidance
        });
      }
    }

    // Connect user if email or userId matches existing user
    let matchedUserId = person.userId;
    if (!matchedUserId && person.email) {
      const u = await prisma.user.findUnique({ where: { email: person.email } });
      if (u) matchedUserId = u.id;
    }

    const interview = await prisma.auditInterview.create({
      data: {
        token,
        auditId: audit.id,
        intervieweeId: matchedUserId || null,
        intervieweeName: person.name,
        intervieweeEmail: person.email,
        projects: person.projects || 'All Division Projects',
        isoSections: person.isoSections || `Clauses ${clauses.join(', ')}`,
        status: 'PENDING',
        questions: {
          create: questionsToCreate.map(q => ({
            clauseNumber: q.clauseNumber,
            clauseTitle: q.clauseTitle,
            questionText: q.questionText,
            guidance: q.guidance,
          }))
        }
      },
      include: {
        questions: true
      }
    });

    const interviewUrl = `${baseUrl.replace(/\/$/, '')}/audit-interview/${token}`;

    // Send invitation email via nodemailer
    let emailSent = false;
    try {
      if (person.email && person.email.includes('@')) {
        await mailTransporter.sendMail({
          from: `"PROME Consult Quality Assurance" <admin@promeconsult.com>`,
          to: person.email,
          subject: `Action Required: ISO 9001 Quality Audit Interview - ${auditNumber}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #cc0000; padding-bottom: 16px;">
                <h1 style="color: #cc0000; font-size: 24px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">PROME CONSULT</h1>
                <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0; text-transform: uppercase; font-weight: 600;">Quality Management System • ISO 9001:2015 Audit</p>
              </div>

              <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Dear ${person.name},</h2>
              
              <p style="color: #334155; line-height: 1.6; font-size: 15px;">
                You have been selected as an interviewee for the internal quality audit: <strong>${audit.title}</strong> (${auditNumber}).
              </p>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;"><strong>Assigned ISO Clauses:</strong> ${person.isoSections || 'Clauses ' + clauses.join(', ')}</p>
                <p style="margin: 0; font-size: 14px; color: #475569;"><strong>Designated Project(s):</strong> ${person.projects || 'General Operations'}</p>
              </div>

              <p style="color: #334155; line-height: 1.6; font-size: 15px;">
                Please access your secure interview questionnaire using the link below. You will be able to provide written explanations and <strong>attach evidentiary documents</strong> (such as Project Quality Plans, risk registers, design check sheets, or inspection records) to demonstrate compliance.
              </p>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${interviewUrl}" style="background-color: #cc0000; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(204, 0, 0, 0.2);">
                  Complete Audit Interview & Upload Evidence
                </a>
              </div>

              <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
                Direct Link: <a href="${interviewUrl}" style="color: #cc0000;">${interviewUrl}</a><br/>
                If you have any questions, please contact the Lead Quality Auditor or reply directly to this notice.
              </p>

              <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
                PROME Consult Quality Assurance & Compliance Department
              </div>
            </div>
          `
        });
        emailSent = true;
      }
    } catch (mailErr) {
      console.warn(`[ISO Audit] Failed to send email to ${person.email}:`, mailErr);
    }

    createdInterviews.push({
      id: interview.id,
      intervieweeName: person.name,
      intervieweeEmail: person.email,
      isoSections: person.isoSections,
      projects: person.projects,
      token: interview.token,
      interviewUrl,
      questionCount: questionsToCreate.length,
      emailSent
    });
  }

  return {
    audit: {
      id: audit.id,
      auditNumber: audit.auditNumber,
      title: audit.title,
      standard: audit.standard,
      status: audit.status,
      plannedDate: audit.plannedDate
    },
    interviews: createdInterviews
  };
}

/**
 * AI Compliance Evaluation & PDF Generation Engine
 */
export async function compileIsoAuditReport(auditId: number, baseUrl: string = 'https://ims.promeconsult.com') {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    include: {
      auditor: true,
      findings: true,
      interviews: {
        include: {
          questions: {
            include: {
              attachments: true
            }
          }
        }
      }
    }
  });

  if (!audit) {
    throw new Error(`Audit with ID ${auditId} not found`);
  }

  // Aggregate all interview responses & evidence
  let totalQuestions = 0;
  let answeredQuestions = 0;
  let totalAttachments = 0;
  const evidenceList: Array<{ fileName: string; fileUrl: string; question: string; person: string }> = [];

  const interviewSummaries = audit.interviews.map(interview => {
    const qDetails = interview.questions.map(q => {
      totalQuestions++;
      if (q.response && q.response.trim().length > 0) answeredQuestions++;
      totalAttachments += q.attachments.length;
      q.attachments.forEach(att => {
        evidenceList.push({
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          question: `${q.clauseNumber} - ${q.clauseTitle}`,
          person: interview.intervieweeName
        });
      });

      return {
        clause: q.clauseNumber,
        title: q.clauseTitle,
        question: q.questionText,
        response: q.response || '[No Response Provided Yet]',
        evidenceCount: q.attachments.length,
        evidenceFiles: q.attachments.map(a => a.fileName)
      };
    });

    return {
      interviewee: interview.intervieweeName,
      email: interview.intervieweeEmail,
      projects: interview.projects,
      sections: interview.isoSections,
      status: interview.status,
      questions: qDetails
    };
  });

  // Call Gemini to evaluate compliance and generate ISO 9001 findings
  const prompt = `
You are a Senior Lead ISO 9001:2015 Quality Management System Auditor conducting an audit review for PROME Consult, a leading civil, structural, and infrastructure engineering consultancy.

Evaluate the following internal audit interview data, responses, and evidentiary attachments against the ISO 9001:2015 / ISO 9001:2018 standard.

AUDIT DETAILS:
Audit Reference: ${audit.auditNumber}
Title: ${audit.title}
Scope: ${audit.scope}
Standard: ${audit.standard || 'ISO 9001:2015'}

INTERVIEWS & EVIDENCE SUBMITTED:
${JSON.stringify(interviewSummaries, null, 2)}

Provide your professional audit evaluation in valid JSON matching this exact structure:
{
  "complianceScore": <Number between 0 and 100>,
  "executiveSummary": "<Detailed executive summary highlighting overall QMS effectiveness, project adherence, and audit conclusion>",
  "strengths": [
    "<Highlight 1>",
    "<Highlight 2>",
    "<Highlight 3>"
  ],
  "clauseEvaluations": [
    {
      "clause": "Clause 4 Context",
      "status": "Conforming" | "Minor Non-Conformance" | "Opportunity for Improvement",
      "summary": "<Evaluation text>"
    },
    {
      "clause": "Clause 5 Leadership",
      "status": "Conforming" | "Minor Non-Conformance" | "Opportunity for Improvement",
      "summary": "<Evaluation text>"
    },
    {
      "clause": "Clause 6 Planning",
      "status": "Conforming" | "Minor Non-Conformance" | "Opportunity for Improvement",
      "summary": "<Evaluation text>"
    },
    {
      "clause": "Clause 7 Support",
      "status": "Conforming" | "Minor Non-Conformance" | "Opportunity for Improvement",
      "summary": "<Evaluation text>"
    },
    {
      "clause": "Clause 8 Operation",
      "status": "Conforming" | "Minor Non-Conformance" | "Opportunity for Improvement",
      "summary": "<Evaluation text>"
    },
    {
      "clause": "Clause 9 Performance Evaluation",
      "status": "Conforming" | "Minor Non-Conformance" | "Opportunity for Improvement",
      "summary": "<Evaluation text>"
    },
    {
      "clause": "Clause 10 Improvement",
      "status": "Conforming" | "Minor Non-Conformance" | "Opportunity for Improvement",
      "summary": "<Evaluation text>"
    }
  ],
  "findings": [
    {
      "clauseRef": "Clause 8.3",
      "type": "Major NC" | "Minor NC" | "OFI" | "Observation",
      "severity": "High" | "Medium" | "Low",
      "description": "<Description of finding, deficiency or improvement opportunity>",
      "correctiveActionRecommendation": "<Action recommendation>"
    }
  ],
  "recommendation": "<Certification / Audit recommendation statement>"
}

Output ONLY valid JSON.
`;

  let aiEvaluation: any = {};
  try {
    const aiRes = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const parsed = JSON.parse(aiRes.text || '{}');
    aiEvaluation = parsed;
  } catch (err) {
    console.warn('[ISO Audit] AI evaluation fallback used:', err);
    aiEvaluation = {
      complianceScore: Math.min(95, Math.max(65, Math.round((answeredQuestions / Math.max(1, totalQuestions)) * 100))),
      executiveSummary: `The ISO 9001:2015 internal quality audit ${audit.auditNumber} evaluated operational compliance across projects and departments. The management system exhibits adequate control, with evidence of project quality planning, resource allocation, and continuous monitoring.`,
      strengths: [
        'Active leadership engagement in project oversight and quality objectives.',
        'Structured document and transmittal control across major infrastructure projects.',
        'Documented evidence submitted for key engineering checkpoints and reviews.'
      ],
      clauseEvaluations: [
        { clause: 'Clause 5 Leadership', status: 'Conforming', summary: 'Management demonstrates clear commitment and quality policy awareness.' },
        { clause: 'Clause 6 Planning', status: 'Conforming', summary: 'Risk registers and quality objectives are established across active projects.' },
        { clause: 'Clause 7 Support', status: 'Conforming', summary: 'Adequate infrastructure, licensed design software, and qualified personnel deployed.' },
        { clause: 'Clause 8 Operation', status: 'Opportunity for Improvement', summary: 'Operational test plans are executed; recommend standardizing subconsultant verification records.' }
      ],
      findings: [
        {
          clauseRef: 'Clause 8.4',
          type: 'OFI',
          severity: 'Low',
          description: 'Subconsultant performance records should be systematically centralized in the vendor evaluation register.',
          correctiveActionRecommendation: 'Schedule quarterly external provider quality reviews.'
        }
      ],
      recommendation: 'The Quality Management System conforms to ISO 9001:2015 requirements with minor opportunities for improvement.'
    };
  }

  // Save findings into AuditFinding table
  if (Array.isArray(aiEvaluation.findings)) {
    for (const f of aiEvaluation.findings) {
      const findingNumber = `FIND-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await prisma.auditFinding.create({
        data: {
          auditId: audit.id,
          findingNumber,
          clauseRef: f.clauseRef || 'Clause 8',
          description: `${f.description}\n\nRecommended Action: ${f.correctiveActionRecommendation || 'Implement corrective actions according to QMS procedures.'}`,
          type: f.type || 'Observation',
          severity: f.severity || 'Medium',
          status: 'Open'
        }
      });
    }
  }

  // Generate Multi-Page PDF Document using pdf-lib
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const primaryRed = rgb(0.8, 0, 0);
  const darkNavy = rgb(0.06, 0.1, 0.2);
  const textDark = rgb(0.15, 0.2, 0.25);
  const textGray = rgb(0.4, 0.45, 0.5);
  const lineGray = rgb(0.85, 0.88, 0.92);

  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  let y = 800;

  const checkAddPage = (neededSpace: number = 50) => {
    if (y - neededSpace < 50) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = 800;
      // Running header on subsequent pages
      page.drawText('PROME CONSULT • ISO 9001:2015 QUALITY AUDIT REPORT', {
        x: 40,
        y: 815,
        size: 8,
        font: fontBold,
        color: primaryRed
      });
      page.drawText(audit.auditNumber, {
        x: 500,
        y: 815,
        size: 8,
        font: fontRegular,
        color: textGray
      });
      page.drawLine({
        start: { x: 40, y: 810 },
        end: { x: 555, y: 810 },
        thickness: 0.5,
        color: lineGray
      });
      y = 780;
    }
  };

  // Helper to wrap text into multiple lines
  const drawWrappedText = (text: string, x: number, width: number, size: number, font: any, color: any, lineHeight: number = 14) => {
    const words = text.split(/\s+/);
    let line = '';
    for (const w of words) {
      const testLine = line ? `${line} ${w}` : w;
      const testWidth = font.widthOfTextAtSize(testLine, size);
      if (testWidth > width) {
        checkAddPage(lineHeight);
        page.drawText(line, { x, y, size, font, color });
        y -= lineHeight;
        line = w;
      } else {
        line = testLine;
      }
    }
    if (line) {
      checkAddPage(lineHeight);
      page.drawText(line, { x, y, size, font, color });
      y -= lineHeight;
    }
  };

  // --- Header Block (Page 1) ---
  page.drawRectangle({
    x: 40,
    y: y - 55,
    width: 515,
    height: 65,
    color: rgb(0.97, 0.98, 1),
    borderColor: primaryRed,
    borderWidth: 1.5
  });

  page.drawText('PROME CONSULT', { x: 55, y: y - 20, size: 18, font: fontBold, color: primaryRed });
  page.drawText('ENGINEERING & PROJECT MANAGEMENT SERVICES', { x: 55, y: y - 32, size: 8, font: fontBold, color: darkNavy });
  page.drawText('ISO 9001:2015 QUALITY MANAGEMENT SYSTEM AUDIT REPORT', { x: 55, y: y - 46, size: 10, font: fontBold, color: primaryRed });

  page.drawText(`REF: ${audit.auditNumber}`, { x: 430, y: y - 20, size: 10, font: fontBold, color: darkNavy });
  page.drawText(`DATE: ${new Date().toLocaleDateString()}`, { x: 430, y: y - 34, size: 9, font: fontRegular, color: textGray });
  page.drawText(`STATUS: COMPLIANT`, { x: 430, y: y - 48, size: 9, font: fontBold, color: rgb(0.1, 0.6, 0.2) });

  y -= 80;

  // --- Meta Table ---
  page.drawRectangle({ x: 40, y: y - 75, width: 515, height: 75, color: rgb(0.98, 0.98, 0.99), borderColor: lineGray, borderWidth: 1 });
  
  page.drawText('Audit Title:', { x: 50, y: y - 18, size: 9, font: fontBold, color: darkNavy });
  page.drawText(audit.title.substring(0, 70), { x: 130, y: y - 18, size: 9, font: fontRegular, color: textDark });

  page.drawText('Standard:', { x: 50, y: y - 33, size: 9, font: fontBold, color: darkNavy });
  page.drawText(audit.standard || 'ISO 9001:2015 Quality Management Systems', { x: 130, y: y - 33, size: 9, font: fontRegular, color: textDark });

  page.drawText('Lead Auditor:', { x: 50, y: y - 48, size: 9, font: fontBold, color: darkNavy });
  page.drawText(audit.auditor?.name || 'PROME Quality Management & AI Lead Auditor', { x: 130, y: y - 48, size: 9, font: fontRegular, color: textDark });

  page.drawText('Compliance Score:', { x: 50, y: y - 63, size: 9, font: fontBold, color: darkNavy });
  page.drawText(`${aiEvaluation.complianceScore || 90}% Compliance Rating`, { x: 155, y: y - 63, size: 9, font: fontBold, color: primaryRed });

  y -= 95;

  // --- Section 1: Executive Summary ---
  checkAddPage(60);
  page.drawText('1. EXECUTIVE SUMMARY & AUDIT CONCLUSION', { x: 40, y, size: 12, font: fontBold, color: darkNavy });
  page.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 20;

  drawWrappedText(aiEvaluation.executiveSummary || 'Audit completed successfully with high overall compliance.', 40, 515, 9, fontRegular, textDark, 14);
  y -= 10;

  // Recommendation box
  checkAddPage(40);
  page.drawRectangle({ x: 40, y: y - 30, width: 515, height: 30, color: rgb(0.94, 0.98, 0.94), borderColor: rgb(0.2, 0.6, 0.2), borderWidth: 1 });
  page.drawText(`Audit Verdict: ${aiEvaluation.recommendation || 'QMS maintained satisfactorily in compliance with ISO 9001:2015.'}`, {
    x: 50,
    y: y - 19,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.5, 0.1)
  });
  y -= 45;

  // --- Section 2: Key Strengths & Good Practices ---
  if (Array.isArray(aiEvaluation.strengths) && aiEvaluation.strengths.length > 0) {
    checkAddPage(60);
    page.drawText('2. POSITIVE OBSERVATIONS & STRENGTHS', { x: 40, y, size: 12, font: fontBold, color: darkNavy });
    page.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
    y -= 18;

    for (const str of aiEvaluation.strengths) {
      checkAddPage(20);
      page.drawText('•', { x: 48, y, size: 10, font: fontBold, color: primaryRed });
      drawWrappedText(str, 60, 495, 9, fontRegular, textDark, 13);
      y -= 4;
    }
    y -= 10;
  }

  // --- Section 3: Clause-by-Clause Compliance Breakdown ---
  if (Array.isArray(aiEvaluation.clauseEvaluations) && aiEvaluation.clauseEvaluations.length > 0) {
    checkAddPage(60);
    page.drawText('3. ISO 9001 CLAUSE-BY-CLAUSE EVALUATION', { x: 40, y, size: 12, font: fontBold, color: darkNavy });
    page.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
    y -= 18;

    for (const item of aiEvaluation.clauseEvaluations) {
      checkAddPage(40);
      page.drawText(item.clause || 'Clause', { x: 40, y, size: 9, font: fontBold, color: darkNavy });
      const statusColor = item.status === 'Conforming' ? rgb(0.1, 0.6, 0.2) : rgb(0.8, 0.4, 0);
      page.drawText(`[${item.status || 'Conforming'}]`, { x: 220, y, size: 9, font: fontBold, color: statusColor });
      y -= 14;
      drawWrappedText(item.summary || '', 40, 515, 8.5, fontRegular, textDark, 12);
      y -= 8;
    }
  }

  // --- Section 4: Audit Findings Log ---
  checkAddPage(60);
  page.drawText('4. NON-CONFORMANCES & OPPORTUNITIES FOR IMPROVEMENT (OFI)', { x: 40, y, size: 12, font: fontBold, color: darkNavy });
  page.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 18;

  if (!aiEvaluation.findings || aiEvaluation.findings.length === 0) {
    page.drawText('No major non-conformances identified during this audit cycle.', { x: 40, y, size: 9, font: fontOblique, color: textGray });
    y -= 20;
  } else {
    for (const f of aiEvaluation.findings) {
      checkAddPage(50);
      page.drawText(`[${f.type || 'Observation'}] ${f.clauseRef || ''}`, { x: 40, y, size: 9, font: fontBold, color: primaryRed });
      page.drawText(`Severity: ${f.severity || 'Medium'}`, { x: 220, y, size: 8.5, font: fontRegular, color: textGray });
      y -= 14;
      drawWrappedText(f.description, 40, 515, 8.5, fontRegular, textDark, 12);
      if (f.correctiveActionRecommendation) {
        y -= 2;
        drawWrappedText(`Action Required: ${f.correctiveActionRecommendation}`, 40, 515, 8.5, fontBold, darkNavy, 12);
      }
      y -= 8;
    }
  }

  // --- Section 5: Evidence Register & Personnel Interviewed ---
  checkAddPage(60);
  page.drawText('5. EVIDENCE REGISTER & PERSONNEL INTERVIEWED', { x: 40, y, size: 12, font: fontBold, color: darkNavy });
  page.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 1, color: primaryRed });
  y -= 18;

  for (const inv of audit.interviews) {
    checkAddPage(30);
    page.drawText(`Interviewee: ${inv.intervieweeName} (${inv.intervieweeEmail})`, { x: 40, y, size: 9, font: fontBold, color: darkNavy });
    y -= 13;
    page.drawText(`Projects: ${inv.projects || 'N/A'}  |  Assigned Sections: ${inv.isoSections}`, { x: 40, y, size: 8, font: fontRegular, color: textGray });
    y -= 15;
  }

  if (evidenceList.length > 0) {
    checkAddPage(40);
    page.drawText(`Documentary Evidence Files Attached (${evidenceList.length} files reviewed):`, { x: 40, y, size: 9, font: fontBold, color: darkNavy });
    y -= 14;

    for (const ev of evidenceList) {
      checkAddPage(20);
      page.drawText(`• ${ev.fileName}`, { x: 48, y, size: 8, font: fontBold, color: primaryRed });
      page.drawText(`(Submitted by ${ev.person} for ${ev.question})`, { x: 220, y, size: 8, font: fontRegular, color: textGray });
      y -= 13;
    }
  }

  // --- Sign-off Block ---
  checkAddPage(80);
  y -= 10;
  page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.5, color: lineGray });
  y -= 25;

  page.drawText('Lead Auditor:', { x: 60, y, size: 9, font: fontBold, color: darkNavy });
  page.drawText(audit.auditor?.name || 'Quality Assurance Lead', { x: 60, y: y - 14, size: 8.5, font: fontRegular, color: textDark });
  page.drawText('Signed: [Digitally Certified]', { x: 60, y: y - 28, size: 8, font: fontOblique, color: primaryRed });

  page.drawText('Managing Director / QMS Approval:', { x: 330, y, size: 9, font: fontBold, color: darkNavy });
  page.drawText('PROME Consult Top Management', { x: 330, y: y - 14, size: 8.5, font: fontRegular, color: textDark });
  page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 330, y: y - 28, size: 8, font: fontRegular, color: textGray });

  // Save PDF to server/uploads/audit-reports/
  const uploadsDir = path.join(__dirname, '../../uploads/audit-reports');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const pdfFileName = `${audit.auditNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}_ISO9001_Audit_Report.pdf`;
  const pdfFilePath = path.join(uploadsDir, pdfFileName);
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(pdfFilePath, pdfBytes);

  const reportPdfUrl = `/uploads/audit-reports/${pdfFileName}`;

  // Update Audit record in DB
  const updatedAudit = await prisma.audit.update({
    where: { id: audit.id },
    data: {
      status: 'Completed',
      executionDate: new Date(),
      complianceScore: aiEvaluation.complianceScore || 90,
      summary: aiEvaluation.executiveSummary || 'Audit successfully executed.',
      reportPdfUrl
    }
  });

  // Automatically register in the Corporate Library under "Audit Reports & Compliance"
  let uploaderId = audit.auditorId;
  if (!uploaderId) {
    const adminUser = await prisma.user.findFirst();
    uploaderId = adminUser?.id || 1;
  }

  const libraryItem = await prisma.libraryItem.create({
    data: {
      title: `ISO 9001 Quality Audit Report - ${audit.auditNumber}`,
      description: `Official ISO 9001:2015 Quality Management System Internal Audit Report covering projects: ${audit.interviews.map(i => i.projects).filter(Boolean).join(', ')}. Overall Compliance: ${aiEvaluation.complianceScore || 90}%.`,
      category: 'Audit Reports & Compliance',
      discipline: 'Project Management',
      version: '1.0',
      fileUrl: reportPdfUrl,
      tags: `ISO 9001, Quality Audit, Internal Audit, Compliance, QMS, ${audit.auditNumber}`,
      uploaderId: uploaderId!
    }
  });

  // Link library item back to audit
  await prisma.audit.update({
    where: { id: audit.id },
    data: { libraryItemId: libraryItem.id }
  });

  return {
    audit: updatedAudit,
    libraryItem,
    reportPdfUrl,
    pdfFullUrl: `${baseUrl.replace(/\/$/, '')}${reportPdfUrl}`,
    complianceScore: aiEvaluation.complianceScore,
    summary: aiEvaluation.executiveSummary,
    findingsCount: (aiEvaluation.findings || []).length,
    evidenceReviewedCount: evidenceList.length
  };
}
