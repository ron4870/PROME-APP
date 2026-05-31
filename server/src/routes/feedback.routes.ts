import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all feedback
router.get('/', authenticateToken, async (req, res) => {
  try {
    const feedback = await prisma.customerFeedback.findMany({
      include: {
        assignedTo: { select: { id: true, name: true } },
        linkedCapa: { select: { id: true,  status: true } }
      },
      orderBy: { dateReceived: 'desc' }
    });
    res.json(feedback);
  } catch (error) {
    console.error('Failed to fetch feedback:', error);
    res.status(500).json({ message: 'Failed to fetch feedback' });
  }
});

// Create new feedback
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { customerName, projectName, type, description, rating, dateReceived, assignedToId } = req.body;
    
    const year = new Date().getFullYear();
    const count = await prisma.customerFeedback.count({
      where: { feedbackNumber: { startsWith: `PROME-FB-${year}` } }
    });
    const nextNum = (count + 1).toString().padStart(3, '0');
    const feedbackNumber = `PROME-FB-${year}-${nextNum}`;

    const data: any = {
      feedbackNumber,
      customerName,
      projectName,
      type,
      description,
      dateReceived: dateReceived ? new Date(dateReceived) : new Date(),
    };

    if (rating && type === 'Survey') {
      data.rating = parseInt(rating);
    }
    
    if (assignedToId) {
      data.assignedToId = parseInt(assignedToId);
    }

    const feedback = await prisma.customerFeedback.create({
      data,
      include: {
        assignedTo: { select: { id: true, name: true } }
      }
    });
    
    res.status(201).json(feedback);
  } catch (error) {
    console.error('Failed to create feedback:', error);
    res.status(500).json({ message: 'Failed to create feedback' });
  }
});

// Get specific feedback details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const feedback = await prisma.customerFeedback.findUnique({
      where: { id: parseInt(id) },
      include: {
        assignedTo: { select: { id: true, name: true } },
        linkedCapa: { select: { id: true,  status: true } }
      }
    });

    if (!feedback) return res.status(404).json({ message: 'Feedback not found' });
    res.json(feedback);
  } catch (error) {
    console.error('Failed to fetch feedback details:', error);
    res.status(500).json({ message: 'Failed to fetch feedback details' });
  }
});

// Update feedback details
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      customerName, projectName, type, description, rating, 
      status, resolutionNotes, assignedToId, linkedCapaId 
    } = req.body;

    const data: any = {
      customerName, projectName, type, description, status, resolutionNotes
    };

    if (rating && type === 'Survey') {
      data.rating = parseInt(rating);
    } else if (type !== 'Survey') {
      data.rating = null;
    }

    if (assignedToId) data.assignedToId = parseInt(assignedToId);
    else data.assignedToId = null;

    if (linkedCapaId) data.linkedCapaId = parseInt(linkedCapaId);
    else data.linkedCapaId = null;

    const updated = await prisma.customerFeedback.update({
      where: { id: parseInt(id) },
      data,
      include: {
        assignedTo: { select: { id: true, name: true } },
        linkedCapa: { select: { id: true,  status: true } }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to update feedback:', error);
    res.status(500).json({ message: 'Failed to update feedback' });
  }
});

export default router;
