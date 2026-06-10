import express from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import { driveService, GOOGLE_DRIVE_FOLDER_ID } from '../services/drive.service';
import { Readable } from 'stream';

const router = express.Router();
const prisma = new PrismaClient();

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDFs are allowed'));
    }
  }
});
// For now, let's assume there is an upload route or we just store metadata if fileUrl is provided.
// I will implement basic CRUD

// Get all library items
router.get('/', async (req, res) => {
  try {
    const { category, discipline, search } = req.query;

    const filters: any = {};
    if (category) filters.category = String(category);
    if (discipline) filters.discipline = String(discipline);
    if (search) {
      filters.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
        { tags: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const items = await prisma.libraryItem.findMany({
      where: filters,
      include: {
        uploader: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(items);
  } catch (error) {
    console.error('Error fetching library items:', error);
    res.status(500).json({ error: 'Failed to fetch library items' });
  }
});

router.post('/', authenticateToken, upload.single('file'), async (req: any, res: any) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, description, category, discipline, version, tags } = req.body;
    let fileUrl = req.body.fileUrl;
    
    if (req.file) {
      try {
        console.log(`Uploading ${req.file.originalname} to Google Drive...`);
        const fileMetadata = {
          name: `Library_${Date.now()}_${req.file.originalname}`,
          parents: [GOOGLE_DRIVE_FOLDER_ID]
        };
        const media = {
          mimeType: req.file.mimetype,
          body: Readable.from(req.file.buffer)
        };

        const driveFile = await driveService.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: 'id, webViewLink',
          supportsAllDrives: true
        });

        const fileId = driveFile.data.id;
        
        if (fileId) {
          // Make the file publicly accessible so users can view it
          await driveService.permissions.create({
            fileId: fileId,
            requestBody: {
              role: 'reader',
              type: 'anyone',
            },
            supportsAllDrives: true
          });
          fileUrl = driveFile.data.webViewLink;
        }
      } catch (driveError) {
        console.error('Error uploading to Google Drive:', driveError);
        return res.status(500).json({ error: 'Failed to upload document to Google Drive' });
      }
    }

    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category are required' });
    }

    const newItem = await prisma.libraryItem.create({
      data: {
        title,
        description,
        category,
        discipline,
        version: version || "1.0",
        tags,
        fileUrl,
        uploaderId: userId,
      },
      include: {
        uploader: { select: { name: true } }
      }
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating library item:', error);
    res.status(500).json({ error: 'Failed to create library item' });
  }
});

// Delete library item
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    // Check if it exists
    const item = await prisma.libraryItem.findUnique({ where: { id: parseInt(id) } });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Optionally check permissions (only admin or uploader can delete)
    // req.user logic here

    await prisma.libraryItem.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting library item:', error);
    res.status(500).json({ error: 'Failed to delete library item' });
  }
});

export default router;
