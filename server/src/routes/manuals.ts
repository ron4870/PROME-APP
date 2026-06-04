import { Router, Request, Response } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth';
const pdfParse = require('pdf-parse');

const router = Router();
const prisma = new PrismaClient();

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/manuals');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `manual-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDFs are allowed for manuals'));
    }
  }
});

// GET /api/manuals
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const manuals = await prisma.manual.findMany({
      include: {
        uploadedBy: { select: { name: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(manuals);
  } catch (error) {
    console.error('Fetch Manuals error:', error);
    res.status(500).json({ error: 'Failed to fetch manuals' });
  }
});

// POST /api/manuals
router.post('/', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    // @ts-ignore - set by auth middleware
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, category, documentNumber } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    if (category === 'PROME Manuals') {
      // PROME Manuals -> Convert PDF to native IsoDocument
      
      if (!documentNumber) {
        return res.status(400).json({ error: 'Document Number is required for PROME Manuals' });
      }

      // Read PDF file and extract text
      let extractedText = '';
      try {
        console.log('Reading file for PROME Manuals: ', file.path);
        const dataBuffer = fs.readFileSync(file.path);
        console.log('Parsing PDF...');
        const parsedData = await pdfParse(dataBuffer);
        console.log('PDF parsed successfully.');
        extractedText = parsedData.text;
      } catch (parseError) {
        console.error("PDF Parsing error:", parseError);
        return res.status(500).json({ error: 'Failed to extract text from PDF' });
      }

      // We can optionally delete the temporary PDF file since we have extracted the text
      fs.unlinkSync(file.path);

      // Create IsoDocument
      const newDoc = await prisma.isoDocument.create({
        data: {
          documentNumber,
          title,
          category: 'Manual',
          format: 'native',
          content: extractedText,
          status: 'DRAFT',
          authorId: userId,
        }
      });

      return res.status(201).json({ 
        message: 'PROME Manual successfully parsed and saved as draft.', 
        document: newDoc 
      });

    } else {
      // Other categories -> Save as Manual record (External PDFs)
      const fileUrl = `/uploads/manuals/${file.filename}`;
      
      const newManual = await prisma.manual.create({
        data: {
          title,
          category,
          fileUrl,
          uploadedById: userId,
        }
      });

      return res.status(201).json({
        message: 'External manual uploaded successfully.',
        manual: newManual
      });
    }

  } catch (error) {
    console.error('Upload Manual error:', error);
    res.status(500).json({ error: 'Failed to upload manual' });
  }
});

export default router;
