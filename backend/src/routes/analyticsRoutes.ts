import { Router } from 'express';
import { getSummary, getTrends, getPriceTracker, generateAiSummary } from '../controllers/analyticsController.js';
import { validateRequest } from '../middleware/validate.js';
import { aiOperationsLimiter } from '../middleware/rateLimiter.js';
import {
  AnalyticsSummaryQuerySchema,
  AnalyticsTrendsQuerySchema,
} from '../schemas/api.schemas.js';

const router = Router();

// GET /api/analytics/summary
router.get('/summary', validateRequest({ query: AnalyticsSummaryQuerySchema }), getSummary);

// GET /api/analytics/trends
router.get('/trends', validateRequest({ query: AnalyticsTrendsQuerySchema }), getTrends);

// GET /api/analytics/price-tracker
router.get('/price-tracker', getPriceTracker);

// POST / GET /api/analytics/ai-summary (Gemini grounded executive summary)
router.post('/ai-summary', aiOperationsLimiter, generateAiSummary);
router.get('/ai-summary', aiOperationsLimiter, generateAiSummary);

export default router;
