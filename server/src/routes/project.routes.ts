import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken as authenticate } from '../middleware/auth';
import { checkProjectAccess } from '../middleware/projectAuth';
import { upload, driveService, GOOGLE_DRIVE_FOLDER_ID, getOrCreateProjectFolder } from '../services/drive.service';
import { Readable } from 'stream';

const router = Router();
const prisma = new PrismaClient();

// Get all projects the user has access to
router.get('/', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user!.userId },
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
            some: { userId: (req as any).user!.userId }
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
      where: { id: (req as any).user!.userId },
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

      // Assign user permissions based on their role
      if (req.body.members) {
        for (const member of req.body.members) {
          const roleName = member.role;
          const userId = parseInt(member.userId);
          const modulePerms = rolesDefaults[roleName] || rolesDefaults['Viewer'];
          
          for (const [mod, accessLevel] of Object.entries(modulePerms)) {
            await tx.projectUserPermission.create({
              data: {
                projectId: newProject.id,
                userId: userId,
                module: mod,
                accessLevel: accessLevel as string
              }
            });
          }
        }
      }

      // Auto-create Overall Project Progress Tracker Task
      const creatorId = parseInt((req as any).user!.userId);
      await tx.projectTask.create({
        data: {
          projectId: newProject.id,
          title: 'Overall Project Progress',
          description: 'System generated task to track the overall completion progress of the project.',
          status: 'In Progress',
          priority: 'High',
          progress: 0,
          isOverallProgressTracker: true,
          assignedToId: creatorId
        }
      });

      return newProject;
    });

    try {
        await getOrCreateProjectFolder(project.id, project.name, null);
    } catch (e) {
        console.error('Failed to create Google Drive folder for new project', e);
    }

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
        userPermissions: true
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

// Delete a project (Admin only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user!.userId },
      include: { role: true }
    });
    
    if (user?.role?.name !== 'Administrator') {
      return res.status(403).json({ message: 'Forbidden: Only Administrators can delete projects' });
    }

    const projectId = parseInt(req.params.id);

    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await prisma.project.delete({
      where: { id: projectId }
    });

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
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
    
    // Also provision default user permissions based on this role
    const allModules = [
        'Dashboard', 'Tasks', 'Schedule', 'Documents', 'Procurement', 
        'Daily Reports', 'Variations', 'Subcontractors', 'Punch List', 
        'Correspondence', 'Equipment Logs', 'HSE', 'Quality', 'Risks', 
        'Resources', 'Financials'
    ];
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
    
    const modulePerms = rolesDefaults[role] || rolesDefaults['Viewer'];
    for (const [mod, accessLevel] of Object.entries(modulePerms)) {
      await prisma.projectUserPermission.upsert({
        where: { projectId_userId_module: { projectId, userId: parseInt(userId), module: mod } },
        update: {}, // Don't override existing permissions if they exist
        create: { projectId, userId: parseInt(userId), module: mod, accessLevel: accessLevel as string }
      });
    }

    res.json(member);
  } catch (error) {
    console.error('Error assigning member:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update User Permissions Matrix
router.put('/:id/permissions', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const { permissions } = req.body;
    const projectId = parseInt(req.params.id);

    // Needs to be Administrator or Project Manager
    const membership = (req as any).projectMembership;
    const user = await prisma.user.findUnique({ where: { id: (req as any).user!.userId }, include: { role: true } });
    if (user?.role?.name !== 'Administrator' && membership?.role !== 'Project Manager') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await prisma.$transaction(async (tx) => {
      for (const p of permissions) {
        await tx.projectUserPermission.upsert({
          where: { projectId_userId_module: { projectId, userId: parseInt(p.userId), module: p.module } },
          update: { accessLevel: p.accessLevel },
          create: { projectId, userId: parseInt(p.userId), module: p.module, accessLevel: p.accessLevel }
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
      include: { 
        assignedTo: { select: { id: true, name: true } },
        milestone: true,
        dependencies: true,
        dependentOn: true
      },
      orderBy: { dueDate: 'asc' }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET Project Meetings
router.get('/:id/meetings', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const meetings = await prisma.projectMeeting.findMany({
      where: { projectId: parseInt(req.params.id) },
      orderBy: { date: 'asc' }
    });
    res.json(meetings);
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

// GET Project Payment Invoices
router.get('/:id/payment-invoices', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const invoices = await prisma.projectPaymentInvoice.findMany({
      where: { projectId: parseInt(req.params.id) },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { issueDate: 'desc' }
    });
    res.json(invoices);
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
      where: { id: (req as any).user!.userId },
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

// GET Project Milestones
router.get('/:id/milestones', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const milestones = await prisma.projectMilestone.findMany({
      where: { projectId: parseInt(req.params.id) },
      include: { tasks: true },
      orderBy: { targetDate: 'asc' }
    });
    res.json(milestones);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST Project Milestones
router.post('/:id/milestones', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const { title, description, targetDate, status } = req.body;
    const milestone = await prisma.projectMilestone.create({
      data: {
        projectId: parseInt(req.params.id),
        title,
        description,
        targetDate: new Date(targetDate),
        status: status || 'Pending'
      }
    });
    res.json(milestone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT Project Milestones
router.put('/:id/milestones/:milestoneId', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const { title, description, targetDate, status } = req.body;
    const milestone = await prisma.projectMilestone.update({
      where: { id: parseInt(req.params.milestoneId) },
      data: {
        title,
        description,
        targetDate: targetDate ? new Date(targetDate) : undefined,
        status
      }
    });
    res.json(milestone);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE Project Milestones
router.delete('/:id/milestones/:milestoneId', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    await prisma.projectMilestone.delete({
      where: { id: parseInt(req.params.milestoneId) }
    });
    res.json({ success: true });
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


// ---------------------------------------------------------------------------
// NEW POST ROUTES FOR ALL MODULES
// ---------------------------------------------------------------------------

// POST Project Tasks
router.post('/:id/tasks', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const { title, status, priority, assignedToId, dueDate, description, progress, isOverallProgressTracker } = req.body;
    const newTask = await prisma.projectTask.create({
      data: {
        projectId: parseInt(req.params.id),
        title,
        status: status || 'Pending',
        priority: priority || 'Medium',
        assignedToId: assignedToId ? parseInt(assignedToId) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        description,
        progress: progress ? parseInt(progress) : 0,
        isOverallProgressTracker: isOverallProgressTracker === true || isOverallProgressTracker === 'true',
        milestoneId: req.body.milestoneId ? parseInt(req.body.milestoneId) : undefined
      }
    });
    res.json(newTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT Project Tasks (Update progress & details)
router.put('/:id/tasks/:taskId', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const { progress, status, title, description, priority, assignedToId, dueDate, isOverallProgressTracker } = req.body;
    const taskId = parseInt(req.params.taskId);

    const userObj = await prisma.user.findUnique({ where: { id: (req as any).user.userId }, include: { role: true } });
    const isManagerOrAdmin = userObj?.role?.name === 'Administrator' || ['Project Manager', 'Project Top Managment', 'Project Top Management'].includes((req as any).projectMembership?.role || '');
    
    const updateData: any = {
      progress: progress !== undefined ? parseInt(progress) : undefined,
      status: status || undefined,
      completedDate: status === 'Completed' || progress === 100 ? new Date() : undefined,
      milestoneId: req.body.milestoneId ? parseInt(req.body.milestoneId) : undefined
    };

    if (isManagerOrAdmin) {
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (priority !== undefined) updateData.priority = priority;
      if (assignedToId !== undefined) updateData.assignedToId = assignedToId ? parseInt(assignedToId) : null;
      if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
      if (isOverallProgressTracker !== undefined) updateData.isOverallProgressTracker = isOverallProgressTracker === true || isOverallProgressTracker === 'true';
    }

    const updatedTask = await prisma.projectTask.update({
      where: { id: taskId },
      data: updateData
    });
    res.json(updatedTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST Task Dependency
router.post('/:id/tasks/:taskId/dependencies', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const { predecessorId, type } = req.body;
    const dependency = await prisma.taskDependency.create({
      data: {
        predecessorId: parseInt(predecessorId),
        successorId: parseInt(req.params.taskId),
        type: type || 'Finish-To-Start'
      }
    });
    res.json(dependency);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE Task Dependency
router.delete('/:id/tasks/:taskId/dependencies/:dependencyId', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    await prisma.taskDependency.delete({
      where: { id: parseInt(req.params.dependencyId) }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST Project Meetings
router.post('/:id/meetings', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const { title, date, time, locationOrLink, attendees, description } = req.body;
    const newMeeting = await prisma.projectMeeting.create({
      data: {
        projectId: parseInt(req.params.id),
        title,
        date: date ? new Date(date) : new Date(),
        time: time || '10:00 AM',
        locationOrLink: locationOrLink || 'TBD',
        attendees: attendees || '',
        description,
        status: 'Scheduled'
      }
    });
    res.json(newMeeting);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST Project Documents
router.post('/:id/documents', authenticate, checkProjectAccess(), upload.single('file'), async (req, res) => {
  try {
    const projectId = req.params.id;
    const { documentNumber, title, type, revision, status, issueDate } = req.body;
    const file = req.file;
    let fileUrl = null;

    if (file) {
      const project = await prisma.project.findUnique({ where: { id: Number(projectId) } });
      if (!project) return res.status(404).json({ error: 'Project not found' });
      const targetFolderId = await getOrCreateProjectFolder(project.id, project.name, project.driveFolderId);

      const fileMetadata = { name: file.originalname, parents: [targetFolderId] };
      const media = { mimeType: file.mimetype, body: Readable.from(file.buffer) };
      const driveFile = await driveService.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
        supportsAllDrives: true
      });
      const fileId = driveFile.data.id;
      if (fileId) {
        await driveService.permissions.create({
          fileId: fileId,
          requestBody: { role: 'reader', type: 'anyone' },
          supportsAllDrives: true
        });
        fileUrl = JSON.stringify({ view: driveFile.data.webViewLink, download: driveFile.data.webContentLink, isPdf: file.mimetype === 'application/pdf' });
      }
    }

    const newDoc = await prisma.projectDocument.create({
      data: {
        projectId: parseInt(projectId),
        documentNumber: documentNumber || `DOC-${Date.now()}`,
        title: title || file?.originalname || 'Untitled',
        type: type || 'General',
        revision: revision || '1.0',
        status: status || 'Draft',
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        uploadedById: (req as any).user!.userId,
        fileUrl,
      }
    });
    res.json(newDoc);
  } catch (error) {
    console.error('Error in documents post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST Project Payment Invoices
router.post('/:id/payment-invoices', authenticate, checkProjectAccess(), upload.single('file'), async (req, res) => {
  try {
    const projectId = req.params.id;
    const { documentNumber, title, type, revision, status, issueDate } = req.body;
    const file = req.file;
    let fileUrl = null;

    if (file) {
      const project = await prisma.project.findUnique({ where: { id: Number(projectId) } });
      if (!project) return res.status(404).json({ error: 'Project not found' });
      const targetFolderId = await getOrCreateProjectFolder(project.id, project.name, project.driveFolderId);

      const fileMetadata = { name: file.originalname, parents: [targetFolderId] };
      const media = { mimeType: file.mimetype, body: Readable.from(file.buffer) };
      const driveFile = await driveService.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
        supportsAllDrives: true
      });
      const fileId = driveFile.data.id;
      if (fileId) {
        await driveService.permissions.create({
          fileId: fileId,
          requestBody: { role: 'reader', type: 'anyone' },
          supportsAllDrives: true
        });
        fileUrl = JSON.stringify({ view: driveFile.data.webViewLink, download: driveFile.data.webContentLink, isPdf: file.mimetype === 'application/pdf' });
      }
    }

    const newInvoice = await prisma.projectPaymentInvoice.create({
      data: {
        projectId: parseInt(projectId),
        documentNumber: documentNumber || `INV-${Date.now()}`,
        title: title || file?.originalname || 'Untitled',
        type: type || 'Consultant Invoice',
        revision: revision || '1.0',
        status: status || 'Submitted',
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        uploadedById: (req as any).user!.userId,
        fileUrl,
      }
    });
    res.json(newInvoice);
  } catch (error) {
    console.error('Error in payment-invoices post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST Project Resources
router.post('/:id/resources', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const { type, userId, equipmentId, role, allocation, startDate, endDate } = req.body;
    const newRes = await prisma.projectResource.create({
      data: {
        projectId: parseInt(req.params.id),
        resourceType: type || 'Personnel',
        userId: userId ? parseInt(userId) : undefined,
        equipmentId: equipmentId ? parseInt(equipmentId) : undefined,
        role,
        allocationPercentage: allocation ? parseInt(allocation) : 100,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : undefined
      }
    });
    res.json(newRes);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST Project Financials
router.post('/:id/financials', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const { type, amount, date, description, status } = req.body;
    const newFin = await prisma.projectFinancial.create({
      data: {
        projectId: parseInt(req.params.id),
        type,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        description,
        status: status || 'Pending',
        loggedById: (req as any).user!.userId
      }
    });
    res.json(newFin);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST HSE Incidents
router.post('/:id/hse', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const { title, type, description, location, severity, incidentDate } = req.body;
    const newInc = await prisma.hseIncident.create({
      data: {
        projectId: parseInt(req.params.id),
        incidentNumber: `INC-${Date.now()}`,
        title,
        type,
        description,
        location,
        severity: severity || 'Low',
        incidentDate: incidentDate ? new Date(incidentDate) : new Date(),
        reportedById: (req as any).user!.userId
      }
    });
    res.json(newInc);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST Quality NCRs
router.post('/:id/quality', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const { title, productOrService, description, source, severity } = req.body;
    const newNcr = await prisma.nonConformityReport.create({
      data: {
        projectId: parseInt(req.params.id),
        ncrNumber: `NCR-${Date.now()}`,
        title,
        productOrService: productOrService || 'General',
        description,
        source: source || 'In-Process',
        severity: severity || 'Minor',
        reportedById: (req as any).user!.userId
      }
    });
    res.json(newNcr);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST Risks
router.post('/:id/risks', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const { title, type, category, description, likelihood, impact } = req.body;
    const newRisk = await prisma.risk.create({
      data: {
        projectId: parseInt(req.params.id),
        riskNumber: `RSK-${Date.now()}`,
        title,
        type: type || 'Risk',
        category: category || 'Project',
        description,
        likelihood: parseInt(likelihood || '1'),
        impact: parseInt(impact || '1'),
        score: parseInt(likelihood || '1') * parseInt(impact || '1'),
        ownerId: (req as any).user!.userId
      }
    });
    res.json(newRisk);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST Procurement Requisition
router.post('/:id/procurement', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const { itemName, quantity, unit, requestedDate, requiredDate } = req.body;
    const newReq = await prisma.projectMaterialRequisition.create({
      data: {
        projectId: parseInt(req.params.id),
        itemDescription: itemName || 'N/A',
        quantity: parseFloat(quantity),
        unit,
        requestedDate: requestedDate ? new Date(requestedDate) : new Date(),
        requiredDate: requiredDate ? new Date(requiredDate) : new Date(),
        status: 'Pending',
        requestedById: (req as any).user!.userId
      }
    });
    res.json(newReq);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST Daily Report
router.post('/:id/daily-reports', authenticate, checkProjectAccess(), upload.single('file'), async (req, res) => {
  try {
    const projectId = req.params.id;
    const { date, weatherCondition, manpowerCount, equipmentCount, summary, location } = req.body;
    const file = req.file;
    let fileUrl = null;

    if (file) {
      const project = await prisma.project.findUnique({ where: { id: Number(projectId) } });
      if (!project) return res.status(404).json({ error: 'Project not found' });
      const targetFolderId = await getOrCreateProjectFolder(project.id, project.name, project.driveFolderId);

      const fileMetadata = { name: file.originalname, parents: [targetFolderId] };
      const media = { mimeType: file.mimetype, body: Readable.from(file.buffer) };
      const driveFile = await driveService.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
        supportsAllDrives: true
      });
      const fileId = driveFile.data.id;
      if (fileId) {
        await driveService.permissions.create({
          fileId: fileId,
          requestBody: { role: 'reader', type: 'anyone' },
          supportsAllDrives: true
        });
        fileUrl = JSON.stringify({ view: driveFile.data.webViewLink, download: driveFile.data.webContentLink, isPdf: file.mimetype === 'application/pdf' });
      }
    }

    const newRep = await prisma.projectDailyReport.create({
      data: {
        projectId: parseInt(projectId),
        date: date ? new Date(date) : new Date(),
        weatherMorning: weatherCondition,
        activeManpower: parseInt(manpowerCount || '0'),
        activeEquipment: parseInt(equipmentCount || '0'),
        activities: summary || '',
        location: location || null,
        fileUrl: fileUrl,
        reportedById: (req as any).user!.userId
      }
    });
    res.json(newRep);
  } catch (error) {
    console.error('Error in daily reports post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST Variations
router.post('/:id/variations', authenticate, checkProjectAccess(), upload.single('file'), async (req, res) => {
  try {
    const projectId = req.params.id;
    const { title, description, costImpact, scheduleImpactDays, date, referenceNumber } = req.body;
    const file = req.file;
    let fileUrl = null;

    if (file) {
      const project = await prisma.project.findUnique({ where: { id: Number(projectId) } });
      if (!project) return res.status(404).json({ error: 'Project not found' });
      const targetFolderId = await getOrCreateProjectFolder(project.id, project.name, project.driveFolderId);

      const fileMetadata = { name: file.originalname, parents: [targetFolderId] };
      const media = { mimeType: file.mimetype, body: Readable.from(file.buffer) };
      const driveFile = await driveService.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
        supportsAllDrives: true
      });
      const fileId = driveFile.data.id;
      if (fileId) {
        await driveService.permissions.create({
          fileId: fileId,
          requestBody: { role: 'reader', type: 'anyone' },
          supportsAllDrives: true
        });
        fileUrl = driveFile.data.webViewLink;
      }
    }

    const newVar = await prisma.projectVariationOrder.create({
      data: {
        projectId: parseInt(projectId),
        referenceNumber: referenceNumber || `VO-${Date.now()}`,
        date: date ? new Date(date) : new Date(),
        title,
        description: description || '',
        costImpact: costImpact ? parseFloat(costImpact) : 0,
        scheduleImpact: scheduleImpactDays ? parseInt(scheduleImpactDays) : 0,
        status: 'Proposed',
        fileUrl
      }
    });
    res.json(newVar);
  } catch (error) {
    console.error('Error in variations post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST Subcontractors
router.post('/:id/subcontractors', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const { supplierId, scopeOfWork, contractValue, startDate, endDate } = req.body;
    const newSub = await prisma.projectSubcontractor.create({
      data: {
        projectId: parseInt(req.params.id),
        supplierId: parseInt(supplierId), // Must exist in Supplier table
        scopeOfWork,
        contractValue: contractValue ? parseFloat(contractValue) : 0,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : undefined,
        status: 'Active'
      }
    });
    res.json(newSub);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST Snags
router.post('/:id/snags', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const { location, description, severity, assignedToId } = req.body;
    const newSnag = await prisma.projectSnag.create({
      data: {
        projectId: parseInt(req.params.id),
        location,
        description,
        severity: severity || 'Minor',
        status: 'Open',
        reportedById: (req as any).user!.userId,
        assignedToId: assignedToId ? parseInt(assignedToId) : undefined
      }
    });
    res.json(newSnag);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST Correspondence
router.post('/:id/correspondence', authenticate, checkProjectAccess(), upload.single('file'), async (req, res) => {
  try {
    const projectId = req.params.id;
    const { type, subject, sender, recipient, date, referenceNumber } = req.body;
    const file = req.file;
    let fileUrl = null;

    if (file) {
      const project = await prisma.project.findUnique({ where: { id: Number(projectId) } });
      if (!project) return res.status(404).json({ error: 'Project not found' });
      const targetFolderId = await getOrCreateProjectFolder(project.id, project.name, project.driveFolderId);

      const fileMetadata = { name: file.originalname, parents: [targetFolderId] };
      const media = { mimeType: file.mimetype, body: Readable.from(file.buffer) };
      const driveFile = await driveService.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
        supportsAllDrives: true
      });
      const fileId = driveFile.data.id;
      if (fileId) {
        await driveService.permissions.create({
          fileId: fileId,
          requestBody: { role: 'reader', type: 'anyone' },
          supportsAllDrives: true
        });
        fileUrl = driveFile.data.webViewLink;
      }
    }

    const newCorr = await prisma.projectCorrespondence.create({
      data: {
        projectId: parseInt(projectId),
        referenceNumber: referenceNumber || `CORR-${Date.now()}`,
        type,
        subject,
        sender,
        recipient,
        date: date ? new Date(date) : new Date(),
        category: 'Letter',
        fileUrl
      }
    });
    res.json(newCorr);
  } catch (error) {
    console.error('Error in correspondence post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST Equipment Logs
router.post('/:id/equipment-logs', authenticate, checkProjectAccess(), async (req, res) => {
  try {
    const { equipmentId, date, runningHours, fuelConsumedLiters, breakdownStatus, notes } = req.body;
    const newLog = await prisma.projectEquipmentLog.create({
      data: {
        projectId: parseInt(req.params.id),
        equipmentId: parseInt(equipmentId), // Must exist
        date: date ? new Date(date) : new Date(),
        runningHours: runningHours ? parseFloat(runningHours) : 0,
        fuelConsumed: fuelConsumedLiters ? parseFloat(fuelConsumedLiters) : null,
        breakdownStatus: breakdownStatus === 'true' || breakdownStatus === true
      }
    });
    res.json(newLog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

