import { Router } from 'express';
import validate from '../middlewares/validate.js';
import protect from '../middlewares/auth.js';
import { otpLimiter, authLimiter } from '../middlewares/rateLimiter.js';
import {
  sendOtpSchema,
  verifyOtpSchema,
  loginSchema,
  doctorSignupSchema,
  clinicSignupSchema,
} from '../validators/auth.schema.js';
import {
  sendOtp,
  verifyOtp,
  doctorSignup,
  clinicSignup,
  login,
  refresh,
  logout,
  me,
} from '../controllers/auth.controller.js';

const router = Router();

// Patient (OTP)
router.post('/patient/send-otp', otpLimiter, validate(sendOtpSchema), sendOtp);
router.post('/patient/verify-otp', authLimiter, validate(verifyOtpSchema), verifyOtp);

// Doctor / Clinic signup
router.post('/doctor/signup', authLimiter, validate(doctorSignupSchema), doctorSignup);
router.post('/clinic/signup', authLimiter, validate(clinicSignupSchema), clinicSignup);

// Doctor / Clinic / Admin login
router.post('/login', authLimiter, validate(loginSchema), login);

// Session
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', protect, me);

export default router;