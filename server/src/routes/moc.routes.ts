import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all MOC requests
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    const mocs = await prisma.changeRequest.findMany({
      include: {
        requestedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(mocs);
  } catch (error) {
    console.error('Error fetching MOC requests:', error);
    res.status(500).json({ error: 'Failed to fetch MOC requests' });
  }
});

// Get a single MOC request
router.get('/requests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const moc = await prisma.changeRequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      }
    });
    
    if (!moc) return res.status(404).json({ error: 'MOC not found' });
    res.json(moc);
  } catch (error) {
    console.error('Error fetching MOC request:', error);
    res.status(500).json({ error: 'Failed to fetch MOC request' });
  }
});

// Create a new MOC
router.post('/requests', authenticateToken, async (req, res) => {
  try {
    const { title, type, description, reasonForChange, proposedDate, riskAssessment, requestedById } = req.body;
    
    // Generate MOC Number MOC-YYYY-XXX
    const year = new Date().getFullYear();
    const count = await prisma.changeRequest.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
        }
      }
    });
    
    const seq = String(count + 1).padStart(3, '0');
    const mocNumber = `MOC-${year}-${seq}`;

    const newMoc = await prisma.changeRequest.create({
      data: {
        mocNumber,
        title,
        type,
        description,
        reasonForChange,
        proposedDate: proposedDate ? new Date(proposedDate) : null,
        riskAssessment,
        requestedById: requestedById ? parseInt(requestedById) : null,
      }
    });
    
    res.status(201).json(newMoc);
  } catch (error) {
    console.error('Error creating MOC:', error);
    res.status(500).json({ error: 'Failed to submit MOC request' });
  }
});

// Review a MOC
router.post('/requests/:id/review', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewerNotes, status, reviewedById } = req.body;
    
    const moc = await prisma.changeRequest.update({
      where: { id: parseInt(id) },
      data: {
        status,
        reviewerNotes,
        reviewedById: parseInt(reviewedById)
      }
    });
    
    res.status(200).json(moc);
  } catch (error) {
    console.error('Error reviewing MOC:', error);
    res.status(500).json({ error: 'Failed to update MOC review' });
  }
});

// Approve a MOC
router.post('/requests/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { approverNotes, status, approvedById } = req.body;
    
    const moc = await prisma.changeRequest.update({
      where: { id: parseInt(id) },
      data: {
        status,
        approverNotes,
        approvedById: parseInt(approvedById)
      }
    });
    
    res.status(200).json(moc);
  } catch (error) {
    console.error('Error approving MOC:', error);
    res.status(500).json({ error: 'Failed to update MOC approval' });
  }
});

export default router;
