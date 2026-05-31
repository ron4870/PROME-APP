import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all management reviews
router.get('/', authenticateToken, async (req, res) => {
  try {
    const reviews = await prisma.managementReview.findMany({
      include: {
        chairperson: { select: { id: true, name: true } },
        attendees: { select: { id: true, name: true } },
        actionItems: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reviews);
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// Create a new management review
router.post('/', authenticateToken, async (req: any, res) => {
  try {
    const { scheduledDate, title } = req.body;
    
    // Generate MR number
    const year = new Date().getFullYear();
    const count = await prisma.managementReview.count({
      where: { meetingNumber: { startsWith: `PROME-MR-${year}` } }
    });
    const nextNum = (count + 1).toString().padStart(3, '0');
    const meetingNumber = `PROME-MR-${year}-${nextNum}`;

    const review = await prisma.managementReview.create({
      data: {
        meetingNumber,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        chairpersonId: req.user.userId,
        attendees: { connect: [{ id: req.user.userId }] } // Add creator as default attendee
      },
      include: {
        chairperson: { select: { id: true, name: true } },
        attendees: { select: { id: true, name: true } }
      }
    });
    
    res.status(201).json(review);
  } catch (error) {
    console.error('Failed to create review:', error);
    res.status(500).json({ message: 'Failed to create review' });
  }
});

// Get specific review details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const review = await prisma.managementReview.findUnique({
      where: { id: parseInt(id) },
      include: {
        chairperson: { select: { id: true, name: true } },
        attendees: { select: { id: true, name: true } },
        actionItems: {
          include: {
            assignedTo: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.json(review);
  } catch (error) {
    console.error('Failed to fetch review:', error);
    res.status(500).json({ message: 'Failed to fetch review' });
  }
});

// Update a review
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      status, scheduledDate, conductedDate,
      auditResultsSummary, capaSummary, riskSummary, generalNotes, decisions,
      attendeeIds
    } = req.body;

    const data: any = {
      status,
      auditResultsSummary,
      capaSummary,
      riskSummary,
      generalNotes,
      decisions
    };

    if (scheduledDate) data.scheduledDate = new Date(scheduledDate);
    if (conductedDate) data.conductedDate = new Date(conductedDate);
    
    // Update attendees if provided
    if (attendeeIds && Array.isArray(attendeeIds)) {
      data.attendees = {
        set: attendeeIds.map((userId: number) => ({ id: userId }))
      };
    }

    const updated = await prisma.managementReview.update({
      where: { id: parseInt(id) },
      data,
      include: {
        chairperson: { select: { id: true, name: true } },
        attendees: { select: { id: true, name: true } },
        actionItems: {
          include: { assignedTo: { select: { id: true, name: true } } }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to update review:', error);
    res.status(500).json({ message: 'Failed to update review' });
  }
});

// Add an action item
router.post('/:id/actions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, assignedToId, dueDate } = req.body;

    const action = await prisma.reviewActionItem.create({
      data: {
        reviewId: parseInt(id),
        description,
        assignedToId: assignedToId ? parseInt(assignedToId) : null,
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: {
        assignedTo: { select: { id: true, name: true } }
      }
    });

    res.status(201).json(action);
  } catch (error) {
    console.error('Failed to add action item:', error);
    res.status(500).json({ message: 'Failed to add action item' });
  }
});

// Update action item
router.put('/:id/actions/:actionId', authenticateToken, async (req, res) => {
  try {
    const { actionId } = req.params;
    const { status, description, assignedToId, dueDate } = req.body;

    const action = await prisma.reviewActionItem.update({
      where: { id: parseInt(actionId) },
      data: {
        status,
        description,
        assignedToId: assignedToId ? parseInt(assignedToId) : null,
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: {
        assignedTo: { select: { id: true, name: true } }
      }
    });

    res.json(action);
  } catch (error) {
    console.error('Failed to update action item:', error);
    res.status(500).json({ message: 'Failed to update action item' });
  }
});

// Delete action item
router.delete('/:id/actions/:actionId', authenticateToken, async (req, res) => {
  try {
    const { actionId } = req.params;
    await prisma.reviewActionItem.delete({
      where: { id: parseInt(actionId) }
    });
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete action item:', error);
    res.status(500).json({ message: 'Failed to delete action item' });
  }
});

export default router;
