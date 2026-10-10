import { Router } from 'express';
import { z } from 'zod';
import protect from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { list, unreadCount, markRead, markAllRead } from '../controllers/notification.controller.js';

const router = Router();
router.use(protect);

const listSchema = z.object({
  query: z.object({
    unread: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});
const idSchema = z.object({ params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') }) });

router.get('/', validate(listSchema), list);
router.get('/unread-count', unreadCount);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', validate(idSchema), markRead);

export default router;