import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-prome-key';

// Middleware to verify token and extract user
const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const getUserPermissions = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: true }
  });
  if (user?.roles?.some(r => ['Admin', 'Administrator', 'Super Admin'].includes(r.name))) return { isAdmin: true };
  return user?.roles?.reduce((acc, r) => ({ ...acc, ...(r.permissions as Record<string, boolean>) }), {}) || {};
};

const requireWikiView = async (req: any, res: any, next: any) => {
  try {
    const perms = await getUserPermissions(req.userId) as any;
    if (!perms.isAdmin && !perms.wiki_view && !perms.wiki_draft && !perms.wiki_review && !perms.wiki_approve) {
      return res.status(403).json({ error: 'Permission denied: Requires view privileges.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify permissions' });
  }
};

// =====================================
// FOLDERS
// =====================================

// Get all folders with their pages
router.get('/folders', authenticate, requireWikiView, async (req, res) => {
  try {
    const folders = await prisma.wikiFolder.findMany({
      include: {
        pages: {
          select: {
            id: true,
            title: true,
            status: true,
            folderId: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(folders);
  } catch (error) {
    console.error('Error fetching wiki folders:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// Create a folder
router.post('/folders', authenticate, async (req, res) => {
  try {
    const { name, description, parentId } = req.body;
    const folder = await prisma.wikiFolder.create({
      data: { 
        name, 
        description,
        parentId: parentId ? Number(parentId) : undefined
      }
    });
    res.status(201).json(folder);
  } catch (error) {
    console.error('Error creating wiki folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Update a folder
router.put('/folders/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, parentId } = req.body;
    const folder = await prisma.wikiFolder.update({
      where: { id: Number(id) },
      data: { 
        name, 
        description,
        parentId: parentId === null ? null : (parentId ? Number(parentId) : undefined)
      }
    });
    res.json(folder);
  } catch (error) {
    console.error('Error updating wiki folder:', error);
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

// Delete a folder
router.delete('/folders/:id', authenticate, async (req: any, res) => {
  try {
    const perms = await getUserPermissions(req.userId) as any;
    if (!perms.isAdmin) {
      return res.status(403).json({ error: 'Permission denied: Administrators only.' });
    }
    const { id } = req.params;
    await prisma.wikiFolder.delete({
      where: { id: Number(id) }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting wiki folder:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// =====================================
// PAGES
// =====================================

// Get all pages (useful for search or flat list)
router.get('/pages', authenticate, requireWikiView, async (req, res) => {
  try {
    const pages = await prisma.wikiPage.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        folderId: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(pages);
  } catch (error) {
    console.error('Error fetching wiki pages:', error);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

// Get a specific page
router.get('/pages/:id', authenticate, requireWikiView, async (req, res) => {
  try {
    const { id } = req.params;
    const page = await prisma.wikiPage.findUnique({
      where: { id: Number(id) },
      include: {
        author: { select: { name: true } },
        approvedBy: { select: { name: true } },
        folder: true,
        outgoingLinks: {
          include: { targetPage: { select: { id: true, title: true } } }
        },
        incomingLinks: {
          include: { sourcePage: { select: { id: true, title: true } } }
        }
      }
    });
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json(page);
  } catch (error) {
    console.error('Error fetching wiki page:', error);
    res.status(500).json({ error: 'Failed to fetch page' });
  }
});

// Create a page
router.post('/pages', authenticate, async (req: any, res) => {
  try {
    const perms = await getUserPermissions(req.userId) as any;
    if (!perms.isAdmin && !perms.wiki_draft) {
      return res.status(403).json({ error: 'Permission denied: Requires draft privileges.' });
    }

    const { title, content, folderId, status } = req.body;
    const page = await prisma.wikiPage.create({
      data: {
        title,
        content: content || '',
        folderId: Number(folderId),
        authorId: req.userId,
        status: status || 'Draft'
      }
    });
    res.status(201).json(page);
  } catch (error) {
    console.error('Error creating wiki page:', error);
    res.status(500).json({ error: 'Failed to create page' });
  }
});

// Update a page
router.put('/pages/:id', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { title, content, folderId, status, approvedById, linkedPageIds } = req.body;
    
    const perms = await getUserPermissions(req.userId) as any;
    const existingPage = await prisma.wikiPage.findUnique({ where: { id: Number(id) } });
    if (!existingPage) return res.status(404).json({ error: 'Page not found' });

    if (status && status !== existingPage.status) {
      if (status === 'Review' && !perms.isAdmin && !perms.wiki_draft && !perms.wiki_review) {
        return res.status(403).json({ error: 'Permission denied: Cannot submit for review.' });
      }
      if (status === 'Approved' && !perms.isAdmin && !perms.wiki_approve) {
        return res.status(403).json({ error: 'Permission denied: Requires approve privileges.' });
      }
      if (status === 'Draft' && existingPage.status === 'Review' && !perms.isAdmin && !perms.wiki_review) {
        return res.status(403).json({ error: 'Permission denied: Requires review privileges.' });
      }
    }

    if (content !== undefined && content !== existingPage.content) {
      if (existingPage.status === 'Review' && !perms.isAdmin && !perms.wiki_review) {
        return res.status(403).json({ error: 'Permission denied: Cannot edit while in review.' });
      }
      if (existingPage.status === 'Approved' && !perms.isAdmin && !perms.wiki_approve) {
        return res.status(403).json({ error: 'Permission denied: Cannot edit an approved document.' });
      }
    }

    const page = await prisma.wikiPage.update({
      where: { id: Number(id) },
      data: {
        title,
        content,
        folderId: folderId ? Number(folderId) : undefined,
        status,
        approvedById: status === 'Approved' ? req.userId : (approvedById ? Number(approvedById) : undefined)
      }
    });

    if (Array.isArray(linkedPageIds)) {
      await prisma.wikiPageLink.deleteMany({ where: { sourceId: Number(id) } });
      const newLinks = linkedPageIds.map((targetId: number) => ({
        sourceId: Number(id),
        targetId: Number(targetId)
      }));
      if (newLinks.length > 0) {
        await prisma.wikiPageLink.createMany({ data: newLinks, skipDuplicates: true });
      }
    }

    res.json(page);
  } catch (error) {
    console.error('Error updating wiki page:', error);
    res.status(500).json({ error: 'Failed to update page' });
  }
});

// Delete a page
router.delete('/pages/:id', authenticate, async (req: any, res) => {
  try {
    const perms = await getUserPermissions(req.userId) as any;
    if (!perms.isAdmin) {
      return res.status(403).json({ error: 'Permission denied: Administrators only.' });
    }
    const { id } = req.params;
    await prisma.wikiPage.delete({
      where: { id: Number(id) }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting wiki page:', error);
    res.status(500).json({ error: 'Failed to delete page' });
  }
});

// =====================================
// PAGE LINKS
// =====================================

// Add a link
router.post('/pages/:id/links', authenticate, async (req, res) => {
  try {
    const { id } = req.params; // source page id
    const { targetId } = req.body;
    
    const link = await prisma.wikiPageLink.create({
      data: {
        sourceId: Number(id),
        targetId: Number(targetId)
      }
    });
    res.status(201).json(link);
  } catch (error) {
    console.error('Error adding page link:', error);
    res.status(500).json({ error: 'Failed to add link' });
  }
});

// Remove a link
router.delete('/pages/:id/links/:targetId', authenticate, async (req, res) => {
  try {
    const { id, targetId } = req.params;
    
    await prisma.wikiPageLink.delete({
      where: {
        sourceId_targetId: {
          sourceId: Number(id),
          targetId: Number(targetId)
        }
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting page link:', error);
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

// =====================================
// TEMPLATES
// =====================================

// Get all templates
router.get('/templates', authenticate, async (req, res) => {
  try {
    const templates = await prisma.wikiTemplate.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(templates);
  } catch (error) {
    console.error('Error fetching wiki templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Create a template (Admin only)
router.post('/templates', authenticate, async (req: any, res) => {
  try {
    const perms = await getUserPermissions(req.userId) as any;
    if (!perms.isAdmin) {
      return res.status(403).json({ error: 'Permission denied: Administrators only.' });
    }
    const { name, content } = req.body;
    const template = await prisma.wikiTemplate.create({
      data: {
        name,
        content: content || '',
        creatorId: req.userId
      }
    });
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating wiki template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Delete a template (Admin only)
router.delete('/templates/:id', authenticate, async (req: any, res) => {
  try {
    const perms = await getUserPermissions(req.userId) as any;
    if (!perms.isAdmin) {
      return res.status(403).json({ error: 'Permission denied: Administrators only.' });
    }
    const { id } = req.params;
    await prisma.wikiTemplate.delete({
      where: { id: Number(id) }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting wiki template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;
