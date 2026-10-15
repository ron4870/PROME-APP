import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getLiveIsoComplianceMatrix, runIsoAiGapAnalysis } from '../services/iso-matrix.service';

const router = Router();

// Cache for AI Gap Analysis results to keep page snappy
let cachedAiAnalysis: any = null;
let lastAiAnalysisTime: number = 0;

// GET /api/iso-matrix - Fetch live ISO standards compliance matrix
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const standard = req.query.standard as string | undefined;
    const matrix = await getLiveIsoComplianceMatrix(standard);

    // Attach cached AI analysis if within last 1 hour
    const now = Date.now();
    if (cachedAiAnalysis && (now - lastAiAnalysisTime < 60 * 60 * 1000)) {
      matrix.summary.aiAuditSummary = cachedAiAnalysis;
    }

    res.json(matrix);
  } catch (error: any) {
    console.error('Error fetching ISO compliance matrix:', error);
    res.status(500).json({ error: 'Failed to evaluate ISO compliance matrix', details: error.message });
  }
});

// GET /api/iso-matrix/summary - Quick overview statistics
router.get('/summary', authenticateToken, async (req: Request, res: Response) => {
  try {
    const standard = req.query.standard as string | undefined;
    const matrix = await getLiveIsoComplianceMatrix(standard);
    res.json(matrix.summary);
  } catch (error: any) {
    console.error('Error fetching ISO matrix summary:', error);
    res.status(500).json({ error: 'Failed to fetch ISO summary' });
  }
});

// POST /api/iso-matrix/ai-scan - Run fresh live scan + Gemini AI Lead Auditor Analysis
router.post('/ai-scan', authenticateToken, async (req: Request, res: Response) => {
  try {
    const standard = req.body.standard as string | undefined;
    const matrix = await getLiveIsoComplianceMatrix(standard);

    const aiAnalysis = await runIsoAiGapAnalysis(matrix);
    cachedAiAnalysis = aiAnalysis;
    lastAiAnalysisTime = Date.now();

    matrix.summary.aiAuditSummary = aiAnalysis;

    res.json(matrix);
  } catch (error: any) {
    console.error('Error running AI ISO gap analysis:', error);
    res.status(500).json({ error: 'Failed to run AI gap analysis', details: error.message });
  }
});

export default router;
