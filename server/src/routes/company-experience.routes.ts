import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Initial seed records when database table is empty
const initialExperiences = [
  {
    projectNumber: 'PROME-EXP-2025-001',
    projectName: 'Consultancy Services for Detailed Engineering Design of Kampala Flyover Project Lot 2',
    client: 'UNRA (Uganda National Roads Authority)',
    sector: 'Roads & Highways',
    location: 'Kampala, Uganda',
    contractValue: 'USD 3,800,000',
    role: 'Lead Consultant',
    status: 'Completed',
    startDate: new Date('2023-02-15'),
    completionDate: new Date('2025-01-30'),
    description: 'Comprehensive detailed engineering design, traffic modeling, structural bridge analysis, utility relocation engineering, and tender documentation for Lot 2 flyover structure and grade-separated interchanges in Kampala City.',
    scopeOfServices: 'Topographical surveys, geotechnical investigations, structural design of flyover viaducts, traffic capacity analysis, environmental & social impact assessment (ESIA), and preparation of FIDIC contract documents.',
    clientContact: 'Eng. Director of Roads, UNRA Head Office, Nakawa, Kampala. Tel: +256 414 318000'
  },
  {
    projectNumber: 'PROME-EXP-2025-002',
    projectName: 'Feasibility Study & Detailed Design for Gulu Logistics Hub Infrastructure',
    client: 'Ministry of Works & Transport / TradeMark Africa',
    sector: 'Infrastructure & Logistics',
    location: 'Gulu, Uganda',
    contractValue: 'USD 1,450,000',
    role: 'Lead Consultant',
    status: 'Ongoing',
    startDate: new Date('2024-03-01'),
    completionDate: new Date('2025-11-30'),
    description: 'Master planning and detailed engineering for the regional multi-modal logistics hub in Gulu, including railway container yard access, heavy-duty pavement design, and digital customs access gates.',
    scopeOfServices: 'Master planning, pavement engineering for heavy axle loads, drainage networks, solar street lighting, architectural design of customs administration buildings, and EIA approval.',
    clientContact: 'Project Coordinator, Ministry of Works & Transport, Plot 56 Jinja Road, Kampala.'
  },
  {
    projectNumber: 'PROME-EXP-2024-001',
    projectName: 'Construction Supervision & Quality Control for Entebbe Expressway Expansion Bypass',
    client: 'UNRA (Uganda National Roads Authority)',
    sector: 'Roads & Highways',
    location: 'Wakiso / Entebbe, Uganda',
    contractValue: 'UGX 14,200,000,000',
    role: 'Joint Venture Partner',
    status: 'Completed',
    startDate: new Date('2022-06-01'),
    completionDate: new Date('2024-08-15'),
    description: 'Full-time construction supervision, asphalt concrete mix design verification, bridge deck load testing, geometric alignment audits, and financial claims verification for dual-carriageway expansion.',
    scopeOfServices: 'Resident engineering, material testing, pavement deflection testing (FWD), traffic safety management, progress certification, and defects liability monitoring.',
    clientContact: 'Project Engineer, UNRA Directorate of Projects, Nakawa.'
  },
  {
    projectNumber: 'PROME-EXP-2024-002',
    projectName: 'Engineering Design & Supervision for Kampala Water Lake Victoria WATSAN Package 4',
    client: 'National Water & Sewerage Corporation (NWSC)',
    sector: 'Water & Sanitation',
    location: 'Kampala / Mukono, Uganda',
    contractValue: 'EUR 2,600,000',
    role: 'Lead Consultant',
    status: 'Completed',
    startDate: new Date('2022-01-10'),
    completionDate: new Date('2024-05-20'),
    description: 'Engineering design and construction supervision of raw water intake works, high-lift pumping stations, clear water transmission mains, and 10,000m3 reinforced concrete reservoirs.',
    scopeOfServices: 'Hydraulic modeling, surge analysis, structural design of water treatment units, MEP engineering, SCADA integration supervision, and commissioning.',
    clientContact: 'Director of Capital Development, NWSC Head Office, Plot 39 Jinja Road, Kampala.'
  },
  {
    projectNumber: 'PROME-EXP-2023-001',
    projectName: 'Geotechnical Investigation & Foundation Engineering for Mbarara Commercial Complex',
    client: 'Private Infrastructure Developer',
    sector: 'Structures & Buildings',
    location: 'Mbarara, Uganda',
    contractValue: 'UGX 850,000,000',
    role: 'Lead Consultant',
    status: 'Completed',
    startDate: new Date('2023-04-01'),
    completionDate: new Date('2023-10-15'),
    description: 'Sub-surface geotechnical investigation, rotary core drilling, Standard Penetration Tests (SPT), pile foundation design, and deep excavation retaining wall stability analysis.',
    scopeOfServices: 'Geotechnical boreholes, soil mechanics laboratory testing, pile capacity calculations, retaining wall design, and foundation settlement monitoring.',
    clientContact: 'Managing Director, Mbarara Commercial Developments Ltd.'
  }
];

// Get all company experience records
router.get('/', authenticateToken, async (req, res) => {
  try {
    let records = await prisma.companyExperience.findMany({
      include: {
        createdBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Auto-seed initial records if table is empty
    if (records.length === 0) {
      for (const rec of initialExperiences) {
        await prisma.companyExperience.create({
          data: {
            ...rec,
            createdById: (req as any).user?.userId || null
          }
        });
      }
      records = await prisma.companyExperience.findMany({
        include: {
          createdBy: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    res.json(records);
  } catch (error) {
    console.error('Failed to fetch company experiences:', error);
    res.status(500).json({ message: 'Failed to fetch company experience records' });
  }
});

// Create a new experience record
router.post('/', authenticateToken, async (req: any, res) => {
  try {
    const { projectName, client, sector, location, contractValue, role, startDate, completionDate, status, description, scopeOfServices, clientContact } = req.body;

    const year = new Date().getFullYear();
    const count = await prisma.companyExperience.count({
      where: { projectNumber: { startsWith: `PROME-EXP-${year}` } }
    });
    const nextNum = (count + 1).toString().padStart(3, '0');
    const projectNumber = `PROME-EXP-${year}-${nextNum}`;

    const newRecord = await prisma.companyExperience.create({
      data: {
        projectNumber,
        projectName: projectName || 'New Executed Project',
        client: client || 'Client / Employer',
        sector: sector || 'Civil & Infrastructure',
        location: location || 'Uganda',
        contractValue: contractValue || null,
        role: role || 'Lead Consultant',
        startDate: startDate ? new Date(startDate) : null,
        completionDate: completionDate ? new Date(completionDate) : null,
        status: status || 'Completed',
        description: description || null,
        scopeOfServices: scopeOfServices || null,
        clientContact: clientContact || null,
        createdById: req.user?.userId || null
      },
      include: {
        createdBy: { select: { id: true, name: true } }
      }
    });

    res.status(201).json(newRecord);
  } catch (error) {
    console.error('Failed to create company experience:', error);
    res.status(500).json({ message: 'Failed to create company experience record' });
  }
});

// Get specific experience record
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const record = await prisma.companyExperience.findUnique({
      where: { id: parseInt(id) },
      include: {
        createdBy: { select: { id: true, name: true } }
      }
    });

    if (!record) return res.status(404).json({ message: 'Company experience record not found' });
    res.json(record);
  } catch (error) {
    console.error('Failed to fetch company experience record:', error);
    res.status(500).json({ message: 'Failed to fetch company experience record' });
  }
});

// Update experience record
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { projectName, client, sector, location, contractValue, role, startDate, completionDate, status, description, scopeOfServices, clientContact } = req.body;

    const updated = await prisma.companyExperience.update({
      where: { id: parseInt(id) },
      data: {
        projectName,
        client,
        sector,
        location,
        contractValue,
        role,
        startDate: startDate ? new Date(startDate) : null,
        completionDate: completionDate ? new Date(completionDate) : null,
        status,
        description,
        scopeOfServices,
        clientContact
      },
      include: {
        createdBy: { select: { id: true, name: true } }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to update company experience record:', error);
    res.status(500).json({ message: 'Failed to update company experience record' });
  }
});

// Delete experience record
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.companyExperience.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Failed to delete company experience record:', error);
    res.status(500).json({ message: 'Failed to delete company experience record' });
  }
});

export default router;
