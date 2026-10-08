import { Router } from 'express';
import protect from '../middlewares/auth.js';
import authorize from '../middlewares/rbac.js';
import validate from '../middlewares/validate.js';
import { ROLES } from '../utils/constants.js';
import {
  doctorParamSchema,
  appointmentParamSchema,
  pauseSchema,
  checkInSchema,
  walkInSchema,
} from '../validators/queue.schema.js';
import {
  live,
  callNextPatient,
  pause,
  checkInByCode,
  checkInById,
  done,
  skipPatient,
  emergency,
  walkIn,
  myStatus,
} from '../controllers/queue.controller.js';

const router = Router();
const staff = [protect, authorize(ROLES.DOCTOR, ROLES.CLINIC)]; // doctor or receptionist (clinic)
const doctorOnly = [protect, authorize(ROLES.DOCTOR)];

// Patient: where am I in the queue?
router.get('/me', protect, authorize(ROLES.PATIENT), myStatus);

// Queue of one doctor ("me" works for a doctor)
router.get('/doctors/:doctorId/live', ...staff, validate(doctorParamSchema), live);
router.patch('/doctors/:doctorId/call-next', ...staff, validate(doctorParamSchema), callNextPatient);
router.patch('/doctors/:doctorId/pause', ...staff, validate(pauseSchema), pause);

// Check-in
router.post('/check-in', ...staff, validate(checkInSchema), checkInByCode);
router.patch('/appointments/:id/check-in', ...staff, validate(appointmentParamSchema), checkInById);

// Per patient
router.patch('/appointments/:id/done', ...doctorOnly, validate(appointmentParamSchema), done); // only the doctor
router.patch('/appointments/:id/skip', ...staff, validate(appointmentParamSchema), skipPatient);
router.patch('/appointments/:id/emergency', ...staff, validate(appointmentParamSchema), emergency);

// Walk-in (clinic only)
router.post('/walk-in', protect, authorize(ROLES.CLINIC), validate(walkInSchema), walkIn);

export default router;