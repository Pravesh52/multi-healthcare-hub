import { Router } from 'express';
import { z } from 'zod';
import protect from '../middlewares/auth.js';
import authorize from '../middlewares/rbac.js';
import validate from '../middlewares/validate.js';
import { ROLES } from '../utils/constants.js';
import {
  getStats,
  listDoctors,
  verifyDoctor,
  rejectDoctor,
  listClinics,
  verifyClinic,
  rejectClinic,
} from '../controllers/admin.controller.js';

const router = Router();

router.use(protect, authorize(ROLES.ADMIN));

const reasonSchema = z.object({
  body: z.object({ reason: z.string().trim().min(3, 'Please give a reason').max(300) }),
});

router.get('/stats', getStats);

router.get('/doctors', listDoctors); // ?status=pending|verified|rejected
router.patch('/doctors/:id/verify', verifyDoctor);
router.patch('/doctors/:id/reject', validate(reasonSchema), rejectDoctor);

router.get('/clinics', listClinics);
router.patch('/clinics/:id/verify', verifyClinic);
router.patch('/clinics/:id/reject', validate(reasonSchema), rejectClinic);

export default router;