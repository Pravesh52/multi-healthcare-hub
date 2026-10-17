import { Router } from 'express';
import { publicStats } from '../controllers/stats.controller.js';

const router = Router();

router.get('/public', publicStats);

export default router;