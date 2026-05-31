import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all NCRs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const ncrs = await prisma.nonConformityReport.findMany({
      include: {
        reportedBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(ncrs);
  } catch (error) {
    console.error('Error fetching NCRs:', error);
    res.status(500).json({ error: 'Failed to fetch NCRs' });
  }
});

// Get a single NCR
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const ncr = await prisma.nonConformityReport.findUnique({
      where: { id: parseInt(id) },
      include: {
        reportedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        linkedCapa: { select: { id: true, reportNumber: true, status: true } }
      }
    });
    
    if (!ncr) return res.status(404).json({ error: 'NCR not found' });
    res.json(ncr);
  } catch (error) {
    console.error('Error fetching NCR:', error);
    res.status(500).json({ error: 'Failed to fetch NCR' });
  }
});

// Create a new NCR
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, productOrService, quantityScope, description, source, severity, estimatedCost, reportedById } = req.body;
    
    // Generate NCR Number NCR-YYYY-XXX
    const year = new Date().getFullYear();
    const count = await prisma.nonConformityReport.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
        }
      }
    });
    
    const seq = String(count + 1).padStart(3, '0');
    const ncrNumber = `NCR-${year}-${seq}`;

    const newNcr = await prisma.nonConformityReport.create({
      data: {
        ncrNumber,
        title,
        productOrService,
        quantityScope,
        description,
        source,
        severity,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
        reportedById: reportedById ? parseInt(reportedById) : (req as any).user.id,
      }
    });
    
    res.status(201).json(newNcr);
  } catch (error) {
    console.error('Error creating NCR:', error);
    res.status(500).json({ error: 'Failed to record NCR' });
  }
});

// Disposition NCR
router.post('/:id/disposition', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { disposition, status, raiseCapa, assignedToId } = req.body;
    
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update the NCR
      const ncr = await tx.nonConformityReport.update({
        where: { id: parseInt(id) },
        data: {
          disposition,
          status,
          assignedToId: assignedToId ? parseInt(assignedToId) : null
        }
      });

      // 2. Optionally raise a CAPA if requested
      let capa = null;
      if (raiseCapa) {
        const year = new Date().getFullYear();
        const count = await tx.capaReport.count({
          where: {
            createdAt: {
              gte: new Date(`${year}-01-01T00:00:00.000Z`),
              lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
            }
          }
        });
        const seq = String(count + 1).padStart(3, '0');
        const reportNumber = `PROME-NCR-${year}-${seq}`; // Wait, the existing CAPA system uses PROME-NCR for Corrective Action prefixes, so this is correct. NCR actually means Non-Conformance Report, but here we use it for both.

        capa = await tx.capaReport.create({
          data: {
            reportNumber,
            title: `Systemic Fix for Product/Service NCR: ${ncr.ncrNumber}`,
            type: 'Non-Conformance',
            description: `This CAPA was raised from a Product/Service Non-Conformity.\n\nNCR: ${ncr.title}\nProduct/Service: ${ncr.productOrService}\nDisposition: ${disposition}`,
            source: 'Daily Operation',
            severity: ncr.severity,
            status: 'Reported',
            reportedById: assignedToId ? parseInt(assignedToId) : ncr.reportedById
          }
        });

        // Link CAPA to NCR
        await tx.nonConformityReport.update({
          where: { id: parseInt(id) },
          data: { linkedCapaId: capa.id }
        });
      }

      return { ncr, capa };
    });
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error dispositioning NCR:', error);
    res.status(500).json({ error: 'Failed to update NCR disposition' });
  }
});

export default router;
