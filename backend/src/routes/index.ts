import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireBusinessTenant } from '../middleware/tenant.js';

import meRoutes from './meRoutes.js';
import receiptRoutes from './receiptRoutes.js';
import supplierRoutes from './supplierRoutes.js';
import itemRoutes from './itemRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import chatRoutes from './chatRoutes.js';

const router = Router();

// Unauthenticated health check endpoint (used by Cloud Run, K8s, load balancers)
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'shopledger-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

// Authenticated current user profile
router.use('/me', requireAuth, meRoutes);

// Protected tenant-scoped business endpoints
router.use('/receipts', requireAuth, requireBusinessTenant, receiptRoutes);
router.use('/suppliers', requireAuth, requireBusinessTenant, supplierRoutes);
router.use('/items', requireAuth, requireBusinessTenant, itemRoutes);
router.use('/analytics', requireAuth, requireBusinessTenant, analyticsRoutes);
router.use('/chat', requireAuth, requireBusinessTenant, chatRoutes);

export default router;
