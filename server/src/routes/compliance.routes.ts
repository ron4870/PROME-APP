import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all compliance requirements
router.get('/', authenticateToken, async (req, res) => {
  try {
    const requirements = await prisma.complianceRequirement.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { evaluations: true } }
      },
      orderBy: { requirementNumber: 'desc' }
    });
    res.json(requirements);
  } catch (error) {
    console.error('Error fetching compliance requirements:', error);
    res.status(500).json({ error: 'Failed to fetch compliance requirements' });
  }
});

// Get a single requirement with its evaluations
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const requirement = await prisma.complianceRequirement.findUnique({
      where: { id: parseInt(id) },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        evaluations: {
          include: {
            evaluator: { select: { id: true, name: true } },
            linkedCapa: { select: { id: true, reportNumber: true, status: true } }
          },
          orderBy: { evaluationDate: 'desc' }
        }
      }
    });
    
    if (!requirement) return res.status(404).json({ error: 'Requirement not found' });
    res.json(requirement);
  } catch (error) {
    console.error('Error fetching compliance requirement:', error);
    res.status(500).json({ error: 'Failed to fetch compliance requirement' });
  }
});

// Create a new compliance requirement
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, issuingAuthority, applicableClauses, evaluationFrequency, ownerId } = req.body;
    
    // Generate Requirement Number COMP-YYYY-XXX
    const year = new Date().getFullYear();
    const count = await prisma.complianceRequirement.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
        }
      }
    });
    
    const seq = String(count + 1).padStart(3, '0');
    const requirementNumber = `COMP-${year}-${seq}`;

    // Compute next evaluation date based on frequency (simplified)
    const nextEvalDate = new Date();
    if (evaluationFrequency === 'Annual') nextEvalDate.setFullYear(nextEvalDate.getFullYear() + 1);
    else if (evaluationFrequency === 'Bi-Annual') nextEvalDate.setMonth(nextEvalDate.getMonth() + 6);
    else if (evaluationFrequency === 'Quarterly') nextEvalDate.setMonth(nextEvalDate.getMonth() + 3);
    else if (evaluationFrequency === 'Monthly') nextEvalDate.setMonth(nextEvalDate.getMonth() + 1);

    const newReq = await prisma.complianceRequirement.create({
      data: {
        requirementNumber,
        title,
        description,
        issuingAuthority,
        applicableClauses,
        evaluationFrequency,
        nextEvaluationDate: nextEvalDate,
        ownerId: ownerId ? parseInt(ownerId) : null,
      }
    });
    
    res.status(201).json(newReq);
  } catch (error) {
    console.error('Error creating compliance requirement:', error);
    res.status(500).json({ error: 'Failed to create compliance requirement' });
  }
});

// Add a compliance evaluation
router.post('/:id/evaluations', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { statusResult, findings, evaluatorId, raiseCapa } = req.body;
    
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the evaluation
      const evaluation = await tx.complianceEvaluation.create({
        data: {
          requirementId: parseInt(id),
          evaluatorId: parseInt(evaluatorId),
          statusResult,
          findings
        }
      });

      // 2. Compute next evaluation date for the requirement
      const reqInfo = await tx.complianceRequirement.findUnique({ where: { id: parseInt(id) } });
      const nextEvalDate = new Date();
      if (reqInfo?.evaluationFrequency === 'Annual') nextEvalDate.setFullYear(nextEvalDate.getFullYear() + 1);
      else if (reqInfo?.evaluationFrequency === 'Bi-Annual') nextEvalDate.setMonth(nextEvalDate.getMonth() + 6);
      else if (reqInfo?.evaluationFrequency === 'Quarterly') nextEvalDate.setMonth(nextEvalDate.getMonth() + 3);
      else if (reqInfo?.evaluationFrequency === 'Monthly') nextEvalDate.setMonth(nextEvalDate.getMonth() + 1);

      // 3. Update the requirement status and dates
      await tx.complianceRequirement.update({
        where: { id: parseInt(id) },
        data: {
          status: statusResult,
          lastEvaluationDate: new Date(),
          nextEvaluationDate: nextEvalDate
        }
      });

      // 4. Optionally raise a CAPA if it's Non-Compliant and requested
      let capa = null;
      if (raiseCapa && statusResult === 'Non-Compliant') {
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
        const reportNumber = `PROME-NCR-${year}-${seq}`;

        capa = await tx.capaReport.create({
          data: {
            reportNumber,
            title: `Compliance Non-Conformance: ${reqInfo?.requirementNumber}`,
            type: 'Non-Conformance',
            description: `This CAPA was raised from a Compliance Evaluation.\n\nRequirement: ${reqInfo?.title}\nFindings: ${findings}`,
            source: 'Daily Operation',
            severity: 'High',
            status: 'Reported',
            reportedById: parseInt(evaluatorId)
          }
        });

        // Link CAPA to Evaluation
        await tx.complianceEvaluation.update({
          where: { id: evaluation.id },
          data: { linkedCapaId: capa.id }
        });
      }

      return { evaluation, capa };
    });
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error adding evaluation:', error);
    res.status(500).json({ error: 'Failed to add evaluation' });
  }
});

export default router;
