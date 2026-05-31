import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    // 1. CAPA Metrics
    const openCapasCount = await prisma.capaReport.count({
      where: { status: { in: ['Reported', 'Under Investigation', 'Action Pending'] } }
    });
    
    const overdueCapasCount = await prisma.capaReport.count({
      where: { 
        status: { in: ['Reported', 'Under Investigation', 'Action Pending'] },
        targetCompletionDate: { lt: today }
      }
    });

    // 2. Risk Metrics
    const criticalRisksCount = await prisma.risk.count({
      where: {
        status: { not: 'Closed' },
        // residualRiskLevel: { in: ['High', 'Critical'] }
      }
    });

    // 3. Equipment Calibration Metrics
    const equipment = await prisma.equipment.findMany({ select: { nextCalibrationDate: true, status: true } });
    let overdueCalibrations = 0;
    let upcomingCalibrations = 0;

    equipment.forEach(eq => {
      if (eq.status === 'Active' && eq.nextCalibrationDate) {
        const calDate = new Date(eq.nextCalibrationDate);
        calDate.setHours(0,0,0,0);
        if (calDate < today) {
          overdueCalibrations++;
        } else if (calDate <= thirtyDaysFromNow) {
          upcomingCalibrations++;
        }
      }
    });

    // 4. Customer Feedback Metrics
    const openComplaintsCount = await prisma.customerFeedback.count({
      where: {
        type: 'Complaint',
        status: { in: ['Open', 'Under Investigation'] }
      }
    });

    // 5. Supplier Metrics
    const suppliers = await prisma.supplier.findMany({ select: { nextEvaluationDate: true, status: true } });
    let evaluationsDue = 0;
    suppliers.forEach(sup => {
      if (sup.status === 'Approved' || sup.status === 'Conditional') {
        if (sup.nextEvaluationDate) {
          const evalDate = new Date(sup.nextEvaluationDate);
          evalDate.setHours(0,0,0,0);
          if (evalDate <= thirtyDaysFromNow) {
            evaluationsDue++;
          }
        } else {
          evaluationsDue++; // Unset means due
        }
      }
    });

    // 6. Document Metrics
    const pendingDocumentsCount = await prisma.masterDocument.count({
      where: { status: { in: ['Draft', 'Under Review'] } }
    });

    const documents = await prisma.masterDocument.findMany({ select: { nextReviewDate: true, status: true } });
    let documentReviewsDue = 0;
    documents.forEach(doc => {
      if (doc.status === 'Approved' && doc.nextReviewDate) {
        const revDate = new Date(doc.nextReviewDate);
        revDate.setHours(0,0,0,0);
        if (revDate <= thirtyDaysFromNow) {
          documentReviewsDue++;
        }
      }
    });

    // 7. Internal Audit Metrics
    const upcomingAuditsCount = await prisma.audit.count({
      where: {
        status: 'Scheduled',
        plannedDate: { gte: today }
      }
    });

    // 8. NCR Metrics
    const openNcrsCount = await prisma.nonConformityReport.count({
      where: { status: 'Open' }
    });

    res.json({
      capa: { open: openCapasCount, overdue: overdueCapasCount },
      risk: { criticalOpen: criticalRisksCount },
      equipment: { overdue: overdueCalibrations, upcoming: upcomingCalibrations },
      feedback: { openComplaints: openComplaintsCount },
      suppliers: { evaluationsDue: evaluationsDue },
      documents: { pending: pendingDocumentsCount, reviewsDue: documentReviewsDue },
      audits: { upcoming: upcomingAuditsCount },
      ncr: { open: openNcrsCount }
    });

  } catch (error) {
    console.error('Failed to fetch dashboard summary:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard summary' });
  }
});

export default router;
