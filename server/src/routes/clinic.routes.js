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
import { z } from 'zod';
import { acceptFiles } from '../middlewares/upload.js';
import { addClinicPhoto, removeClinicPhoto } from '../controllers/upload.controller.js';


const router = Router();
const owner = [protect, authorize(ROLES.CLINIC)];

// Public
router.get('/', validate(listClinicsSchema), listClinics);
const indexSchema = z.object({ params: z.object({ index: z.coerce.number().int().min(0).max(4) }) });
router.post('/me/photos', ...owner, acceptFiles([{ name: 'photo', maxCount: 1 }]), addClinicPhoto);
router.delete('/me/photos/:index', ...owner, validate(indexSchema), removeClinicPhoto);
// Clinic owner (must stay above '/:id')
router.get('/me', ...owner, getMine);
router.patch('/me', ...owner, validate(updateClinicSchema), updateMine);
router.get('/me/doctors', ...owner, myDoctors);
router.post('/me/doctors', ...owner, validate(addDoctorSchema), addDoctor);
router.delete('/me/doctors/:doctorId', ...owner, removeDoctor);

// Public detail
router.get('/:id', getClinic);

export default router;