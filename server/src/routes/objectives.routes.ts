import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all objectives
router.get('/', authenticateToken, async (req, res) => {
  try {
    const objectives = await prisma.qualityObjective.findMany({
      include: {
        owner: { select: { id: true, name: true } },
        measurements: {
          orderBy: { measuredDate: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(objectives);
  } catch (error) {
    console.error('Failed to fetch objectives:', error);
    res.status(500).json({ message: 'Failed to fetch objectives' });
  }
});

// Create a new objective
router.post('/', authenticateToken, async (req: any, res) => {
  try {
    const { title, description, division, targetValue, unit, targetDate } = req.body;
    
    const year = new Date().getFullYear();
    const count = await prisma.qualityObjective.count({
      where: { objectiveNumber: { startsWith: `PROME-OBJ-${year}` } }
    });
    const nextNum = (count + 1).toString().padStart(3, '0');
    const objectiveNumber = `PROME-OBJ-${year}-${nextNum}`;

    const objective = await prisma.qualityObjective.create({
      data: {
        objectiveNumber,
        title,
        description,
        division,
        ownerId: req.user.userId,
        targetValue: parseFloat(targetValue) || 100,
        currentValue: 0,
        unit: unit || '%',
        targetDate: targetDate ? new Date(targetDate) : null,
      },
      include: {
        owner: { select: { id: true, name: true } }
      }
    });
    
    res.status(201).json(objective);
  } catch (error) {
    console.error('Failed to create objective:', error);
    res.status(500).json({ message: 'Failed to create objective' });
  }
});

// Get specific objective
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const objective = await prisma.qualityObjective.findUnique({
      where: { id: parseInt(id) },
      include: {
        owner: { select: { id: true, name: true } },
        measurements: {
          include: {
            measuredBy: { select: { id: true, name: true } }
          },
          orderBy: { measuredDate: 'desc' }
        }
      }
    });

    if (!objective) return res.status(404).json({ message: 'Objective not found' });
    res.json(objective);
  } catch (error) {
    console.error('Failed to fetch objective:', error);
    res.status(500).json({ message: 'Failed to fetch objective' });
  }
});

// Update an objective
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, division, ownerId, targetValue, currentValue, unit, targetDate, status } = req.body;

    const data: any = {
      title, description, division, unit, status,
      targetValue: targetValue !== undefined ? parseFloat(targetValue) : undefined,
      currentValue: currentValue !== undefined ? parseFloat(currentValue) : undefined,
    };

    if (ownerId) data.ownerId = parseInt(ownerId);
    if (targetDate !== undefined) data.targetDate = targetDate ? new Date(targetDate) : null;

    const updated = await prisma.qualityObjective.update({
      where: { id: parseInt(id) },
      data,
      include: {
        owner: { select: { id: true, name: true } },
        measurements: {
          include: { measuredBy: { select: { id: true, name: true } } },
          orderBy: { measuredDate: 'desc' }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to update objective:', error);
    res.status(500).json({ message: 'Failed to update objective' });
  }
});

// Add a measurement
router.post('/:id/measurements', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { measuredDate, value, notes } = req.body;
    const numericValue = parseFloat(value);

    const measurement = await prisma.kpiMeasurement.create({
      data: {
        objectiveId: parseInt(id),
        measuredDate: new Date(measuredDate),
        value: numericValue,
        notes,
        measuredById: req.user.userId
      },
      include: {
        measuredBy: { select: { id: true, name: true } }
      }
    });

    // Automatically update the objective's currentValue
    // Determine the latest value based on measuredDate
    const latestMeasurement = await prisma.kpiMeasurement.findFirst({
      where: { objectiveId: parseInt(id) },
      orderBy: { measuredDate: 'desc' }
    });

    if (latestMeasurement) {
      await prisma.qualityObjective.update({
        where: { id: parseInt(id) },
        data: { currentValue: latestMeasurement.value }
      });
    }

    res.status(201).json(measurement);
  } catch (error) {
    console.error('Failed to add measurement:', error);
    res.status(500).json({ message: 'Failed to add measurement' });
  }
});

export default router;
