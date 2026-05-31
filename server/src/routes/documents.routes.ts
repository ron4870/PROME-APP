import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all documents
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
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, type, ownerId } = req.body;
    
    // Auto-generate document number based on type
    const year = new Date().getFullYear();
    const typePrefix = type === 'SOP' ? 'SOP' : 
                       type === 'Policy' ? 'POL' : 
                       type === 'Manual' ? 'MAN' : 
                       type === 'Form' ? 'FRM' : 'WI';
                       
    const count = await prisma.masterDocument.count({
      where: { documentNumber: { startsWith: `PROME-${typePrefix}-${year}` } }
    });
    
    const nextNum = (count + 1).toString().padStart(3, '0');
    const documentNumber = `PROME-${typePrefix}-${year}-${nextNum}`;

    const data: any = {
      documentNumber,
      title,
      type,
      status: 'Draft',
      revision: '1.0'
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
      issueDate, nextReviewDate, ownerId, 
      approvedById, fileUrl, changeHistory 
    } = req.body;

    const data: any = {
      title, type, revision, status, fileUrl, changeHistory
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
