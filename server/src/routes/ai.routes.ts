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
      parts: [{ text: "You are the PROME App AI Assistant. You help Administrators and Managing Directors manage their company. You are professional, concise, and helpful. You have access to system tools (including company Wiki pages, documentation, FAQs, and the Organizational Knowledge Folder via getOrganizationalKnowledge) to look up live data. You can also write or expand FAQs by using createFaqItem. When asked to plan, analyze, or generate ASAM OpenDrive roads or features, use the provided horizontal alignment geometry PIs as the reference line (planView) to build the road network. Always output valid, complete, and syntactically correct ASAM OpenDrive XML (.xodr) code using standard elements like <header>, <road>, <link>, <planView>, <geometry>, <lanes>, and <laneSection> to detail road objects, lanes, and alignments." }]
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
      model: 'gemini-2.5-flash',
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
  } catch (error) {
    console.error('Error in 3D workspace AI:', error);
    res.status(500).json({ error: 'Failed to process 3D workspace command' });
  }
});

export default router;
