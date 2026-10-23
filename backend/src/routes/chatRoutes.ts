import { Router } from 'express';
import { handleChat } from '../controllers/chatController.js';
import { validateRequest } from '../middleware/validate.js';
import { aiOperationsLimiter } from '../middleware/rateLimiter.js';
import { ChatRequestSchema } from '../schemas/api.schemas.js';

const router = Router();

// POST /api/chat
router.post('/', aiOperationsLimiter, validateRequest({ body: ChatRequestSchema }), handleChat);

export default router;
