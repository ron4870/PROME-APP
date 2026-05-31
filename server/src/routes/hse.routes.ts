import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all incidents
router.get('/incidents', authenticateToken, async (req, res) => {
  try {
    const incidents = await prisma.hseIncident.findMany({
      include: {
        reportedBy: { select: { id: true, name: true } },
      },
      orderBy: { incidentDate: 'desc' }
    });
    res.json(incidents);
  } catch (error) {
    console.error('Error fetching HSE incidents:', error);
    res.status(500).json({ error: 'Failed to fetch HSE incidents' });
  }
});

// Get a single incident
router.get('/incidents/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const incident = await prisma.hseIncident.findUnique({
      where: { id: parseInt(id) },
      include: {
        reportedBy: { select: { id: true, name: true, email: true } },
        linkedCapa: { select: { id: true, reportNumber: true, status: true } }
      }
    });
    
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  } catch (error) {
    console.error('Error fetching HSE incident:', error);
    res.status(500).json({ error: 'Failed to fetch HSE incident' });
  }
});

// Report a new incident
router.post('/incidents', authenticateToken, async (req, res) => {
  try {
    const { type, title, description, location, incidentDate, severity, immediateActionTaken, reportedById } = req.body;
    
    // Generate Incident Number HSE-INC-YYYY-XXX
    const year = new Date().getFullYear();
    const count = await prisma.hseIncident.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
        }
      }
    });
    
    const seq = String(count + 1).padStart(3, '0');
    const incidentNumber = `HSE-INC-${year}-${seq}`;

    const newIncident = await prisma.hseIncident.create({
      data: {
        incidentNumber,
        type,
        title,
        description,
        location,
        incidentDate: incidentDate ? new Date(incidentDate) : new Date(),
        severity,
        immediateActionTaken,
        reportedById: reportedById ? parseInt(reportedById) : null,
      }
    });
    
    res.status(201).json(newIncident);
  } catch (error) {
    console.error('Error creating HSE incident:', error);
    res.status(500).json({ error: 'Failed to report HSE incident' });
  }
});

// Investigate / Resolve incident
router.post('/incidents/:id/investigate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { investigationFindings, status, raiseCapa, investigatorId } = req.body;
    
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update the incident
      const incident = await tx.hseIncident.update({
        where: { id: parseInt(id) },
        data: {
          status,
          investigationFindings
        }
      });

      // 2. Optionally raise a CAPA if requested
      let capa = null;
      if (raiseCapa) {
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
            title: `Systemic Fix for HSE Incident: ${incident.incidentNumber}`,
            type: 'Safety Incident',
            description: `This CAPA was raised from an HSE Incident.\n\nIncident: ${incident.title}\nFindings: ${investigationFindings}`,
            source: 'Daily Operation',
            severity: incident.severity,
            status: 'Reported',
            reportedById: parseInt(investigatorId)
          }
        });

        // Link CAPA to Incident
        await tx.hseIncident.update({
          where: { id: parseInt(id) },
          data: { linkedCapaId: capa.id }
        });
      }

      return { incident, capa };
    });
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error investigating incident:', error);
    res.status(500).json({ error: 'Failed to update incident investigation' });
  }
});

// Get all drills
router.get('/drills', authenticateToken, async (req, res) => {
  try {
    const drills = await prisma.emergencyDrill.findMany({
      include: {
        conductedBy: { select: { id: true, name: true } },
      },
      orderBy: { drillDate: 'desc' }
    });
    res.json(drills);
  } catch (error) {
    console.error('Error fetching drills:', error);
    res.status(500).json({ error: 'Failed to fetch emergency drills' });
  }
});

// Create a new drill
router.post('/drills', authenticateToken, async (req, res) => {
  try {
    const { type, scenario, drillDate, durationMinutes, participantsCount, findings, status, conductedById } = req.body;
    
    // Generate Drill Number DRL-YYYY-XXX
    const year = new Date().getFullYear();
    const count = await prisma.emergencyDrill.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
        }
      }
    });
    
    const seq = String(count + 1).padStart(3, '0');
    const drillNumber = `DRL-${year}-${seq}`;

    const newDrill = await prisma.emergencyDrill.create({
      data: {
        drillNumber,
        type,
        scenario,
        drillDate: drillDate ? new Date(drillDate) : new Date(),
        durationMinutes: parseInt(durationMinutes),
        participantsCount: parseInt(participantsCount),
        findings,
        status,
        conductedById: conductedById ? parseInt(conductedById) : null,
      }
    });
    
    res.status(201).json(newDrill);
  } catch (error) {
    console.error('Error creating drill:', error);
    res.status(500).json({ error: 'Failed to record emergency drill' });
  }
});

export default router;
