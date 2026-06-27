import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';
import pdfParse from 'pdf-parse';
import { getOrCreateBidFolder } from '../services/drive.service';

const router = Router();
const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-prome-key';

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware to protect routes
const authMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ==========================================
// OPPORTUNITIES
// ==========================================

// Get all opportunities
router.get('/opportunities', authMiddleware, async (req, res) => {
  try {
    const opportunities = await prisma.bidOpportunity.findMany({
      orderBy: { createdAt: 'desc' },
      include: { bids: true }
    });
    res.json(opportunities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

// Create new opportunity
router.post('/opportunities', authMiddleware, async (req, res) => {
  try {
    const { title, description, client, country, source, type, deadline, status } = req.body;
    const opp = await prisma.bidOpportunity.create({
      data: {
        title,
        description,
        client,
        country,
        source,
        type,
        deadline: deadline ? new Date(deadline) : null,
        status: status || 'Identified'
      }
    });
    res.status(201).json(opp);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create opportunity' });
  }
});

// Email Webhook for Opportunities
router.post('/webhook/email', async (req, res) => {
  try {
    const { subject, text, from } = req.body;
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });

    const prompt = `
      Extract civil engineering bid opportunity details from this email.
      Return your response in pure JSON format exactly like this, without markdown formatting or code blocks:
      {
        "title": "Project Name or Subject",
        "client": "Client Name",
        "country": "Country",
        "type": "EOI or RFP or DP",
        "description": "Brief summary of the project",
        "deadline": "YYYY-MM-DD or null"
      }
      Email Subject: ${subject}
      Email Body: ${text}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.1 }
    });

    const cleanText = (response.text || "{}").replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanText);

    const opp = await prisma.bidOpportunity.create({
      data: {
        title: result.title || subject || 'Email Opportunity',
        description: result.description || text || '',
        client: result.client || 'Unknown',
        country: result.country || 'Unknown',
        source: 'Email',
        type: result.type || 'Unknown',
        deadline: result.deadline ? new Date(result.deadline) : null,
        status: 'Identified'
      }
    });
    res.status(201).json(opp);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process email webhook' });
  }
});

// Newspaper OCR
router.post('/opportunities/ocr', authMiddleware, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'No image provided' });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg'
              }
            },
            {
              text: "Extract civil engineering bid opportunity details from this newspaper clipping. Return your response in pure JSON format exactly like this, without markdown formatting or code blocks: { \"title\": \"...\", \"client\": \"...\", \"country\": \"...\", \"type\": \"...\", \"description\": \"...\", \"deadline\": \"YYYY-MM-DD or null\" }"
            }
          ]
        }
      ],
      config: { temperature: 0.1 }
    });

    const cleanText = (response.text || "{}").replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanText);

    const opp = await prisma.bidOpportunity.create({
      data: {
        title: result.title || 'Newspaper Opportunity',
        description: result.description || '',
        client: result.client || 'Unknown',
        country: result.country || 'Unknown',
        source: 'Newspaper',
        type: result.type || 'Unknown',
        deadline: result.deadline ? new Date(result.deadline) : null,
        status: 'Identified'
      }
    });
    res.status(201).json(opp);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process OCR' });
  }
});

// Web Search for Opportunities
router.post('/opportunities/search', authMiddleware, async (req, res) => {
  try {
    const { query } = req.body;
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });

    const prompt = `
      You are an AI tasked with finding active civil engineering tenders/bids online.
      Search the web for: ${query}
      If you find real opportunities, summarize them.
      Return your response as a JSON array of objects exactly like this, without markdown formatting or code blocks:
      [
        {
          "title": "Project Name",
          "client": "Client Name",
          "country": "Country",
          "type": "EOI or RFP",
          "description": "Brief summary",
          "deadline": "YYYY-MM-DD or null"
        }
      ]
      If you cannot use search, just return an empty array [].
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { 
        temperature: 0.2,
        // Attempting to enable Google Search grounding if the SDK supports it.
        // Even if it ignores it, we'll gracefully handle it.
        tools: [{ googleSearch: {} }] 
      }
    });

    const cleanText = (response.text || "[]").replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanText);

    const createdOpps = [];
    for (const opp of (Array.isArray(result) ? result : [])) {
       const created = await prisma.bidOpportunity.create({
         data: {
           title: opp.title || 'Web Search Opportunity',
           description: opp.description || '',
           client: opp.client || 'Unknown',
           country: opp.country || 'Unknown',
           source: 'Web Search',
           type: opp.type || 'Unknown',
           deadline: opp.deadline ? new Date(opp.deadline) : null,
           status: 'Identified'
         }
       });
       createdOpps.push(created);
    }
    
    res.status(201).json(createdOpps);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to search for opportunities' });
  }
});

// AI Triage
router.post('/opportunities/:id/triage', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const opp = await prisma.bidOpportunity.findUnique({ where: { id: Number(id) } });
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const prompt = `
      You are an expert civil engineering bid manager for PROME.
      Analyze this opportunity and provide a Go/No-Go recommendation and a score (0-100).
      Return your response in pure JSON format exactly like this, without markdown formatting or code blocks:
      {
        "score": 85,
        "recommendation": "Go. Strong fit for our past road infrastructure projects."
      }

      Opportunity Details:
      Title: ${opp.title}
      Client: ${opp.client || 'Unknown'}
      Country: ${opp.country || 'Unknown'}
      Type: ${opp.type || 'Unknown'}
      Description: ${opp.description || 'No description provided.'}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
      }
    });

    let result;
    try {
      const text = response.text || "{}";
      // Clean up potential markdown formatting from Gemini response
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      result = JSON.parse(cleanText);
    } catch (e) {
      console.error("Failed to parse Gemini response:", response.text);
      result = { score: 50, recommendation: "Could not analyze the opportunity with certainty. Please review manually." };
    }

    const updated = await prisma.bidOpportunity.update({
      where: { id: Number(id) },
      data: {
        aiRecommendation: result.recommendation,
        aiScore: result.score || 0,
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to triage opportunity' });
  }
});

// Update opportunity status
router.put('/opportunities/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await prisma.bidOpportunity.update({
      where: { id: Number(id) },
      data: { status }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update opportunity' });
  }
});

// Delete opportunity
router.delete('/opportunities/:id', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).userId },
      include: { roles: true }
    });
    
    const roleNames = user?.roles?.map(r => r.name) || [];
    if (!roleNames.includes('Administrator') && !roleNames.includes('Managing Director') && !roleNames.includes('Head of Division')) {
      return res.status(403).json({ error: 'Unauthorized to delete opportunities' });
    }

    const { id } = req.params;
    await prisma.bidOpportunity.delete({ where: { id: Number(id) } });
    res.json({ message: 'Opportunity deleted successfully' });
  } catch (error) {
    console.error('Error deleting opportunity:', error);
    res.status(500).json({ error: 'Failed to delete opportunity' });
  }
});

// ==========================================
// BIDS & PREPARATION
// ==========================================

// Create a bid from an opportunity
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { opportunityId } = req.body;
    
    const opp = await prisma.bidOpportunity.findUnique({ where: { id: Number(opportunityId) } });
    if (!opp) return res.status(404).json({ error: 'Opportunity not found' });

    // Create the Bid
    const bid = await prisma.bid.create({
      data: {
        opportunityId: Number(opportunityId),
        status: 'Preparation',
      }
    });

    try {
      await getOrCreateBidFolder(bid.id, opp.title, null);
    } catch (err) {
      console.error("Failed to create Google Drive folder for bid:", err);
    }

    // Auto-create standard bid sections
    const defaultSections = [
      "Bid Checklist",
      "Eligibility and Administrative Compliance",
      "Technical Submission forms",
      "Powers of Attorney",
      "Company Experience",
      "Comments on TORs",
      "Methodology",
      "Work Programme",
      "Task Assignment and Team Composition",
      "Team CVs",
      "Staffing Schedule",
      "Bid Securing Declaration",
      "Financial Proposal Sheets"
    ];

    await prisma.bidSection.createMany({
      data: defaultSections.map(name => ({
        bidId: bid.id,
        name,
        status: 'Pending'
      }))
    });

    res.status(201).json(bid);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to initialize bid' });
  }
});

// Get all bids
router.get('/', authMiddleware, async (req, res) => {
  try {
    const bids = await prisma.bid.findMany({
      include: { opportunity: true, partners: true, results: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(bids);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

// Get single bid with all relations
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const bid = await prisma.bid.findUnique({
      where: { id: Number(id) },
      include: {
        opportunity: true,
        partners: true,
        sections: {
          include: { assignee: { select: { id: true, name: true, email: true } } }
        },
        results: true,
        retrospective: true
      }
    });
    if (!bid) return res.status(404).json({ error: 'Bid not found' });
    res.json(bid);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bid details' });
  }
});

// Delete a bid workspace (Admin, Managing Director, Head of Division)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).userId },
      include: { roles: true }
    });
    
    const roleName = user?.roles?.[0]?.name;
    if (roleName !== 'Admin' && roleName !== 'Managing Director' && roleName !== 'Head of Division') {
      return res.status(403).json({ error: 'Unauthorized to delete bid workspaces' });
    }

    const { id } = req.params;
    await prisma.bid.delete({ where: { id: Number(id) } });
    res.json({ message: 'Bid workspace deleted successfully' });
  } catch (error) {
    console.error('Error deleting bid workspace:', error);
    res.status(500).json({ error: 'Failed to delete bid workspace' });
  }
});

// Auto-suggest Resources (Staff & Projects)
router.get('/:id/suggest-resources', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const bid = await prisma.bid.findUnique({
      where: { id: Number(id) },
      include: { opportunity: true }
    });
    
    if (!bid) return res.status(404).json({ error: 'Bid not found' });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });

    const users = await prisma.user.findMany({
      select: { id: true, name: true, bio: true, skills: true, qualifications: true, division: true }
    });

    const projects = await prisma.project.findMany({
      where: { status: 'Completed' },
      select: { id: true, name: true, client: true, description: true }
    });

    const prompt = `
      You are an expert bid resource manager for PROME Consult.
      Analyze the following Bid Opportunity and suggest the top 3 best-suited Staff (Users) and top 3 best-suited Past Projects to include in the proposal.
      
      Bid Opportunity:
      Title: ${bid.opportunity.title}
      Description: ${bid.opportunity.description}

      Available Staff:
      ${JSON.stringify(users)}

      Available Past Projects:
      ${JSON.stringify(projects)}

      Return your response in pure JSON format exactly like this, without markdown formatting or code blocks:
      {
        "suggestedStaff": [
          { "id": 1, "name": "...", "reason": "Why they are a good fit" }
        ],
        "suggestedProjects": [
          { "id": 1, "name": "...", "reason": "Why this project is relevant" }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.1 }
    });

    const cleanText = (response.text || "{}").replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanText);

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to suggest resources' });
  }
});

// Update Bid Section Assignment or Status
router.put('/sections/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigneeId, content, references, data } = req.body;
    
    const updated = await prisma.bidSection.update({
      where: { id: Number(id) },
      data: {
        ...(status && { status }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId ? Number(assigneeId) : null }),
        ...(content !== undefined && { content }),
        ...(references !== undefined && { references }),
        ...(data !== undefined && { data })
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update section' });
  }
});

// AI Bid Checklist Generation
router.post('/sections/:id/generate-checklist', authMiddleware, upload.single('document'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded' });
    }

    const section = await prisma.bidSection.findUnique({
      where: { id: Number(id) }
    });

    if (!section) return res.status(404).json({ error: 'Section not found' });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });

    // Parse the PDF
    let documentText = '';
    try {
      const pdfData = await pdfParse(req.file.buffer);
      documentText = pdfData.text;
    } catch (parseErr) {
      return res.status(400).json({ error: 'Failed to parse PDF document' });
    }

    const prompt = `
      You are an expert Bid Manager analyzing a tender document (RFP/ToR).
      Extract a robust checklist of key procedures, mandatory documents, and requirements that must be met during the preparation and submission of the bid.
      
      CRITICAL EXTRACTION RULES:
      1. Interpret any items described with the word "shall" or "must" as strictly mandatory.
      2. Specifically look out for and extract requirements related to "Taxes".
      3. Specifically look out for and extract requirements related to "Lists the Table of Forms".
      4. Extract any other relevant administrative, technical, or financial clauses.
      
      Document Text Extract:
      ${documentText.substring(0, 30000)} // Limit text to avoid exceeding token limits if it's too large
      
      Return a JSON array of checklist items. Each item must have:
      1. "category": A string grouping the item (e.g. "Mandatory Requirements", "Taxes & Financial", "Procedural Steps", "Table of Forms").
      2. "task": The specific requirement or action item.
      3. "mandatory": Boolean indicating if it's strictly mandatory (remember the "shall" rule).
      4. "reference": A string indicating the Section and Page Number where this requirement is found (e.g. "Section 4.1, Page 12"). If unknown, leave empty.
      
      Output ONLY valid JSON. Example format:
      [
        { "category": "Administrative", "task": "Submit valid trading license", "mandatory": true, "reference": "Section 2, Page 5" }
      ]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { 
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    });

    const resultText = response.text;
    if (!resultText) {
      return res.status(500).json({ error: 'Failed to generate checklist' });
    }

    const checklistItems = JSON.parse(resultText);
    
    // Add IDs and completed state to the items
    const formattedItems = checklistItems.map((item: any) => ({
      id: Math.random().toString(36).substring(7),
      ...item,
      completed: false
    }));

    res.json(formattedItems);
  } catch (error) {
    console.error('Checklist Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate checklist' });
  }
});

// --- GENERATE ELIGIBILITY REQUIREMENTS ---
router.post(
  '/sections/:id/generate-eligibility',
  authMiddleware,
  upload.single('file'),
  async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Parse PDF
      const pdfData = await pdfParse(file.buffer);
      const documentText = pdfData.text;

      // Ensure section exists
      const section = await prisma.bidSection.findUnique({
        where: { id: parseInt(id) }
      });

      if (!section) {
        return res.status(404).json({ error: 'Section not found' });
      }

      const prompt = `
      You are an expert Procurement and Bid Manager analyzing a tender document (RFP/ToR).
      Extract a comprehensive checklist of Eligibility, Qualifications, and Administrative Compliance requirements.
      
      CRITICAL EXTRACTION RULES:
      1. Interpret any items described with the word "shall" or "must" as strictly mandatory.
      2. Specifically look out for requirements like: Trading Licenses, Certificates of Incorporation, Tax Clearance, Powers of Attorney, Litigation History, Conflict of Interest forms, Joint Venture agreements, etc.
      3. Extract any specific requirements regarding Eligibility to bid (e.g., country of origin, not blacklisted).
      4. Ignore technical methodology or pricing details, ONLY focus on administrative and eligibility requirements.
      
      Document Text Extract:
      ${documentText.substring(0, 30000)} // Limit text to avoid exceeding token limits if it's too large
      
      Return a JSON array of checklist items. Each item must have:
      1. "category": A string grouping the item (e.g. "Legal Documents", "Tax Compliance", "Forms & Declarations").
      2. "task": The specific requirement or document to submit.
      3. "mandatory": Boolean indicating if it's strictly mandatory.
      4. "reference": A string indicating the Section and Page Number where this requirement is found (e.g. "Section 4.1, Page 12"). If unknown, leave empty.
      
      Output ONLY valid JSON. Example format:
      [
        { "category": "Legal Documents", "task": "Submit valid Certificate of Incorporation", "mandatory": true, "reference": "Section 2, Page 5" }
      ]
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });

      const responseText = response.text || "[]";
      let checklist = [];
      try {
        checklist = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse AI response:', responseText);
        return res.status(500).json({ error: 'AI returned invalid data format' });
      }

      // Add unique IDs to items
      checklist = checklist.map((item: any) => ({
        ...item,
        id: Math.random().toString(36).substr(2, 9),
        completed: false
      }));

      // Update the section data with the new checklist
      const currentData = section.data ? (typeof section.data === 'string' ? JSON.parse(section.data) : section.data) : {};
      currentData.eligibilityList = checklist;

      await prisma.bidSection.update({
        where: { id: parseInt(id) },
        data: { data: currentData }
      });

      res.json({ checklist });
    } catch (error) {
      console.error('Error generating eligibility list:', error);
      res.status(500).json({ error: 'Failed to generate eligibility requirements' });
    }
  }
);

// AI CV Evaluation for Team CVs Section
router.post('/sections/:id/evaluate-cv', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, requirements, wikiPageId } = req.body;

    if (!role || !requirements || !wikiPageId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const section = await prisma.bidSection.findUnique({
      where: { id: Number(id) }
    });

    if (!section) return res.status(404).json({ error: 'Section not found' });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });

    // Fetch the Wiki Page to use as CV
    const wikiPage = await prisma.wikiPage.findUnique({
      where: { id: Number(wikiPageId) }
    });

    if (!wikiPage) return res.status(404).json({ error: 'Wiki Page (CV) not found' });
    
    const prompt = `
      You are an expert HR technical evaluator for a bid proposal.
      Evaluate the following CV/Profile against the project requirements for the role of "${role}".
      
      Requirements for Role:
      ${requirements}
      
      Staff CV/Profile (from internal Wiki):
      Title: ${wikiPage.title}
      Content:
      ${wikiPage.content}
      
      Provide a rigorous evaluation. Return a JSON object with EXACTLY two fields:
      1. "score": An integer between 0 and 100 representing the overall fit.
      2. "opinion": A professional, concise opinion (max 3 sentences) on whether this CV should be used for this role and why.
      
      Output ONLY valid JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { 
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    });

    const resultText = response.text;
    if (!resultText) {
      return res.status(500).json({ error: 'Failed to generate evaluation' });
    }

    const evaluation = JSON.parse(resultText);
    res.json({
      role,
      requirements,
      wikiPageId,
      staffName: wikiPage.title,
      score: evaluation.score,
      opinion: evaluation.opinion,
      status: "Evaluated"
    });
  } catch (error) {
    console.error('CV Evaluation Error:', error);
    res.status(500).json({ error: 'Failed to evaluate CV' });
  }
});

// AI Draft Generation for Bid Sections
router.post('/sections/:id/draft', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const section = await prisma.bidSection.findUnique({
      where: { id: Number(id) },
      include: { bid: { include: { opportunity: true } } }
    });

    if (!section) return res.status(404).json({ error: 'Section not found' });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });

    // Real DB Query for Context (RAG approach)
    const similarPastSections = await prisma.bidSection.findMany({
      where: { 
        name: section.name,
        bid: { status: 'Won' },
        content: { not: null }
      },
      take: 2,
      orderBy: { createdAt: 'desc' }
    });

    const recentProjects = await prisma.project.findMany({
      where: { status: 'Completed' },
      select: { name: true, description: true },
      take: 3,
      orderBy: { updatedAt: 'desc' }
    });

    let pastProposalsContext = "Context from past successful PROME proposals and projects:\n\n";
    
    if (similarPastSections.length > 0) {
      pastProposalsContext += "--- PAST WINNING BID SECTIONS ---\n";
      similarPastSections.forEach(s => {
        // Limit size to avoid overwhelming the prompt if we had a smaller context window, though Gemini handles large contexts easily.
        pastProposalsContext += (s.content || "").substring(0, 2500) + "...\n\n";
      });
    }

    if (recentProjects.length > 0) {
      pastProposalsContext += "--- RECENT COMPLETED PROJECTS ---\n";
      recentProjects.forEach(p => {
        pastProposalsContext += `Project: ${p.name}\nDescription: ${p.description || 'N/A'}\n\n`;
      });
    }
    
    if (similarPastSections.length === 0 && recentProjects.length === 0) {
      pastProposalsContext += "PROME Consult uses a robust methodology emphasizing ISO 9001:2015 quality standards. We deploy experienced engineers rapidly and manage risk via continuous stakeholder engagement.";
    }

    const prompt = `
      You are an expert bid writer for PROME Consult, a top-tier civil engineering firm.
      Draft the "${section.name}" section for the following Bid Opportunity.
      
      Bid Opportunity:
      Title: ${section.bid.opportunity.title}
      Description: ${section.bid.opportunity.description || 'N/A'}
      Client: ${section.bid.opportunity.client || 'N/A'}
      
      Past Proposals Context (Use this to align the tone and standard practices):
      ${pastProposalsContext}
      
      Write a professional, compelling, and structured draft formatted as raw HTML (e.g., using <h2>, <p>, <ul>, <li>, <strong>). Do NOT use Markdown formatting or markdown codeblocks (\`\`\`). Only return the raw HTML string.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.3 }
    });

    const draftText = response.text || "Failed to generate draft.";

    const updated = await prisma.bidSection.update({
      where: { id: Number(id) },
      data: { content: draftText, status: 'In Progress' }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate draft' });
  }
});

// Generate AI Retrospective Advice
router.post('/:id/retrospective', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { winLossReason } = req.body;

    const bid = await prisma.bid.findUnique({
      where: { id: Number(id) },
      include: { opportunity: true }
    });

    if (!bid) return res.status(404).json({ error: 'Bid not found' });

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const prompt = `
      You are an expert bid analyst for PROME Consult, a civil engineering firm.
      Review the outcome of this bid and provide actionable advice for future bids. Focus on what we can do better next time or what strengths we should double down on. Keep it concise (1-2 paragraphs max).
      
      Bid Title: ${bid.opportunity.title}
      Client: ${bid.opportunity.client || 'Unknown'}
      Win/Loss Reason provided by the team: "${winLossReason || 'No reason provided'}"
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    const aiAdvice = response.text || "Unable to generate advice.";

    // Upsert the retrospective
    const retrospective = await prisma.bidRetrospective.upsert({
      where: { bidId: Number(id) },
      update: {
        winLossReason,
        aiAdvice
      },
      create: {
        bidId: Number(id),
        winLossReason,
        aiAdvice,
      }
    });

    res.json(retrospective);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate retrospective advice' });
  }
});

// ==========================================
// AI SECTION TOOLS
// ==========================================

// 1. Methodology TOR Cross-Checker
router.post('/:id/cross-check-tor', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body; // HTML or text of the drafted section

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const bid = await prisma.bid.findUnique({
      where: { id: Number(id) },
      include: { opportunity: true }
    });

    if (!bid || !bid.opportunity) {
      return res.status(404).json({ error: 'Bid or opportunity not found' });
    }

    const prompt = `
      You are an expert bid compliance officer for a civil engineering firm.
      Review the drafted Methodology section text against the Terms of Reference (TOR) description.
      Identify any missing requirements, highlight the strengths, and suggest improvements.
      
      Respond in pure JSON format exactly like this:
      {
        "score": 85, // percentage score indicating compliance
        "strengths": ["list of strengths"],
        "weaknesses": ["list of missing or weak points"],
        "suggestions": ["list of actionable improvements"]
      }
      
      Terms of Reference (Description):
      ${bid.opportunity.description}
      
      Drafted Methodology:
      ${content}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.2 }
    });

    const cleanText = (response.text || "{}").replace(/```json/g, '').replace(/```/g, '').trim();
    let result;
    try {
      result = JSON.parse(cleanText);
    } catch (e) {
      result = { error: 'Failed to parse AI response' };
    }

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to run cross-check' });
  }
});

// 2. Financial BOQ Parser
import * as xlsx from 'xlsx';

router.post('/parse-boq', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    // Assuming the first sheet is the summary or the main BOQ
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON array
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    let grandTotal = 0;
    
    // Simple heuristic: Look for the maximum numeric value in the last few rows or columns
    // that might represent the grand total.
    for (let i = data.length - 1; i >= Math.max(0, data.length - 20); i--) {
      const row = data[i];
      if (!row) continue;
      
      for (let j = 0; j < row.length; j++) {
        const cell = row[j];
        if (typeof cell === 'number' && cell > grandTotal) {
          grandTotal = cell;
        } else if (typeof cell === 'string') {
          // Try to parse string numbers like "1,000,000.00"
          const cleanStr = cell.replace(/,/g, '').trim();
          if (!isNaN(Number(cleanStr)) && Number(cleanStr) > grandTotal) {
            grandTotal = Number(cleanStr);
          }
        }
      }
    }

    if (grandTotal === 0) {
      return res.status(400).json({ error: 'Could not detect a valid total in the BOQ' });
    }

    // Apply standard Uganda taxes as confirmed by user
    const vatRate = 0.18;
    const whtRate = 0.06;
    
    const vat = grandTotal * vatRate;
    const wht = grandTotal * whtRate;
    const finalTotal = grandTotal + vat; // Usually BOQ sub-totals are VAT exclusive, and WHT is deducted from the gross, but for display we show SubTotal + VAT.

    res.json({
      subTotal: grandTotal,
      vat,
      wht,
      finalTotal
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to parse BOQ file' });
  }
});

export default router;
