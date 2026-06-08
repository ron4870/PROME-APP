import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get unread notifications for the logged-in user
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        isRead: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark a specific notification as read
router.put('/:id/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = (req as any).user.userId;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Send a support request to Administrators
router.post('/support', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const sender = await prisma.user.findUnique({ where: { id: userId } });
    const admins = await prisma.user.findMany({
      where: { role: { name: 'Administrator' } }
    });

    if (admins.length === 0) {
      return res.status(500).json({ error: 'No administrators found to receive the message' });
    }

    const notificationsToCreate = admins.map(admin => ({
      userId: admin.id,
      title: 'New Support Request',
      message: `Support request from ${sender?.name || 'User'}: ${message}`,
      type: 'Support',
      link: '/users' // Or wherever admins would handle this
    }));

    await prisma.notification.createMany({
      data: notificationsToCreate
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending support request:', error);
    res.status(500).json({ error: 'Failed to send support request' });
  }
});

export default router;
