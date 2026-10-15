import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import { createIsoAuditCampaign, compileIsoAuditReport } from '../services/iso-audit.service';

const router = Router();
const prisma = new PrismaClient();

// Setup multer for audit evidence uploads
const evidenceDir = path.join(__dirname, '../../uploads/audit-evidence');
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, evidenceDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `ev_${Date.now()}_${safeName}`);
  }
});

const uploadEvidence = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// 1. Get all audits
router.get('/', async (req, res) => {
  try {
    const audits = await prisma.audit.findMany({
      include: {
        auditor: { select: { id: true, name: true } },
        auditees: { select: { id: true, name: true } },
        _count: { select: { findings: true, interviews: true } }
      },
      orderBy: { plannedDate: 'desc' }
    });
    res.json(audits);
  } catch (error) {
    console.error('Error fetching audits:', error);
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
});

// 2. Create ISO Audit Campaign (generates questions, tokens, sends emails)
router.post('/campaign', async (req, res) => {
  try {
    const { title, scope, standard, plannedDate, auditorId, interviewees, baseUrl } = req.body;
    if (!title || !interviewees || !Array.isArray(interviewees) || interviewees.length === 0) {
      return res.status(400).json({ error: 'Title and interviewees array are required.' });
    }

    const hostHeader = req.get('host');
    const protocol = req.protocol;
    const computedBaseUrl = baseUrl || (hostHeader ? `${protocol}://${hostHeader}` : 'https://ims.promeconsult.com');

    const result = await createIsoAuditCampaign({
      title,
      scope,
      standard: standard || 'ISO 9001:2015',
      plannedDate,
      auditorId: auditorId ? parseInt(auditorId) : undefined,
      interviewees,
      baseUrl: computedBaseUrl
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error creating ISO audit campaign:', error);
    res.status(500).json({ error: `Failed to create audit campaign: ${error.message}` });
  }
});

// 3. Interviewee Portal: Get interview data by token
router.get('/interviews/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const interview = await prisma.auditInterview.findUnique({
      where: { token },
      include: {
        audit: {
          select: {
            id: true,
            auditNumber: true,
            title: true,
            standard: true,
            scope: true,
            plannedDate: true,
            status: true,
            auditor: { select: { name: true, email: true } }
          }
        },
        questions: {
          include: {
            attachments: true
          },
          orderBy: { id: 'asc' }
        }
      }
    });

    if (!interview) {
      return res.status(404).json({ error: 'Audit interview not found or invalid link.' });
    }

    res.json(interview);
  } catch (error: any) {
    console.error('Error fetching interview by token:', error);
    res.status(500).json({ error: 'Failed to fetch interview details.' });
  }
});

// 4. Interviewee Portal: Save draft answers
router.post('/interviews/:token/save-draft', async (req, res) => {
  try {
    const { token } = req.params;
    const { responses } = req.body; // Array of { questionId, response }

    const interview = await prisma.auditInterview.findUnique({ where: { token } });
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found.' });
    }

    if (Array.isArray(responses)) {
      for (const item of responses) {
        if (item.questionId) {
          await prisma.auditInterviewQuestion.update({
            where: { id: parseInt(item.questionId) },
            data: { response: item.response || '' }
          });
        }
      }
    }

    await prisma.auditInterview.update({
      where: { token },
      data: { status: 'IN_PROGRESS' }
    });

    res.json({ success: true, message: 'Draft saved successfully.' });
  } catch (error: any) {
    console.error('Error saving draft:', error);
    res.status(500).json({ error: 'Failed to save draft.' });
  }
});

// 5. Interviewee Portal: Upload evidentiary file for a question
router.post('/interviews/:token/upload', uploadEvidence.single('file'), async (req: any, res) => {
  try {
    const { token } = req.params;
    const { questionId } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const interview = await prisma.auditInterview.findUnique({
      where: { token },
      include: { questions: true }
    });

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found.' });
    }

    const qId = parseInt(questionId);
    const validQ = interview.questions.find(q => q.id === qId);
    if (!validQ) {
      return res.status(400).json({ error: 'Invalid question ID for this interview.' });
    }

    const relativeUrl = `/uploads/audit-evidence/${req.file.filename}`;

    const attachment = await prisma.auditInterviewAttachment.create({
      data: {
        questionId: qId,
        fileName: req.file.originalname,
        fileUrl: relativeUrl,
        fileType: req.file.mimetype,
        fileSize: req.file.size
      }
    });

    res.status(201).json(attachment);
  } catch (error: any) {
    console.error('Error uploading audit evidence:', error);
    res.status(500).json({ error: 'Failed to upload evidence file.' });
  }
});

// 6. Interviewee Portal: Delete an evidentiary attachment
router.delete('/interviews/:token/attachments/:attachmentId', async (req, res) => {
  try {
    const { token, attachmentId } = req.params;
    const interview = await prisma.auditInterview.findUnique({ where: { token } });
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found.' });
    }

    const attId = parseInt(attachmentId);
    const attachment = await prisma.auditInterviewAttachment.findUnique({ where: { id: attId } });
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found.' });
    }

    // Try deleting physical file
    try {
      const fileName = path.basename(attachment.fileUrl);
      const filePath = path.join(evidenceDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.warn('Physical file delete warning:', e);
    }

    await prisma.auditInterviewAttachment.delete({ where: { id: attId } });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ error: 'Failed to delete attachment.' });
  }
});

// 7. Interviewee Portal: Final Submission of responses
router.post('/interviews/:token/submit', async (req, res) => {
  try {
    const { token } = req.params;
    const { responses } = req.body;

    const interview = await prisma.auditInterview.findUnique({ where: { token } });
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found.' });
    }

    if (Array.isArray(responses)) {
      for (const item of responses) {
        if (item.questionId) {
          await prisma.auditInterviewQuestion.update({
            where: { id: parseInt(item.questionId) },
            data: { response: item.response || '' }
          });
        }
      }
    }

    const updated = await prisma.auditInterview.update({
      where: { token },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date()
      }
    });

    res.json({ success: true, interview: updated });
  } catch (error: any) {
    console.error('Error submitting interview:', error);
    res.status(500).json({ error: 'Failed to submit interview.' });
  }
});

// 8. Compile ISO Audit Report (AI evaluation, PDF generation, publish to /audits and /library)
router.post('/:id/compile-report', async (req, res) => {
  try {
    const { id } = req.params;
    const auditId = parseInt(id);

    const hostHeader = req.get('host');
    const protocol = req.protocol;
    const baseUrl = hostHeader ? `${protocol}://${hostHeader}` : 'https://ims.promeconsult.com';

    const result = await compileIsoAuditReport(auditId, baseUrl);
    res.json(result);
  } catch (error: any) {
    console.error('Error compiling audit report:', error);
    res.status(500).json({ error: `Failed to compile report: ${error.message}` });
  }
});

// 9. Get single audit with findings, interviews, questions and evidence
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const audit = await prisma.audit.findUnique({
      where: { id: parseInt(id) },
      include: {
        auditor: { select: { id: true, name: true, email: true } },
        auditees: { select: { id: true, name: true, email: true } },
        findings: {
          orderBy: { createdAt: 'desc' }
        },
        interviews: {
          include: {
            questions: {
              include: {
                attachments: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
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

// 10. Create standard audit
router.post('/', async (req, res) => {
  try {
    const { title, type, standard, scope, plannedDate, auditorId, auditeeIds } = req.body;
    
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
        type: type || 'Internal',
        standard: standard || 'ISO 9001:2015',
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

// 11. Update audit
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, auditorId, auditeeIds, executionDate, summary } = req.body;

    const data: any = {};
    if (status !== undefined) data.status = status;
    if (summary !== undefined) data.summary = summary;
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

// 12. Add finding to audit
router.post('/:id/findings', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, classification, clauseRef } = req.body;
    
    const newFinding = await prisma.auditFinding.create({
      data: {
        auditId: parseInt(id),
        findingNumber: 'FIND-' + Date.now(),
        clauseRef: clauseRef || 'Clause 8',
        description,
        type: classification || 'Observation',
        severity: classification && classification.includes('Major') ? 'High' : 'Medium',
        status: 'Open'
      }
    });
    
    res.status(201).json(newFinding);
  } catch (error) {
    console.error('Error adding finding:', error);
    res.status(500).json({ error: 'Failed to add finding' });
  }
});

// 13. Raise CAPA from finding
router.post('/findings/:findingId/capa', async (req, res) => {
  try {
    const { findingId } = req.params;
    const { reportedById } = req.body;
    
    const finding = await prisma.auditFinding.findUnique({
      where: { id: parseInt(findingId) },
      include: { audit: true }
    });
    
    if (!finding) return res.status(404).json({ error: 'Finding not found' });
    if ((finding as any).capaId) return res.status(400).json({ error: 'CAPA already exists for this finding' });
    
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

    const result = await prisma.$transaction(async (tx) => {
      const capa = await tx.capaReport.create({
        data: {
          reportNumber,
          title: `Audit Finding Escalation: ${finding.audit.auditNumber}`,
          type: 'Non-Conformance',
          description: `This CAPA was raised from Internal Audit ${finding.audit.auditNumber}.\n\nAudit Finding Details:\n${finding.description}`,
          source: 'Internal Audit',
          severity: severityMap[(finding as any).type] || 'Medium',
          status: 'Reported',
          reportedById: parseInt(reportedById)
        }
      });
      
      const updatedFinding = await tx.auditFinding.update({
        where: { id: finding.id },
        data: { capaId: capa.id }
      });
      
      return { capa, finding: updatedFinding };
    });
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error raising CAPA:', error);
    res.status(500).json({ error: 'Failed to raise CAPA' });
  }
});

// 14. Delete audit (Administrator only)
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true }
    });

    const isAdmin = user?.roles?.some(r => 
      r.name === 'Administrator' || 
      r.name === 'Managing Director' || 
      r.name === 'Super Admin'
    );

    if (!isAdmin) {
      return res.status(403).json({ error: 'Permission denied. Only Administrators can delete audits.' });
    }

    const auditId = parseInt(req.params.id);
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      include: {
        interviews: {
          include: {
            questions: {
              include: { attachments: true }
            }
          }
        }
      }
    });

    if (!audit) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    // 1. Clean up evidence attachment files from uploads directory
    for (const interview of audit.interviews) {
      for (const question of interview.questions) {
        for (const attachment of question.attachments) {
          if (attachment.fileUrl && attachment.fileUrl.startsWith('/uploads/')) {
            const filePath = path.join(__dirname, '../..', attachment.fileUrl);
            if (fs.existsSync(filePath)) {
              try { fs.unlinkSync(filePath); } catch (e) {}
            }
          }
        }
      }
    }

    // 2. Clean up compiled PDF report if it exists
    if (audit.reportPdfUrl && audit.reportPdfUrl.startsWith('/uploads/')) {
      const pdfPath = path.join(__dirname, '../..', audit.reportPdfUrl);
      if (fs.existsSync(pdfPath)) {
        try { fs.unlinkSync(pdfPath); } catch (e) {}
      }
    }

    // 3. Clean up linked Library item if registered
    if (audit.libraryItemId) {
      try {
        await prisma.libraryItem.delete({
          where: { id: audit.libraryItemId }
        });
      } catch (e) {
        console.warn('Linked library item already removed or not found');
      }
    }

    // 4. Delete the audit record (Prisma cascade deletes interviews, questions, attachments, and findings)
    await prisma.audit.delete({
      where: { id: auditId }
    });

    res.json({ success: true, message: `Audit ${audit.auditNumber} deleted successfully.` });
  } catch (error: any) {
    console.error('Error deleting audit:', error);
    res.status(500).json({ error: `Failed to delete audit: ${error.message}` });
  }
});

export default router;
