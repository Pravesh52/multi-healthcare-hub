import { Router } from 'express';
import { z } from 'zod';
import protect from '../middlewares/auth.js';
import authorize from '../middlewares/rbac.js';
import validate from '../middlewares/validate.js';
import { ROLES } from '../utils/constants.js';
import { createPaymentOrder, verifyPayment, webhook } from '../controllers/payment.controller.js';

const router = Router();
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const orderSchema = z.object({ body: z.object({ appointmentId: objectId }) });
const verifySchema = z.object({
  body: z.object({
    appointmentId: objectId,
    razorpay_order_id: z.string().min(5),
    razorpay_payment_id: z.string().min(5),
    razorpay_signature: z.string().min(10),
  }),
});

router.post('/order', protect, authorize(ROLES.PATIENT), validate(orderSchema), createPaymentOrder);
router.post('/verify', protect, authorize(ROLES.PATIENT), validate(verifySchema), verifyPayment);
router.post('/webhook', webhook); // no login: protected by Razorpay's signature

export default router;