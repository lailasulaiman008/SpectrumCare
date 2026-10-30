import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/dashboard/:childId — single endpoint for everything
router.get('/:childId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const childId = req.params.childId as string;
    const child = await prisma.child.findFirst({
      where: { id: childId, userId: req.user!.id },
      include: {
        screenings: { orderBy: { createdAt: 'desc' } },
        gameSessions: { orderBy: { playedAt: 'desc' } },
      },
    }) as any;

    if (!child) { res.status(404).json({ error: 'Child not found.' }); return; }

    const latestScreening: any = child.screenings[0];
    const sessions: any[] = child.gameSessions;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const last7 = sessions.filter((s: any) => new Date(s.playedAt) >= sevenDaysAgo);

    // Streak
    let streak = 0;
    for (let i = 0; i <= 30; i++) {
      const d = new Date(now.getTime() - i * 86400000);
      const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const e = new Date(s.getTime() + 86400000);
      if (sessions.some((x: any) => { const dd = new Date(x.playedAt); return dd >= s && dd < e; })) streak++;
      else if (i > 0) break;
    }

    const acc = last7.length > 0 ? Math.round(last7.reduce((s: number, x: any) => s + x.accuracy, 0) / last7.length * 100) : 0;
    const hasScreening = !!latestScreening;

    let nextAction = 'Start your first screening to get developmental insights.';
    if (hasScreening && sessions.length === 0) nextAction = 'Try playing some therapy games to track your child\'s progress.';
    else if (hasScreening && sessions.length > 0) nextAction = 'Keep playing daily to maintain your streak!';

    res.json({
      child: { id: child.id, name: child.name, ageMonths: child.ageMonths, gender: child.gender },
      latestScreening: latestScreening ? {
        ...latestScreening,
        answers: JSON.parse(latestScreening.answers),
        shapData: latestScreening.shapData ? JSON.parse(latestScreening.shapData) : null,
      } : null,
      gameStats: { totalSessions: sessions.length, recentAccuracy: acc, streak },
      nextAction,
    });
  } catch (err) { console.error('Dashboard error:', err); res.status(500).json({ error: 'Failed to load dashboard.' }); }
});

export default router;
