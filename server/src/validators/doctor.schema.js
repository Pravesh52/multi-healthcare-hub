import { z } from 'zod';

const time = z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const listDoctorsSchema = z.object({
  query: z.object({
    state: z.string().trim().optional(),
    district: z.string().trim().optional(),
    speciality: z.string().trim().max(60).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    maxFees: z.coerce.number().min(0).optional(),
    clinic: z.string().trim().optional(),
    q: z.string().trim().max(60).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
});

const scheduleItem = z
  .object({ day: z.number().int().min(0).max(6), start: time, end: time })
  .refine((s) => s.end > s.start, { message: 'End time must be after start time' });

export const updateDoctorSchema = z.object({
  body: z
    .object({
      fees: z.number().min(0).max(100000),
      slotMinutes: z.number().int().min(5).max(120),
      experienceYears: z.number().int().min(0).max(70),
      bio: z.string().trim().max(500),
      schedule: z.array(scheduleItem).max(21),
      leaveDates: z.array(date).max(366),
      unavailableToday: z.boolean(),
    })
    .partial(),
});