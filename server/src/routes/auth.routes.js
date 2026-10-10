import { Router } from 'express';
import validate from '../middlewares/validate.js';
import protect from '../middlewares/auth.js';
import { otpLimiter, authLimiter } from '../middlewares/rateLimiter.js';
import { acceptFiles } from '../middlewares/upload.js';
import {
  sendOtpSchema,
  verifyOtpSchema,
  loginSchema,
  doctorSignupSchema,
  clinicSignupSchema,
  resubmitSchema,
} from '../validators/auth.schema.js';
import {
  sendOtp,
  verifyOtp,
  doctorSignup,
  clinicSignup,
  doctorResubmit,
  clinicResubmit,
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
router.post(
  '/doctor/signup',
  authLimiter,
  acceptFiles([{ name: 'certificate', maxCount: 1 }, { name: 'photo', maxCount: 1 }], { pdfFields: ['certificate'] }),
  validate(doctorSignupSchema),
  doctorSignup
);
router.post(
  '/clinic/signup',
  authLimiter,
  acceptFiles([{ name: 'licence', maxCount: 1 }, { name: 'photos', maxCount: 3 }], { pdfFields: ['licence'] }),
  validate(clinicSignupSchema),
  clinicSignup
);

// Rejected application: send the document again (email + password + file, no login)
router.post(
  '/doctor/resubmit',
  authLimiter,
  acceptFiles([{ name: 'certificate', maxCount: 1 }], { pdfFields: ['certificate'] }),
  validate(resubmitSchema),
  doctorResubmit
);
router.post(
  '/clinic/resubmit',
  authLimiter,
  acceptFiles([{ name: 'licence', maxCount: 1 }], { pdfFields: ['licence'] }),
  validate(resubmitSchema),
  clinicResubmit
);

// Doctor / Clinic / Admin login
router.post('/login', authLimiter, validate(loginSchema), login);

// Session
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', protect, me);

export default router;