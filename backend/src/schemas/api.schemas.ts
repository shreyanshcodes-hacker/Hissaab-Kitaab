import { z } from 'zod';

// -----------------------------------------------------------------------------
// Pagination & Query Schemas
// -----------------------------------------------------------------------------

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().default('purchaseDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const ReceiptsFilterQuerySchema = PaginationQuerySchema.extend({
  status: z
    .enum(['all', 'draft', 'processing', 'needs_review', 'verified', 'reconciled', 'archived'])
    .optional(),
  supplierId: z.string().optional(),
  category: z.string().optional(),
  paymentStatus: z.enum(['paid', 'unpaid_udhar', 'partially_paid']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  search: z.string().max(100).optional(),
});

export const AnalyticsSummaryQuerySchema = z.object({
  period: z.enum(['this_month', 'last_month', 'last_30_days', 'last_90_days', 'all_time']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
});

export const AnalyticsTrendsQuerySchema = z.object({
  granularity: z.enum(['day', 'week', 'month']).default('month'),
  period: z
    .enum(['this_month', 'last_month', 'last_30_days', 'last_90_days', 'last_6_months', 'last_12_months', 'all_time'])
    .optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  metric: z.enum(['spend', 'receipts']).default('spend'),
});

export const ItemsFilterQuerySchema = PaginationQuerySchema.extend({
  category: z.string().optional(),
  search: z.string().max(100).optional(),
});

export const SuppliersFilterQuerySchema = PaginationQuerySchema.extend({
  search: z.string().max(100).optional(),
});

// -----------------------------------------------------------------------------
// Receipt Mutation Schemas
// -----------------------------------------------------------------------------

export const MeasurementUnitSchema = z.enum([
  'kg',
  'gram',
  'pouch',
  'packet',
  'bag',
  'tin',
  'box',
  'carton',
  'liter',
  'ml',
  'piece',
  'bundle',
  'dozen',
  'other',
]);

export const LineItemInputSchema = z.object({
  id: z.string().optional(),
  rawName: z.string().min(1, 'Item name cannot be empty'),
  normalizedItemId: z.string().optional(),
  category: z.string().default('General Grocery'),
  hsnCode: z.string().optional(),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unit: MeasurementUnitSchema.default('piece'),
  unitPriceMinor: z.number().int().nonnegative('Unit price must be non-negative integer paise'),
  discountMinor: z.number().int().nonnegative('Discount must be non-negative integer paise').default(0),
  taxRatePercent: z.number().nonnegative().max(100).default(0),
  needsReview: z.boolean().default(false),
  reviewReason: z.string().optional(),
  boundingBox: z
    .object({
      ymin: z.number().int().min(0).max(1000),
      xmin: z.number().int().min(0).max(1000),
      ymax: z.number().int().min(0).max(1000),
      xmax: z.number().int().min(0).max(1000),
    })
    .optional(),
});

export const CreateReceiptSchema = z.object({
  invoiceNumber: z.string().optional(),
  receiptDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').default(() => new Date().toISOString().slice(0, 10)),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').default(() => new Date().toISOString().slice(0, 10)),
  supplier: z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Supplier name is required'),
    phone: z.string().optional(),
    gstin: z.string().optional(),
    address: z.string().optional(),
  }),
  payment: z.object({
    method: z.enum(['cash', 'upi', 'credit_udhar', 'bank_transfer', 'cheque']).default('cash'),
    status: z.enum(['paid', 'unpaid_udhar', 'partially_paid']).default('paid'),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    paidAmountMinor: z.number().int().nonnegative().optional(),
    transactionRef: z.string().optional(),
  }).default({ method: 'cash', status: 'paid' }),
  imagePath: z.string().min(1, 'Storage image path is required'),
  thumbnailPath: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  items: z.array(LineItemInputSchema).optional().default([]),
});

export const UpdateReceiptSchema = z.object({
  invoiceNumber: z.string().optional(),
  receiptDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  supplier: z
    .object({
      id: z.string().optional(),
      name: z.string().min(1),
      phone: z.string().optional(),
      gstin: z.string().optional(),
      address: z.string().optional(),
    })
    .optional(),
  payment: z
    .object({
      method: z.enum(['cash', 'upi', 'credit_udhar', 'bank_transfer', 'cheque']),
      status: z.enum(['paid', 'unpaid_udhar', 'partially_paid']),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      paidAmountMinor: z.number().int().nonnegative().optional(),
      transactionRef: z.string().optional(),
    })
    .optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  items: z.array(LineItemInputSchema).optional(),
});

export const ConfirmReceiptSchema = z.object({
  notes: z.string().optional(),
});

// -----------------------------------------------------------------------------
// Chat Schema
// -----------------------------------------------------------------------------

export const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(1000, 'Message cannot exceed 1000 characters'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        text: z.string(),
      })
    )
    .optional()
    .default([]),
});

// -----------------------------------------------------------------------------
// Param ID Schemas
// -----------------------------------------------------------------------------

export const ReceiptIdParamSchema = z.object({
  receiptId: z.string().min(1, 'Receipt ID is required'),
});

export const SupplierIdParamSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID is required'),
});

export const ItemIdParamSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
});
