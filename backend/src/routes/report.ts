import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { generatePDFReport } from '../utils/pdf-generator';

const router = Router();
const prisma = new PrismaClient();

// GET /api/report/:childId
router.get('/:childId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const childId = req.params.childId as string;
    const child = await prisma.child.findFirst({
      where: { id: childId, userId: req.user!.id },
      include: {
        screenings: { orderBy: { createdAt: 'desc' }, take: 1 },
        gameSessions: true,
      },
    }) as any;

    if (!child) { res.status(404).json({ error: 'Child not found.' }); return; }

    const latestScreening = child.screenings[0];
    const shapValues = latestScreening?.shapData ? JSON.parse(latestScreening.shapData) : [];
    const sessions = child.gameSessions;
    const totalSessions = sessions.length;
    const accuracy = totalSessions > 0 ? Math.round(sessions.reduce((s: number, x: any) => s + x.accuracy, 0) / totalSessions * 100) : 0;
    const avgRT = totalSessions > 0 ? Math.round(sessions.reduce((s: number, x: any) => s + x.avgResponseTimeMs, 0) / totalSessions) : 0;

    const pdfBytes = await generatePDFReport({
      childName: child.name,
      childAge: child.ageMonths,
      childGender: child.gender,
      riskLevel: latestScreening?.riskLevel || 'LOW',
      riskScore: latestScreening ? Math.round((latestScreening.mchatScore / 20) * 100) : 0,
      mchatScore: latestScreening?.mchatScore || 0,
      shapValues,
      gameStats: { totalSessions, accuracy, avgResponseTimeMs: avgRT, streak: 0 },
      reportDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="SpectrumCare-Report-${child.name}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err) { console.error('Report error:', err); res.status(500).json({ error: 'Failed to generate report.' }); }
});

export default router;
