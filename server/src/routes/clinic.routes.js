import { Router } from 'express';
import protect from '../middlewares/auth.js';
import authorize from '../middlewares/rbac.js';
import validate from '../middlewares/validate.js';
import { ROLES } from '../utils/constants.js';
import { listClinicsSchema, updateClinicSchema, addDoctorSchema } from '../validators/clinic.schema.js';
import {
  listClinics,
  getClinic,
  getMine,
  updateMine,
  myDoctors,
  addDoctor,
  removeDoctor,
} from '../controllers/clinic.controller.js';

const router = Router();
const owner = [protect, authorize(ROLES.CLINIC)];

// Public
router.get('/', validate(listClinicsSchema), listClinics);

// Clinic owner (must stay above '/:id')
router.get('/me', ...owner, getMine);
router.patch('/me', ...owner, validate(updateClinicSchema), updateMine);
router.get('/me/doctors', ...owner, myDoctors);
router.post('/me/doctors', ...owner, validate(addDoctorSchema), addDoctor);
router.delete('/me/doctors/:doctorId', ...owner, removeDoctor);

// Public detail
router.get('/:id', getClinic);

export default router;