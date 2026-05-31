import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all suppliers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { nextEvaluationDate: 'asc' }
    });
    res.json(suppliers);
  } catch (error) {
    console.error('Failed to fetch suppliers:', error);
    res.status(500).json({ message: 'Failed to fetch suppliers' });
  }
});

// Create new supplier
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, contactName, email, phone, category, status } = req.body;
    
    const year = new Date().getFullYear();
    const count = await prisma.supplier.count({
      where: { supplierNumber: { startsWith: `PROME-SUP-${year}` } }
    });
    const nextNum = (count + 1).toString().padStart(3, '0');
    const supplierNumber = `PROME-SUP-${year}-${nextNum}`;

    const supplier = await prisma.supplier.create({
      data: {
        supplierNumber,
        name,
        contactName,
        email,
        phone,
        category,
        status: status || 'Approved',
        approvalDate: new Date(),
        nextEvaluationDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) // default 1 year
      }
    });
    
    res.status(201).json(supplier);
  } catch (error) {
    console.error('Failed to register supplier:', error);
    res.status(500).json({ message: 'Failed to register supplier' });
  }
});

// Get specific supplier details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await prisma.supplier.findUnique({
      where: { id: parseInt(id) },
      include: {
        evaluations: {
          include: {
            evaluator: { select: { id: true, name: true } }
          },
          orderBy: { evaluationDate: 'desc' }
        }
      }
    });

    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json(supplier);
  } catch (error) {
    console.error('Failed to fetch supplier details:', error);
    res.status(500).json({ message: 'Failed to fetch supplier details' });
  }
});

// Update supplier details
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, contactName, email, phone, category, 
      status, approvalDate, nextEvaluationDate, notes 
    } = req.body;

    const updated = await prisma.supplier.update({
      where: { id: parseInt(id) },
      data: {
        name, contactName, email, phone, category, status, notes,
        approvalDate: approvalDate ? new Date(approvalDate) : null,
        nextEvaluationDate: nextEvaluationDate ? new Date(nextEvaluationDate) : null
      },
      include: {
        evaluations: {
          include: { evaluator: { select: { id: true, name: true } } },
          orderBy: { evaluationDate: 'desc' }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to update supplier:', error);
    res.status(500).json({ message: 'Failed to update supplier' });
  }
});

// Add a supplier evaluation
router.post('/:id/evaluations', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { 
      evaluationDate, qualityScore, deliveryScore, 
      responsivenessScore, comments, resultStatus 
    } = req.body;

    const q = parseInt(qualityScore);
    const d = parseInt(deliveryScore);
    const r = parseInt(responsivenessScore);
    const overallScore = ((q + d + r) / 3).toFixed(2);

    // Create the evaluation record
    const record = await prisma.supplierEvaluation.create({
      data: {
        supplierId: parseInt(id),
        evaluationDate: new Date(evaluationDate),
        evaluatorId: req.user.userId,
        qualityScore: q,
        deliveryScore: d,
        responsivenessScore: r,
        overallScore: parseFloat(overallScore),
        comments,
        resultStatus
      }
    });

    // Update parent supplier status and next evaluation date
    const nextDate = new Date(evaluationDate);
    nextDate.setFullYear(nextDate.getFullYear() + 1); // Default to +1 year

    await prisma.supplier.update({
      where: { id: parseInt(id) },
      data: {
        status: resultStatus,
        nextEvaluationDate: nextDate
      }
    });

    res.status(201).json(record);
  } catch (error) {
    console.error('Failed to log evaluation:', error);
    res.status(500).json({ message: 'Failed to log evaluation' });
  }
});

export default router;
