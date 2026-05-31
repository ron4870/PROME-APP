import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all notices
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notices = await prisma.notice.findMany({
      include: {
        author: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20 // Limit to recent 20 for the dashboard
    });
    res.json(notices);
  } catch (error) {
    console.error('Error fetching notices:', error);
    res.status(500).json({ error: 'Failed to fetch notices' });
  }
});

// Create a new notice
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, content, priority, authorId } = req.body;
    
    const newNotice = await prisma.notice.create({
      data: {
        title,
        content,
        priority,
        authorId: parseInt(authorId),
      }
    });
    
    // Fetch it again to include author info for immediate UI update
    const noticeWithAuthor = await prisma.notice.findUnique({
      where: { id: newNotice.id },
      include: {
        author: { select: { id: true, name: true } }
      }
    });

    res.status(201).json(noticeWithAuthor);
  } catch (error) {
    console.error('Error creating notice:', error);
    res.status(500).json({ error: 'Failed to post notice' });
  }
});

// Delete a notice (optional for future use)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notice.delete({
      where: { id: parseInt(id) }
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting notice:', error);
    res.status(500).json({ error: 'Failed to delete notice' });
  }
});

export default router;
