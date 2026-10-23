/**
 * ShopLedger Zod Validation Schemas
 *
 * Runtime validation schemas for receipt headers, line items, supplier snapshots,
 * and extraction metadata. Ensures zero undefined financial fields and enforces
 * integer minor currency constraints.
 */

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Base & Enum Schemas
// -----------------------------------------------------------------------------

export const CurrencyCodeSchema = z.literal('INR');

export const BusinessTypeSchema = z.enum([
  'kirana',
  'retail',
  'wholesale_mandi',
  'godown_warehouse',
  'general_store',
  'supermarket',
  'other',
]);

export const ReceiptReviewStatusSchema = z.enum([
  'draft',
  'processing',
  'needs_review',
  'verified',
  'reconciled',
  'archived',
]);

export const PaymentMethodSchema = z.enum([
  'cash',
  'upi',
  'credit_udhar',
  'bank_transfer',
  'cheque',
]);

export const PaymentStatusSchema = z.enum(['paid', 'unpaid_udhar', 'partially_paid']);

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

// Normalized bounding box: [0..1000] space
export const BoundingBoxSchema = z.object({
  ymin: z.number().int().min(0).max(1000),
  xmin: z.number().int().min(0).max(1000),
  ymax: z.number().int().min(0).max(1000),
  xmax: z.number().int().min(0).max(1000),
});

export const AddressSchema = z.object({
  line1: z.string().min(1, 'Street address is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'PIN Code must be 6 digits'),
  country: z.literal('IN').default('IN'),
});

// -----------------------------------------------------------------------------
// Supplier Snapshot Schema
// -----------------------------------------------------------------------------

export const ReceiptSupplierSnapshotSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Supplier name is required'),
  phone: z.string().optional(),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid Indian GSTIN format')
    .optional()
    .or(z.literal('')),
  address: z.string().optional(),
});

// -----------------------------------------------------------------------------
// Payment Details Schema
// -----------------------------------------------------------------------------

export const ReceiptPaymentDetailsSchema = z.object({
  method: PaymentMethodSchema.default('cash'),
  status: PaymentStatusSchema.default('paid'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD').optional(),
  paidAmountMinor: z.number().int().nonnegative('Paid amount must be non-negative integer paise').optional(),
  transactionRef: z.string().optional(),
});

// -----------------------------------------------------------------------------
// Line Item Schema (Snapshot)
// -----------------------------------------------------------------------------

export const ReceiptLineItemSchema = z.object({
  id: z.string().min(1, 'Line item ID is required'),
  receiptId: z.string().min(1, 'Receipt ID is required'),
  businessId: z.string().min(1, 'Business ID is required'),
  lineIndex: z.number().int().nonnegative(),
  rawName: z.string().min(1, 'Item name cannot be empty'),
  normalizedItemId: z.string().optional(),
  category: z.string().default('General Grocery'),
  hsnCode: z.string().optional(),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unit: MeasurementUnitSchema.default('piece'),

  // Integer paise fields
  unitPriceMinor: z.number().int().nonnegative('Unit price must be non-negative integer paise'),
  discountMinor: z.number().int().nonnegative('Discount must be non-negative integer paise').default(0),
  taxRatePercent: z.number().nonnegative().max(100).default(0),
  taxAmountMinor: z.number().int().nonnegative().default(0),
  lineTotalMinor: z.number().int().nonnegative('Line total must be non-negative integer paise'),

  confidenceScore: z.number().min(0).max(1).default(1.0),
  needsReview: z.boolean().default(false),
  reviewReason: z.string().optional(),
  boundingBox: BoundingBoxSchema.optional(),

  createdAt: z.string().datetime().optional().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().optional().default(() => new Date().toISOString()),
});

// -----------------------------------------------------------------------------
// Extraction Metadata Schema
// -----------------------------------------------------------------------------

export const ReceiptExtractionMetadataSchema = z.object({
  model: z.string().default('gemini-2.5-flash'),
  durationMs: z.number().int().nonnegative().default(0),
  overallConfidence: z.number().min(0).max(1).default(1.0),
  rawSnippet: z.string().optional(),
  flaggedFieldsCount: z.number().int().nonnegative().default(0),
  errorReason: z.string().optional(),
});

// -----------------------------------------------------------------------------
// Full Receipt Header Schema
// -----------------------------------------------------------------------------

export const ReceiptSchema = z.object({
  id: z.string().min(1, 'Receipt ID is required'),
  businessId: z.string().min(1, 'Business ID is required'),
  invoiceNumber: z.string().optional(),
  receiptDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Receipt date must be YYYY-MM-DD'),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Purchase date must be YYYY-MM-DD'),
  supplier: ReceiptSupplierSnapshotSchema,
  payment: ReceiptPaymentDetailsSchema,
  currency: CurrencyCodeSchema.default('INR'),

  // Integer paise financial totals
  subtotalMinor: z.number().int().nonnegative('Subtotal must be non-negative integer paise'),
  taxTotalMinor: z.number().int().nonnegative('Tax total must be non-negative integer paise').default(0),
  discountTotalMinor: z.number().int().nonnegative('Discount total must be non-negative integer paise').default(0),
  roundOffMinor: z.number().int().default(0),
  grandTotalMinor: z.number().int().nonnegative('Grand total must be non-negative integer paise'),

  reviewStatus: ReceiptReviewStatusSchema.default('draft'),
  imagePath: z.string().min(1, 'Storage image path is required'),
  thumbnailPath: z.string().optional(),
  lineItemCount: z.number().int().nonnegative().default(0),

  extractionMetadata: ReceiptExtractionMetadataSchema.optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),

  isDeleted: z.boolean().default(false),

  createdAt: z.string().datetime().optional().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().optional().default(() => new Date().toISOString()),
  confirmedAt: z.string().datetime().optional(),
  confirmedBy: z.string().optional(),
  reconciledAt: z.string().datetime().optional(),
  deletedAt: z.string().datetime().optional(),
});

// -----------------------------------------------------------------------------
// Supplier Schema
// -----------------------------------------------------------------------------

export const SupplierSchema = z.object({
  id: z.string().min(1),
  businessId: z.string().min(1),
  name: z.string().min(1, 'Supplier name is required'),
  tradeName: z.string().optional(),
  phone: z.string().optional(),
  alternatePhone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  address: AddressSchema.optional(),
  paymentTerms: z.string().optional(),
  defaultCategory: z.string().optional(),
  notes: z.string().optional(),

  totalReceiptsCount: z.number().int().nonnegative().default(0),
  totalSpendMinor: z.number().int().nonnegative().default(0),
  lastPurchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),

  createdAt: z.string().datetime().optional().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().optional().default(() => new Date().toISOString()),
});

// -----------------------------------------------------------------------------
// Catalog Item Schema
// -----------------------------------------------------------------------------

export const CatalogItemSchema = z.object({
  id: z.string().min(1),
  businessId: z.string().min(1),
  name: z.string().min(1, 'Item name is required'),
  brand: z.string().optional(),
  category: z.string().default('General Grocery'),
  hsnCode: z.string().optional(),
  barcode: z.string().optional(),
  defaultUnit: MeasurementUnitSchema.default('piece'),

  typicalPurchasePriceMinor: z.number().int().nonnegative().default(0),
  lastPurchasePriceMinor: z.number().int().nonnegative().default(0),
  lowestPriceMinor: z.number().int().nonnegative().default(0),
  highestPriceMinor: z.number().int().nonnegative().default(0),

  lastSupplierId: z.string().optional(),
  lastPurchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),

  createdAt: z.string().datetime().optional().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().optional().default(() => new Date().toISOString()),
});

// Infer types from schemas for validation guarantees
export type ReceiptInput = z.infer<typeof ReceiptSchema>;
export type ReceiptLineItemInput = z.infer<typeof ReceiptLineItemSchema>;
export type SupplierInput = z.infer<typeof SupplierSchema>;
export type CatalogItemInput = z.infer<typeof CatalogItemSchema>;
