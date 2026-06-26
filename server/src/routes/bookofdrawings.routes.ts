import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken as authenticate } from '../middleware/auth';
import { getOrCreateBookOfDrawingsFolder } from '../services/drive.service';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
// @ts-ignore
const dxf = require('dxf');

const upload = multer({ dest: 'uploads/' });

const router = Router();
const prisma = new PrismaClient();

// Get all Book of Drawings Projects
router.get('/', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user!.userId },
      include: { role: true }
    });

    let projects;
    if (user?.role?.name === 'Administrator' || user?.role?.name === 'Managing Director') {
      projects = await prisma.bookOfDrawingsProject.findMany({
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      projects = await prisma.bookOfDrawingsProject.findMany({
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

    const formattedProjects = projects.map(p => ({
      ...p,
      membersCount: p.members.length
    }));

    res.json(formattedProjects);
  } catch (error) {
    console.error('Error fetching Book of Drawings projects:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new Book of Drawings Project (copies template)
router.post('/', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user!.userId },
      include: { role: true }
    });
    
    const canCreate = ['Administrator', 'Managing Director', 'Head of Division'].includes(user?.role?.name || '');
    if (!canCreate) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to create projects.' });
    }

    const { name, client, description, members } = req.body;

    const project = await prisma.$transaction(async (tx) => {
      // 1. Create the new project
      const newProject = await tx.bookOfDrawingsProject.create({
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
          await tx.bookOfDrawingsProjectMember.create({
            data: {
              projectId: newProject.id,
              userId: parseInt(member.userId),
              role: member.role
            }
          });
        }
      }

      // 3. Find template project to copy pages from
      const templateProject = await tx.bookOfDrawingsProject.findFirst({
        where: { isTemplate: true },
        include: { pages: true }
      });

      if (templateProject && templateProject.pages.length > 0) {
        // Copy pages
        for (const page of templateProject.pages) {
          await tx.bookOfDrawingsPage.create({
            data: {
              projectId: newProject.id,
              section: page.section,
              pageNumber: page.pageNumber,
              canvasState: page.canvasState
            }
          });
        }
      } else {
        // If no template exists or it's empty, create default sections with 1 empty page each
        const defaultSections = [
          "Page Layout", "Cover Page", "General", "Typical Cross Sections & Pavement Details",
          "Setting-Out Data", "Detailed Plan and Profile", "Cross Sections", "Layout Drawings",
          "Junctions & Intersections", "Utility Services", "Drainage Details", "Structures Details",
          "Geotechnical Works", "Landscaping Works", "Traffic Accomodation", "Engineer's Facilities",
          "Road Signs & Marking", "Ancillary Works", "Final Book"
        ];
        
        for (const section of defaultSections) {
          await tx.bookOfDrawingsPage.create({
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

    try {
      await getOrCreateBookOfDrawingsFolder(project.id, project.name, null);
    } catch (e) {
      console.error('Failed to create Google Drive folder for new Book of Drawings project', e);
    }

    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating Book of Drawings project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single project
router.get('/:id', authenticate, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    // Check access
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user!.userId },
      include: { role: true }
    });
    
    const project = await prisma.bookOfDrawingsProject.findUnique({
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
      return res.status(404).json({ message: 'Project not found' });
    }

    const isAdminOrMD = user?.role?.name === 'Administrator' || user?.role?.name === 'Managing Director';
    let hasAccess = false;
    
    if (isAdminOrMD) {
      hasAccess = true;
    } else if (project.isTemplate) {
      hasAccess = false;
    } else if (project.members.some(m => m.userId === user?.id)) {
      hasAccess = true;
    }
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching Book of Drawings project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update project details
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, client, description } = req.body;
    const projectId = parseInt(req.params.id);

    const project = await prisma.bookOfDrawingsProject.update({
      where: { id: projectId },
      data: {
        name: name !== undefined ? name : undefined,
        client: client !== undefined ? client : undefined,
        description: description !== undefined ? description : undefined,
      }
    });

    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create/Add a new page to a section
router.post('/:id/pages', authenticate, async (req, res) => {
  try {
    const { section, canvasState, name } = req.body;
    const projectId = parseInt(req.params.id);

    // Get max page number for this section
    const existingPages = await prisma.bookOfDrawingsPage.findMany({
      where: { projectId, section },
      orderBy: { pageNumber: 'desc' },
      take: 1
    });
    
    const nextPageNumber = existingPages.length > 0 ? existingPages[0].pageNumber + 1 : 1;

    const newPage = await prisma.bookOfDrawingsPage.create({
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
    console.error('Error adding page:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a page (save canvas or properties)
router.put('/:id/pages/:pageId', authenticate, async (req, res) => {
  try {
    const { canvasState, name, applyFrame, includeInFinal, insertPageData } = req.body;
    const pageId = parseInt(req.params.pageId);

    const updateData: any = {};
    if (canvasState !== undefined) updateData.canvasState = canvasState;
    if (name !== undefined) updateData.name = name;
    if (applyFrame !== undefined) updateData.applyFrame = applyFrame;
    if (includeInFinal !== undefined) updateData.includeInFinal = includeInFinal;
    if (insertPageData !== undefined) updateData.insertPageData = insertPageData;

    const updatedPage = await prisma.bookOfDrawingsPage.update({
      where: { id: pageId },
      data: updateData
    });

    res.json(updatedPage);
  } catch (error) {
    console.error('Error updating page:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a page
router.delete('/:id/pages/:pageId', authenticate, async (req, res) => {
  try {
    const pageId = parseInt(req.params.pageId);

    await prisma.bookOfDrawingsPage.delete({
      where: { id: pageId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update sections order
router.put('/:id/sections/order', authenticate, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const { sectionsOrder } = req.body;

    const project = await prisma.bookOfDrawingsProject.update({
      where: { id: projectId },
      data: {
        sectionsOrder
      }
    });

    res.json(project);
  } catch (error) {
    console.error('Error updating sections order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update section short names
router.put('/:id/sections/shortnames', authenticate, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const { sectionShortNames } = req.body;

    const project = await prisma.bookOfDrawingsProject.update({
      where: { id: projectId },
      data: {
        sectionShortNames
      }
    });

    res.json(project);
  } catch (error) {
    console.error('Error updating section short names:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update final book sections order
router.put('/:id/finalBookSectionsOrder', authenticate, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const { finalBookSections } = req.body;

    const project = await prisma.bookOfDrawingsProject.update({
      where: { id: projectId },
      data: {
        finalBookSections
      }
    });

    res.json(project);
  } catch (error) {
    console.error('Error updating final book sections order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reorder pages within a section
router.put('/:id/pages/reorder', authenticate, async (req, res) => {
  try {
    const { pageIds } = req.body; // Array of page IDs in their new order
    
    // Process them in a transaction
    await prisma.$transaction(
      pageIds.map((id: number, index: number) =>
        prisma.bookOfDrawingsPage.update({
          where: { id },
          data: { pageNumber: index + 1 }
        })
      )
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering pages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Import CAD file and convert to SVG
router.post('/:id/pages/:pageId/import-cad', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { originalname, path: filePath } = req.file;
    const ext = path.extname(originalname).toLowerCase();

    let dxfContent = '';

    if (ext === '.dxf') {
      dxfContent = fs.readFileSync(filePath, 'utf-8');
    } else if (ext === '.dwg') {
      // Use LibreDWG dwg2dxf
      const outPath = `${filePath}.dxf`;
      try {
        execSync(`dwg2dxf "${filePath}" -o "${outPath}"`);
        dxfContent = fs.readFileSync(outPath, 'utf-8');
        fs.unlinkSync(outPath); // cleanup
      } catch (err) {
        console.error('LibreDWG error:', err);
        return res.status(500).json({ message: 'Failed to convert DWG to DXF' });
      }
    } else {
      return res.status(400).json({ message: 'Unsupported file format' });
    }

    // Cleanup uploaded file
    fs.unlinkSync(filePath);

    // Parse DXF and convert to SVG
    const Helper = dxf.Helper;
    const helper = new Helper(dxfContent);
    let svgString = helper.toSVG();

    // Inject text entities since dxf module ignores them
    if (helper.parsed && helper.parsed.entities) {
      let textNodes = '';
      helper.parsed.entities.forEach((entity: any) => {
        if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
          let textStr = entity.string || '';
          
          // Clean MTEXT formatting codes (e.g. \fArial|b0|i0|c0|p34;, \A1;, \P, etc)
          textStr = textStr.replace(/\\[A-Za-z0-9|,-]+;/g, '');
          textStr = textStr.replace(/\\P/g, ' '); // Replace newlines with spaces for now
          textStr = textStr.replace(/[{}]/g, '');
          
          if (!textStr.trim()) return;

          const x = entity.x || 0;
          const y = entity.y || 0;
          const height = entity.textHeight || entity.nominalTextHeight || 12;
          
          // Use scale(1, -1) to counter the parent <g> flipping the Y-axis
          // so the text renders upright.
          textNodes += `<text transform="translate(${x}, ${y}) scale(1, -1)" fill="black" font-size="${height}" font-family="Arial">${textStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>\n  `;
        }
      });
      
      if (textNodes) {
        svgString = svgString.replace('</g>\n</svg>', `  ${textNodes}</g>\n</svg>`);
      }
    }

    res.json({ svg: svgString });
  } catch (error: any) {
    console.error('Error importing CAD:', error);
    res.status(500).json({ message: 'Server error processing CAD file', error: error?.message || String(error) });
  }
});

// Import a PDF overlay and convert to high-quality SVG using pdftocairo
router.post('/:id/pages/:pageId/import-overlay-pdf', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== '.pdf') {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'File must be a PDF' });
    }

    const filePath = req.file.path;
    const outPrefix = `${filePath}_out`;
    
    // pdftocairo generates outPrefix.svg or outPrefix-1.svg depending on pages
    // we use -f 1 -l 1 to only extract the first page
    try {
      execSync(`pdftocairo -svg -f 1 -l 1 "${filePath}" "${outPrefix}.svg"`);
      
      const outSvgPath = `${outPrefix}.svg`;
      if (!fs.existsSync(outSvgPath)) {
        throw new Error('pdftocairo failed to generate SVG');
      }

      const svgContent = fs.readFileSync(outSvgPath, 'utf-8');
      
      // cleanup
      fs.unlinkSync(filePath);
      fs.unlinkSync(outSvgPath);

      res.json({ svg: svgContent });
    } catch (err: any) {
      console.error('pdftocairo error:', err);
      // clean up if exists
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(500).json({ message: 'Failed to convert PDF to SVG' });
    }
  } catch (error: any) {
    console.error('Error importing PDF overlay:', error);
    res.status(500).json({ message: 'Server error processing PDF file', error: error?.message || String(error) });
  }
});

export default router;
