import { Router } from 'express';
import {
  listReceipts,
  getReceiptById,
  createReceipt,
  updateReceipt,
  confirmReceipt,
  retryReceipt,
  extractReceipt,
  uploadReceipt,
} from '../controllers/receiptController.js';
import { validateRequest } from '../middleware/validate.js';
import { requireRole } from '../middleware/tenant.js';
import { aiOperationsLimiter } from '../middleware/rateLimiter.js';
import { receiptUploadMiddleware } from '../middleware/upload.js';
import {
  ReceiptsFilterQuerySchema,
  ReceiptIdParamSchema,
  CreateReceiptSchema,
  UpdateReceiptSchema,
  ConfirmReceiptSchema,
} from '../schemas/api.schemas.js';

const router = Router();

// POST /api/receipts/upload (Multipart image upload with automated OCR)
router.post(
  '/upload',
  aiOperationsLimiter,
  requireRole(['owner', 'manager', 'accountant']),
  receiptUploadMiddleware.single('file'),
  uploadReceipt
);

// GET /api/receipts
router.get('/', validateRequest({ query: ReceiptsFilterQuerySchema }), listReceipts);

// POST /api/receipts
router.post(
  '/',
  requireRole(['owner', 'manager', 'accountant']),
  validateRequest({ body: CreateReceiptSchema }),
  createReceipt
);

// GET /api/receipts/:receiptId
router.get('/:receiptId', validateRequest({ params: ReceiptIdParamSchema }), getReceiptById);

// PATCH /api/receipts/:receiptId
router.patch(
  '/:receiptId',
  requireRole(['owner', 'manager', 'accountant']),
  validateRequest({ params: ReceiptIdParamSchema, body: UpdateReceiptSchema }),
  updateReceipt
);

// POST /api/receipts/:receiptId/extract
router.post(
  '/:receiptId/extract',
  aiOperationsLimiter,
  validateRequest({ params: ReceiptIdParamSchema }),
  extractReceipt
);

// POST /api/receipts/:receiptId/confirm
router.post(
  '/:receiptId/confirm',
  requireRole(['owner', 'manager', 'accountant']),
  validateRequest({ params: ReceiptIdParamSchema, body: ConfirmReceiptSchema }),
  confirmReceipt
);

// POST /api/receipts/:receiptId/retry
router.post(
  '/:receiptId/retry',
  aiOperationsLimiter,
  validateRequest({ params: ReceiptIdParamSchema }),
  retryReceipt
);

export default router;
