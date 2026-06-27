import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Generate next risk/opportunity number
async function generateNextNumber(type: string) {
  const prefix = type === 'Opportunity' ? 'PROME-OPP' : 'PROME-RSK';
  const year = new Date().getFullYear();
  const searchString = `${prefix}-${year}-`;
  
  const lastItem = await prisma.risk.findFirst({
    where: {
      riskNumber: {
        startsWith: searchString
      }
    },
    orderBy: {
      riskNumber: 'desc'
    }
  });

  if (lastItem) {
    const sequence = parseInt(lastItem.riskNumber.split('-')[3], 10);
    return `${searchString}${(sequence + 1).toString().padStart(3, '0')}`;
  }
  return `${searchString}001`;
}

// Get all risks/opportunities
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const risks = await prisma.risk.findMany({
      include: {
        owner: {
          select: { id: true, name: true, division: true }
        },
        capa: {
          select: { id: true, reportNumber: true, status: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(risks);
  } catch (error) {
    console.error('Fetch risks error:', error);
    res.status(500).json({ message: 'Failed to fetch risks' });
  }
});

// Get a single risk
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const risk = await prisma.risk.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        owner: {
          select: { id: true, name: true, division: true }
        },
        capa: {
          select: { id: true, reportNumber: true, status: true }
        }
      }
    });

    if (!risk) return res.status(404).json({ message: 'Risk not found' });
    res.json(risk);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch risk details' });
  }
});

// Create new risk or opportunity
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      title, type, category, description,
      ownerId, likelihood, impact,
      mitigationPlan, actionDeadline
    } = req.body;

    const riskNumber = await generateNextNumber(type);
    
    // Calculate score
    const score = (likelihood && impact) ? (likelihood * impact) : null;

    const risk = await prisma.risk.create({
      data: {
        riskNumber,
        title,
        type,
        category,
        description,
        ownerId: ownerId ? parseInt(ownerId) : null,
        likelihood: likelihood ? parseInt(likelihood) : null,
        impact: impact ? parseInt(impact) : null,
        score,
        mitigationPlan,
        actionDeadline: actionDeadline ? new Date(actionDeadline) : null,
        status: (likelihood && impact) ? 'Assessed' : 'Identified'
      },
      include: {
        owner: { select: { id: true, name: true } }
      }
    });

    res.status(201).json(risk);
  } catch (error) {
    console.error('Create risk error:', error);
    res.status(500).json({ message: 'Failed to create risk' });
  }
});

// Update risk (Assessment, Mitigation, Status)
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      title, category, description, status, ownerId,
      likelihood, impact, mitigationPlan, actionDeadline,
      residualLikelihood, residualImpact
    } = req.body;

    const score = (likelihood && impact) ? (parseInt(likelihood) * parseInt(impact)) : null;
    const residualScore = (residualLikelihood && residualImpact) ? (parseInt(residualLikelihood) * parseInt(residualImpact)) : null;

    const risk = await prisma.risk.update({
      where: { id: parseInt(req.params.id) },
      data: {
        title,
        category,
        description,
        status,
        ownerId: ownerId ? parseInt(ownerId) : null,
        likelihood: likelihood ? parseInt(likelihood) : null,
        impact: impact ? parseInt(impact) : null,
        score,
        mitigationPlan,
        actionDeadline: actionDeadline ? new Date(actionDeadline) : null,
        residualLikelihood: residualLikelihood ? parseInt(residualLikelihood) : null,
        residualImpact: residualImpact ? parseInt(residualImpact) : null,
        residualScore
      },
      include: {
        owner: { select: { id: true, name: true } },
        capa: { select: { id: true, reportNumber: true } }
      }
    });

    res.json(risk);
  } catch (error) {
    console.error('Update risk error:', error);
    res.status(500).json({ message: 'Failed to update risk' });
  }
});

// Escalate Realized Risk to CAPA
router.post('/:id/capa', authenticateToken, async (req: Request, res: Response) => {
  try {
    const riskId = parseInt(req.params.id);
    const risk = await prisma.risk.findUnique({ where: { id: riskId } });
    
    if (!risk) return res.status(404).json({ message: 'Risk not found' });
    if (risk.capaId) return res.status(400).json({ message: 'Risk is already escalated to CAPA' });

    // Generate CAPA number
    const year = new Date().getFullYear();
    const searchString = `PROME-CAPA-${year}-`;
    const lastCapa = await prisma.capaReport.findFirst({
      where: { reportNumber: { startsWith: searchString } },
      orderBy: { reportNumber: 'desc' }
    });
    
    let nextSeq = 1;
    if (lastCapa) {
      nextSeq = parseInt(lastCapa.reportNumber.split('-')[3], 10) + 1;
    }
    const reportNumber = `${searchString}${nextSeq.toString().padStart(3, '0')}`;

    // Create CAPA and update Risk in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create CAPA
      const capa = await tx.capaReport.create({
        data: {
          reportNumber,
          title: `Realized Risk: ${risk.title}`,
          type: 'Non-Conformance',
          source: 'Daily Operation',
          severity: risk.residualScore && risk.residualScore > 12 ? 'High' : (risk.score && risk.score > 12 ? 'High' : 'Medium'),
          description: `This CAPA was automatically generated from a realized risk: ${risk.riskNumber}\n\nOriginal Risk Description:\n${risk.description}\n\nMitigation Plan that was in place:\n${risk.mitigationPlan || 'None'}`,
          reportedById: (req as any).user.userId,
          status: 'Reported'
        }
      });

      // 2. Link CAPA to Risk and set status to Realized
      const updatedRisk = await tx.risk.update({
        where: { id: riskId },
        data: {
          status: 'Realized',
          capaId: capa.id
        },
        include: {
          owner: { select: { id: true, name: true } },
          capa: { select: { id: true, reportNumber: true } }
        }
      });

      return updatedRisk;
    });

    res.json(result);
  } catch (error) {
    console.error('Escalate risk error:', error);
    res.status(500).json({ message: 'Failed to escalate risk' });
  }
});

// Delete risk
router.delete('/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const risk = await prisma.risk.findUnique({
      where: { id: parseInt(id) }
    });

    if (!risk) {
      return res.status(404).json({ message: 'Risk not found' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true }
    });
    
    const isAdministrator = user?.roles?.some(r => ['Administrator', 'Admin', 'Super Admin'].includes(r.name));

    if (risk.ownerId !== userId && !isAdministrator) {
      return res.status(403).json({ message: 'Forbidden. Only the owner or an administrator can delete this risk.' });
    }

    await prisma.risk.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Risk deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete risk' });
  }
});

export default router;
