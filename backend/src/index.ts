import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

import authRoutes from './routes/auth';
import childRoutes from './routes/child';
import screeningRoutes from './routes/screening';
import gameRoutes from './routes/game';
import progressRoutes from './routes/progress';
import reportRoutes from './routes/report';
import dashboardRoutes from './routes/dashboard';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Prevent local browser caching during testing
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Serve frontend (index.html from parent directory)
app.use(express.static(path.join(__dirname, '../../')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/child', childRoutes);
app.use('/api/screening', screeningRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback to index.html for SPA routing
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🌿 SpectrumCare API running on http://localhost:${PORT}`);
  console.log(`📄 Frontend served at http://localhost:${PORT}`);
  console.log(`🔌 API routes:`);
  console.log(`   POST /api/auth/register`);
  console.log(`   POST /api/auth/login`);
  console.log(`   POST /api/child`);
  console.log(`   GET  /api/child`);
  console.log(`   POST /api/screening`);
  console.log(`   POST /api/game/session`);
  console.log(`   GET  /api/progress/:childId`);
  console.log(`   GET  /api/report/:childId`);
  console.log(`   GET  /api/dashboard/:childId\n`);
});
