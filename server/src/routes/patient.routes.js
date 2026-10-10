import { Router } from 'express';
import { z } from 'zod';
import protect from '../middlewares/auth.js';
import authorize from '../middlewares/rbac.js';
import validate from '../middlewares/validate.js';
import { ROLES } from '../utils/constants.js';
import { getMe, updateMe, accessLog } from '../controllers/patient.controller.js';

const router = Router();
router.use(protect, authorize(ROLES.PATIENT));

const tag = z.string().trim().min(2, 'Too short').max(60, 'Too long');

const updateSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(80),
      age: z.number().int().min(0).max(120),
      gender: z.enum(['male', 'female', 'other']),
      bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).nullable(), // null clears it
      allergies: z.array(tag).max(20),
      conditions: z.array(tag).max(20),
    })
    .partial(),
});

const logSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

router.get('/me', getMe);
router.patch('/me', validate(updateSchema), updateMe);
router.get('/me/access-log', validate(logSchema), accessLog);

export default router;