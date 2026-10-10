import { Router } from 'express';
import { z } from 'zod';
import protect from '../middlewares/auth.js';
import authorize from '../middlewares/rbac.js';
import validate from '../middlewares/validate.js';
import { ROLES } from '../utils/constants.js';
import { createReview, listForDoctor, listForClinic } from '../controllers/review.controller.js';

const router = Router();
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const createSchema = z.object({
  body: z.object({
    appointmentId: objectId,
    rating: z.number().int().min(1, 'Rating must be 1 to 5').max(5, 'Rating must be 1 to 5'),
    comment: z.string().trim().max(500).optional(),
  }),
});

const listSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
});

router.post('/', protect, authorize(ROLES.PATIENT), validate(createSchema), createReview);
router.get('/doctors/:id', validate(listSchema), listForDoctor);
router.get('/clinics/:id', validate(listSchema), listForClinic);

export default router;