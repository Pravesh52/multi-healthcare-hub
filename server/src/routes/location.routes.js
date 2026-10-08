import { Router } from 'express';
import { getStates, getDistricts } from '../controllers/location.controller.js';

const router = Router();

router.get('/states', getStates);
router.get('/districts', getDistricts);

export default router;