import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all forms for the current user
router.get('/', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const forms = await prisma.formSubmission.findMany({
      where: { submittedById: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        submittedBy: { select: { id: true, name: true, email: true } }
      }
    });
    res.json(forms);
  } catch (error) {
    console.error('Error fetching forms:', error);
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
});

// Submit a new form
router.post('/', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { formType, data } = req.body;

    if (!formType || !data) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate unique ID based on form type (e.g. "FundsRequisition" -> "FRF")
    let prefix = 'FRM';
    if (formType === 'FundsRequisition') prefix = 'FRF';
    else if (formType === 'LocalPurchaseOrder') prefix = 'LPO';
    // Add other form types here...

    // Find the highest sequence number for this prefix
    const count = await prisma.formSubmission.count({
      where: { uniqueId: { startsWith: `PROME-${prefix}-` } }
    });
    const nextNum = (count + 1).toString().padStart(4, '0');
    const uniqueId = `PROME-${prefix}-${nextNum}`;

    const submission = await prisma.formSubmission.create({
      data: {
        uniqueId,
        formType,
        data,
        submittedById: userId,
        status: 'Submitted'
      },
      include: {
        submittedBy: { select: { id: true, name: true, email: true } }
      }
    });

    res.status(201).json(submission);
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

// Get a specific form by ID or uniqueId
router.get('/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    // Check if it's a uniqueId (starts with PROME-) or a numeric ID
    const isUniqueId = id.startsWith('PROME-');
    
    const form = await prisma.formSubmission.findUnique({
      where: isUniqueId ? { uniqueId: id } : { id: parseInt(id) },
      include: {
        submittedBy: { select: { id: true, name: true, email: true } }
      }
    });
    
    if (!form) return res.status(404).json({ error: 'Form not found' });
    
    res.json(form);
  } catch (error) {
    console.error('Error fetching form details:', error);
    res.status(500).json({ error: 'Failed to fetch form details' });
  }
});

export default router;
