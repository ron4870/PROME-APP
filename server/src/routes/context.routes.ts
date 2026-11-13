import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import {
  PROME_CONTEXT_FACTORS,
  PROME_INTERESTED_PARTIES,
  PROME_COMMUNICATION_MATRIX,
  PROME_QMS_SCOPE_RECORD,
  PROME_CONTINUAL_IMPROVEMENT_RECORD,
  getContextFactors,
  saveContextFactors,
  addContextFactor,
  updateContextFactor,
  deleteContextFactor,
  getInterestedParties,
  saveInterestedParties,
  addInterestedParty,
  updateInterestedParty,
  deleteInterestedParty
} from '../services/iso-prome-records';

const router = Router();
const prisma = new PrismaClient();

// ==========================================
// OFFICIAL PROME ISO MANDATORY DOCUMENTS
// ==========================================
router.get('/official-documents', authenticateToken, async (req, res) => {
  res.json({
    contextFactors: getContextFactors(),
    interestedParties: getInterestedParties(),
    communicationMatrix: PROME_COMMUNICATION_MATRIX,
    scopeRecord: PROME_QMS_SCOPE_RECORD,
    continualImprovement: PROME_CONTINUAL_IMPROVEMENT_RECORD
  });
});

// Update an official context factor
router.put('/factors/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = updateContextFactor(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Context factor not found' });
    }

    // Also sync to DB issue if present
    try {
      const issueNumber = `ORG-ISS-${id}`;
      const existing = await prisma.organizationIssue.findUnique({ where: { issueNumber } });
      if (existing) {
        await prisma.organizationIssue.update({
          where: { issueNumber },
          data: {
            title: updated.context,
            type: updated.type,
            factor: updated.factorCategory,
            description: `${updated.aspectFromContext}\n\nMitigation Action: ${updated.mitigationAction}\nReviewer: ${updated.followUpAndReviewBy} (Target: ${updated.followUpDate})\nResult: ${updated.followUpResults}`
          }
        });
      }
    } catch (e) {
      console.warn('DB sync warning for factor:', e);
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating context factor:', error);
    res.status(500).json({ error: error.message || 'Failed to update context factor' });
  }
});

// Add a new context factor
router.post('/factors', authenticateToken, async (req, res) => {
  try {
    const created = addContextFactor(req.body);
    res.status(201).json(created);
  } catch (error: any) {
    console.error('Error adding context factor:', error);
    res.status(500).json({ error: error.message || 'Failed to add context factor' });
  }
});

// Delete a context factor
router.delete('/factors/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const success = deleteContextFactor(id);
    res.json({ success });
  } catch (error: any) {
    console.error('Error deleting context factor:', error);
    res.status(500).json({ error: error.message || 'Failed to delete context factor' });
  }
});

// Update an official interested party
router.put('/parties-official/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = updateInterestedParty(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Interested party not found' });
    }

    // Also sync to DB party if present
    try {
      const partyNumber = `ORG-PTY-${id}`;
      const existing = await prisma.interestedParty.findUnique({ where: { partyNumber } });
      if (existing) {
        await prisma.interestedParty.update({
          where: { partyNumber },
          data: {
            name: updated.name,
            type: updated.category,
            needsAndExpectations: `Control/Influence: ${updated.ipToCompany} (Company to IP: ${updated.companyToIp}) | Priority: ${updated.prioritization}\nAction: ${updated.actionToManageIp}\nReviewer: ${updated.followUpAndReviewBy} (Target: ${updated.followUpDate})\nResult: ${updated.followUpResults}`,
            complianceObligation: updated.prioritization === 'P1'
          }
        });
      }
    } catch (e) {
      console.warn('DB sync warning for party:', e);
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating interested party:', error);
    res.status(500).json({ error: error.message || 'Failed to update interested party' });
  }
});

// Add a new official interested party
router.post('/parties-official', authenticateToken, async (req, res) => {
  try {
    const created = addInterestedParty(req.body);
    res.status(201).json(created);
  } catch (error: any) {
    console.error('Error adding interested party:', error);
    res.status(500).json({ error: error.message || 'Failed to add interested party' });
  }
});

// Delete an official interested party
router.delete('/parties-official/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const success = deleteInterestedParty(id);
    res.json({ success });
  } catch (error: any) {
    console.error('Error deleting interested party:', error);
    res.status(500).json({ error: error.message || 'Failed to delete interested party' });
  }
});

// Seed live database tables with official PROME ISO records
router.post('/seed-official', authenticateToken, async (req, res) => {
  try {
    const adminUser = await prisma.user.findFirst();
    const ownerId = adminUser ? adminUser.id : null;

    let issuesCreated = 0;
    const currentFactors = getContextFactors();
    for (const item of currentFactors) {
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

    let partiesCreated = 0;
    const currentParties = getInterestedParties();
    for (const p of currentParties) {
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

// Update a custom org issue
router.put('/issues/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, factor, description, impact, status, ownerId } = req.body;

    const updated = await prisma.organizationIssue.update({
      where: { id: parseInt(id) },
      data: {
        ...(title !== undefined && { title }),
        ...(type !== undefined && { type }),
        ...(factor !== undefined && { factor }),
        ...(description !== undefined && { description }),
        ...(impact !== undefined && { impact }),
        ...(status !== undefined && { status }),
        ...(ownerId !== undefined && { ownerId: ownerId ? Number(ownerId) : null })
      }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating org issue:', error);
    res.status(500).json({ error: 'Failed to update organization issue' });
  }
});

// Delete a custom org issue
router.delete('/issues/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.organizationIssue.delete({
      where: { id: parseInt(id) }
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting org issue:', error);
    res.status(500).json({ error: 'Failed to delete organization issue' });
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

// Update a custom interested party
router.put('/parties/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, needsAndExpectations, complianceObligation, status, ownerId } = req.body;

    const updated = await prisma.interestedParty.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(needsAndExpectations !== undefined && { needsAndExpectations }),
        ...(complianceObligation !== undefined && { complianceObligation: complianceObligation === true }),
        ...(status !== undefined && { status }),
        ...(ownerId !== undefined && { ownerId: ownerId ? Number(ownerId) : null })
      }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating interested party:', error);
    res.status(500).json({ error: 'Failed to update interested party' });
  }
});

// Delete a custom interested party
router.delete('/parties/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.interestedParty.delete({
      where: { id: parseInt(id) }
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting interested party:', error);
    res.status(500).json({ error: 'Failed to delete interested party' });
  }
});

export default router;
