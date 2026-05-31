import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken as authenticate } from '../middleware/auth';
import { checkProjectAccess } from '../middleware/projectAuth';

const router = Router();
const prisma = new PrismaClient();

// Get all projects the user has access to
router.get('/', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user!.id },
      include: { role: true }
    });

    let projects;
    // Admins see all projects
    if (user?.role?.name === 'Administrator') {
      projects = await prisma.project.findMany({
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } }
          }
        },
        orderBy: { startDate: 'desc' }
      });
    } else {
      // Normal users only see projects they are members of
      projects = await prisma.project.findMany({
        where: {
          members: {
            some: { userId: (req as any).user!.id }
          }
        },
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } }
          }
        },
        orderBy: { startDate: 'desc' }
      });
    }

    // Format for frontend
    const formattedProjects = projects.map(p => ({
      ...p,
      membersCount: p.members.length
    }));

    res.json(formattedProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new project (Admin only for now)
router.post('/', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user!.id },
      include: { role: true }
    });
    
    if (user?.role?.name !== 'Administrator') {
      return res.status(403).json({ message: 'Forbidden: Only Administrators can create projects' });
    }
    const { name, client, description, startDate, endDate, budget, members } = req.body;

    const project = await prisma.$transaction(async (tx) => {
      // Create the project
      const newProject = await tx.project.create({
        data: {
          name,
          client,
          description,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          budget: budget ? parseFloat(budget) : null,
          status: 'Active'
        }
      });

      // Add members if provided
      if (members && Array.isArray(members)) {
        for (const member of members) {
          await tx.projectMember.create({
            data: {
              projectId: newProject.id,
              userId: parseInt(member.userId),
              role: member.role
            }
          });
        }
      }

      // Generate default permissions for standard roles
      const allModules = ['Dashboard', 'Tasks', 'Schedule', 'Documents', 'Procurement', 'Daily Reports', 'Variations', 'Subcontractors', 'Punch List', 'Correspondence', 'Equipment Logs', 'HSE', 'Quality', 'Risk Register', 'Team', 'Financials'];
      
      const rolesDefaults: Record<string, Record<string, string>> = {
        'Project Manager': allModules.reduce((acc, mod) => ({ ...acc, [mod]: 'Edit' }), {}),
        'Lead Engineer': allModules.reduce((acc, mod) => ({ ...acc, [mod]: mod === 'Financials' ? 'Read' : 'Edit' }), {}),
        'Site Engineer': allModules.reduce((acc, mod) => ({ ...acc, [mod]: ['Financials', 'Procurement', 'Variations'].includes(mod) ? 'None' : (['Tasks', 'Daily Reports', 'HSE', 'Quality', 'Punch List', 'Equipment Logs'].includes(mod) ? 'Edit' : 'Read') }), {}),
        'Project Staff': allModules.reduce((acc, mod) => ({ ...acc, [mod]: ['Financials', 'Subcontractors'].includes(mod) ? 'None' : (['Tasks'].includes(mod) ? 'Edit' : 'Read') }), {}),
        'Project Secretary': allModules.reduce((acc, mod) => ({ ...acc, [mod]: ['Documents', 'Correspondence', 'Team'].includes(mod) ? 'Edit' : (['Financials', 'Variations'].includes(mod) ? 'None' : 'Read') }), {}),
        'Project Top Managment': allModules.reduce((acc, mod) => ({ ...acc, [mod]: 'Read' }), {}),
        'Contractor': allModules.reduce((acc, mod) => ({ ...acc, [mod]: ['Tasks', 'Daily Reports'].includes(mod) ? 'Edit' : (['Financials', 'Procurement', 'Risk Register'].includes(mod) ? 'None' : 'Read') }), {}),
        'Employer': allModules.reduce((acc, mod) => ({ ...acc, [mod]: 'Read' }), {}),
        'Viewer': allModules.reduce((acc, mod) => ({ ...acc, [mod]: mod === 'Financials' ? 'None' : 'Read' }), {})
      };

      for (const [roleName, modulePerms] of Object.entries(rolesDefaults)) {
        for (const [mod, accessLevel] of Object.entries(modulePerms)) {
          await tx.projectRolePermission.create({
            data: {
              projectId: newProject.id,
              role: roleName,
              module: mod,
              accessLevel: accessLevel as string
            }
          });
        }
      }

      return newProject;
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single project
router.get('/:id', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, division: true } } }
        },
        rolePermissions: true
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Assign Member to Project
router.post('/:id/members', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const { userId, role } = req.body;
    const projectId = parseInt(req.params.id);

    // Upsert the member role
    const member = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: parseInt(userId) } },
      update: { role },
      create: { projectId, userId: parseInt(userId), role }
    });
    
    res.json(member);
  } catch (error) {
    console.error('Error assigning member:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Role Permissions Matrix
router.put('/:id/permissions', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const { permissions } = req.body;
    const projectId = parseInt(req.params.id);

    // Needs to be Administrator or Project Manager
    const membership = (req as any).projectMembership;
    const user = await prisma.user.findUnique({ where: { id: (req as any).user!.id }, include: { role: true } });
    if (user?.role?.name !== 'Administrator' && membership?.role !== 'Project Manager') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await prisma.$transaction(async (tx) => {
      for (const p of permissions) {
        await tx.projectRolePermission.upsert({
          where: { projectId_role_module: { projectId, role: p.role, module: p.module } },
          update: { accessLevel: p.accessLevel },
          create: { projectId, role: p.role, module: p.module, accessLevel: p.accessLevel }
        });
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET Project Tasks
router.get('/:id/tasks', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const tasks = await prisma.projectTask.findMany({
      where: { projectId: parseInt(req.params.id) },
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: { dueDate: 'asc' }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET Project Documents
router.get('/:id/documents', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const docs = await prisma.projectDocument.findMany({
      where: { projectId: parseInt(req.params.id) },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { issueDate: 'desc' }
    });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET Project Resources
router.get('/:id/resources', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const resources = await prisma.projectResource.findMany({
      where: { projectId: parseInt(req.params.id) },
      include: { 
        user: { select: { id: true, name: true, division: true } },
        equipment: { select: { id: true, name: true, equipmentNumber: true } }
      },
      orderBy: { startDate: 'desc' }
    });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET Project Financials (Restricted)
router.get('/:id/financials', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user!.id },
      include: { role: true }
    });

    const membership = (req as any).projectMembership;
    
    // Authorization Check: Only Admin, Project Manager, or Financial Controller can view
    const isAllowed = user?.role?.name === 'Administrator' || 
                      user?.role?.name === 'Accountant' || 
                      ['Project Manager', 'Project Top Managment', 'Employer'].includes(membership?.role || '');

    if (!isAllowed) {
      return res.status(403).json({ message: 'Forbidden: Financial data restricted' });
    }

    const financials = await prisma.projectFinancial.findMany({
      where: { projectId: parseInt(req.params.id) },
      orderBy: { date: 'desc' }
    });
    res.json(financials);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET Project HSE Data (Incidents & Proactive Metrics)
router.get('/:id/hse', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const incidents = await prisma.hseIncident.findMany({
      where: { projectId: parseInt(req.params.id) },
      orderBy: { incidentDate: 'desc' }
    });
    // In a real scenario we might also fetch Walkdowns/Toolbox Talks here
    res.json({ incidents });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET Project Quality Data (NCRs & Inspections)
router.get('/:id/quality', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const ncrs = await prisma.nonConformityReport.findMany({
      where: { projectId: parseInt(req.params.id) },
      orderBy: { createdAt: 'desc' }
    });
    // Engineering Inspections would be fetched here
    res.json({ ncrs });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET Project Risks
router.get('/:id/risks', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const risks = await prisma.risk.findMany({
      where: { projectId: parseInt(req.params.id) },
      orderBy: { score: 'desc' }
    });
    res.json(risks);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// PHASE 5: ADVANCED ENGINEERING MODULES
// ---------------------------------------------------------------------------

// GET Procurement & Materials
router.get('/:id/procurement', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const requisitions = await prisma.projectMaterialRequisition.findMany({
      where: { projectId: parseInt(req.params.id) },
      orderBy: { requestedDate: 'desc' }
    });
    const inventory = await prisma.projectInventory.findMany({
      where: { projectId: parseInt(req.params.id) },
      orderBy: { itemName: 'asc' }
    });
    res.json({ requisitions, inventory });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET Daily Progress Reports
router.get('/:id/daily-reports', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const reports = await prisma.projectDailyReport.findMany({
      where: { projectId: parseInt(req.params.id) },
      orderBy: { date: 'desc' }
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET Variation Orders & Claims
router.get('/:id/variations', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const variations = await prisma.projectVariationOrder.findMany({
      where: { projectId: parseInt(req.params.id) },
      orderBy: { createdAt: 'desc' }
    });
    res.json(variations);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET Subcontractors
router.get('/:id/subcontractors', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const subcontractors = await prisma.projectSubcontractor.findMany({
      where: { projectId: parseInt(req.params.id) },
      include: { supplier: { select: { name: true } }, paymentApps: true },
      orderBy: { startDate: 'desc' }
    });
    res.json(subcontractors);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET Snags / Punch List
router.get('/:id/snags', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const snags = await prisma.projectSnag.findMany({
      where: { projectId: parseInt(req.params.id) },
      include: { assignedTo: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(snags);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET Formal Correspondence
router.get('/:id/correspondence', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const correspondence = await prisma.projectCorrespondence.findMany({
      where: { projectId: parseInt(req.params.id) },
      orderBy: { date: 'desc' }
    });
    res.json(correspondence);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET Equipment Logs
router.get('/:id/equipment-logs', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const logs = await prisma.projectEquipmentLog.findMany({
      where: { projectId: parseInt(req.params.id) },
      include: { equipment: { select: { equipmentNumber: true, name: true } } },
      orderBy: { date: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
