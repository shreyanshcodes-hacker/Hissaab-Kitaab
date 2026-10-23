import { Router } from 'express';
import { getMe } from '../controllers/authController.js';

const router = Router();

// GET /api/me
router.get('/', getMe);

export default router;
