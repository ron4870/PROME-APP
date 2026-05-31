import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all CAPA reports
router.get('/', async (req, res) => {
  try {
    const capas = await prisma.capaReport.findMany({
      include: {
        reportedBy: {
          select: { id: true, name: true, email: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(capas);
  } catch (error) {
    console.error('Error fetching CAPA reports:', error);
    res.status(500).json({ error: 'Failed to fetch CAPA reports' });
  }
});

// Get single CAPA report
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const capa = await prisma.capaReport.findUnique({
      where: { id: parseInt(id) },
      include: {
        reportedBy: {
          select: { id: true, name: true, email: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    if (!capa) {
      return res.status(404).json({ error: 'CAPA report not found' });
    }
    
    res.json(capa);
  } catch (error) {
    console.error('Error fetching CAPA report:', error);
    res.status(500).json({ error: 'Failed to fetch CAPA report' });
  }
});

// Create new CAPA report
router.post('/', async (req, res) => {
  try {
    const { title, type, description, source, severity, reportedById } = req.body;
    
    // Generate Report Number PROME-NCR-YYYY-XXX
    const year = new Date().getFullYear();
    const count = await prisma.capaReport.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
        }
      }
    });
    
    const seq = String(count + 1).padStart(3, '0');
    const reportNumber = `PROME-NCR-${year}-${seq}`;

    const newCapa = await prisma.capaReport.create({
      data: {
        reportNumber,
        title,
        type,
        description,
        source,
        severity,
        reportedById: parseInt(reportedById)
      }
    });
    
    res.status(201).json(newCapa);
  } catch (error) {
    console.error('Error creating CAPA report:', error);
    res.status(500).json({ error: 'Failed to create CAPA report' });
  }
});

// Update CAPA report
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      status, 
      assignedToId, 
      rootCause, 
      correction, 
      correctiveAction, 
      targetCompletionDate, 
      closedDate 
    } = req.body;

    const data: any = {};
    if (status !== undefined) data.status = status;
    if (assignedToId !== undefined) data.assignedToId = assignedToId ? parseInt(assignedToId) : null;
    if (rootCause !== undefined) data.rootCause = rootCause;
    if (correction !== undefined) data.correction = correction;
    if (correctiveAction !== undefined) data.correctiveAction = correctiveAction;
    if (targetCompletionDate !== undefined) data.targetCompletionDate = targetCompletionDate ? new Date(targetCompletionDate) : null;
    if (closedDate !== undefined) data.closedDate = closedDate ? new Date(closedDate) : null;

    const updatedCapa = await prisma.capaReport.update({
      where: { id: parseInt(id) },
      data
    });
    
    res.json(updatedCapa);
  } catch (error) {
    console.error('Error updating CAPA report:', error);
    res.status(500).json({ error: 'Failed to update CAPA report' });
  }
});

export default router;
