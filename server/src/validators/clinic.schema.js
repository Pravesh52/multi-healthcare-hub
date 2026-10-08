import { z } from 'zod';

const time = z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm');

export const listClinicsSchema = z.object({
  query: z
    .object({
      state: z.string().trim().optional(),
      district: z.string().trim().optional(),
      q: z.string().trim().max(60).optional(),
      type: z.enum(['clinic', 'hospital', 'lab']).optional(),
      lat: z.coerce.number().min(-90).max(90).optional(),
      lng: z.coerce.number().min(-180).max(180).optional(),
      km: z.coerce.number().min(0.5).max(100).default(10),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(10),
    })
    .refine((q) => (q.lat == null) === (q.lng == null), {
      message: 'Provide both lat and lng for near-me search',
    }),
});

export const updateClinicSchema = z.object({
  body: z
    .object({
      phone: z.string().trim().min(8).max(15),
      address: z.string().trim().min(5).max(200),
      timings: z
        .object({
          open: time,
          close: time,
          offDays: z.array(z.number().int().min(0).max(6)).max(7),
        })
        .partial(),
    })
    .partial(),
});

export const addDoctorSchema = z.object({
  body: z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email') }),
});