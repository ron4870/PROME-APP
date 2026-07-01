import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken as authenticate } from '../middleware/auth';
import { upload, driveService, GOOGLE_DRIVE_FOLDER_ID, getOrCreateProjectFolder } from '../services/drive.service';
import { Readable } from 'stream';

const router = Router();
const prisma = new PrismaClient();

// Local middleware to check Database Project access
const checkDatabaseProjectAccess = () => async (req: any, res: any, next: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { roles: true }
    });
    if (user?.roles?.some(r => r.name === 'Administrator' || r.name === 'Admin' || r.name === 'Super Admin')) {
      return next();
    }
    
    const projectId = parseInt(req.params.id);
    const project = await prisma.databaseProject.findUnique({ where: { id: projectId } });
    if (project && project.name === 'Master Database') {
      return next();
    }
    
    const member = await prisma.databaseProjectMember.findUnique({
      where: {
        databaseProjectId_userId: {
          databaseProjectId: projectId,
          userId: req.user!.userId
        }
      }
    });
    if (!member) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this database project' });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET all projects in the database
router.get('/', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user!.userId },
      include: { roles: true }
    });

    // Auto-create Master Database project if not exists
    const existingMasterDb = await prisma.databaseProject.findFirst({
      where: { name: 'Master Database' }
    });
    if (!existingMasterDb) {
      try {
        const newProj = await prisma.databaseProject.create({
          data: {
            name: 'Master Database',
            client: 'PROME',
            description: 'System Master Database for GIS, terrain elevation data, design files, overlays, and 3D models.',
            status: 'Active',
            startDate: new Date('2026-01-01')
          }
        });
        await getOrCreateProjectFolder(newProj.id, newProj.name, null);
      } catch (err) {
        console.error('Failed to auto-create Database Master Database:', err);
      }
    }

    let databaseProjects;
    const isAdmin = user?.roles?.some(r => r.name === 'Administrator' || r.name === 'Admin' || r.name === 'Super Admin');
    
    if (isAdmin) {
      databaseProjects = await prisma.databaseProject.findMany({
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } }
          }
        },
        orderBy: { startDate: 'desc' }
      });
    } else {
      databaseProjects = await prisma.databaseProject.findMany({
        where: {
          OR: [
            {
              members: {
                some: { userId: (req as any).user!.userId }
              }
            },
            {
              name: 'Master Database'
            }
          ]
        },
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } }
          }
        },
        orderBy: { startDate: 'desc' }
      });
    }

    const formatted = databaseProjects.map(p => ({
      ...p,
      membersCount: p.members.length
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching database projects:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET single database project
router.get('/:id', authenticate, checkDatabaseProjectAccess(), async (req, res) => {
  try {
    const project = await prisma.databaseProject.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } }
        }
      }
    });
    if (!project) return res.status(404).json({ message: 'Database project not found' });
    res.json({
      ...project,
      membersCount: project.members.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE database project (Admin only)
router.post('/', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user!.userId },
      include: { roles: true }
    });
    
    if (!user?.roles?.some(r => r.name === 'Administrator' || r.name === 'Admin' || r.name === 'Super Admin')) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { name, client, description, startDate, endDate, selectedSubProjects, members } = req.body;

    const project = await prisma.$transaction(async (tx) => {
      const newProj = await tx.databaseProject.create({
        data: {
          name,
          client,
          description,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          selectedSubProjects: selectedSubProjects || []
        }
      });

      // Add members if provided
      if (members && Array.isArray(members)) {
        await tx.databaseProjectMember.createMany({
          data: members.map((m: any) => ({
            databaseProjectId: newProj.id,
            userId: parseInt(m.userId),
            role: m.role || 'Viewer'
          }))
        });
      }

      return newProj;
    });

    // Create Drive folder asynchronously
    try {
      await getOrCreateProjectFolder(project.id, project.name, null);
    } catch (e) {
      console.error('Failed to create Google Drive folder:', e);
    }

    res.json(project);
  } catch (error) {
    console.error('Error creating database project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE database project (Admin only)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user!.userId },
      include: { roles: true }
    });
    if (!user?.roles?.some(r => r.name === 'Administrator' || r.name === 'Admin' || r.name === 'Super Admin')) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { name, client, description, startDate, endDate, selectedSubProjects } = req.body;

    const updated = await prisma.databaseProject.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name,
        client,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        selectedSubProjects: selectedSubProjects || undefined
      }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE database project (Admin only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user!.userId },
      include: { roles: true }
    });
    if (!user?.roles?.some(r => r.name === 'Administrator' || r.name === 'Admin' || r.name === 'Super Admin')) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await prisma.databaseProject.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({ message: 'Database project deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET documents for database project
router.get('/:id/documents', authenticate, checkDatabaseProjectAccess(), async (req, res) => {
  try {
    const docs = await prisma.databaseProjectDocument.findMany({
      where: { databaseProjectId: parseInt(req.params.id) },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST document for database project
router.post('/:id/documents', authenticate, checkDatabaseProjectAccess(), upload.single('file'), async (req, res) => {
  try {
    const projectId = req.params.id;
    const { documentNumber, title, type, revision, status, issueDate, metadata } = req.body;
    const file = req.file;
    let fileUrl = null;

    if (file) {
      const project = await prisma.databaseProject.findUnique({ where: { id: Number(projectId) } });
      if (!project) return res.status(404).json({ error: 'Database project not found' });
      
      const targetFolderId = await getOrCreateProjectFolder(project.id, project.name, project.driveFolderId);
      const fileMetadata = { name: file.originalname, parents: [targetFolderId] };
      const media = { mimeType: file.mimetype, body: Readable.from(file.buffer) };
      
      const driveFile = await driveService.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
        supportsAllDrives: true
      });
      const fileId = driveFile.data.id;
      if (fileId) {
        await driveService.permissions.create({
          fileId: fileId,
          requestBody: { role: 'reader', type: 'anyone' },
          supportsAllDrives: true
        });
        
        let parsedMetadata = null;
        if (metadata) {
          try {
            parsedMetadata = JSON.parse(metadata);
          } catch(e) {}
        }
        
        fileUrl = JSON.stringify({ 
          id: fileId, 
          view: driveFile.data.webViewLink, 
          download: driveFile.data.webContentLink, 
          isPdf: file.mimetype === 'application/pdf',
          metadata: parsedMetadata
        });
      }
    }

    const newDoc = await prisma.databaseProjectDocument.create({
      data: {
        databaseProjectId: parseInt(projectId),
        documentNumber: documentNumber || `DB-DOC-${Date.now()}`,
        title: title || file?.originalname || 'Untitled',
        type: type || 'General',
        revision: revision || '1.0',
        status: status || 'Draft',
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        uploadedById: (req as any).user!.userId,
        fileUrl,
      }
    });
    res.json(newDoc);
  } catch (error) {
    console.error('Error in database projects documents post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE document for database project
router.delete('/:id/documents/:docId', authenticate, checkDatabaseProjectAccess(), async (req, res) => {
  try {
    const docId = parseInt(req.params.docId);
    const doc = await prisma.databaseProjectDocument.findUnique({
      where: { id: docId }
    });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (doc.fileUrl) {
      try {
        const fileInfo = JSON.parse(doc.fileUrl);
        if (fileInfo.id) {
          await driveService.files.delete({
            fileId: fileInfo.id,
            supportsAllDrives: true
          });
        }
      } catch (err) {
        console.error('Failed to delete file from Google Drive:', err);
      }
    }

    await prisma.databaseProjectDocument.delete({
      where: { id: docId }
    });

    res.json({ message: 'Document deleted successfully from database project' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST add member to database project (Admin only)
router.post('/:id/members', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user!.userId },
      include: { roles: true }
    });
    if (!user?.roles?.some(r => r.name === 'Administrator' || r.name === 'Admin' || r.name === 'Super Admin')) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { userId, role } = req.body;
    const newMember = await prisma.databaseProjectMember.create({
      data: {
        databaseProjectId: parseInt(req.params.id),
        userId: parseInt(userId),
        role: role || 'Viewer'
      }
    });

    res.json(newMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
