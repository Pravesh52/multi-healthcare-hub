import { Router } from 'express';
import { z } from 'zod';
import protect from '../middlewares/auth.js';
import authorize from '../middlewares/rbac.js';
import validate from '../middlewares/validate.js';
import { ROLES } from '../utils/constants.js';
import { isValidDate } from '../utils/time.js';
import {
  savePrescription,
  getPrescription,
  downloadPdf,
  listMine,
} from '../controllers/prescription.controller.js';

const router = Router();
router.use(protect);

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').refine(isValidDate, 'Invalid date');

const medicine = z.object({
  name: z.string().trim().min(2, 'Medicine name is too short').max(100),
  dosage: z.string().trim().max(50).optional(),
  duration: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(150).optional(),
});

const saveSchema = z.object({
  params: z.object({ appointmentId: objectId }),
  body: z
    .object({
      diagnosis: z.string().trim().max(500).optional(),
      medicines: z.array(medicine).max(20).default([]),
      advice: z.string().trim().max(1000).optional(),
      followUpDate: date.optional(),
    })
    .refine((b) => b.diagnosis || b.advice || b.medicines.length > 0, {
      message: 'Add at least a diagnosis, a medicine or some advice',
    }),
});

const paramSchema = z.object({ params: z.object({ appointmentId: objectId }) });

const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

router.get('/me', authorize(ROLES.PATIENT), validate(listSchema), listMine);
router.put('/appointments/:appointmentId', authorize(ROLES.DOCTOR), validate(saveSchema), savePrescription);
router.get('/appointments/:appointmentId', authorize(ROLES.PATIENT, ROLES.DOCTOR), validate(paramSchema), getPrescription);
router.get('/appointments/:appointmentId/pdf', authorize(ROLES.PATIENT, ROLES.DOCTOR), validate(paramSchema), downloadPdf);

export default router;