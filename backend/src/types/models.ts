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
  | 'draft'
  | 'processing'
  | 'needs_review'
  | 'verified'
  | 'reconciled'
  | 'archived';

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
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: 'IN';
}

export interface BusinessMember {
  uid: string;
  role: BusinessRole;
  displayName: string;
  email: string;
  addedAt: string;
  addedBy: string;
}

export interface Business {
  id: string;
  name: string;
  legalName?: string;
  businessType: BusinessType;
  gstin?: string;
  pan?: string;
  ownerUid: string;
  memberUids: string[];
  members: Record<string, BusinessMember>;
  currency: CurrencyCode;
  currencySymbol: string;
  address: Address;
  phone?: string;
  email?: string;
  settings: {
    defaultTaxSlabs: number[];
    confidenceThreshold: number;
    requireReviewForUncertain: boolean;
    dailyReconciliationReminder: boolean;
    language: 'en' | 'hi' | 'hinglish';
  };
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptSupplierSnapshot {
  id?: string;
  name: string;
  phone?: string;
  gstin?: string;
  address?: string;
}

export interface ReceiptPaymentDetails {
  method: PaymentMethod;
  status: PaymentStatus;
  dueDate?: string;
  paidAmountMinor?: number;
  transactionRef?: string;
}

export interface ReceiptExtractionMetadata {
  model: string;
  durationMs: number;
  overallConfidence: number;
  rawSnippet?: string;
  flaggedFieldsCount: number;
  errorReason?: string;
}

export interface Receipt {
  id: string;
  businessId: string;
  invoiceNumber?: string;
  receiptDate: string;
  purchaseDate: string;
  supplier: ReceiptSupplierSnapshot;
  payment: ReceiptPaymentDetails;
  currency: CurrencyCode;

  subtotalMinor: number;
  taxTotalMinor: number;
  discountTotalMinor: number;
  roundOffMinor: number;
  grandTotalMinor: number;

  reviewStatus: ReceiptReviewStatus;
  imagePath: string;
  thumbnailPath?: string;
  lineItemCount: number;
  categories?: string[];

  extractionMetadata?: ReceiptExtractionMetadata;
  notes?: string;
  tags: string[];

  isDeleted: boolean;

  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  confirmedBy?: string;
  reconciledAt?: string;
  deletedAt?: string;
}

export interface ReceiptLineItem {
  id: string;
  receiptId: string;
  businessId: string;
  lineIndex: number;

  rawName: string;
  normalizedItemId?: string;
  category: string;
  hsnCode?: string;

  quantity: number;
  unit: MeasurementUnit;
  unitPriceMinor: number;
  discountMinor: number;
  taxRatePercent: number;
  taxAmountMinor: number;
  lineTotalMinor: number;

  confidenceScore: number;
  needsReview: boolean;
  reviewReason?: string;
  boundingBox?: BoundingBox;

  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  tradeName?: string;
  phone?: string;
  alternatePhone?: string;
  whatsapp?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  address?: Address;
  paymentTerms?: string;
  defaultCategory?: string;
  notes?: string;

  totalReceiptsCount: number;
  totalSpendMinor: number;
  lastPurchaseDate?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CatalogItem {
  id: string;
  businessId: string;
  name: string;
  brand?: string;
  category: string;
  hsnCode?: string;
  barcode?: string;
  defaultUnit: MeasurementUnit;

  typicalPurchasePriceMinor: number;
  lastPurchasePriceMinor: number;
  lowestPriceMinor: number;
  highestPriceMinor: number;

  lastSupplierId?: string;
  lastPurchaseDate?: string;

  createdAt: string;
  updatedAt: string;
}
