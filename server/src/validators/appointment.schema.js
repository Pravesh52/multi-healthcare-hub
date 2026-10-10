import { z } from 'zod';
import { APPOINTMENT_STATUS } from '../utils/constants.js';
import { isValidDate } from '../utils/time.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine(isValidDate, 'Invalid date');
const status = z.enum(Object.values(APPOINTMENT_STATUS));

export const idSchema = z.object({ params: z.object({ id: objectId }) });

export const slotsSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({ date }),
});

export const createAppointmentSchema = z.object({
  body: z.object({
    doctorId: objectId,
    date,
    slot: z.string().regex(/^\d{2}:\d{2}$/, 'Slot must be HH:mm'),
    reason: z.string().trim().max(300).optional(),
    paymentMode: z.enum(['at_clinic', 'online']).default('at_clinic'),
  }),
});

export const listMineSchema = z.object({
  query: z.object({
    status: status.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

export const listForDoctorSchema = z.object({
  query: z.object({
    status: status.optional(),
    date: date.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
});

export const rejectSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ reason: z.string().trim().min(3, 'Please give a reason').max(300) }),
});
export const rescheduleSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    date,
    slot: z.string().regex(/^\d{2}:\d{2}$/, 'Slot must be HH:mm'),
  }),
});