import express from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const prisma = new PrismaClient();

// In a real production setup, configure AWS credentials here
// The current app might just be using local file uploads or a configured S3 bucket
// We will use multer with memory storage so we can upload it manually, or configure multer properly
// Here we are using a simple memory storage to handle the file buffer.
const upload = multer({ storage: multer.memoryStorage() });

// Mock S3 or file upload helper (Modify according to PROME app's existing file upload structure)
// For now, let's assume there is an upload route or we just store metadata if fileUrl is provided.
// I will implement basic CRUD

// Get all library items
router.get('/', async (req, res) => {
  try {
    const { category, discipline, search } = req.query;

    const filters: any = {};
    if (category) filters.category = String(category);
    if (discipline) filters.discipline = String(discipline);
    if (search) {
      filters.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
        { tags: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const items = await prisma.libraryItem.findMany({
      where: filters,
      include: {
        uploader: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(items);
  } catch (error) {
    console.error('Error fetching library items:', error);
    res.status(500).json({ error: 'Failed to fetch library items' });
  }
});

// Upload/Create new library item
// Ideally this endpoint handles the file via S3, but we'll accept a fileUrl from the frontend if they use the existing Drive upload component, 
// OR we can handle the file upload locally.
// Let's assume the frontend will send the metadata, and optionally the fileUrl.
router.post('/', async (req: any, res: any) => {
  try {
    // Basic auth check
    const userId = req.user?.userId; // Assuming authMiddleware runs before this
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, description, category, discipline, version, tags, fileUrl } = req.body;

    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category are required' });
    }

    const newItem = await prisma.libraryItem.create({
      data: {
        title,
        description,
        category,
        discipline,
        version: version || "1.0",
        tags,
        fileUrl,
        uploaderId: userId,
      },
      include: {
        uploader: { select: { name: true } }
      }
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating library item:', error);
    res.status(500).json({ error: 'Failed to create library item' });
  }
});

// Delete library item
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    // Check if it exists
    const item = await prisma.libraryItem.findUnique({ where: { id: parseInt(id) } });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Optionally check permissions (only admin or uploader can delete)
    // req.user logic here

    await prisma.libraryItem.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting library item:', error);
    res.status(500).json({ error: 'Failed to delete library item' });
  }
});

export default router;
