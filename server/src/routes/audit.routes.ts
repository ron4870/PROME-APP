import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all audits
router.get('/', async (req, res) => {
  try {
    const audits = await prisma.audit.findMany({
      include: {
        auditor: { select: { id: true, name: true } },
        auditees: { select: { id: true, name: true } },
        _count: { select: { findings: true } }
      },
      orderBy: { plannedDate: 'desc' }
    });
    res.json(audits);
  } catch (error) {
    console.error('Error fetching audits:', error);
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
});

// Get single audit with findings
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const audit = await prisma.audit.findUnique({
      where: { id: parseInt(id) },
      include: {
        auditor: { select: { id: true, name: true } },
        auditees: { select: { id: true, name: true } },
        findings: {
          include: {
            // capaReport: { select: { id: true, reportNumber: true, status: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!audit) return res.status(404).json({ error: 'Audit not found' });
    res.json(audit);
  } catch (error) {
    console.error('Error fetching audit:', error);
    res.status(500).json({ error: 'Failed to fetch audit' });
  }
});

// Create new audit
router.post('/', async (req, res) => {
  try {
    const { title, type, scope, plannedDate, auditorId, auditeeIds } = req.body;
    
    // Generate Report Number PROME-AUD-YYYY-XXX
    const year = new Date().getFullYear();
    const count = await prisma.audit.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
        }
      }
    });
    
    const seq = String(count + 1).padStart(3, '0');
    const auditNumber = `PROME-AUD-${year}-${seq}`;

    const newAudit = await prisma.audit.create({
      data: {
        auditNumber,
        title,
        type,
        scope,
        plannedDate: new Date(plannedDate),
        auditorId: auditorId ? parseInt(auditorId) : null,
        auditees: auditeeIds && auditeeIds.length > 0 ? {
          connect: auditeeIds.map((id: any) => ({ id: parseInt(id) }))
        } : undefined,
      }
    });
    
    res.status(201).json(newAudit);
  } catch (error) {
    console.error('Error creating audit:', error);
    res.status(500).json({ error: 'Failed to create audit' });
  }
});

// Update audit
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, auditorId, auditeeIds, executionDate } = req.body;

    const data: any = {};
    if (status !== undefined) data.status = status;
    if (auditorId !== undefined) data.auditorId = auditorId ? parseInt(auditorId) : null;
    if (auditeeIds !== undefined) {
      data.auditees = {
        set: auditeeIds.map((aid: any) => ({ id: parseInt(aid) }))
      };
    }
    if (executionDate !== undefined) data.executionDate = executionDate ? new Date(executionDate) : null;

    const updatedAudit = await prisma.audit.update({
      where: { id: parseInt(id) },
      data
    });
    
    res.json(updatedAudit);
  } catch (error) {
    console.error('Error updating audit:', error);
    res.status(500).json({ error: 'Failed to update audit' });
  }
});

// Add finding to audit
router.post('/:id/findings', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, classification } = req.body;
    
    const newFinding = await prisma.auditFinding.create({
      data: {
        auditId: parseInt(id),
        description,
        findingNumber: 'FIND-' + Date.now(),
        type: 'Observation',
        severity: 'Low',
        // classification
      }
    });
    
    res.status(201).json(newFinding);
  } catch (error) {
    console.error('Error adding finding:', error);
    res.status(500).json({ error: 'Failed to add finding' });
  }
});

// Raise CAPA from finding
router.post('/findings/:findingId/capa', async (req, res) => {
  try {
    const { findingId } = req.params;
    const { reportedById } = req.body;
    
    // Get the finding and audit details
    const finding = await prisma.auditFinding.findUnique({
      where: { id: parseInt(findingId) },
      include: { audit: true }
    });
    
    if (!finding) return res.status(404).json({ error: 'Finding not found' });
    if ((finding as any).capaReportId) return res.status(400).json({ error: 'CAPA already exists for this finding' });
    
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
    
    const severityMap: Record<string, string> = {
      'Major Non-Conformance': 'High',
      'Minor Non-Conformance': 'Medium',
      'Opportunity for Improvement': 'Low',
      'Observation': 'Low'
    };

    // Transaction to ensure CAPA is created and linked correctly
    const result = await prisma.$transaction(async (tx) => {
      const capa = await tx.capaReport.create({
        data: {
          reportNumber,
          title: `Audit Finding Escalation: ${finding.audit.auditNumber}`,
          type: 'Non-Conformance',
          description: `This CAPA was raised from Internal Audit ${finding.audit.auditNumber}.\n\nAudit Finding Details:\n${finding.description}`,
          source: 'Internal Audit',
          severity: severityMap[(finding as any).classification] || 'Medium',
          status: 'Reported',
          reportedById: parseInt(reportedById)
        }
      });
      
      const updatedFinding = await tx.auditFinding.update({
        where: { id: finding.id },
        data: { /* capaReportId: capa.id */ }
      });
      
      return { capa, finding: updatedFinding };
    });
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error raising CAPA:', error);
    res.status(500).json({ error: 'Failed to raise CAPA' });
  }
});

export default router;
