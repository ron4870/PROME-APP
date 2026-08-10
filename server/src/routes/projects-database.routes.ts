import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken as authenticate } from '../middleware/auth';
import { upload, driveService, GOOGLE_DRIVE_FOLDER_ID, getOrCreateDatabaseProjectFolder } from '../services/drive.service';
import { Readable } from 'stream';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import { XMLParser } from 'fast-xml-parser';
import proj4 from 'proj4';

const router = Router();
const prisma = new PrismaClient();

// CRS definitions for coordinate transformation
proj4.defs('EPSG:32635', '+proj=utm +zone=35 +datum=WGS84 +units=m +no_defs');
proj4.defs('EPSG:32636', '+proj=utm +zone=36 +datum=WGS84 +units=m +no_defs');
proj4.defs('EPSG:32637', '+proj=utm +zone=37 +datum=WGS84 +units=m +no_defs');
proj4.defs('EPSG:32736', '+proj=utm +zone=36 +south +datum=WGS84 +units=m +no_defs');
proj4.defs('EPSG:21096', '+proj=tmerc +lat_0=0 +lon_0=33 +k=0.9998 +x_0=500000 +y_0=0 +a=6378249.145 +rf=293.465 +towgs84=-160,-6,-302 +units=m +no_defs');

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
            let filesList: string[] = [];
            try {
              filesList = fs.readdirSync(dir);
            } catch (e) {
              return null;
            }

            // First pass: look for exact tileset.json (case insensitive)
            for (const f of filesList) {
              const fullPath = path.join(dir, f);
              try {
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                  const found = findTileset(fullPath);
                  if (found) return found;
                } else if (f.toLowerCase() === 'tileset.json') {
                  return path.relative(destPath, fullPath);
                }
              } catch (e) {}
            }

            // Second pass: look for any .json file inside the extracted zip
            for (const f of filesList) {
              const fullPath = path.join(dir, f);
              try {
                const stat = fs.statSync(fullPath);
                if (!stat.isDirectory() && f.toLowerCase().endsWith('.json')) {
                  return path.relative(destPath, fullPath);
                }
              } catch (e) {}
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
            // Clean up temporary tiles folder and fall back to standard document upload
            fs.rmSync(destPath, { recursive: true, force: true });
          }
        } catch (zipErr) {
          console.warn('Zip extraction attempt finished without 3d tiles json, falling back to document upload:', zipErr);
          fs.rmSync(destPath, { recursive: true, force: true });
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

// Parse LandXML surface file and return TIN vertices + faces in WGS84
router.post('/documents/:docId/parse-surface', authenticate, async (req: any, res: any) => {
  try {
    const docId = parseInt(req.params.docId);
    const doc = await prisma.databaseProjectDocument.findUnique({
      where: { id: docId }
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // 1. Resolve the file content (local or Google Drive)
    let fileBuffer: Buffer | null = null;

    let urlInfo: any = {};
    try { urlInfo = JSON.parse(doc.fileUrl || '{}'); } catch(e) {}
    const viewOrDownload = urlInfo.view || urlInfo.download || doc.fileUrl || '';

    // Try local file first
    if (viewOrDownload && viewOrDownload.includes('/uploads/')) {
      const localRelativePath = viewOrDownload.substring(viewOrDownload.indexOf('/uploads/'));
      const localFilePath = path.join(__dirname, '../..', localRelativePath);
      if (fs.existsSync(localFilePath)) {
        fileBuffer = fs.readFileSync(localFilePath);
      }
    }

    // Try Google Drive
    if (!fileBuffer) {
      const driveFileId = urlInfo.id;
      if (driveFileId && typeof driveFileId === 'string' && !driveFileId.startsWith('local-')) {
        try {
          const driveRes = await driveService.files.get(
            { fileId: driveFileId, alt: 'media' },
            { responseType: 'arraybuffer' }
          );
          fileBuffer = Buffer.from(driveRes.data as ArrayBuffer);
        } catch (driveErr) {
          console.warn('Drive file fetch failed for surface parsing:', driveErr);
        }
      }
    }

    // Fallback: search uploads directory
    if (!fileBuffer) {
      const uploadsDir = path.join(__dirname, '../../uploads');
      if (fs.existsSync(uploadsDir)) {
        const matchingFiles = fs.readdirSync(uploadsDir).filter(f => f.includes(doc.title.replace(/[^a-zA-Z0-9.-]/g, '_')));
        if (matchingFiles.length > 0) {
          fileBuffer = fs.readFileSync(path.join(uploadsDir, matchingFiles[0]));
        }
      }
    }

    if (!fileBuffer) {
      return res.status(404).json({ error: 'Surface file content not available' });
    }

    // 2. Parse the XML
    const xmlText = fileBuffer.toString('utf-8');
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
    });
    const parsed = parser.parse(xmlText);

    // 3. Navigate to Surface > Definition > Pnts and Faces
    // LandXML structure: <LandXML> <Surfaces> <Surface> <Definition> <Pnts> <P id="1">N E Z</P> ... </Pnts> <Faces> <F>1 2 3</F> ... </Faces>
    const landxml = parsed.LandXML || parsed.landxml || parsed;
    const surfaces = landxml.Surfaces || landxml.surfaces;
    if (!surfaces) {
      return res.status(400).json({ error: 'No <Surfaces> element found in LandXML file' });
    }

    const surface = surfaces.Surface || surfaces.surface;
    if (!surface) {
      return res.status(400).json({ error: 'No <Surface> element found' });
    }

    // Handle single surface or array of surfaces (take the first one)
    const surfaceObj = Array.isArray(surface) ? surface[0] : surface;
    const definition = surfaceObj.Definition || surfaceObj.definition;
    if (!definition) {
      return res.status(400).json({ error: 'No <Definition> element found in Surface' });
    }

    const pntsContainer = definition.Pnts || definition.pnts;
    const facesContainer = definition.Faces || definition.faces;
    if (!pntsContainer || !facesContainer) {
      return res.status(400).json({ error: 'Surface is missing <Pnts> or <Faces> data' });
    }

    // 4. Parse points: <P id="1">northing easting elevation</P>
    let rawPoints = pntsContainer.P || pntsContainer.p || [];
    if (!Array.isArray(rawPoints)) rawPoints = [rawPoints];

    // Determine CRS from metadata or default to EPSG:32636 (UTM 36N - Uganda)
    const metadata = urlInfo.metadata || {};
    const crs = metadata.crs || 'EPSG:32636';
    const anchorLat = metadata.anchor?.lat;
    const anchorLon = metadata.anchor?.lon;

    // Build vertex map: pointId -> [lat, lon, elevation]
    const vertexMap: Record<string, [number, number, number]> = {};
    const vertices: [number, number, number][] = [];
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    let minElev = Infinity, maxElev = -Infinity;

    for (const p of rawPoints) {
      const text = typeof p === 'string' ? p : (p['#text'] || '');
      const id = typeof p === 'string' ? '' : (p['@_id'] || '');
      const parts = text.toString().trim().split(/\s+/);
      if (parts.length < 3) continue;

      const northing = parseFloat(parts[0]);
      const easting = parseFloat(parts[1]);
      const elevation = parseFloat(parts[2]);

      let lat: number, lon: number;

      if (crs === 'EPSG:4326') {
        // Already in WGS84: northing=lat, easting=lon
        lat = northing;
        lon = easting;
      } else if (crs === 'local' || crs === 'LOCAL') {
        // Local coordinates: use anchor point + offset in meters
        // Approximate conversion: 1 degree lat ≈ 111320m, 1 degree lon ≈ 111320*cos(lat)m
        const refLat = anchorLat || 0.3134;
        const refLon = anchorLon || 32.5802;
        lat = refLat + northing / 111320;
        lon = refLon + easting / (111320 * Math.cos(refLat * Math.PI / 180));
      } else {
        // Use proj4 to transform from project CRS to WGS84
        try {
          const [lonOut, latOut] = proj4(crs, 'EPSG:4326', [easting, northing]);
          lat = latOut;
          lon = lonOut;
        } catch (projErr) {
          // Fallback to anchor-based local offset
          const refLat = anchorLat || 0.3134;
          const refLon = anchorLon || 32.5802;
          lat = refLat + northing / 111320;
          lon = refLon + easting / (111320 * Math.cos(refLat * Math.PI / 180));
        }
      }

      vertexMap[id || vertices.length.toString()] = [lat, lon, elevation];
      vertices.push([lat, lon, elevation]);

      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (elevation < minElev) minElev = elevation;
      if (elevation > maxElev) maxElev = elevation;
    }

    // 5. Parse faces: <F>p1 p2 p3</F>
    let rawFaces = facesContainer.F || facesContainer.f || [];
    if (!Array.isArray(rawFaces)) rawFaces = [rawFaces];

    const triangles: [number, number, number][] = [];
    // Build id-to-index lookup for vertex references
    const idToIndex: Record<string, number> = {};
    let idx = 0;
    for (const p of rawPoints) {
      const id = typeof p === 'string' ? idx.toString() : (p['@_id'] || idx.toString());
      idToIndex[id] = idx;
      idx++;
    }

    for (const f of rawFaces) {
      const text = typeof f === 'string' ? f : (f['#text'] || f || '');
      const parts = text.toString().trim().split(/\s+/);
      if (parts.length < 3) continue;

      const i1 = idToIndex[parts[0]];
      const i2 = idToIndex[parts[1]];
      const i3 = idToIndex[parts[2]];

      if (i1 !== undefined && i2 !== undefined && i3 !== undefined) {
        triangles.push([i1, i2, i3]);
      }
    }

    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;

    res.json({
      vertices,
      triangles,
      bounds: { west: minLon, east: maxLon, south: minLat, north: maxLat },
      center: { lat: centerLat, lon: centerLon },
      stats: {
        vertexCount: vertices.length,
        triangleCount: triangles.length,
        minElev,
        maxElev,
        crs
      }
    });
  } catch (error: any) {
    console.error('Error parsing surface file:', error);
    res.status(500).json({ error: `Failed to parse surface: ${error.message}` });
  }
});

export default router;
