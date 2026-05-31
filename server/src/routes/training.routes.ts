import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all trainings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const trainings = await prisma.trainingRecord.findMany({
      include: {
        internalTrainer: { select: { id: true, name: true } },
        _count: {
          select: { attendees: true }
        }
      },
      orderBy: { scheduledDate: 'asc' }
    });
    res.json(trainings);
  } catch (error) {
    console.error('Failed to fetch trainings:', error);
    res.status(500).json({ message: 'Failed to fetch trainings' });
  }
});

// Create a new training record
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, trainerName, internalTrainerId, scheduledDate } = req.body;
    
    const year = new Date().getFullYear();
    const count = await prisma.trainingRecord.count({
      where: { trainingNumber: { startsWith: `PROME-TRN-${year}` } }
    });
    const nextNum = (count + 1).toString().padStart(3, '0');
    const trainingNumber = `PROME-TRN-${year}-${nextNum}`;

    const data: any = {
      trainingNumber,
      title,
      description,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
    };

    if (internalTrainerId) {
      data.internalTrainerId = parseInt(internalTrainerId);
    } else if (trainerName) {
      data.trainerName = trainerName;
    }

    const training = await prisma.trainingRecord.create({
      data,
      include: {
        internalTrainer: { select: { id: true, name: true } },
        _count: { select: { attendees: true } }
      }
    });
    
    res.status(201).json(training);
  } catch (error) {
    console.error('Failed to create training:', error);
    res.status(500).json({ message: 'Failed to create training' });
  }
});

// Get specific training details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const training = await prisma.trainingRecord.findUnique({
      where: { id: parseInt(id) },
      include: {
        internalTrainer: { select: { id: true, name: true } },
        attendees: {
          include: {
            attendee: { select: { id: true, name: true, /* department: true */ } },
            evaluator: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!training) return res.status(404).json({ message: 'Training not found' });
    res.json(training);
  } catch (error) {
    console.error('Failed to fetch training:', error);
    res.status(500).json({ message: 'Failed to fetch training' });
  }
});

// Update training details
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, trainerName, internalTrainerId, scheduledDate, completedDate, status } = req.body;

    const data: any = {
      title, description, status,
      trainerName: trainerName || null,
      internalTrainerId: internalTrainerId ? parseInt(internalTrainerId) : null,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      completedDate: completedDate ? new Date(completedDate) : null,
    };

    const updated = await prisma.trainingRecord.update({
      where: { id: parseInt(id) },
      data,
      include: {
        internalTrainer: { select: { id: true, name: true } },
        attendees: {
          include: {
            attendee: { select: { id: true, name: true, /* department: true */ } },
            evaluator: { select: { id: true, name: true } }
          }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to update training:', error);
    res.status(500).json({ message: 'Failed to update training' });
  }
});

// Add an attendee
router.post('/:id/attendees', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { attendeeId } = req.body;

    const attendance = await prisma.trainingAttendance.create({
      data: {
        trainingId: parseInt(id),
        attendeeId: parseInt(attendeeId),
        status: 'Registered',
        competenceEval: 'Pending'
      },
      include: {
        attendee: { select: { id: true, name: true, /* department: true */ } }
      }
    });

    res.status(201).json(attendance);
  } catch (error) {
    // Check if it's a unique constraint violation (already added)
    if ((error as any).code === 'P2002') {
      return res.status(400).json({ message: 'User is already registered for this training' });
    }
    console.error('Failed to add attendee:', error);
    res.status(500).json({ message: 'Failed to add attendee' });
  }
});

// Update attendance and competence evaluation
router.put('/:id/attendees/:attendeeId', authenticateToken, async (req: any, res) => {
  try {
    const { attendeeId } = req.params;
    const { status, competenceEval, evaluationNotes } = req.body;

    const data: any = { status };
    
    if (competenceEval) {
      data.competenceEval = competenceEval;
      data.evaluatorId = req.user.userId; // Automatically set the person evaluating
    }
    if (evaluationNotes !== undefined) data.evaluationNotes = evaluationNotes;

    const updated = await prisma.trainingAttendance.update({
      where: { id: parseInt(attendeeId) },
      data,
      include: {
        attendee: { select: { id: true, name: true, /* department: true */ } },
        evaluator: { select: { id: true, name: true } }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to update attendance:', error);
    res.status(500).json({ message: 'Failed to update attendance' });
  }
});

// Remove an attendee
router.delete('/:id/attendees/:attendeeId', authenticateToken, async (req, res) => {
  try {
    const { attendeeId } = req.params;
    await prisma.trainingAttendance.delete({
      where: { id: parseInt(attendeeId) }
    });
    res.status(204).send();
  } catch (error) {
    console.error('Failed to remove attendee:', error);
    res.status(500).json({ message: 'Failed to remove attendee' });
  }
});

export default router;
