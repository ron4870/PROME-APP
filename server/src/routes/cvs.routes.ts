import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken as authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Enforce role-based permission for CVs module
const checkCvsPermission = async (req: any, res: any, next: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { roles: true }
    });
    const hasPerm = user?.roles?.some(role => {
      if (role.name === 'Administrator' || role.name === 'Admin' || role.name === 'Super Admin') return true;
      return !!(role.permissions as any)?.cvs;
    });
    if (!hasPerm) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access the CVs module.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error verifying permission' });
  }
};

// Get all CV Projects
router.get('/', authenticate, checkCvsPermission, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user!.userId },
      include: { roles: true }
    });

    let projects;
    if (user?.roles?.some(r => r.name === 'Administrator' || r.name === 'Managing Director')) {
      projects = await prisma.cvProject.findMany({
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      projects = await prisma.cvProject.findMany({
        where: {
          isTemplate: false,
          members: { some: { userId: (req as any).user!.userId } }
        },
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    const formattedProjects = projects.map((p: any) => ({
      ...p,
      membersCount: p.members.length
    }));

    res.json(formattedProjects);
  } catch (error) {
    console.error('Error fetching CV projects:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new CV Project (copies template)
router.post('/', authenticate, checkCvsPermission, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user!.userId },
      include: { roles: true }
    });
    
    const canCreate = user?.roles?.some(r => ['Administrator', 'Managing Director', 'Head of Division'].includes(r.name));
    if (!canCreate) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to create CV projects.' });
    }

    const { name, client, description, members } = req.body;

    const project = await prisma.$transaction(async (tx) => {
      // 1. Create the new project
      const newProject = await tx.cvProject.create({
        data: {
          name,
          client,
          description,
          isTemplate: false
        }
      });

      // 2. Add members
      if (members && Array.isArray(members)) {
        for (const member of members) {
          await tx.cvProjectMember.create({
            data: {
              projectId: newProject.id,
              userId: parseInt(member.userId),
              role: member.role
            }
          });
        }
      }

      // 3. Find template project to copy pages from
      const templateProject = await tx.cvProject.findFirst({
        where: { isTemplate: true },
        include: { pages: true }
      });

      if (templateProject && templateProject.pages.length > 0) {
        // Copy pages
        for (const page of templateProject.pages) {
          await tx.cvPage.create({
            data: {
              projectId: newProject.id,
              section: page.section,
              pageNumber: page.pageNumber,
              canvasState: page.canvasState
            }
          });
        }
      } else {
        // If no template exists, create default CV sections
        const defaultSections = [
          "Cover Page", "Personal Profile", "Key Qualifications", 
          "Education & Training", "Professional Experience", 
          "Key Project Experience", "Languages", "References", "Final CV Document"
        ];
        
        for (const section of defaultSections) {
          await tx.cvPage.create({
            data: {
              projectId: newProject.id,
              section: section,
              pageNumber: 1,
              canvasState: null
            }
          });
        }
      }

      return newProject;
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating CV project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single CV project
router.get('/:id', authenticate, checkCvsPermission, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user!.userId },
      include: { roles: true }
    });
    
    const project = await prisma.cvProject.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } }
        },
        pages: {
          orderBy: { pageNumber: 'asc' }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'CV Project not found' });
    }

    const isAdminOrMD = user?.roles?.some(r => r.name === 'Administrator' || r.name === 'Managing Director');
    let hasAccess = false;
    
    if (isAdminOrMD) {
      hasAccess = true;
    } else if (project.isTemplate) {
      hasAccess = false;
    } else if (project.members.some((m: any) => m.userId === user?.id)) {
      hasAccess = true;
    }
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Forbidden access' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching CV project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update project details
router.put('/:id', authenticate, checkCvsPermission, async (req, res) => {
  try {
    const { name, client, description } = req.body;
    const projectId = parseInt(req.params.id);

    const project = await prisma.cvProject.update({
      where: { id: projectId },
      data: {
        name: name !== undefined ? name : undefined,
        client: client !== undefined ? client : undefined,
        description: description !== undefined ? description : undefined,
      }
    });

    res.json(project);
  } catch (error) {
    console.error('Error updating CV project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create/Add a new page to a section
router.post('/:id/pages', authenticate, checkCvsPermission, async (req, res) => {
  try {
    const { section, canvasState, name } = req.body;
    const projectId = parseInt(req.params.id);

    const existingPages = await prisma.cvPage.findMany({
      where: { projectId, section },
      orderBy: { pageNumber: 'desc' },
      take: 1
    });
    
    const nextPageNumber = existingPages.length > 0 ? existingPages[0].pageNumber + 1 : 1;

    const newPage = await prisma.cvPage.create({
      data: {
        projectId,
        section,
        name: name || 'Unnamed Page',
        pageNumber: nextPageNumber,
        canvasState: canvasState || null
      }
    });

    res.status(201).json(newPage);
  } catch (error) {
    console.error('Error adding CV page:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a page
router.put('/:id/pages/:pageId', authenticate, checkCvsPermission, async (req, res) => {
  try {
    const { canvasState, name, applyFrame, includeInFinal } = req.body;
    const pageId = parseInt(req.params.pageId);

    const updateData: any = {};
    if (canvasState !== undefined) updateData.canvasState = canvasState;
    if (name !== undefined) updateData.name = name;
    if (applyFrame !== undefined) updateData.applyFrame = applyFrame;
    if (includeInFinal !== undefined) updateData.includeInFinal = includeInFinal;

    const updatedPage = await prisma.cvPage.update({
      where: { id: pageId },
      data: updateData
    });

    res.json(updatedPage);
  } catch (error) {
    console.error('Error updating CV page:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a page
router.delete('/:id/pages/:pageId', authenticate, checkCvsPermission, async (req, res) => {
  try {
    const pageId = parseInt(req.params.pageId);

    await prisma.cvPage.delete({
      where: { id: pageId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting CV page:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update sections order
router.put('/:id/sections/order', authenticate, checkCvsPermission, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const { sectionsOrder } = req.body;

    const project = await prisma.cvProject.update({
      where: { id: projectId },
      data: {
        sectionsOrder
      }
    });

    res.json(project);
  } catch (error) {
    console.error('Error updating CV sections order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reorder pages within a section
router.put('/:id/pages/reorder', authenticate, checkCvsPermission, async (req, res) => {
  try {
    const { pageIds } = req.body; // Array of page IDs in their new order
    
    await prisma.$transaction(
      pageIds.map((id: number, index: number) =>
        prisma.cvPage.update({
          where: { id },
          data: { pageNumber: index + 1 }
        })
      )
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering CV pages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update final book sections order
router.put('/:id/finalBookSectionsOrder', authenticate, checkCvsPermission, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const { finalBookSections } = req.body;

    const project = await prisma.cvProject.update({
      where: { id: projectId },
      data: {
        finalBookSections
      }
    });

    res.json(project);
  } catch (error) {
    console.error('Error updating final CV sections order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
