import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import {
  PROME_CONTEXT_FACTORS,
  PROME_INTERESTED_PARTIES,
  PROME_COMMUNICATION_MATRIX,
  PROME_QMS_SCOPE_RECORD,
  PROME_CONTINUAL_IMPROVEMENT_RECORD
} from '../services/iso-prome-records';

const router = Router();
const prisma = new PrismaClient();

// ==========================================
// OFFICIAL PROME ISO MANDATORY DOCUMENTS
// ==========================================
router.get('/official-documents', authenticateToken, async (req, res) => {
  res.json({
    contextFactors: PROME_CONTEXT_FACTORS,
    interestedParties: PROME_INTERESTED_PARTIES,
    communicationMatrix: PROME_COMMUNICATION_MATRIX,
    scopeRecord: PROME_QMS_SCOPE_RECORD,
    continualImprovement: PROME_CONTINUAL_IMPROVEMENT_RECORD
  });
});

// Seed live database tables with official PROME ISO records
router.post('/seed-official', authenticateToken, async (req, res) => {
  try {
    const adminUser = await prisma.user.findFirst();
    const ownerId = adminUser ? adminUser.id : null;

    let issuesCreated = 0;
    const existingIssuesCount = await prisma.organizationIssue.count();
    if (existingIssuesCount < 5) {
      for (const item of PROME_CONTEXT_FACTORS) {
        const issueNumber = `ORG-ISS-${item.id}`;
        const existing = await prisma.organizationIssue.findUnique({ where: { issueNumber } });
        if (!existing) {
          await prisma.organizationIssue.create({
            data: {
              issueNumber,
              title: item.context,
              type: item.type,
              factor: item.factorCategory,
              description: `${item.aspectFromContext}\n\nMitigation Action: ${item.mitigationAction}\nReviewer: ${item.followUpAndReviewBy} (Target: ${item.followUpDate})\nResult: ${item.followUpResults}`,
              impact: item.type === 'Internal' ? 'Risk' : 'Both',
              ownerId
            }
          });
          issuesCreated++;
        }
      }
    }

    let partiesCreated = 0;
    const existingPartiesCount = await prisma.interestedParty.count();
    if (existingPartiesCount < 5) {
      for (const p of PROME_INTERESTED_PARTIES) {
        const partyNumber = `ORG-PTY-${p.id}`;
        const existing = await prisma.interestedParty.findUnique({ where: { partyNumber } });
        if (!existing) {
          await prisma.interestedParty.create({
            data: {
              partyNumber,
              name: p.name,
              type: p.category,
              needsAndExpectations: `Control/Influence: ${p.ipToCompany} (Company to IP: ${p.companyToIp}) | Priority: ${p.prioritization}\nAction: ${p.actionToManageIp}\nReviewer: ${p.followUpAndReviewBy} (Target: ${p.followUpDate})\nResult: ${p.followUpResults}`,
              complianceObligation: p.prioritization === 'P1',
              ownerId
            }
          });
          partiesCreated++;
        }
      }
    }

    res.json({
      success: true,
      issuesCreated,
      partiesCreated,
      message: `Seeded ${issuesCreated} context issues and ${partiesCreated} interested parties.`
    });
  } catch (err: any) {
    console.error('Error seeding official context:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ORGANIZATION ISSUES (Clause 4.1)
// ==========================================

// Get all org issues
router.get('/issues', authenticateToken, async (req, res) => {
  try {
    const issues = await prisma.organizationIssue.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(issues);
  } catch (error) {
    console.error('Error fetching org issues:', error);
    res.status(500).json({ error: 'Failed to fetch organization issues' });
  }
});

// Create a new org issue
router.post('/issues', authenticateToken, async (req, res) => {
  try {
    const { title, type, factor, description, impact, ownerId } = req.body;
    
    // Generate an issue number automatically
    const count = await prisma.organizationIssue.count();
    const issueNumber = `ORG-ISS-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const newIssue = await prisma.organizationIssue.create({
      data: {
        issueNumber,
        title: title || 'Untitled',
        type,
        factor,
        description,
        impact,
        ownerId: ownerId ? Number(ownerId) : null
      }
    });
    
    res.status(201).json(newIssue);
  } catch (error) {
    console.error('Error creating org issue:', error);
    res.status(500).json({ error: 'Failed to create organization issue' });
  }
});

// ==========================================
// INTERESTED PARTIES (Clause 4.2)
// ==========================================

// Get all interested parties
router.get('/parties', authenticateToken, async (req, res) => {
  try {
    const parties = await prisma.interestedParty.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(parties);
  } catch (error) {
    console.error('Error fetching interested parties:', error);
    res.status(500).json({ error: 'Failed to fetch interested parties' });
  }
});

// Create a new interested party
router.post('/parties', authenticateToken, async (req, res) => {
  try {
    const { name, type, needsAndExpectations, complianceObligation, ownerId } = req.body;
    
    // Generate a party number automatically
    const count = await prisma.interestedParty.count();
    const partyNumber = `ORG-PTY-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const newParty = await prisma.interestedParty.create({
      data: {
        partyNumber,
        name,
        type,
        needsAndExpectations,
        complianceObligation: complianceObligation === true,
        ownerId: ownerId ? Number(ownerId) : null
      }
    });
    
    res.status(201).json(newParty);
  } catch (error) {
    console.error('Error creating interested party:', error);
    res.status(500).json({ error: 'Failed to create interested party' });
  }
});

export default router;
