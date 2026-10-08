import { Router } from 'express';
import protect from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { z } from 'zod';
import { getReceipt, downloadPdf } from '../controllers/receipt.controller.js';

const router = Router();

const paramSchema = z.object({
  params: z.object({ appointmentId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') }),
});

router.get('/:appointmentId', protect, validate(paramSchema), getReceipt);
router.get('/:appointmentId/pdf', protect, validate(paramSchema), downloadPdf);

export default router;