import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// POST /api/game/session — save a game session
router.post('/session', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { childId, gameType, rounds } = req.body;

    if (!childId || !gameType || !rounds || !Array.isArray(rounds)) {
      res.status(400).json({ error: 'childId, gameType, and rounds array are required.' });
      return;
    }

    const validGameTypes = ['MATCH_FACE', 'ODD_ONE_OUT', 'TAP_COLOR'];
    if (!validGameTypes.includes(gameType)) {
      res.status(400).json({ error: `gameType must be one of: ${validGameTypes.join(', ')}` });
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

    // Calculate stats
    const totalRounds = rounds.length;
    const correctRounds = rounds.filter((r: any) => r.correct).length;
    const accuracy = totalRounds > 0 ? correctRounds / totalRounds : 0;
    const avgResponseTimeMs = totalRounds > 0
      ? Math.round(rounds.reduce((sum: number, r: any) => sum + (r.responseTimeMs || 0), 0) / totalRounds)
      : 0;

    const session = await prisma.gameSession.create({
      data: {
        childId,
        gameType,
        accuracy,
        avgResponseTimeMs,
        totalRounds,
        correctRounds,
        rounds: JSON.stringify(rounds),
        playedAt: new Date(),
      },
    });

    res.status(201).json({
      id: session.id,
      gameType: session.gameType,
      accuracy: Math.round(accuracy * 100),
      avgResponseTimeMs,
      totalRounds,
      correctRounds,
      playedAt: session.playedAt,
    });
  } catch (err) {
    console.error('Game session error:', err);
    res.status(500).json({ error: 'Failed to save game session.' });
  }
});

export default router;
