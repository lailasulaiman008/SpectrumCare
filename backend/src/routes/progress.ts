import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/progress/:childId
router.get('/:childId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const childId = req.params.childId as string;
    const child = await prisma.child.findFirst({ where: { id: childId, userId: req.user!.id } });
    if (!child) { res.status(404).json({ error: 'Child not found.' }); return; }

    const gameSessions = await prisma.gameSession.findMany({ where: { childId: childId }, orderBy: { playedAt: 'desc' } });
    const screenings = await prisma.screening.findMany({ where: { childId: childId }, orderBy: { createdAt: 'desc' } });

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const last7 = gameSessions.filter(s => new Date(s.playedAt) >= sevenDaysAgo);
    const prev7 = gameSessions.filter(s => { const d = new Date(s.playedAt); return d >= fourteenDaysAgo && d < sevenDaysAgo; });

    // Daily activity (Monday to Sunday calendar week, adjusted for client timezone offset in minutes)
    const tzOffset = req.query.tzOffset ? parseInt(req.query.tzOffset as string, 10) : 0;
    const nowAdjusted = new Date(Date.now() - (tzOffset * 60 * 1000));
    const currentDay = nowAdjusted.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(Date.UTC(nowAdjusted.getUTCFullYear(), nowAdjusted.getUTCMonth(), nowAdjusted.getUTCDate() - daysSinceMonday));

    const daily: Array<{ day: string; sessions: number; isToday: boolean }> = [];
    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    for (let i = 0; i < 7; i++) {
      const date = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + i));
      const start = new Date(date.getTime() + (tzOffset * 60 * 1000));
      const end = new Date(start.getTime() + 86400000);
      const ct = gameSessions.filter(s => { const d = new Date(s.playedAt); return d >= start && d < end; }).length;
      const isToday = Date.now() >= start.getTime() && Date.now() < end.getTime();
      daily.push({ day: dayLabels[i], sessions: ct, isToday });
    }

    const acc7 = last7.length > 0 ? Math.round(last7.reduce((s, x) => s + x.accuracy, 0) / last7.length * 100) : 0;
    const accPrev = prev7.length > 0 ? Math.round(prev7.reduce((s, x) => s + x.accuracy, 0) / prev7.length * 100) : 0;
    const avgRT = last7.length > 0 ? Math.round(last7.reduce((s, x) => s + x.avgResponseTimeMs, 0) / last7.length) : 0;

    let streak = 0;
    for (let i = 0; i <= 30; i++) {
      const date = new Date(now.getTime() - i * 86400000);
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const end = new Date(start.getTime() + 86400000);
      if (gameSessions.some(s => { const d = new Date(s.playedAt); return d >= start && d < end; })) streak++;
      else if (i > 0) break;
    }

    const gs: Record<string, { correct: number; total: number }> = {};
    gameSessions.forEach(s => { if (!gs[s.gameType]) gs[s.gameType] = { correct: 0, total: 0 }; gs[s.gameType].correct += s.correctRounds; gs[s.gameType].total += s.totalRounds; });
    const labels: Record<string, string> = { MATCH_FACE: 'Emotion Recognition', ODD_ONE_OUT: 'Pattern Recognition', TAP_COLOR: 'Color Identification' };
    let strongest = 'N/A', weakest = 'N/A', hi = -1, lo = 101;
    for (const [t, v] of Object.entries(gs)) { const a = v.total > 0 ? v.correct / v.total * 100 : 0; if (a > hi) { hi = a; strongest = labels[t] || t; } if (a < lo) { lo = a; weakest = labels[t] || t; } }

    res.json({
      totalSessions: gameSessions.length, accuracy: acc7, accuracyChange: acc7 - accPrev,
      avgResponseTimeMs: avgRT, streak, strongestGame: strongest, weakestGame: weakest,
      dailyActivity: daily,
      screenings: screenings.map(s => ({ ...s, answers: JSON.parse(s.answers), shapData: s.shapData ? JSON.parse(s.shapData) : null })),
    });
  } catch (err) { console.error('Progress error:', err); res.status(500).json({ error: 'Failed to fetch progress.' }); }
});

export default router;
