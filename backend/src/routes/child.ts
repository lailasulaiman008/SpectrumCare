import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// POST /api/child — create a child profile
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, ageMonths, gender } = req.body;
    const userId = req.user!.id;

    if (!name || !name.trim()) {
      res.status(400).json({ error: "Child's name is required." });
      return;
    }

    if (!/^[a-zA-Z\s-]+$/.test(name.trim())) {
      res.status(400).json({ error: "Child's name must contain only letters." });
      return;
    }

    if (ageMonths === undefined) {
      res.status(400).json({ error: "Child's age is required." });
      return;
    }

    const parsedAge = parseInt(ageMonths, 10);
    if (isNaN(parsedAge) || parsedAge < 12 || parsedAge > 48) {
      res.status(400).json({ error: "Child's age must be between 1 and 4 years (12 to 48 months)." });
      return;
    }

    const child = await prisma.child.create({
      data: {
        name: name.trim(),
        ageMonths: parsedAge,
        gender: gender || null,
        userId,
      },
    });

    res.status(201).json(child);
  } catch (err) {
    console.error('Create child error:', err);
    res.status(500).json({ error: 'Failed to create child profile.' });
  }
});

// GET /api/child — list all children for logged-in user
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const children = await prisma.child.findMany({
      where: { userId },
      include: {
        screenings: {
          orderBy: { createdAt: 'desc' },
        },
        gameSessions: {
          orderBy: { playedAt: 'desc' },
        },
      },
    });

    // Parse JSON string fields
    const parsed = children.map(child => ({
      ...child,
      screenings: child.screenings.map(s => ({
        ...s,
        answers: JSON.parse(s.answers),
        shapData: s.shapData ? JSON.parse(s.shapData) : null,
      })),
      gameSessions: child.gameSessions.map(g => ({
        ...g,
        rounds: JSON.parse(g.rounds),
      })),
    }));

    res.json(parsed);
  } catch (err) {
    console.error('Get children error:', err);
    res.status(500).json({ error: 'Failed to fetch children.' });
  }
});

export default router;
