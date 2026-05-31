import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all equipment
router.get('/', authenticateToken, async (req, res) => {
  try {
    const equipmentList = await prisma.equipment.findMany({
      include: {
        owner: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(equipmentList);
  } catch (error) {
    console.error('Failed to fetch equipment:', error);
    res.status(500).json({ message: 'Failed to fetch equipment' });
  }
});

// Register new equipment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, model, serialNumber, location, calibrationRequired, calibrationIntervalMonths, nextCalibrationDate } = req.body;
    
    const year = new Date().getFullYear();
    const count = await prisma.equipment.count({
      where: { equipmentNumber: { startsWith: `PROME-EQP-${year}` } }
    });
    const nextNum = (count + 1).toString().padStart(3, '0');
    const equipmentNumber = `PROME-EQP-${year}-${nextNum}`;

    const equipment = await prisma.equipment.create({
      data: {
        equipmentNumber,
        name,
        model,
        serialNumber,
        location,
        calibrationRequired: calibrationRequired ?? true,
        calibrationIntervalMonths: calibrationIntervalMonths ? parseInt(calibrationIntervalMonths) : null,
        nextCalibrationDate: nextCalibrationDate ? new Date(nextCalibrationDate) : null,
      },
      include: {
        owner: { select: { id: true, name: true } }
      }
    });
    
    res.status(201).json(equipment);
  } catch (error) {
    console.error('Failed to register equipment:', error);
    res.status(500).json({ message: 'Failed to register equipment' });
  }
});

// Get specific equipment details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const equipment = await prisma.equipment.findUnique({
      where: { id: parseInt(id) },
      include: {
        owner: { select: { id: true, name: true } },
        calibrationRecords: {
          orderBy: { calibrationDate: 'desc' }
        }
      }
    });

    if (!equipment) return res.status(404).json({ message: 'Equipment not found' });
    res.json(equipment);
  } catch (error) {
    console.error('Failed to fetch equipment details:', error);
    res.status(500).json({ message: 'Failed to fetch equipment details' });
  }
});

// Update equipment details
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, model, serialNumber, location, status, 
      calibrationRequired, calibrationIntervalMonths, 
      lastCalibrationDate, nextCalibrationDate, ownerId 
    } = req.body;

    const data: any = {
      name, model, serialNumber, location, status,
      calibrationRequired,
      calibrationIntervalMonths: calibrationIntervalMonths ? parseInt(calibrationIntervalMonths) : null,
      ownerId: ownerId ? parseInt(ownerId) : null,
      lastCalibrationDate: lastCalibrationDate ? new Date(lastCalibrationDate) : null,
      nextCalibrationDate: nextCalibrationDate ? new Date(nextCalibrationDate) : null,
    };

    const updated = await prisma.equipment.update({
      where: { id: parseInt(id) },
      data,
      include: {
        owner: { select: { id: true, name: true } },
        calibrationRecords: {
          orderBy: { calibrationDate: 'desc' }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to update equipment:', error);
    res.status(500).json({ message: 'Failed to update equipment' });
  }
});

// Add a calibration record
router.post('/:id/calibrations', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { calibrationDate, performedBy, certificateNumber, result, notes, nextCalibrationDate } = req.body;

    // Create the calibration record
    const record = await prisma.calibrationRecord.create({
      data: {
        equipmentId: parseInt(id),
        calibrationDate: new Date(calibrationDate),
        performedBy,
        certificateNumber,
        result,
        notes
      }
    });

    // Automatically update the equipment's calibration dates
    const equipUpdateData: any = {
      lastCalibrationDate: new Date(calibrationDate)
    };
    
    if (nextCalibrationDate) {
      equipUpdateData.nextCalibrationDate = new Date(nextCalibrationDate);
    } else {
      // Try to calculate next date if interval exists
      const equipment = await prisma.equipment.findUnique({ where: { id: parseInt(id) } });
      if (equipment?.calibrationIntervalMonths) {
        const nextDate = new Date(calibrationDate);
        nextDate.setMonth(nextDate.getMonth() + equipment.calibrationIntervalMonths);
        equipUpdateData.nextCalibrationDate = nextDate;
      }
    }
    
    // Auto-update status if it failed
    if (result === 'Fail') {
      equipUpdateData.status = 'Out of Service';
    } else if (result === 'Pass' || result === 'Adjusted') {
      equipUpdateData.status = 'Active'; // Re-activate if passed
    }

    await prisma.equipment.update({
      where: { id: parseInt(id) },
      data: equipUpdateData
    });

    res.status(201).json(record);
  } catch (error) {
    console.error('Failed to log calibration:', error);
    res.status(500).json({ message: 'Failed to log calibration' });
  }
});

export default router;
