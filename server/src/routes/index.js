import { Router } from 'express';
import mongoose from 'mongoose';
import { redis } from '../config/redis.js';
import authRoutes from './auth.routes.js';
import locationRoutes from './location.routes.js';
import clinicRoutes from './clinic.routes.js';
import doctorRoutes from './doctor.routes.js';
import adminRoutes from './admin.routes.js';
import appointmentRoutes from './appointment.routes.js';
import queueRoutes from './queue.routes.js';
import receiptRoutes from './receipt.routes.js';
import paymentRoutes from './payment.routes.js';

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
router.use('/locations', locationRoutes);
router.use('/clinics', clinicRoutes);
router.use('/doctors', doctorRoutes);
router.use('/admin', adminRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/queue', queueRoutes);
router.use('/receipts', receiptRoutes);
router.use('/payments', paymentRoutes);

// Next steps will mount: /prescriptions, /reviews, /notifications ...

export default router;