import { Router } from 'express';
import protect from '../middlewares/auth.js';
import authorize from '../middlewares/rbac.js';
import validate from '../middlewares/validate.js';
import { ROLES } from '../utils/constants.js';
import { listDoctorsSchema, updateDoctorSchema } from '../validators/doctor.schema.js';
import { slotsSchema } from '../validators/appointment.schema.js';
import { listDoctors, getDoctor, myProfile, updateMe } from '../controllers/doctor.controller.js';
import { getSlots } from '../controllers/appointment.controller.js';
import { acceptFiles } from '../middlewares/upload.js';
import { uploadDoctorPhoto } from '../controllers/upload.controller.js';
const router = Router();
const doctorOnly = [protect, authorize(ROLES.DOCTOR)];

router.get('/', validate(listDoctorsSchema), listDoctors);

// Doctor's own profile (must stay above '/:id')
router.get('/me/profile', ...doctorOnly, myProfile);
router.patch('/me', ...doctorOnly, validate(updateDoctorSchema), updateMe);

router.post('/me/photo', ...doctorOnly, acceptFiles([{ name: 'photo', maxCount: 1 }]), uploadDoctorPhoto);

// Slots of a doctor for one day (public)
router.get('/:id/slots', validate(slotsSchema), getSlots);

router.get('/:id', getDoctor);

export default router;