import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { WorkflowService } from '../services/workflow.service';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to mock authentication (since actual auth might vary, adjust as needed)
// Assuming req.headers.authorization or similar would normally set req.user
const checkAuth = (req: Request, res: Response, next: express.NextFunction) => {
  // Mocking user ID = 1 for now if not provided
  (req as any).user = { id: 1 };
  next();
};

/**
 * Get unified Inbox (Pending Workflow Steps for the User)
 */
router.get('/inbox', checkAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const pendingSteps = await prisma.workflowStep.findMany({
      where: {
        assigneeId: userId,
        status: 'Pending',
      },
      include: {
        workflow: {
          include: {
            initiator: { select: { name: true, email: true } },
            isoDocument: { select: { documentNumber: true, title: true } },
            projectDocument: { select: { title: true, fileUrl: true } },
            changeRequest: { select: { mocNumber: true, title: true } },
          },
        },
      },
      orderBy: { slaDeadline: 'asc' }, // Order by most urgent first
    });

    res.json(pendingSteps);
  } catch (error) {
    console.error('Error fetching inbox:', error);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

/**
 * Get all notifications (For the Unified Dashboard)
 * Includes pending steps and completed steps assigned to user, plus workflows initiated by user
 */
router.get('/dashboard', checkAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const steps = await prisma.workflowStep.findMany({
      where: { assigneeId: userId },
      include: {
        workflow: {
          include: {
            initiator: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const initiatedWorkflows = await prisma.workflowInstance.findMany({
      where: { initiatorId: userId },
      include: {
        steps: {
          include: { assignee: { select: { name: true } } },
          orderBy: { stepOrder: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ steps, initiatedWorkflows });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

/**
 * Process a workflow step (Approve / Reject)
 */
router.post('/step/:id/action', checkAuth, async (req: Request, res: Response) => {
  try {
    const stepId = parseInt(req.params.id);
    const userId = (req as any).user.id;
    const { action, comments } = req.body;

    if (!['Approved', 'Rejected'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be Approved or Rejected.' });
    }

    await WorkflowService.processStep(stepId, userId, action as 'Approved' | 'Rejected', comments);

    res.json({ success: true, message: `Step ${action.toLowerCase()} successfully` });
  } catch (error: any) {
    console.error('Error processing step:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
