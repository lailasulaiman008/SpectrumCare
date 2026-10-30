import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/auth/register
router.post('/register', async (req: any, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !name.trim()) {
      res.status(400).json({ error: "Parent's name is required." });
      return;
    }

    if (!/^[a-zA-Z\s-]+$/.test(name.trim())) {
      res.status(400).json({ error: "Parent's name must contain only letters." });
      return;
    }

    if (!email || !email.trim()) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }

    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/.test(email.trim().toLowerCase())) {
      res.status(400).json({ error: 'Email must be a valid address ending with .com' });
      return;
    }

    if (!password) {
      res.status(400).json({ error: 'Password is required.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    if (!/[A-Z]/.test(password)) {
      res.status(400).json({ error: 'Password must contain at least one uppercase letter.' });
      return;
    }

    if (!/[0-9]/.test(password)) {
      res.status(400).json({ error: 'Password must contain at least one digit.' });
      return;
    }

    if (!/[!@#$%^&*(),.?":{}|_+-=[\]\\/]/.test(password)) {
      res.status(400).json({ error: 'Password must contain at least one special character.' });
      return;
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existingUser) {
      res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: { name: name.trim(), email: email.trim().toLowerCase(), password: hashedPassword },
    });

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: any, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/.test(email.trim().toLowerCase())) {
      res.status(400).json({ error: 'Email must be a valid address ending with .com' });
      return;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        children: {
          include: {
            screenings: { orderBy: { createdAt: 'desc' }, take: 1 },
            gameSessions: { orderBy: { playedAt: 'desc' }, take: 5 },
          },
        },
      },
    });

    if (!user) {
      res.status(401).json({ error: 'No account found with this email.' });
      return;
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).json({ error: 'Incorrect password. Please try again.' });
      return;
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    // Parse JSON fields in screenings
    const children = user.children.map(child => ({
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

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
      children,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

export default router;
