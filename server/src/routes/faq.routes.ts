import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get all FAQs
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const faqs = await prisma.faqItem.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(faqs);
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({ error: 'Server error fetching FAQs' });
  }
});

// Create a new FAQ item
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { question, answer, category } = req.body;

    if (!question || !question.trim() || !answer || !answer.trim()) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }

    const faq = await prisma.faqItem.upsert({
      where: { question: question.trim() },
      update: {
        answer: answer.trim(),
        category: category ? category.trim() : 'General'
      },
      create: {
        question: question.trim(),
        answer: answer.trim(),
        category: category ? category.trim() : 'General'
      }
    });

    res.status(201).json(faq);
  } catch (error) {
    console.error('Error creating/updating FAQ:', error);
    res.status(500).json({ error: 'Server error saving FAQ' });
  }
});

export default router;
