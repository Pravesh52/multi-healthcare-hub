import { Router } from 'express';
import protect from '../middlewares/auth.js';
import authorize from '../middlewares/rbac.js';
import validate from '../middlewares/validate.js';
import { ROLES } from '../utils/constants.js';
import {
  idSchema,
  createAppointmentSchema,
  listMineSchema,
  listForDoctorSchema,
  rejectSchema,
  rescheduleSchema,
} from '../validators/appointment.schema.js';
import {
  createAppointment,
  listMine,
  cancel,
  listForDoctor,
  approve,
  reject,
  getOne,
} from '../controllers/appointment.controller.js';
import { reschedule } from '../controllers/reschedule.controller.js';

const router = Router();
const patientOnly = [protect, authorize(ROLES.PATIENT)];
const doctorOnly = [protect, authorize(ROLES.DOCTOR)];

// Patient
router.post('/', ...patientOnly, validate(createAppointmentSchema), createAppointment);
router.get('/me', ...patientOnly, validate(listMineSchema), listMine);
router.patch('/:id/cancel', ...patientOnly, validate(idSchema), cancel);
router.patch('/:id/reschedule', ...patientOnly, validate(rescheduleSchema), reschedule);

// Doctor (must stay above '/:id')
router.get('/doctor', ...doctorOnly, validate(listForDoctorSchema), listForDoctor);
router.patch('/:id/approve', ...doctorOnly, validate(idSchema), approve);
router.patch('/:id/reject', ...doctorOnly, validate(rejectSchema), reject);

// Any logged-in person connected to the appointment
router.get('/:id', protect, validate(idSchema), getOne);

export default router;