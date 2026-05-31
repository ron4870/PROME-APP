import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

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
