import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken as authenticate } from '../middleware/auth';
import { upload, driveService, GOOGLE_DRIVE_FOLDER_ID, getOrCreateDatabaseProjectFolder } from '../services/drive.service';
import { Readable } from 'stream';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';

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
        await getOrCreateDatabaseProjectFolder(newProj.id, newProj.name, null);
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
      await getOrCreateDatabaseProjectFolder(project.id, project.name, null);
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

    const { name, client, description, startDate, endDate, selectedSubProjects, members } = req.body;

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

    if (members && Array.isArray(members)) {
      await prisma.databaseProjectMember.deleteMany({
        where: { databaseProjectId: parseInt(req.params.id) }
      });
      if (members.length > 0) {
        await prisma.databaseProjectMember.createMany({
          data: members.map((m: any) => ({
            databaseProjectId: parseInt(req.params.id),
            userId: m.userId,
            role: m.role || 'Viewer'
          }))
        });
      }
    }

    const finalProject = await prisma.databaseProject.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } }
        }
      }
    });

    res.json(finalProject);
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

    const user = (req as any).user;
    const isAdmin = user?.roles?.some((r: any) => r.name === 'Administrator' || r.name === 'Admin' || r.name === 'Super Admin');
    if (type === 'General Stream Registry' && !isAdmin) {
      return res.status(403).json({ message: 'Only administrators can upload files to the GENERAL STREAM REGISTRY' });
    }

    if (file) {
      const project = await prisma.databaseProject.findUnique({ where: { id: Number(projectId) } });
      if (!project) return res.status(404).json({ error: 'Database project not found' });

      let parsedMetadata = null;
      if (metadata) {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch(e) {}
      }

      const fileExt = file.originalname.split('.').pop()?.toLowerCase();
      const uploadDir = path.join(__dirname, '../../uploads');
      const tilesDir = path.join(uploadDir, '3d-tiles');
      if (!fs.existsSync(tilesDir)) {
        fs.mkdirSync(tilesDir, { recursive: true });
      }

      if (fileExt === 'zip') {
        const uniqueId = `tiles-${Date.now()}`;
        const destPath = path.join(tilesDir, uniqueId);
        fs.mkdirSync(destPath, { recursive: true });
        
        try {
          const zip = new AdmZip(file.buffer);
          zip.extractAllTo(destPath, true);
          
          const findTileset = (dir: string): string | null => {
            const filesList = fs.readdirSync(dir);
            for (const f of filesList) {
              const fullPath = path.join(dir, f);
              const stat = fs.statSync(fullPath);
              if (stat.isDirectory()) {
                const found = findTileset(fullPath);
                if (found) return found;
              } else if (f.toLowerCase() === 'tileset.json') {
                return path.relative(destPath, fullPath);
              }
            }
            return null;
          };
          
          const tilesetRelPath = findTileset(destPath);
          if (tilesetRelPath) {
            const relativeUrlPath = `/uploads/3d-tiles/${uniqueId}/${tilesetRelPath.replace(/\\/g, '/')}`;
            fileUrl = JSON.stringify({
              id: uniqueId,
              view: relativeUrlPath,
              download: relativeUrlPath,
              is3dTiles: true,
              metadata: parsedMetadata
            });
          } else {
            fs.rmSync(destPath, { recursive: true, force: true });
            return res.status(400).json({ message: 'Invalid 3D Tileset zip. Must contain a tileset.json file.' });
          }
        } catch (zipErr) {
          console.error('Error extracting 3D tileset zip:', zipErr);
          return res.status(400).json({ message: 'Failed to extract 3D Tileset zip.' });
        }
      } else if (fileExt === 'json' && file.originalname.toLowerCase().includes('tileset')) {
        const uniqueId = `tiles-${Date.now()}`;
        const destPath = path.join(tilesDir, uniqueId);
        fs.mkdirSync(destPath, { recursive: true });
        
        fs.writeFileSync(path.join(destPath, 'tileset.json'), file.buffer);
        const relativeUrlPath = `/uploads/3d-tiles/${uniqueId}/tileset.json`;
        
        fileUrl = JSON.stringify({
          id: uniqueId,
          view: relativeUrlPath,
          download: relativeUrlPath,
          is3dTiles: true,
          metadata: parsedMetadata
        });
      } else {
        try {
          const targetFolderId = await getOrCreateDatabaseProjectFolder(project.id, project.name, project.driveFolderId);
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
            try {
              await driveService.permissions.create({
                fileId: fileId,
                requestBody: { role: 'reader', type: 'anyone' },
                supportsAllDrives: true
              });
            } catch (permErr) {
              console.warn('Drive permission setting warning:', permErr);
            }
            
            fileUrl = JSON.stringify({ 
              id: fileId, 
              view: driveFile.data.webViewLink, 
              download: driveFile.data.webContentLink, 
              isPdf: file.mimetype === 'application/pdf',
              metadata: parsedMetadata
            });
          }
        } catch (driveErr) {
          console.error('Google Drive upload error, falling back to local file storage:', driveErr);
          const sanitizeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
          const localFilename = `doc-${Date.now()}-${sanitizeName}`;
          const localUploadPath = path.join(__dirname, '../../uploads', localFilename);
          fs.writeFileSync(localUploadPath, file.buffer);
          const relativeUrlPath = `/uploads/${localFilename}`;
          fileUrl = JSON.stringify({
            id: `local-${Date.now()}`,
            view: relativeUrlPath,
            download: relativeUrlPath,
            metadata: parsedMetadata
          });
        }
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
        if (fileInfo.is3dTiles && fileInfo.id) {
          const folderPath = path.join(__dirname, '../../uploads/3d-tiles', fileInfo.id);
          if (fs.existsSync(folderPath)) {
            fs.rmSync(folderPath, { recursive: true, force: true });
          }
        } else if (fileInfo.id) {
          await driveService.files.delete({
            fileId: fileInfo.id,
            supportsAllDrives: true
          });
        }
      } catch (err) {
        console.error('Failed to delete file/folder:', err);
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

// GET proxy endpoint to download/stream document from Google Drive or local uploads to bypass CORS
router.get('/documents/:docId/file', authenticate, async (req, res) => {
  try {
    const docId = parseInt(req.params.docId);
    const doc = await prisma.databaseProjectDocument.findUnique({
      where: { id: docId }
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    let urlInfo: any = {};
    try {
      urlInfo = JSON.parse(doc.fileUrl || '{}');
    } catch(e) {}

    const viewOrDownload = urlInfo.view || urlInfo.download || doc.fileUrl || '';

    // Determine mimeType from file extension or doc title
    let mimeType = 'image/png';
    const ext = doc.title.split('.').pop()?.toLowerCase();
    if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
    else if (ext === 'gif') mimeType = 'image/gif';
    else if (ext === 'pdf') mimeType = 'application/pdf';
    else if (ext === 'xml') mimeType = 'text/xml';
    else if (ext === 'glb') mimeType = 'model/gltf-binary';
    else if (ext === 'gltf') mimeType = 'model/gltf+json';
    else mimeType = 'application/octet-stream';

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    // 1. Check if stored locally in /uploads directory
    if (viewOrDownload && viewOrDownload.includes('/uploads/')) {
      const localRelativePath = viewOrDownload.substring(viewOrDownload.indexOf('/uploads/'));
      const localFilePath = path.join(__dirname, '../..', localRelativePath);
      if (fs.existsSync(localFilePath)) {
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${doc.title}"`);
        return fs.createReadStream(localFilePath).pipe(res);
      }
    }

    // 2. Try to stream from Google Drive if a valid drive file ID exists
    const driveFileId = urlInfo.id;
    if (driveFileId && typeof driveFileId === 'string' && !driveFileId.startsWith('local-')) {
      try {
        const driveRes = await driveService.files.get(
          { fileId: driveFileId, alt: 'media' },
          { responseType: 'stream' }
        );

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${doc.title}"`);
        return driveRes.data.pipe(res);
      } catch (driveErr) {
        console.warn('Drive file stream failed, checking local uploads fallback:', driveErr);
      }
    }

    // 3. Fallback: search for file in uploads directory by document ID
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (fs.existsSync(uploadsDir)) {
      const filesList = fs.readdirSync(uploadsDir);
      const matchedFile = filesList.find(f => f.includes(`doc-`) && (f.includes(`${doc.id}`) || f.includes(doc.title.replace(/[^a-zA-Z0-9.-]/g, '_'))));
      if (matchedFile) {
        const fallbackPath = path.join(uploadsDir, matchedFile);
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${doc.title}"`);
        return fs.createReadStream(fallbackPath).pipe(res);
      }
    }

    res.status(404).json({ error: 'File content not available.' });
  } catch (error: any) {
    console.error('Error streaming document:', error);
    res.status(500).json({ error: 'Failed to stream file content' });
  }
});

export default router;
