import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';
import { google } from 'googleapis';
import path from 'path';
import { Readable } from 'stream';

const router = express.Router();
const prisma = new PrismaClient();

const uploadDir = path.join(__dirname, '../../uploads');
import fs from 'fs';

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }
});
router.get('/', authenticateToken, async (req, res) => {
  try {
    const documents = await prisma.masterDocument.findMany({
      include: {
        owner: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } }
      },
      orderBy: { documentNumber: 'asc' }
    });
    res.json(documents);
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// Create new document
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { title, type, category, division, retentionPeriod, documentNumber, ownerId } = req.body;
    
    // Auto-generate document number if not provided
    let finalDocNumber = documentNumber;
    if (!finalDocNumber) {
      const year = new Date().getFullYear();
      const typePrefix = type === 'SOP' ? 'SOP' : 
                         type === 'Policy' ? 'POL' : 
                         type === 'Manual' ? 'MAN' : 
                         type === 'Form' ? 'FRM' : 'WI';
                         
      const count = await prisma.masterDocument.count({
        where: { documentNumber: { startsWith: `PROME-${typePrefix}-${year}` } }
      });
      
      const nextNum = (count + 1).toString().padStart(3, '0');
      finalDocNumber = `PROME-${typePrefix}-${year}-${nextNum}`;
    }

    let fileUrl = null;
    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
    }

    const data: any = {
      documentNumber: finalDocNumber,
      title,
      type,
      category,
      division,
      retentionPeriod,
      status: 'Draft',
      revision: '1.0',
      fileUrl
    };

    if (ownerId) data.ownerId = parseInt(ownerId);

    const doc = await prisma.masterDocument.create({
      data,
      include: {
        owner: { select: { id: true, name: true } }
      }
    });
    
    res.status(201).json(doc);
  } catch (error) {
    console.error('Failed to create document:', error);
    res.status(500).json({ message: 'Failed to create document' });
  }
});

// Get specific document details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const document = await prisma.masterDocument.findUnique({
      where: { id: parseInt(id) },
      include: {
        owner: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } }
      }
    });

    if (!document) return res.status(404).json({ message: 'Document not found' });
    res.json(document);
  } catch (error) {
    console.error('Failed to fetch document details:', error);
    res.status(500).json({ message: 'Failed to fetch document details' });
  }
});

// Update document metadata
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, type, revision, status, 
      category, division, retentionPeriod,
      issueDate, nextReviewDate, ownerId, 
      approvedById, fileUrl, changeHistory 
    } = req.body;

    const data: any = {
      title, type, revision, status, 
      category, division, retentionPeriod,
      fileUrl, changeHistory
    };

    if (issueDate) data.issueDate = new Date(issueDate);
    else data.issueDate = null;
    
    if (nextReviewDate) data.nextReviewDate = new Date(nextReviewDate);
    else data.nextReviewDate = null;

    if (ownerId) data.ownerId = parseInt(ownerId);
    else data.ownerId = null;

    if (approvedById) data.approvedById = parseInt(approvedById);
    else data.approvedById = null;

    const updated = await prisma.masterDocument.update({
      where: { id: parseInt(id) },
      data,
      include: {
        owner: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to update document:', error);
    res.status(500).json({ message: 'Failed to update document' });
  }
});

export default router;
