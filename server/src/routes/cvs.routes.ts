import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken as authenticate } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { generateCustomCv, getCandidateCvTexts } from '../services/cv-ai.service';

const router = Router();
const prisma = new PrismaClient();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

function getCatalogueData(): any[] {
  const possiblePaths = [
    path.join(__dirname, '../data/drive_cvs_catalogue.json'),
    path.join(__dirname, '../../src/data/drive_cvs_catalogue.json'),
    path.join(process.cwd(), 'server/src/data/drive_cvs_catalogue.json'),
    path.join(process.cwd(), 'src/data/drive_cvs_catalogue.json'),
    path.join(process.cwd(), 'dist/data/drive_cvs_catalogue.json'),
    '/app/server/src/data/drive_cvs_catalogue.json',
    '/app/dist/data/drive_cvs_catalogue.json'
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch (e) {
        console.error('Error reading catalogue from', p, e);
      }
    }
  }
  return [];
}

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
          category: true,
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
          category: true,
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

    const { name, client, description, members, categoryId } = req.body;

    const project = await prisma.$transaction(async (tx) => {
      // 1. Create the new project
      const newProject = await tx.cvProject.create({
        data: {
          name,
          client,
          description,
          isTemplate: false,
          categoryId: categoryId ? parseInt(categoryId) : null
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

// Fetch all CV Categories
router.get('/categories/all', authenticate, checkCvsPermission, async (req, res) => {
  try {
    const categories = await prisma.cvCategory.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching CV categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new CV Category (only admin)
router.post('/categories', authenticate, checkCvsPermission, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user!.userId },
      include: { roles: true }
    });
    
    const isAdmin = user?.roles?.some(r => r.name === 'Administrator');
    if (!isAdmin) {
      return res.status(403).json({ message: 'Forbidden: Only administrators can create new categories.' });
    }

    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const category = await prisma.cvCategory.create({
      data: { name: name.trim() }
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating CV category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Fetch CVs Catalogue (from Google Drive index)
router.get('/catalogue', authenticate, checkCvsPermission, async (req, res) => {
  try {
    const { search = '', category = '', candidate = '', fileType = '', page = '1', limit = '30' } = req.query as any;

    const items = getCatalogueData();
    const categoriesSet = new Set<string>();
    const candidatesSet = new Set<string>();

    for (const item of items) {
      if (item.category) categoriesSet.add(item.category);
      if (item.candidateName && item.candidateName.length > 2) candidatesSet.add(item.candidateName);
    }

    const categories = Array.from(categoriesSet).sort();
    const candidates = Array.from(candidatesSet).sort();

    // Filter items
    let filtered = items;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(item => 
        (item.fileName && item.fileName.toLowerCase().includes(q)) ||
        (item.candidateName && item.candidateName.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q))
      );
    }

    if (category && category !== 'All') {
      filtered = filtered.filter(item => item.category === category);
    }

    if (candidate && candidate !== 'All') {
      const candLower = candidate.toLowerCase();
      filtered = filtered.filter(item => 
        item.candidateName && item.candidateName.toLowerCase() === candLower
      );
    }

    if (fileType && fileType !== 'All') {
      filtered = filtered.filter(item => item.fileType && item.fileType.toUpperCase() === fileType.toUpperCase());
    }

    const total = filtered.length;
    const pageNum = parseInt(page) || 1;
    const limitNum = limit === 'all' ? total : (parseInt(limit) || 30);
    const totalPages = Math.ceil(total / limitNum) || 1;

    let paginated = filtered;
    if (limit !== 'all') {
      const startIndex = (pageNum - 1) * limitNum;
      paginated = filtered.slice(startIndex, startIndex + limitNum);
    }

    res.json({
      items: paginated,
      total,
      page: pageNum,
      totalPages,
      categories,
      candidates
    });
  } catch (error) {
    console.error('Error fetching CV catalogue:', error);
    res.status(500).json({ message: 'Server error fetching CV catalogue' });
  }
});

// Fetch distinct candidates list with their available CV counts
router.get('/candidates', authenticate, checkCvsPermission, async (req, res) => {
  try {
    const items = getCatalogueData();
    const candidatesMap = new Map<string, { name: string; count: number; categories: string[]; files: any[] }>();

    for (const item of items) {
      let name = (item.candidateName || '').trim();
      if (!name || name.length < 2 || /^\d+$/.test(name)) continue;
      name = name.replace(/^[\d\s._-]+/, '').trim();
      if (!name || name.length < 2 || /^\d+$/.test(name)) continue;

      if (!candidatesMap.has(name)) {
        candidatesMap.set(name, {
          name,
          count: 0,
          categories: [],
          files: []
        });
      }
      const entry = candidatesMap.get(name)!;
      entry.count += 1;
      if (item.category && !entry.categories.includes(item.category)) {
        entry.categories.push(item.category);
      }
      entry.files.push({
        id: item.id,
        fileName: item.fileName,
        fileType: item.fileType,
        fileSize: item.fileSize,
        date: item.date,
        driveUrl: item.driveUrl
      });
    }

    const candidateList = Array.from(candidatesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    res.json(candidateList);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ message: 'Server error fetching candidates' });
  }
});

// Fetch candidate specific CVs
router.get('/candidate-cvs/:candidateName', authenticate, checkCvsPermission, async (req, res) => {
  try {
    const candidateName = decodeURIComponent(req.params.candidateName).toLowerCase().trim();
    const items = getCatalogueData();
    const matching = items.filter(item => {
      const c = (item.candidateName || '').toLowerCase().trim();
      const f = (item.fileName || '').toLowerCase().trim();
      return c === candidateName || (candidateName.length > 4 && (c.includes(candidateName) || candidateName.includes(c) || f.includes(candidateName)));
    });

    res.json(matching);
  } catch (error) {
    console.error('Error fetching candidate CVs:', error);
    res.status(500).json({ message: 'Server error fetching candidate CVs' });
  }
});

// AI Custom CV Generator
router.post('/generate-custom', authenticate, checkCvsPermission, upload.single('formatFile'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user!.userId },
      include: { roles: true }
    });

    const canCreate = user?.roles?.some(r => ['Administrator', 'Managing Director', 'Head of Division'].includes(r.name));
    if (!canCreate) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to create CV profiles.' });
    }

    const {
      candidateName,
      categoryName,
      categoryId,
      profileTitle,
      jobTitle,
      targetJob,
      customInstructions,
      formatType
    } = req.body;

    if (!candidateName || !candidateName.trim()) {
      return res.status(400).json({ message: 'Candidate Name is required' });
    }

    const items = getCatalogueData();

    // Call Gemini custom CV generator
    const generated = await generateCustomCv({
      candidateName: candidateName.trim(),
      categoryName: categoryName || 'General Engineering & Consulting',
      profileTitle: profileTitle ? profileTitle.trim() : undefined,
      jobTitle: jobTitle ? jobTitle.trim() : undefined,
      targetJob: targetJob ? targetJob.trim() : undefined,
      customInstructions: customInstructions ? customInstructions.trim() : undefined,
      formatType: formatType || 'UNRA Standard Format',
      formatFileBuffer: req.file ? req.file.buffer : undefined,
      formatFileName: req.file ? req.file.originalname : undefined
    }, items);

    // Resolve categoryId if string or find category
    let finalCategoryId: number | null = null;
    if (categoryId && !isNaN(parseInt(categoryId))) {
      finalCategoryId = parseInt(categoryId);
    } else if (categoryName) {
      let existingCat = await prisma.cvCategory.findFirst({
        where: { name: { equals: categoryName.trim(), mode: 'insensitive' } }
      });
      if (!existingCat) {
        existingCat = await prisma.cvCategory.create({
          data: { name: categoryName.trim() }
        });
      }
      finalCategoryId = existingCat.id;
    }

    // Create the CV Project in database
    const projectName = profileTitle && profileTitle.trim() 
      ? profileTitle.trim() 
      : `${candidateName.trim()} - ${jobTitle || formatType || 'Custom CV'}`;

    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.cvProject.create({
        data: {
          name: projectName,
          client: candidateName.trim(),
          description: `Format: ${generated.formatUsed || formatType || 'Custom'}\nTarget Tender: ${jobTitle || 'Standard Bid'}\n\nExecutive Summary:\n${generated.executiveSummary || ''}\n\nFull Formatted CV:\n${generated.fullMarkdownCv || ''}`,
          isTemplate: false,
          categoryId: finalCategoryId,
          sectionsOrder: generated.sections.map(s => s.sectionName)
        }
      });

      // Add creator as Editor
      await tx.cvProjectMember.create({
        data: {
          projectId: newProject.id,
          userId: (req as any).user!.userId,
          role: 'Editor'
        }
      });

      // Create CV pages populated with the AI-tailored content
      for (let i = 0; i < generated.sections.length; i++) {
        const sec = generated.sections[i];
        const fabricState = {
          version: "5.3.0",
          objects: [
            {
              type: "textbox",
              text: sec.content || "",
              fontSize: 13,
              fontFamily: "Arial",
              fill: "#1e293b",
              left: 40,
              top: 40,
              width: 720,
              lineHeight: 1.35,
              splitByGrapheme: true
            }
          ]
        };
        await tx.cvPage.create({
          data: {
            projectId: newProject.id,
            section: sec.sectionName,
            pageNumber: 1,
            name: sec.sectionName,
            canvasState: JSON.stringify({
              fabricState,
              overlays: [],
              markdownContent: sec.content,
              aiGenerated: true
            })
          }
        });
      }

      return newProject;
    });

    res.status(201).json({
      success: true,
      project,
      customCv: generated
    });
  } catch (error: any) {
    console.error('Error generating custom CV with AI:', error);
    res.status(500).json({ message: error.message || 'Server error generating custom CV' });
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
        category: true,
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

// Update page includeInFinal status
router.put('/:id/pages/:pageId/include', authenticate, checkCvsPermission, async (req, res) => {
  try {
    const pageId = parseInt(req.params.pageId);
    const { includeInFinal } = req.body;

    const page = await prisma.cvPage.update({
      where: { id: pageId },
      data: { includeInFinal }
    });

    res.json(page);
  } catch (error) {
    console.error('Error updating page include status:', error);
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

// Rename a section (updates sectionsOrder, finalBookSections, and all pages belonging to the section)
router.put('/:id/sections/rename', authenticate, checkCvsPermission, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const { oldName, newName } = req.body;

    if (!oldName || !newName || !newName.trim()) {
      return res.status(400).json({ message: 'Old and new section names are required' });
    }

    const project = await prisma.cvProject.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Update sectionsOrder
    let sectionsOrder: string[] = Array.isArray(project.sectionsOrder) ? (project.sectionsOrder as string[]) : [];
    sectionsOrder = sectionsOrder.map(s => s === oldName ? newName.trim() : s);

    // Update finalBookSections
    let finalBookSections: string[] = Array.isArray(project.finalBookSections) ? (project.finalBookSections as string[]) : [];
    finalBookSections = finalBookSections.map(s => s === oldName ? newName.trim() : s);

    await prisma.$transaction([
      prisma.cvProject.update({
        where: { id: projectId },
        data: {
          sectionsOrder,
          finalBookSections
        }
      }),
      prisma.cvPage.updateMany({
        where: { projectId, section: oldName },
        data: { section: newName.trim() }
      })
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error renaming section:', error);
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
