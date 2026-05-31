import { PrismaClient, WorkflowInstance, WorkflowStep } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

// Configure Nodemailer for Email Escalations/Notifications
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER || 'test@ethereal.email',
    pass: process.env.SMTP_PASS || 'testpass',
  },
});

export class WorkflowService {
  /**
   * Initializes a new workflow and notifies the first assignee
   */
  static async startWorkflow(
    initiatorId: number,
    title: string,
    entity: { isoDocumentId?: number; projectDocumentId?: number; changeRequestId?: number },
    steps: { assigneeId: number; actionType: string; stepOrder: number; slaDeadline: Date }[]
  ): Promise<WorkflowInstance> {
    const workflow = await prisma.workflowInstance.create({
      data: {
        initiatorId,
        title,
        ...entity,
        steps: {
          create: steps.map((s) => ({
            ...s,
            status: s.stepOrder === 1 ? 'Pending' : 'Awaiting Previous Step',
          })),
        },
      },
      include: { steps: { include: { assignee: true } } },
    });

    // Notify the first assignee
    const firstStep = workflow.steps.find((s) => s.stepOrder === 1);
    if (firstStep && firstStep.assignee) {
      await this.sendNotificationEmail(
        firstStep.assignee.email,
        'Action Required: New Workflow Assignment',
        `You have been assigned to step: ${firstStep.actionType} for workflow: ${workflow.title}. Due by: ${firstStep.slaDeadline}`
      );
    }

    return workflow;
  }

  /**
   * Process a workflow step (Approve/Reject)
   */
  static async processStep(
    stepId: number,
    userId: number,
    action: 'Approved' | 'Rejected',
    comments?: string
  ) {
    const step = await prisma.workflowStep.findUnique({
      where: { id: stepId },
      include: { workflow: { include: { initiator: true, steps: { include: { assignee: true } } } } },
    });

    if (!step) throw new Error('Step not found');
    if (step.assigneeId !== userId) throw new Error('Not authorized to process this step');
    if (step.status === 'Approved' || step.status === 'Rejected') throw new Error('Step already processed');

    // Update the step
    await prisma.workflowStep.update({
      where: { id: stepId },
      data: {
        status: action,
        comments,
        completedAt: new Date(),
      },
    });

    if (action === 'Rejected') {
      // Mark workflow as rejected and notify initiator
      await prisma.workflowInstance.update({
        where: { id: step.workflowId },
        data: { status: 'Rejected' },
      });
      await this.sendNotificationEmail(
        step.workflow.initiator.email,
        'Workflow Rejected',
        `Your workflow "${step.workflow.title}" was rejected by step ${step.stepOrder}. Comments: ${comments || 'None'}`
      );
    } else if (action === 'Approved') {
      // Check for next step
      const nextStep = step.workflow.steps.find((s) => s.stepOrder === step.stepOrder + 1);
      
      if (nextStep) {
        // Activate next step and notify
        await prisma.workflowStep.update({
          where: { id: nextStep.id },
          data: { status: 'Pending' },
        });
        if (nextStep.assignee) {
          await this.sendNotificationEmail(
            nextStep.assignee.email,
            'Action Required: New Workflow Assignment',
            `You have been assigned to step: ${nextStep.actionType} for workflow: ${step.workflow.title}. Due by: ${nextStep.slaDeadline}`
          );
        }
      } else {
        // Workflow complete
        await prisma.workflowInstance.update({
          where: { id: step.workflowId },
          data: { status: 'Completed' },
        });
        await this.sendNotificationEmail(
          step.workflow.initiator.email,
          'Workflow Completed',
          `Your workflow "${step.workflow.title}" has been fully approved and completed.`
        );
      }
    }

    return true;
  }

  /**
   * Cron job logic: Checks for SLA breaches and sends escalations
   */
  static async checkSlaEscalations() {
    const overdueSteps = await prisma.workflowStep.findMany({
      where: {
        status: 'Pending',
        escalationSent: false,
        slaDeadline: { lt: new Date() },
      },
      include: {
        assignee: true,
        workflow: { include: { initiator: true } },
      },
    });

    for (const step of overdueSteps) {
      // Send Escalation Email
      await this.sendNotificationEmail(
        step.assignee.email,
        'URGENT: Workflow SLA Breached',
        `You have an overdue action (${step.actionType}) for workflow "${step.workflow.title}". It was due on ${step.slaDeadline}. Please action immediately. CC: ${step.workflow.initiator.email}`
      );

      // Mark escalation as sent so we don't spam them every hour
      await prisma.workflowStep.update({
        where: { id: step.id },
        data: { escalationSent: true },
      });
    }

    return overdueSteps.length;
  }

  private static async sendNotificationEmail(to: string, subject: string, text: string) {
    try {
      console.log(`Sending email to ${to}: ${subject}`);
      // In production, uncomment the transporter logic
      // await transporter.sendMail({
      //   from: '"PROME IMS & Projects" <no-reply@prome.com>',
      //   to,
      //   subject,
      //   text,
      // });
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }
}
