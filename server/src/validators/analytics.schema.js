import { z } from 'zod';
import { isValidDate, todayIST, addDays } from '../utils/time.js';

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine(isValidDate, 'Invalid date');
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const MAX_DAYS = 366;

export const analyticsSchema = z.object({
  query: z
    .object({ from: date.optional(), to: date.optional(), doctorId: objectId.optional() })
    .transform((q) => {
      const to = q.to ?? todayIST();
      const from = q.from ?? addDays(to, -29); // default: last 30 days
      return { ...q, from, to };
    })
    .refine((q) => q.from <= q.to, { message: '"from" must not be after "to"' })
    .refine((q) => (Date.parse(q.to) - Date.parse(q.from)) / 86400000 < MAX_DAYS, {
      message: `The date range can be at most ${MAX_DAYS} days`,
    }),
});