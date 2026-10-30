import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { scoreMCHATR } from '../utils/mchat-scorer';

const router = Router();
const prisma = new PrismaClient();

// POST /api/screening
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { childId, answers } = req.body;

    if (!childId || !answers) {
      res.status(400).json({ error: 'childId and answers are required.' });
      return;
    }

    // Verify child belongs to user
    const child = await prisma.child.findFirst({
      where: { id: childId, userId: req.user!.id },
    });

    if (!child) {
      res.status(404).json({ error: 'Child not found.' });
      return;
    }

    // Score using M-CHAT-R clinical rules
    const scoring = scoreMCHATR(answers);

    // Try to get AI prediction (optional — if Python service is running)
    let aiProbability: number | null = null;
    let aiShapData: any = null;

    try {
      let aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5001';
      if (!aiServiceUrl.startsWith('http://') && !aiServiceUrl.startsWith('https://')) {
        aiServiceUrl = `http://${aiServiceUrl}`;
      }
      const aiResponse = await fetch(`${aiServiceUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: Object.values(answers).map((v: any) => v ? 1 : 0),
          ageMonths: child.ageMonths,
        }),
        signal: AbortSignal.timeout(5000), // 5s timeout
      });

      if (aiResponse.ok) {
        const aiResult = await aiResponse.json() as any;
        aiProbability = aiResult.probability;
        aiShapData = aiResult.shapValues;
        // Override with AI risk level if available
        if (aiResult.riskLevel) {
          scoring.riskLevel = aiResult.riskLevel;
        }
        if (aiResult.riskScore !== undefined) {
          scoring.riskScore = aiResult.riskScore;
        }
      }
    } catch (aiErr) {
      // AI service not available — use clinical scoring only
      console.log('AI service not available, using clinical scoring only.');
    }

    // Save screening
    const screening = await prisma.screening.create({
      data: {
        childId,
        answers: JSON.stringify(answers),
        mchatScore: scoring.mchatScore,
        riskLevel: scoring.riskLevel,
        aiProbability,
        shapData: JSON.stringify(aiShapData || scoring.shapValues),
      },
    });

    res.status(201).json({
      id: screening.id,
      mchatScore: scoring.mchatScore,
      riskLevel: scoring.riskLevel,
      riskScore: scoring.riskScore,
      aiProbability,
      shapValues: aiShapData || scoring.shapValues,
      createdAt: screening.createdAt,
    });
  } catch (err) {
    console.error('Screening error:', err);
    res.status(500).json({ error: 'Screening failed. Please try again.' });
  }
});

export default router;
