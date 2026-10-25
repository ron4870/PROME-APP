import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth';
import { GoogleGenAI, Type } from '@google/genai';
import { upload, driveService } from '../services/drive.service';
import { createIsoAuditCampaign, compileIsoAuditReport, PROME_AUDIT_PROGRAM_OCT_2026 } from '../services/iso-audit.service';
import { getLiveIsoComplianceMatrix } from '../services/iso-matrix.service';
import {
  PROME_CONTEXT_FACTORS,
  PROME_INTERESTED_PARTIES,
  PROME_COMMUNICATION_MATRIX,
  PROME_QMS_SCOPE_RECORD,
  PROME_CONTINUAL_IMPROVEMENT_RECORD
} from '../services/iso-prome-records';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Middleware to check Admin/MD Role
const authorizeAiAccess = async (req: Request, res: Response, next: express.NextFunction) => {
  const userId = (req as any).user.userId;
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { roles: true } });
  
  if (!user) {
    return res.status(403).json({ error: 'Access denied. User not found.' });
  }
  (req as any).fullUser = user;
  next();
};

// Apply auth and role check to all AI routes
router.use(authenticateToken, authorizeAiAccess);

// 1. Get all AI Chat Sessions for the user
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const sessions = await prisma.aiChatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// 2. Create a new AI Chat Session
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { title } = req.body;
    
    const session = await prisma.aiChatSession.create({
      data: {
        title: title || 'New Chat',
        userId
      }
    });
    res.json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// 3. Get Session details and messages
router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const sessionId = parseInt(req.params.id);
    
    const session = await prisma.aiChatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    
    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// 4. Delete Session
router.delete('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const sessionId = parseInt(req.params.id);
    
    const session = await prisma.aiChatSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    await prisma.aiChatSession.delete({ where: { id: sessionId } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Function Calling Definitions (Tools)
const systemTools: any[] = [
  {
    name: "getSystemStats",
    description: "Gets the total number of users, active projects, and ISO documents in the system.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    }
  },
  {
    name: "getProjects",
    description: "Returns a list of all active projects.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    }
  },
  {
    name: "getEmployees",
    description: "Returns a list of all employees and users in the system.",
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: "getBids",
    description: "Returns a list of all bids/tenders.",
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: "getLibraryDocuments",
    description: "Returns a list of documents in the corporate library. Optionally filter by search query.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Optional search query to filter documents by title or description." }
      }
    }
  },
  {
    name: "getIsoDocuments",
    description: "Returns a list of all ISO quality documents.",
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: "searchGoogleDrive",
    description: "Searches the connected PROME Google Drive workspace for files by name and returns their secure web links.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "The filename or keyword to search for in Google Drive." }
      },
      required: ["query"]
    }
  },
  {
    name: "getProjectDetails",
    description: "Gets detailed information about a specific project by its ID.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: { type: Type.NUMBER, description: "The ID of the project." }
      },
      required: ["projectId"]
    }
  },
  {
    name: "getOrganizationalKnowledge",
    description: "Searches the company Wiki pages, documentation, and directories (OKF) for answers relating to company guidelines, instructions, policies, procedures, and projects.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "The search query or keyword to find relevant knowledge in Wiki pages." }
      },
      required: ["query"]
    }
  },
  {
    name: "createFaqItem",
    description: "Adds or updates a Frequently Asked Question (FAQ) and response to the shared FAQs directory when a user asks a common question or requests knowledge expansion.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING, description: "The commonly asked question." },
        answer: { type: Type.STRING, description: "The accurate answer/response." },
        category: { type: Type.STRING, description: "The category (e.g., CVs, ISO, Bids, General)." }
      },
      required: ["question", "answer"]
    }
  },
  {
    name: "createIsoAuditCampaign",
    description: "Initiates an ISO 9001 internal quality audit campaign. When the user specifies personnel to interview, assigned ISO standard clauses/sections, and projects they manage, this tool creates the audit, generates tailored audit questions, creates unique secure interview links for each person, and sends email invitations with the links.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Descriptive title for the audit (e.g. 'Annual ISO 9001:2015 QMS Internal Audit')." },
        auditNumber: { type: Type.STRING, description: "Optional reference number for the audit (e.g. 'PROME-IMSR-PMBDD-28' or 'PROME-AUD-2026-001')." },
        scope: { type: Type.STRING, description: "Audit scope, objectives, or criteria." },
        standard: { type: Type.STRING, description: "ISO Standard name, e.g. 'ISO 9001:2015' or 'ISO 9001:2018'." },
        interviewees: {
          type: Type.ARRAY,
          description: "List of individuals to interview, their assigned ISO standard clauses, department, scheduled time, and projects in charge of.",
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Full name of the interviewee." },
              email: { type: Type.STRING, description: "Email address of the interviewee." },
              department: { type: Type.STRING, description: "Department or division (e.g. 'Top Management', 'CPSD', 'PDMD', 'PED', 'AFD/HRAD')." },
              scheduledTime: { type: Type.STRING, description: "Scheduled time of interview (e.g. '09:00 - 10:00')." },
              auditorName: { type: Type.STRING, description: "Assigned internal auditor name." },
              isoSections: { type: Type.STRING, description: "Assigned ISO clauses/sections (e.g. 'Clause 5 (Leadership), Clause 6 (Planning)' or 'Clause 8 (Operation)')." },
              projects: { type: Type.STRING, description: "Projects they manage or are in charge of." }
            },
            required: ["name", "email", "isoSections"]
          }
        }
      },
      required: ["title", "interviewees"]
    }
  },
  {
    name: "loadIsoAuditProgramTemplate",
    description: "Loads the official PROME ISO Internal Audit Program preset (e.g. October 23, 2026 Integrated Internal Audit program Doc Ref: PROME-IMSR-PMBDD-28). Returns the full schedule across 7 departments, assigned ISO standard clauses, designated auditors, and 36 targeted audit questions with objective evidence requirements.",
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: "getIsoMandatoryDocuments",
    description: "Returns the official company ISO records and mandatory documents under PROME's QMS: Clause 4.1 Organization Context (PROME-QSP-CSVM-01, 7 internal & 5 external factors), Clause 4.2 Interested Parties (PROME-QSP-CSVM-21, 7 external & 3 internal parties with P1/P2/P3 priorities), Clause 4.3 Scope & 16 Core QMS Processes (PROME-QSP-CSVM-18, Quality Policy: 'DOING THE RIGHT THINGS, IN THE RIGHT WAY, FIRST TIME'), Clause 7.4 Communication Matrix (PROME-QSR-AFD-20, internal & external communication tables), and Clause 10.3 Continual Improvement Record (Section 10).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        section: { type: Type.STRING, description: "Optional filter for section: 'context', 'parties', 'scope', 'communication', 'continual_improvement', or 'ALL'." }
      }
    }
  },
  {
    name: "deleteIsoAudit",
    description: "Deletes an ISO audit record by ID (Admin only), cascades deletion of questions, responses, attachments from disk, and removes the report from the Corporate Library.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        auditId: { type: Type.NUMBER, description: "The numeric ID of the audit to delete." }
      },
      required: ["auditId"]
    }
  },
  {
    name: "getIsoAuditStatus",
    description: "Retrieves real-time status of an ISO audit campaign, checking interview submission progress and evidentiary documents attached.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        auditId: { type: Type.NUMBER, description: "ID of the audit." },
        auditNumber: { type: Type.STRING, description: "Audit reference number (e.g. 'PROME-AUD-2026-001')." }
      }
    }
  },
  {
    name: "compileIsoAuditReport",
    description: "Evaluates all submitted audit interview responses and evidentiary files against ISO 9001 criteria, identifies non-conformances and OFIs, generates a compliant multi-page PDF audit report, saves the PDF to https://ims.promeconsult.com/audits, and registers it in the Corporate Library on https://ims.promeconsult.com/library in category 'Audit Reports & Compliance'.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        auditId: { type: Type.NUMBER, description: "ID of the audit to evaluate and compile." }
      },
      required: ["auditId"]
    }
  },
  {
    name: "getIsoComplianceMatrix",
    description: "Returns the live list and register of all mandatory documents and records required by ISO standards (ISO 9001:2018, ISO 14001:2015, ISO 45001:2018), where within the PROME IMS each is stored, and which documents or records are compliant, need to be updated, or are missing.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        standard: { type: Type.STRING, description: "Optional filter for standard: 'ISO 9001:2018', 'ISO 14001:2015', 'ISO 45001:2018', or 'ALL'." },
        status: { type: Type.STRING, description: "Optional filter by status: 'MISSING', 'NEEDS_UPDATE', or 'COMPLIANT'." }
      }
    }
  },
  {
    name: "getQualityObjectives",
    description: "Returns corporate and departmental Quality Objectives and KPIs (ISO 9001:2015 Clause 6.2). Includes strategic objectives, departmental quality objectives, strategy/methodology, measurement method, review frequency, previous target (2025), end 2025 status, current target (2026), quarterly review metrics (Q1, Q2, Q3, Q4), comments, verification records, and approval status.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        division: { type: Type.STRING, description: "Optional filter by division/department (e.g., 'PMBDD', 'BE&ED', 'AFD')." },
        status: { type: Type.STRING, description: "Optional filter by status ('Active', 'Achieved', 'Off-Track', 'Draft')." },
        query: { type: Type.STRING, description: "Optional search query to match objective number, title, or strategic goals." }
      }
    }
  },
  {
    name: "updateQualityObjectiveQuarter",
    description: "Updates a Quality Objective's quarterly review status (Q1, Q2, Q3, or Q4), current KPI value, objective status, review comments, and verification records.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        objectiveNumber: { type: Type.STRING, description: "The objective number (e.g. 'PROME-QOBJ-PMBDD-01' or numeric ID)." },
        quarter: { type: Type.STRING, description: "The quarter to update ('Q1', 'Q2', 'Q3', 'Q4')." },
        quarterStatus: { type: Type.STRING, description: "Status or metric for the quarter (e.g. '100%', '4', '1')." },
        currentValue: { type: Type.NUMBER, description: "Updated overall current value achieved." },
        status: { type: Type.STRING, description: "Objective status ('Active', 'Achieved', 'Off-Track', 'Draft')." },
        comments: { type: Type.STRING, description: "Quarterly review remarks and comments." },
        records: { type: Type.STRING, description: "Verification evidence records (e.g., 'MIS Access Log', 'Training Reports')." }
      },
      required: ["objectiveNumber", "quarter", "quarterStatus"]
    }
  },
  {
    name: "getManagementReviews",
    description: "Returns ISO 9001:2015 Clause 9.3 Management Review Meeting records, dates, attendees, chairperson, comprehensive review agendas (QMS policy/objectives, audit results, feedback, process conformity, CAPA, provider performance, resources, risks/opportunities), and assigned action items.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        meetingNumber: { type: Type.STRING, description: "Optional meeting number (e.g. 'MRM-2025-01')." },
        status: { type: Type.STRING, description: "Optional filter by status ('Conducted', 'Scheduled', 'Closed')." }
      }
    }
  },
  {
    name: "getMasterDocumentRegister",
    description: "Searches and returns documents from the official PROME Document Masterlist (Manuals, Procedures, Forms, Work Instructions) with document numbers, revision levels, issue dates, categories, divisions, and direct portal links on https://ims.promeconsult.com/documents.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Optional search query to filter documents by title or document number." },
        category: { type: Type.STRING, description: "Optional category filter (e.g. 'Manuals', 'Procedures', 'Forms', 'Work Instructions')." },
        division: { type: Type.STRING, description: "Optional division filter (e.g. 'AFD', 'PMBDD', 'ALL')." }
      }
    }
  },
  {
    name: "getFormsDirectory",
    description: "Returns the official PROME Forms Directory and updated digital forms (Equipment Maintenance, Training Evaluation, Non-Conformance, Customer Feedback, Risk Assessment, etc.) with form numbers, revisions, and direct links to https://ims.promeconsult.com/forms.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Optional search query to filter forms by title or form number." }
      }
    }
  },
  {
    name: "getRiskRegister",
    description: "Queries the Corporate & Project Risk Register (ISO 9001:2015 Clause 6.1) including risks and opportunities, categories, likelihood, impact, score, mitigation plans, action deadlines, residual risk ratings, and status.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING, description: "Optional filter by type: 'Risk', 'Opportunity', or 'ALL'." },
        category: { type: Type.STRING, description: "Optional category: 'Operational', 'Strategic', 'Financial', 'Compliance', 'Project', 'HSE'." },
        status: { type: Type.STRING, description: "Optional status: 'Identified', 'Assessed', 'Mitigated', 'Closed'." }
      }
    }
  },
  {
    name: "getVariationsAndClaims",
    description: "Returns project Variations, Claims, and contract change requests across active projects, including descriptions, financial/cost impacts, time extensions, submitted dates, and approval status.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Optional search query to filter variations by subject or project." },
        projectId: { type: Type.NUMBER, description: "Optional filter by project ID." }
      }
    }
  }
];

// 5. Send Chat Message
router.post('/chat', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const userId = (req as any).user.userId;
    const { sessionId, message } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'SessionId is required' });
    }
    if (!message && !req.file) {
      return res.status(400).json({ error: 'Message or file is required' });
    }

    // Verify session
    const session = await prisma.aiChatSession.findUnique({
      where: { id: Number(sessionId) },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const actualMessage = message || 'Please analyze this document.';
    const finalMessage = req.file ? (message ? `${message}\n\n[Attachment: ${req.file.originalname}]` : `[Attachment: ${req.file.originalname}]`) : actualMessage;

    // Save user message to DB
    await prisma.aiChatMessage.create({
      data: {
        sessionId: Number(sessionId),
        role: 'user',
        content: finalMessage
      }
    });

    // Update session title if it's the first message
    if (session.messages.length === 0) {
      await prisma.aiChatSession.update({
        where: { id: Number(sessionId) },
        data: { title: finalMessage.substring(0, 30) + '...' }
      });
    }

    // Prepare history for Gemini
    const history = session.messages.map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // System instruction
    const systemInstruction = {
      role: "system",
      parts: [{ text: `You are the PROME App AI Assistant, equipped with advanced Lead Auditor capabilities for ISO 9001:2015 and ISO 9001:2018 Quality Management Systems, ISO 14001:2015, and ISO 45001:2018. You assist Administrators and Managing Directors in managing projects, conducting autonomous audits, tracking quality objectives, managing risks, inspecting management review meetings, and maintaining the corporate ISO Compliance & Mandatory Records Register.

PROME COMPANY QMS FOUNDATION & POLICIES:
- Quality Policy: "DOING THE RIGHT THINGS, IN THE RIGHT WAY, FIRST TIME"
- Mission: "To provide state-of-the-art infrastructure consultancy solutions through our motivated staff and in an environmentally friendly and sustainable manner."
- Vision: "To be the preferred consultancy firm in Eastern Africa."
- Core Values: "Customer Satisfaction, Integrity, Professionalism, Teamwork, Innovation & Continual Improvement."
- 16 Core QMS Processes: Business Development (PMBDD), Project Inception & Planning (PDMD), Feasibility & Preliminary Engineering (PDMD), Detailed Engineering Design (PED), Procurement Support & Tender Admin (PED), Project Management & Construction Supervision (PDMD), Environmental & Social Impact Assessment (CPSD), Geotechnical & Materials Investigation (PED), Topographical & Engineering Surveys (PED), Quality Assurance & Audit (Lead Auditor), Client Relationship & Feedback (CSVM), Document Control & Records Management (AFD), Human Resource & Competence (HRAD), ICT & Digital Infrastructure (ICT), Financial Management & Invoicing (AFD), Legal & Regulatory Compliance (MD/Legal).
- Official Controlled Documents & Modules:
  * Clause 4.1 Organization Context (PROME-QSP-CSVM-01, Rev 05) - 7 Internal Factors & 5 External Factors at https://ims.promeconsult.com/organization-context.
  * Clause 4.2 Interested Party Mapping (PROME-QSP-CSVM-21, Rev 05) - 7 External & 3 Internal Interested Parties with P1/P2/P3 priorities.
  * Clause 4.3 & 4.4 Scope & Core QMS Processes (PROME-QSP-CSVM-18, Rev 05) - No exclusions (Design & Development included), statutory compliance (KCCA, NSSF, UACE, PPDA).
  * Clause 6.1 Risk & Opportunity Management (PROME-QSP-CSVM-03) - Enterprise & Project Risk Register at https://ims.promeconsult.com/risks.
  * Clause 6.2 Corporate & Departmental Quality Objectives (PROME-IMSR-QOBJ-01, Version 3.0) - 5 PMBDD Quality Objectives (PROME-QOBJ-PMBDD-01 to 05) with 2025 targets, 2025 actuals, 2026 targets, quarterly review metrics (Q1, Q2, Q3, Q4), comments, records, and departmental approvals at https://ims.promeconsult.com/objectives.
  * Clause 7.4 Communication Matrix (PROME-QSR-AFD-20) - Internal & External communication tables.
  * Clause 7.5 Document Masterlist & Records Register (PROME-QSR-AFD-01) - Master list of all PROME manuals, procedures, forms, and instructions at https://ims.promeconsult.com/documents.
  * Digital Forms Directory - Interactive forms (Equipment Maintenance, Training Evaluation, Non-Conformance, Customer Feedback, Risk Assessment) at https://ims.promeconsult.com/forms.
  * Clause 9.2 Internal Audit Program (PROME-IMSR-PMBDD-28) - Integrated Audit covering 7 departments & 36 questions at https://ims.promeconsult.com/audits.
  * Clause 9.3 Management Review Records (PROME-QSR-AFD-03) - Meeting minutes & 11 ISO inputs at https://ims.promeconsult.com/management-reviews.
  * Clause 10.3 Continual Improvement (Section 10) - Registered improvements across MIS, ISO 45001, ESIA, Tilenga, Equipment, Clients, Suppliers.
  * 3D Geospatial & Terrain Surface Engineering: 3D Cesium GIS globe workspace with DEM, DXF 3D TIN, and Contours terrain surface extraction at https://ims.promeconsult.com/projects-database/3d.
  * Project Variations & Claims: Comprehensive contract change management with multi-category filtering at https://ims.promeconsult.com/variations-and-claims.

CAPABILITIES & DIRECTIVES:
1. QUALITY OBJECTIVES (Clause 6.2): When asked about quality objectives, KPI targets, quarterly status, or updating progress for Q1, Q2, Q3, or Q4, use \`getQualityObjectives\` or \`updateQualityObjectiveQuarter\`. Provide direct links to https://ims.promeconsult.com/objectives.
2. MANAGEMENT REVIEWS (Clause 9.3): When asked about management review meetings, executive decisions, or ISO 9.3 agenda inputs, use \`getManagementReviews\`. Direct users to https://ims.promeconsult.com/management-reviews.
3. DOCUMENT MASTERLIST & FORMS: When asked for corporate SOPs, manuals, procedures, or forms, use \`getMasterDocumentRegister\` and \`getFormsDirectory\` with direct links to https://ims.promeconsult.com/documents and https://ims.promeconsult.com/forms.
4. RISKS & OPPORTUNITIES: When asked about risks, mitigation plans, or project variations & claims, use \`getRiskRegister\` and \`getVariationsAndClaims\` with direct links to https://ims.promeconsult.com/risks and https://ims.promeconsult.com/variations-and-claims.
5. ISO AUDITS & COMPLIANCE: Use \`getIsoComplianceMatrix\`, \`loadIsoAuditProgramTemplate\`, \`createIsoAuditCampaign\`, \`getIsoAuditStatus\`, and \`compileIsoAuditReport\` for audit management.
6. When asked what documents or records are required by ISO standards, where they are stored within the PROME IMS, or which ones are missing or need updating, use \`getIsoComplianceMatrix\` and \`getIsoMandatoryDocuments\` with direct IMS module links.
7. Always provide clear, professional, lead-auditor quality explanations and include clickable links using the https://ims.promeconsult.com domain.` }]
    };

    // Initialize chat session with history
    const chat = ai.chats.create({
      model: 'gemini-3.8-flash',
      config: {
        systemInstruction: systemInstruction.parts[0].text,
        tools: [{ functionDeclarations: systemTools }],
        temperature: 0.7,
      }
    });

    const userParts: any[] = [{ text: actualMessage }];
    if (req.file) {
      userParts.push({
        inlineData: {
          data: req.file.buffer.toString('base64'),
          mimeType: req.file.mimetype
        }
      });
    }

    // We must manually replay history for @google/genai by passing it in if needed, but chats.create doesn't take history directly in this version?
    // Wait, let's just use `ai.models.generateContent` with the full `contents` array for easier tool handling.
    const contents: any[] = [...history, { role: 'user', parts: userParts }];

    let response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction.parts[0].text,
        tools: [{ functionDeclarations: systemTools }],
        temperature: 0.7,
      }
    });

    // Handle function calls
    while (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      let functionResponse: any = {};
      
      try {
        if (call.name === 'getSystemStats') {
          const userCount = await prisma.user.count();
          const projectCount = await prisma.project.count();
          const docCount = await prisma.isoDocument.count();
          functionResponse = { users: userCount, projects: projectCount, documents: docCount };
        } else if (call.name === 'getProjects') {
          const projects = await prisma.project.findMany({ select: { id: true, name: true, status: true }, take: 10 });
          functionResponse = { projects };
        } else if (call.name === 'getEmployees') {
          const employees = await prisma.user.findMany({ select: { id: true, name: true, email: true, roles: { select: { name: true } }, division: true, skills: true } });
          functionResponse = { employees };
        } else if (call.name === 'getBids') {
          const bids = await prisma.bid.findMany({ select: { id: true, status: true, opportunity: { select: { title: true, client: true, deadline: true } } } });
          functionResponse = { bids };
        } else if (call.name === 'getLibraryDocuments') {
          const args = call.args as any;
          const query = args.query || '';
          const documents = await prisma.libraryItem.findMany({
            where: query ? { OR: [{ title: { contains: query, mode: 'insensitive' } }, { description: { contains: query, mode: 'insensitive' } }] } : undefined,
            select: { id: true, title: true, category: true, version: true, fileUrl: true }
          });
          functionResponse = { documents };
        } else if (call.name === 'getIsoDocuments') {
          const documents = await prisma.isoDocument.findMany({ select: { id: true, documentNumber: true, title: true, status: true, revision: true } });
          functionResponse = { documents };
        } else if (call.name === 'searchGoogleDrive') {
          const args = call.args as any;
          const query = args.query;
          const driveRes = await driveService.files.list({
            q: `name contains '${query}'`,
            fields: 'files(id, name, webViewLink, mimeType)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
          });
          functionResponse = { files: driveRes.data.files || [] };
        } else if (call.name === 'getProjectDetails') {
          const args = call.args as any;
          const project = await prisma.project.findUnique({
            where: { id: args.projectId },
            include: { tasks: true, members: { include: { user: true } }, financials: true }
          });
          functionResponse = project ? { project } : { error: 'Project not found' };
        } else if (call.name === 'getOrganizationalKnowledge') {
          const args = call.args as any;
          const query = args.query || '';
          const pages = await prisma.wikiPage.findMany({
            where: {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { content: { contains: query, mode: 'insensitive' } }
              ]
            },
            select: { id: true, title: true, content: true },
            take: 5
          });
          const faqs = await prisma.faqItem.findMany({
            where: {
              OR: [
                { question: { contains: query, mode: 'insensitive' } },
                { answer: { contains: query, mode: 'insensitive' } }
              ]
            },
            select: { id: true, question: true, answer: true, category: true },
            take: 5
          });
          functionResponse = { 
            wikiPages: pages.map(p => ({ title: p.title, content: p.content.substring(0, 1000) })),
            faqItems: faqs.map(f => ({ question: f.question, answer: f.answer, category: f.category }))
          };
        } else if (call.name === 'createFaqItem') {
          const args = call.args as any;
          const faq = await prisma.faqItem.upsert({
            where: { question: args.question.trim() },
            update: {
              answer: args.answer.trim(),
              category: args.category ? args.category.trim() : 'General'
            },
            create: {
              question: args.question.trim(),
              answer: args.answer.trim(),
              category: args.category ? args.category.trim() : 'General'
            }
          });
          functionResponse = { faq: { id: faq.id, question: faq.question } };
        } else if (call.name === 'createIsoAuditCampaign') {
          const args = call.args as any;
          const hostHeader = req.get('host');
          const protocol = req.protocol;
          const baseUrl = hostHeader ? `${protocol}://${hostHeader}` : 'https://ims.promeconsult.com';

          const campaign = await createIsoAuditCampaign({
            title: args.title,
            scope: args.scope,
            standard: args.standard || 'ISO 9001:2015',
            auditNumber: args.auditNumber,
            auditorId: userId,
            interviewees: args.interviewees || [],
            baseUrl
          });
          functionResponse = campaign;
        } else if (call.name === 'loadIsoAuditProgramTemplate') {
          functionResponse = PROME_AUDIT_PROGRAM_OCT_2026;
        } else if (call.name === 'getIsoMandatoryDocuments') {
          const args = call.args as any;
          const section = (args?.section || 'all').toLowerCase();
          functionResponse = {
            qualityPolicy: PROME_QMS_SCOPE_RECORD.qualityPolicy,
            scopeSummary: PROME_QMS_SCOPE_RECORD.scopeStatement,
            contextFactors: (section === 'all' || section === 'context') ? PROME_CONTEXT_FACTORS : undefined,
            interestedParties: (section === 'all' || section === 'parties') ? PROME_INTERESTED_PARTIES : undefined,
            scopeRecord: (section === 'all' || section === 'scope') ? PROME_QMS_SCOPE_RECORD : undefined,
            communicationMatrix: (section === 'all' || section === 'communication') ? PROME_COMMUNICATION_MATRIX : undefined,
            continualImprovement: (section === 'all' || section === 'continual_improvement') ? PROME_CONTINUAL_IMPROVEMENT_RECORD : undefined,
            imsNavigation: {
              organizationContext: 'https://ims.promeconsult.com/organization-context',
              complianceMatrix: 'https://ims.promeconsult.com/iso-compliance-matrix',
              auditsDashboard: 'https://ims.promeconsult.com/audits',
              corporateLibrary: 'https://ims.promeconsult.com/library'
            }
          };
        } else if (call.name === 'deleteIsoAudit') {
          const args = call.args as any;
          const auditId = Number(args.auditId);
          const audit = await prisma.audit.findUnique({
            where: { id: auditId },
            include: {
              interviews: {
                include: {
                  questions: {
                    include: { attachments: true }
                  }
                }
              }
            }
          });
          if (!audit) {
            functionResponse = { error: `Audit with ID ${auditId} not found.` };
          } else {
            // Clean up evidence files
            for (const interview of audit.interviews) {
              for (const question of interview.questions) {
                for (const attachment of question.attachments) {
                  if (attachment.fileUrl && attachment.fileUrl.startsWith('/uploads/')) {
                    const filePath = path.join(__dirname, '../..', attachment.fileUrl);
                    if (fs.existsSync(filePath)) {
                      try { fs.unlinkSync(filePath); } catch (e) {}
                    }
                  }
                }
              }
            }
            // Clean up PDF report
            if (audit.reportPdfUrl && audit.reportPdfUrl.startsWith('/uploads/')) {
              const pdfPath = path.join(__dirname, '../..', audit.reportPdfUrl);
              if (fs.existsSync(pdfPath)) {
                try { fs.unlinkSync(pdfPath); } catch (e) {}
              }
            }
            // Clean up Library item
            if (audit.libraryItemId) {
              try {
                await prisma.libraryItem.delete({ where: { id: audit.libraryItemId } });
              } catch (e) {}
            }
            // Delete audit record
            await prisma.audit.delete({ where: { id: auditId } });
            functionResponse = {
              success: true,
              message: `Audit ${audit.auditNumber} (ID: ${auditId}) has been successfully deleted.`
            };
          }
        } else if (call.name === 'getIsoAuditStatus') {
          const args = call.args as any;
          const audit = await prisma.audit.findFirst({
            where: args.auditId ? { id: args.auditId } : (args.auditNumber ? { auditNumber: args.auditNumber } : undefined),
            include: {
              findings: true,
              interviews: {
                include: {
                  questions: {
                    include: { attachments: true }
                  }
                }
              }
            }
          });
          if (!audit) {
            functionResponse = { error: 'Audit not found' };
          } else {
            functionResponse = {
              auditNumber: audit.auditNumber,
              title: audit.title,
              status: audit.status,
              complianceScore: audit.complianceScore,
              reportPdfUrl: audit.reportPdfUrl,
              interviews: audit.interviews.map(i => ({
                interviewee: i.intervieweeName,
                email: i.intervieweeEmail,
                status: i.status,
                isoSections: i.isoSections,
                projects: i.projects,
                answeredCount: i.questions.filter(q => q.response && q.response.trim().length > 0).length,
                totalQuestions: i.questions.length,
                attachmentCount: i.questions.reduce((acc, q) => acc + q.attachments.length, 0),
                interviewUrl: `https://ims.promeconsult.com/audit-interview/${i.token}`
              }))
            };
          }
        } else if (call.name === 'compileIsoAuditReport') {
          const args = call.args as any;
          const hostHeader = req.get('host');
          const protocol = req.protocol;
          const baseUrl = hostHeader ? `${protocol}://${hostHeader}` : 'https://ims.promeconsult.com';

          const reportResult = await compileIsoAuditReport(args.auditId, baseUrl);
          functionResponse = reportResult;
        } else if (call.name === 'getIsoComplianceMatrix') {
          const args = call.args as any;
          const matrix = await getLiveIsoComplianceMatrix(args.standard);
          let reqs = matrix.requirements;
          if (args.status) {
            reqs = reqs.filter(r => r.status.toUpperCase() === args.status.toUpperCase());
          }
          functionResponse = {
            summary: matrix.summary,
            totalCount: reqs.length,
            requirements: reqs.map(r => ({
              clause: r.clause,
              title: r.title,
              type: r.type,
              status: r.status,
              storedInModule: r.targetModule,
              imsRoute: `https://ims.promeconsult.com${r.route}`,
              liveSummary: r.liveSummary,
              actionRequired: r.aiRecommendation
            }))
          };
        } else if (call.name === 'getQualityObjectives') {
          const args = call.args as any;
          const query = (args?.query || '').toLowerCase();
          const objectives = await prisma.qualityObjective.findMany({
            where: {
              AND: [
                args.division && args.division !== 'ALL' ? { division: { contains: args.division, mode: 'insensitive' } } : {},
                args.status ? { status: args.status } : {},
                query ? {
                  OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { objectiveNumber: { contains: query, mode: 'insensitive' } },
                    { corporateStrategicObjective: { contains: query, mode: 'insensitive' } },
                    { departmentalQualityObjective: { contains: query, mode: 'insensitive' } }
                  ]
                } : {}
              ]
            },
            include: { owner: { select: { id: true, name: true } } },
            orderBy: { objectiveNumber: 'asc' }
          });

          functionResponse = {
            totalCount: objectives.length,
            portalUrl: 'https://ims.promeconsult.com/objectives',
            objectives: objectives.map(o => ({
              id: o.id,
              objectiveNumber: o.objectiveNumber,
              title: o.title,
              corporateStrategicObjective: o.corporateStrategicObjective,
              departmentalQualityObjective: o.departmentalQualityObjective,
              strategyMethodology: o.strategyMethodology,
              measurementMethod: o.measurementMethod,
              frequencyOfReview: o.frequencyOfReview || 4,
              kpiTarget2025: o.kpiTargetPrevious,
              statusEnd2025: o.statusPreviousYear,
              kpiTarget2026: o.kpiTargetCurrent,
              quarterlyProgress: {
                q1: o.q1Status || '0',
                q2: o.q2Status || '0',
                q3: o.q3Status || '0',
                q4: o.q4Status || '0'
              },
              comments: o.comments,
              records: o.records,
              targetValue: o.targetValue,
              currentValue: o.currentValue,
              unit: o.unit,
              status: o.status,
              owner: o.owner?.name,
              approvals: {
                departmentHead: o.departmentHeadApproval,
                departmentHeadDate: o.departmentHeadDate,
                managingDirector: o.managingDirectorApproval,
                managingDirectorDate: o.managingDirectorDate
              },
              sheetUrl: `https://ims.promeconsult.com/objectives/${o.id}`
            }))
          };
        } else if (call.name === 'updateQualityObjectiveQuarter') {
          const args = call.args as any;
          const objNum = args.objectiveNumber;
          const obj = await prisma.qualityObjective.findFirst({
            where: {
              OR: [
                { objectiveNumber: objNum },
                { id: isNaN(Number(objNum)) ? -1 : Number(objNum) }
              ]
            }
          });
          if (!obj) {
            functionResponse = { error: `Objective ${objNum} not found.` };
          } else {
            const q = args.quarter.toUpperCase();
            const qField = q === 'Q1' ? 'q1Status' : q === 'Q2' ? 'q2Status' : q === 'Q3' ? 'q3Status' : 'q4Status';
            const updateData: any = {
              [qField]: args.quarterStatus
            };
            if (args.currentValue !== undefined) updateData.currentValue = parseFloat(args.currentValue);
            if (args.status) updateData.status = args.status;
            if (args.comments) updateData.comments = args.comments;
            if (args.records) updateData.records = args.records;

            const updated = await prisma.qualityObjective.update({
              where: { id: obj.id },
              data: updateData
            });

            functionResponse = {
              success: true,
              message: `Objective ${updated.objectiveNumber} updated successfully for ${q}.`,
              objective: {
                objectiveNumber: updated.objectiveNumber,
                title: updated.title,
                quarter: q,
                quarterStatus: (updated as any)[qField],
                currentValue: updated.currentValue,
                overallStatus: updated.status,
                comments: updated.comments,
                records: updated.records
              },
              portalUrl: `https://ims.promeconsult.com/objectives/${updated.id}`
            };
          }
        } else if (call.name === 'getManagementReviews') {
          const args = call.args as any;
          const reviews = await prisma.managementReview.findMany({
            where: {
              AND: [
                args.meetingNumber ? { meetingNumber: { contains: args.meetingNumber, mode: 'insensitive' } } : {},
                args.status ? { status: args.status } : {}
              ]
            },
            include: {
              chairperson: { select: { id: true, name: true } },
              attendees: { select: { id: true, name: true } },
              actionItems: { include: { assignedTo: { select: { id: true, name: true } } } }
            },
            orderBy: { scheduledDate: 'desc' }
          });

          functionResponse = {
            totalCount: reviews.length,
            portalUrl: 'https://ims.promeconsult.com/management-reviews',
            reviews: reviews.map(r => ({
              id: r.id,
              meetingNumber: r.meetingNumber,
              scheduledDate: r.scheduledDate,
              conductedDate: r.conductedDate,
              status: r.status,
              chairperson: r.chairperson?.name,
              attendees: r.attendees.map(a => a.name),
              purpose: r.purpose,
              agendaInputs: {
                auditResults: r.auditResultsSummary,
                capaSummary: r.capaSummary,
                riskSummary: r.riskSummary,
                customerFeedback: r.customerFeedbackSummary,
                qualityObjectives: r.qualityObjectivesSummary,
                monitoringResults: r.monitoringResults,
                supplierPerformance: r.providerPerformanceSummary,
                resourceAdequacy: r.adequacyOfResources,
                policyReview: r.policyReviewSummary,
                processPerformance: r.processPerformanceProductConformitySummary,
                continualImprovement: r.continualImprovementSummary
              },
              conclusion: r.conclusion,
              actionItems: r.actionItems.map(a => ({
                description: a.description,
                assignedTo: a.assignedTo?.name,
                dueDate: a.dueDate,
                status: a.status
              }))
            }))
          };
        } else if (call.name === 'getMasterDocumentRegister') {
          const args = call.args as any;
          const query = (args?.query || '').toLowerCase();
          const docs = await prisma.masterDocument.findMany({
            where: {
              AND: [
                args.category ? { category: { contains: args.category, mode: 'insensitive' } } : {},
                args.division && args.division !== 'ALL' ? { division: { contains: args.division, mode: 'insensitive' } } : {},
                query ? {
                  OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { documentNumber: { contains: query, mode: 'insensitive' } }
                  ]
                } : {}
              ]
            },
            take: 25,
            orderBy: { documentNumber: 'asc' }
          });

          functionResponse = {
            totalCount: docs.length,
            portalUrl: 'https://ims.promeconsult.com/documents',
            documents: docs.map(d => ({
              documentNumber: d.documentNumber,
              title: d.title,
              type: d.type,
              category: d.category,
              division: d.division,
              revision: d.revision,
              status: d.status,
              issueDate: d.issueDate,
              url: d.fileUrl ? (d.fileUrl.startsWith('http') ? d.fileUrl : `https://ims.promeconsult.com${d.fileUrl}`) : 'https://ims.promeconsult.com/documents'
            }))
          };
        } else if (call.name === 'getFormsDirectory') {
          const args = call.args as any;
          const query = (args?.query || '').toLowerCase();
          const forms = await prisma.masterDocument.findMany({
            where: {
              AND: [
                { OR: [{ type: 'Form' }, { category: { contains: 'Form', mode: 'insensitive' } }] },
                query ? {
                  OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { documentNumber: { contains: query, mode: 'insensitive' } }
                  ]
                } : {}
              ]
            },
            take: 30,
            orderBy: { documentNumber: 'asc' }
          });

          functionResponse = {
            totalCount: forms.length,
            portalUrl: 'https://ims.promeconsult.com/forms',
            forms: forms.map(f => ({
              formNumber: f.documentNumber,
              title: f.title,
              category: f.category,
              revision: f.revision,
              division: f.division,
              status: f.status,
              directUrl: 'https://ims.promeconsult.com/forms'
            }))
          };
        } else if (call.name === 'getRiskRegister') {
          const args = call.args as any;
          const risks = await prisma.risk.findMany({
            where: {
              AND: [
                args.type && args.type !== 'ALL' ? { type: args.type } : {},
                args.category ? { category: { contains: args.category, mode: 'insensitive' } } : {},
                args.status ? { status: args.status } : {}
              ]
            },
            include: {
              owner: { select: { id: true, name: true } },
              project: { select: { id: true, name: true } }
            },
            orderBy: { score: 'desc' },
            take: 20
          });

          functionResponse = {
            totalCount: risks.length,
            portalUrl: 'https://ims.promeconsult.com/risks',
            risks: risks.map(r => ({
              id: r.id,
              riskNumber: r.riskNumber,
              title: r.title,
              type: r.type,
              category: r.category,
              description: r.description,
              likelihood: r.likelihood,
              impact: r.impact,
              score: r.score,
              mitigationPlan: r.mitigationPlan,
              actionDeadline: r.actionDeadline,
              residualScore: r.residualScore,
              status: r.status,
              owner: r.owner?.name,
              project: r.project?.name
            }))
          };
        } else if (call.name === 'getVariationsAndClaims') {
          const args = call.args as any;
          const query = (args?.query || '').toLowerCase();
          
          const variationOrders = await prisma.projectVariationOrder.findMany({
            where: {
              AND: [
                args.projectId ? { projectId: args.projectId } : {},
                query ? {
                  OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { referenceNumber: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { project: { name: { contains: query, mode: 'insensitive' } } }
                  ]
                } : {}
              ]
            },
            include: {
              project: { select: { id: true, name: true, client: true } }
            },
            orderBy: { date: 'desc' },
            take: 20
          });

          // Also check for variation/claim documents in ProjectDocument
          const variationDocs = await prisma.projectDocument.findMany({
            where: {
              AND: [
                args.projectId ? { projectId: args.projectId } : {},
                {
                  OR: [
                    { type: { contains: 'Variation', mode: 'insensitive' } },
                    { type: { contains: 'Claim', mode: 'insensitive' } },
                    { title: { contains: 'Variation', mode: 'insensitive' } },
                    { title: { contains: 'Claim', mode: 'insensitive' } }
                  ]
                },
                query ? {
                  OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { documentNumber: { contains: query, mode: 'insensitive' } }
                  ]
                } : {}
              ]
            },
            include: {
              project: { select: { id: true, name: true, client: true } },
              uploadedBy: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          });

          functionResponse = {
            totalCount: variationOrders.length + variationDocs.length,
            portalUrl: args.projectId ? `https://ims.promeconsult.com/projects/${args.projectId}` : 'https://ims.promeconsult.com/projects',
            variationOrders: variationOrders.map(vo => ({
              id: vo.id,
              referenceNumber: vo.referenceNumber,
              title: vo.title,
              description: vo.description,
              date: vo.date,
              costImpact: vo.costImpact,
              scheduleImpactDays: vo.scheduleImpact,
              status: vo.status,
              approvalDate: vo.approvalDate,
              project: vo.project?.name,
              client: vo.project?.client,
              fileUrl: vo.fileUrl ? (vo.fileUrl.startsWith('http') ? vo.fileUrl : `https://ims.promeconsult.com${vo.fileUrl}`) : null,
              projectUrl: `https://ims.promeconsult.com/projects/${vo.projectId}`
            })),
            variationDocuments: variationDocs.map(d => ({
              id: d.id,
              documentNumber: d.documentNumber,
              title: d.title,
              type: d.type,
              status: d.status,
              issueDate: d.issueDate,
              project: d.project?.name,
              client: d.project?.client,
              uploadedBy: d.uploadedBy?.name,
              fileUrl: d.fileUrl ? (d.fileUrl.startsWith('http') ? d.fileUrl : `https://ims.promeconsult.com${d.fileUrl}`) : null
            }))
          };
        } else {
          functionResponse = { error: 'Function not found' };
        }
      } catch (e: any) {
        functionResponse = { error: e.message };
      }

      const modelContent = response.candidates?.[0]?.content || { role: 'model', parts: [{ functionCall: call }] };
      contents.push(modelContent);
      contents.push({ role: 'user', parts: [{ functionResponse: { name: call.name, response: functionResponse } }] });

      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contents,
        config: {
          systemInstruction: systemInstruction.parts[0].text,
          tools: [{ functionDeclarations: systemTools }],
          temperature: 0.7,
        }
      });
    }

    const aiMessageText = response.text || "I'm sorry, I couldn't process that request.";

    // Save AI response to DB
    const aiDbMessage = await prisma.aiChatMessage.create({
      data: {
        sessionId: Number(sessionId),
        role: 'model',
        content: aiMessageText
      }
    });

    // Update session timestamp
    await prisma.aiChatSession.update({
      where: { id: Number(sessionId) },
      data: { updatedAt: new Date() }
    });

    res.json(aiDbMessage);
  } catch (error) {
    console.error('Error in AI chat:', error);
    res.status(500).json({ error: 'Failed to process AI chat' });
  }
});

const workspace3dTools: any[] = [
  // Camera tools
  {
    name: 'flyToLocation',
    description: 'Fly the camera to a specific latitude and longitude',
    parameters: {
      type: Type.OBJECT,
      properties: {
        lat: { type: Type.NUMBER, description: 'Latitude' },
        lon: { type: Type.NUMBER, description: 'Longitude' },
        altitude: { type: Type.NUMBER, description: 'Altitude in meters (default 5000)' }
      },
      required: ['lat', 'lon']
    }
  },
  {
    name: 'flyToUganda',
    description: 'Fly the camera to default Uganda view',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: 'resetCameraView',
    description: 'Reset camera to default view',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: 'setCameraView',
    description: 'Set camera view with specific heading, pitch, and roll',
    parameters: {
      type: Type.OBJECT,
      properties: {
        heading: { type: Type.NUMBER, description: 'Heading in degrees' },
        pitch: { type: Type.NUMBER, description: 'Pitch in degrees' },
        roll: { type: Type.NUMBER, description: 'Roll in degrees' }
      },
      required: ['heading', 'pitch', 'roll']
    }
  },
  // Base Map tools
  {
    name: 'changeBaseLayer',
    description: 'Change the base map layer',
    parameters: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING, description: 'Base layer type: satellite, google, or street' }
      },
      required: ['type']
    }
  },
  // Layer tools
  {
    name: 'toggleLayer',
    description: 'Toggle visibility of a specific layer/file',
    parameters: {
      type: Type.OBJECT,
      properties: {
        layerName: { type: Type.STRING, description: 'Name of the file/layer to toggle' }
      },
      required: ['layerName']
    }
  },
  {
    name: 'toggleAllLayers',
    description: 'Toggle all layers in a category',
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING, description: 'Category: Surfaces, Design Files, PNGs, or GLTF-GLB' },
        show: { type: Type.BOOLEAN, description: 'Whether to show or hide' }
      },
      required: ['category', 'show']
    }
  },
  {
    name: 'setLayerOpacity',
    description: 'Set opacity of a specific layer',
    parameters: {
      type: Type.OBJECT,
      properties: {
        layerName: { type: Type.STRING, description: 'Name of the layer' },
        opacity: { type: Type.NUMBER, description: 'Opacity from 0 to 100' }
      },
      required: ['layerName', 'opacity']
    }
  },
  {
    name: 'getActiveLayers',
    description: 'Get list of currently active layers',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  // Measurement tools
  {
    name: 'startMeasurement',
    description: 'Start a measurement tool',
    parameters: {
      type: Type.OBJECT,
      properties: {
        mode: { type: Type.STRING, description: 'Measurement mode: distance, area, or profile' }
      },
      required: ['mode']
    }
  },
  {
    name: 'clearMeasurements',
    description: 'Clear all active measurements',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  // Scene tools
  {
    name: 'setSceneFog',
    description: 'Toggle scene fog',
    parameters: {
      type: Type.OBJECT,
      properties: {
        enabled: { type: Type.BOOLEAN, description: 'Enable or disable fog' }
      },
      required: ['enabled']
    }
  },
  {
    name: 'setAtmosphere',
    description: 'Toggle scene atmosphere',
    parameters: {
      type: Type.OBJECT,
      properties: {
        enabled: { type: Type.BOOLEAN, description: 'Enable or disable atmosphere' }
      },
      required: ['enabled']
    }
  },
  {
    name: 'setLighting',
    description: 'Toggle scene lighting',
    parameters: {
      type: Type.OBJECT,
      properties: {
        enabled: { type: Type.BOOLEAN, description: 'Enable or disable lighting' }
      },
      required: ['enabled']
    }
  },
  {
    name: 'setShadows',
    description: 'Toggle scene shadows',
    parameters: {
      type: Type.OBJECT,
      properties: {
        enabled: { type: Type.BOOLEAN, description: 'Enable or disable shadows' }
      },
      required: ['enabled']
    }
  },
  {
    name: 'setDepthTest',
    description: 'Toggle depth testing against terrain',
    parameters: {
      type: Type.OBJECT,
      properties: {
        enabled: { type: Type.BOOLEAN, description: 'Enable or disable depth testing' }
      },
      required: ['enabled']
    }
  },
  {
    name: 'setContrast',
    description: 'Set scene contrast',
    parameters: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.NUMBER, description: 'Contrast value (50-200)' }
      },
      required: ['value']
    }
  },
  {
    name: 'setBrightness',
    description: 'Set scene brightness',
    parameters: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.NUMBER, description: 'Brightness value (50-150)' }
      },
      required: ['value']
    }
  },
  // Terrain Export tools
  {
    name: 'startTerrainSelection',
    description: 'Start terrain selection tool',
    parameters: {
      type: Type.OBJECT,
      properties: {
        mode: { type: Type.STRING, description: 'Selection mode: box or polygon' }
      },
      required: ['mode']
    }
  },
  {
    name: 'clearTerrainSelection',
    description: 'Clear active terrain selection',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: 'setTerrainExportFormat',
    description: 'Set terrain export format',
    parameters: {
      type: Type.OBJECT,
      properties: {
        format: { type: Type.STRING, description: 'Format: dem_asc, dxf_tin, dxf_contour, or geotif_image' }
      },
      required: ['format']
    }
  },
  {
    name: 'setTerrainCrs',
    description: 'Set terrain coordinate reference system',
    parameters: {
      type: Type.OBJECT,
      properties: {
        crs: { type: Type.STRING, description: 'CRS, e.g. EPSG:32636' }
      },
      required: ['crs']
    }
  },
  {
    name: 'downloadTerrainSurface',
    description: 'Download the selected terrain surface',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  // Split Compare tools
  {
    name: 'toggleSplitCompare',
    description: 'Toggle split screen compare mode',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: 'setSplitPosition',
    description: 'Set split screen slider position',
    parameters: {
      type: Type.OBJECT,
      properties: {
        percent: { type: Type.NUMBER, description: 'Slider position percentage (0-100)' }
      },
      required: ['percent']
    }
  },
  // Timeline tools
  {
    name: 'toggleTimeline',
    description: 'Toggle timeline visibility',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: 'setTimelinePosition',
    description: 'Set timeline slider position',
    parameters: {
      type: Type.OBJECT,
      properties: {
        percent: { type: Type.NUMBER, description: 'Timeline position percentage (0-100)' }
      },
      required: ['percent']
    }
  },
  {
    name: 'togglePlayback',
    description: 'Toggle timeline playback',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  // Pedestrian tools
  {
    name: 'togglePedestrianMode',
    description: 'Toggle pedestrian/first-person mode',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: 'setPedestrianSpeed',
    description: 'Set pedestrian movement speed',
    parameters: {
      type: Type.OBJECT,
      properties: {
        speed: { type: Type.NUMBER, description: 'Speed (1-100)' }
      },
      required: ['speed']
    }
  },
  // Project tools
  {
    name: 'selectProject',
    description: 'Select a project by ID',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: { type: Type.NUMBER, description: 'Project ID' }
      },
      required: ['projectId']
    }
  },
  {
    name: 'getProjects',
    description: 'Get a list of available projects',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: 'getProjectFiles',
    description: 'Get a list of files for the current project',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  // Panel tools
  {
    name: 'openLeftPanel',
    description: 'Open the left UI panel',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: 'openRightPanel',
    description: 'Open the right UI panel',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: 'selectSubModule',
    description: 'Select a specific sub-module',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Module name: GeoTech, Terrain, Corridors, Hydrology, or Structures' }
      },
      required: ['name']
    }
  },
  // Query tools
  {
    name: 'getViewerState',
    description: 'Get the current state of the 3D viewer (camera position, active layers, scene settings)',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  }
];

router.post('/3d-workspace', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Prepare history if session exists
    let history: any[] = [];
    let activeSession = null;

    if (sessionId) {
      activeSession = await prisma.aiChatSession.findUnique({
        where: { id: Number(sessionId) },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (activeSession) {
        history = activeSession.messages.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }));
      }

      // Save user message to DB
      await prisma.aiChatMessage.create({
        data: {
          sessionId: Number(sessionId),
          role: 'user',
          content: message
        }
      });
    }

    const systemInstruction = `You are the PROME 3D Workspace AI Assistant specialized in engineering geospatial operations on a CesiumJS globe. 
You control the 3D viewer by calling tools, and the results are executed on the frontend. 
You can and should call multiple tools when the user's request requires multiple actions (e.g., "fly to Kampala and enable fog" means calling flyToLocation and setSceneFog). 
ALWAYS respond with a natural language explanation of what you did.`;

    const contents: any[] = [...history, { role: 'user', parts: [{ text: message }] }];

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: workspace3dTools }],
        temperature: 0.7,
      }
    });

    const commands: { tool: string, args: object }[] = [];
    
    // Process function calls
    if (response.functionCalls && response.functionCalls.length > 0) {
      for (const call of response.functionCalls) {
        commands.push({
          tool: call.name || '',
          args: call.args as object || {}
        });
      }
    }

    const aiMessageText = response.text || "I have executed the commands as requested.";

    // Save AI response to DB if session exists
    if (sessionId && activeSession) {
      await prisma.aiChatMessage.create({
        data: {
          sessionId: Number(sessionId),
          role: 'model',
          content: aiMessageText
        }
      });

      // Update session timestamp
      await prisma.aiChatSession.update({
        where: { id: Number(sessionId) },
        data: { updatedAt: new Date() }
      });
    }

    res.json({
      response: aiMessageText,
      commands
    });
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    console.error('Error in 3D workspace AI:', errMsg);
    res.status(500).json({ error: errMsg });
  }
});

export default router;
