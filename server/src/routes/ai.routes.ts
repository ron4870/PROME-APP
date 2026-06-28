import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { GoogleGenAI, Type } from '@google/genai';
import { upload, driveService } from '../services/drive.service';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Middleware to check Admin/MD Role
const authorizeAiAccess = async (req: Request, res: Response, next: express.NextFunction) => {
  const userId = (req as any).user.userId;
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { roles: true } });
  
  if (!user || (!user.roles?.some(r => r.name === 'Administrator' || r.name === 'Managing Director'))) {
    return res.status(403).json({ error: 'Access denied. AI Assistant is only available to Administrators and Managing Directors.' });
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
      parts: [{ text: "You are the PROME App AI Assistant. You help Administrators and Managing Directors manage their company. You are professional, concise, and helpful. You have access to system tools (including company Wiki pages, documentation, and the Organizational Knowledge Folder via getOrganizationalKnowledge) to look up live data." }]
    };

    // Initialize chat session with history
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
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
      model: 'gemini-2.5-flash',
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
          functionResponse = { pages: pages.map(p => ({ title: p.title, content: p.content.substring(0, 1000) })) };
        } else {
          functionResponse = { error: 'Function not found' };
        }
      } catch (e: any) {
        functionResponse = { error: e.message };
      }

      contents.push({ role: 'model', parts: [{ functionCall: call }] });
      contents.push({ role: 'user', parts: [{ functionResponse: { name: call.name, response: functionResponse } }] });

      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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

export default router;
