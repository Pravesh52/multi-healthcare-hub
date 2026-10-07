import { Router } from 'express';
import mongoose from 'mongoose';
import { redis } from '../config/redis.js';
import authRoutes from './auth.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'MultiHealth Care Hub API',
    time: new Date().toISOString(),
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'not connected',
    redis: redis.status === 'ready' ? 'connected' : redis.status,
  });
});

router.use('/auth', authRoutes);

// Next steps will mount: /clinics, /doctors, /appointments, /queue ...

export default router;