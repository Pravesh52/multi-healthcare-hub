import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const doctorId = z.union([objectId, z.literal('me')]);

export const doctorParamSchema = z.object({ params: z.object({ doctorId }) });
export const appointmentParamSchema = z.object({ params: z.object({ id: objectId }) });

export const pauseSchema = z.object({
  params: z.object({ doctorId }),
  body: z.object({ paused: z.boolean() }),
});

export const checkInSchema = z.object({
  body: z.object({ code: z.string().trim().min(10).max(100) }),
});

export const walkInSchema = z.object({
  body: z.object({
    doctorId: objectId,
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
    age: z.coerce.number().int().min(0).max(120).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    reason: z.string().trim().max(300).optional(),
    emergency: z.boolean().default(false),
  }),
});