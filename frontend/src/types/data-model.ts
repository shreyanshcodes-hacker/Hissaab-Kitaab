/**
 * ShopLedger Core Firestore Data Model Types
 *
 * All financial values are represented in integer minor units (paise for INR).
 * 100 paise = 1 Indian Rupee (₹).
 */

// -----------------------------------------------------------------------------
// Common Enums & Base Types
// -----------------------------------------------------------------------------

export type CurrencyCode = 'INR';

export type BusinessRole = 'owner' | 'manager' | 'accountant' | 'cashier' | 'viewer';

export type BusinessType =
  | 'kirana'
  | 'retail'
  | 'wholesale_mandi'
  | 'godown_warehouse'
  | 'general_store'
  | 'supermarket'
  | 'other';

export type ReceiptReviewStatus =
  | 'draft'          // Uploaded or staged, not yet extracted
  | 'processing'     // Undergoing Gemini OCR extraction
  | 'needs_review'   // Extracted with low-confidence flags or arithmetic discrepancy
  | 'verified'       // Verified & confirmed by shopkeeper into the ledger
  | 'reconciled'     // Matched and checked off during night closing tally
  | 'archived';      // Soft archived

export type PaymentMethod = 'cash' | 'upi' | 'credit_udhar' | 'bank_transfer' | 'cheque';

export type PaymentStatus = 'paid' | 'unpaid_udhar' | 'partially_paid';

export type MeasurementUnit =
  | 'kg'
  | 'gram'
  | 'pouch'
  | 'packet'
  | 'bag'
  | 'tin'
  | 'box'
  | 'carton'
  | 'liter'
  | 'ml'
  | 'piece'
  | 'bundle'
  | 'dozen'
  | 'other';

export interface BoundingBox {
  ymin: number; // 0 to 1000 normalized coordinate
  xmin: number; // 0 to 1000 normalized coordinate
  ymax: number; // 0 to 1000 normalized coordinate
  xmax: number; // 0 to 1000 normalized coordinate
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: 'IN';
}

// -----------------------------------------------------------------------------
// 1. User Profile (`/users/{uid}`)
// -----------------------------------------------------------------------------

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
  activeBusinessId: string;
  businessIds: string[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// -----------------------------------------------------------------------------
// 2. Business / Shop Entity (`/businesses/{businessId}`)
// -----------------------------------------------------------------------------

export interface BusinessMember {
  uid: string;
  role: BusinessRole;
  displayName: string;
  email: string;
  addedAt: string;
  addedBy: string;
}

export interface BusinessSettings {
  defaultTaxSlabs: number[];               // e.g. [0, 5, 12, 18, 28]
  confidenceThreshold: number;             // e.g. 0.85
  requireReviewForUncertain: boolean;
  dailyReconciliationReminder: boolean;
  language: 'en' | 'hi' | 'hinglish';
  autoMatchSuppliers: boolean;
}

export interface Business {
  id: string;
  name: string;                             // e.g. "Sharma Kirana Store"
  legalName?: string;
  businessType: BusinessType;
  gstin?: string;                           // 15-character Indian GSTIN
  pan?: string;
  ownerUid: string;
  memberUids: string[];                     // Flat array for security rules & array-contains queries
  members: Record<string, BusinessMember>;  // Detailed role map keyed by UID
  currency: CurrencyCode;
  currencySymbol: string;                   // '₹'
  address: Address;
  phone?: string;
  email?: string;
  settings: BusinessSettings;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 3. Purchase Receipt Entity (`/businesses/{businessId}/receipts/{receiptId}`)
// -----------------------------------------------------------------------------

export interface ReceiptSupplierSnapshot {
  id?: string;                              // Reference to normalized supplier if matched
  name: string;                             // e.g. "Gupta Wholesale Mart"
  phone?: string;
  gstin?: string;
  address?: string;
}

export interface ReceiptPaymentDetails {
  method: PaymentMethod;
  status: PaymentStatus;
  dueDate?: string;                         // ISO 8601 YYYY-MM-DD for credit/udhar
  paidAmountMinor?: number;                 // Integer paise
  transactionRef?: string;                  // UPI UTR or Cheque number
}

export interface ReceiptExtractionMetadata {
  model: string;                            // e.g. "gemini-2.5-flash"
  durationMs: number;
  overallConfidence: number;                // 0.0 to 1.0
  rawSnippet?: string;
  flaggedFieldsCount: number;
  errorReason?: string;
}

export interface Receipt {
  id: string;
  businessId: string;
  invoiceNumber?: string;                   // Extracted bill/cash memo number
  receiptDate: string;                      // ISO 8601 date printed on bill (YYYY-MM-DD)
  purchaseDate: string;                     // ISO 8601 date transaction took place
  supplier: ReceiptSupplierSnapshot;
  payment: ReceiptPaymentDetails;
  currency: CurrencyCode;

  // Financial totals in integer paise (minor units)
  subtotalMinor: number;
  taxTotalMinor: number;
  discountTotalMinor: number;
  roundOffMinor: number;
  grandTotalMinor: number;

  reviewStatus: ReceiptReviewStatus;
  imagePath: string;                        // Firebase Storage path: businesses/{businessId}/receipts/{receiptId}/original.jpg
  thumbnailPath?: string;
  lineItemCount: number;

  extractionMetadata?: ReceiptExtractionMetadata;
  notes?: string;
  tags: string[];

  // Soft delete flag
  isDeleted: boolean;

  // Timestamps
  createdAt: string;                        // When scanned or uploaded
  updatedAt: string;                        // Last modified
  confirmedAt?: string;                     // When verified by shopkeeper
  confirmedBy?: string;                     // User UID who confirmed
  reconciledAt?: string;                    // Evening closing timestamp
  deletedAt?: string;
}

// -----------------------------------------------------------------------------
// 4. Receipt Line Item Snapshot (`/businesses/{businessId}/receipts/{receiptId}/items/{lineItemId}`)
// -----------------------------------------------------------------------------

export interface ReceiptLineItem {
  id: string;
  receiptId: string;
  businessId: string;
  lineIndex: number;

  // Immutable historical snapshot fields
  rawName: string;                          // Verbatim extracted item name, e.g. "Fortune Kachi Ghani 1L Pouch"
  normalizedItemId?: string;                // Reference to catalog item
  category: string;                         // e.g. "Edible Oils & Ghee"
  hsnCode?: string;

  quantity: number;
  unit: MeasurementUnit;
  unitPriceMinor: number;                   // Integer paise per unit
  discountMinor: number;                    // Integer paise discount on line
  taxRatePercent: number;                   // e.g. 5 for 5% GST
  taxAmountMinor: number;                   // Integer paise tax on line
  lineTotalMinor: number;                   // Integer paise final line total

  confidenceScore: number;                  // 0.0 to 1.0
  needsReview: boolean;
  reviewReason?: string;
  boundingBox?: BoundingBox;                // Normalized coordinates 0..1000

  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 5. Normalized Supplier Record (`/businesses/{businessId}/suppliers/{supplierId}`)
// -----------------------------------------------------------------------------

export interface Supplier {
  id: string;
  businessId: string;
  name: string;                             // e.g. "Gupta Wholesale Mart"
  tradeName?: string;
  phone?: string;
  alternatePhone?: string;
  whatsapp?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  address?: Address;
  paymentTerms?: string;                    // e.g. "Net 15", "Immediate UPI"
  defaultCategory?: string;
  notes?: string;

  // Aggregated purchase stats
  totalReceiptsCount: number;
  totalSpendMinor: number;                  // Total spent in integer paise
  lastPurchaseDate?: string;                // ISO 8601 date

  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 6. Normalized Catalog Item (`/businesses/{businessId}/items/{itemId}`)
// -----------------------------------------------------------------------------

export interface CatalogItem {
  id: string;
  businessId: string;
  name: string;                             // e.g. "Fortune Kachi Ghani Mustard Oil 1L"
  brand?: string;
  category: string;
  hsnCode?: string;
  barcode?: string;
  defaultUnit: MeasurementUnit;

  // Rate tracking in integer paise
  typicalPurchasePriceMinor: number;
  lastPurchasePriceMinor: number;
  lowestPriceMinor: number;
  highestPriceMinor: number;

  lastSupplierId?: string;
  lastPurchaseDate?: string;

  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 7. Category Metadata (`/businesses/{businessId}/categories/{categoryId}`)
// -----------------------------------------------------------------------------

export interface Category {
  id: string;
  businessId: string;
  name: string;                             // e.g. "Edible Oils & Ghee"
  slug: string;
  icon?: string;
  color?: string;
  defaultGstRate?: number;                  // e.g. 5
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
