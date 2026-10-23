export type ReceiptStatus = 'processing' | 'needs_review' | 'verified' | 'draft' | 'archived';
export type PaymentMode = 'cash' | 'upi' | 'credit_udhar' | 'bank_transfer' | 'cheque';
export type PaymentStatus = 'paid' | 'unpaid_udhar' | 'partial';

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface ReceiptItem {
  id: string;
  name: string;
  category: string;
  hsnCode?: string;
  quantity: number;
  unit: string;
  unitRate: number;
  lineTotal: number;
  taxRate?: number;
  taxAmount?: number;
  confidenceScore: number;
  needsReview: boolean;
  reviewReason?: string;
  boundingBox?: BoundingBox;
}

export interface TaxBreakdown {
  slabRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
}

export interface Receipt {
  id: string;
  invoiceNo: string;
  supplierId: string;
  supplierName: string;
  mandiMarket?: string;
  billDate: string;
  scannedAt: string;
  status: ReceiptStatus;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  items: ReceiptItem[];
  itemCount: number;
  taxBreakdown: TaxBreakdown[];
  ocrConfidence: {
    overall: number;
    hasFlaggedItems: boolean;
    flaggedCount?: number;
  };
  sourceVoucherUrl?: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  mandiMarket?: string;
  gstin?: string;
  aliases: string[];
  notes?: string;
  metrics: {
    totalSpendCurrentMonth: number;
    totalSpendAllTime: number;
    billsCount: number;
    lastPurchaseDate: string;
    topCategories: string[];
  };
}

export interface PricePoint {
  date: string;
  supplierName: string;
  supplierId: string;
  receiptId: string;
  unitRate: number;
  unit: string;
  quantity: number;
}

export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  hsnCode?: string;
  defaultUnit: string;
  latestPurchaseRate: number;
  lowestRate30Days: number;
  highestRate30Days: number;
  primarySupplierName: string;
  priceHistory: PricePoint[];
  stockQuantity?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  structuredCard?: {
    type: 'supplier_comparison' | 'price_alert';
    title?: string;
    data: any;
  };
  citedReceiptIds?: string[];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  shopName: string;
  businessType: string;
  role: 'owner' | 'staff';
  activeBranch: string;
  activeBusinessId?: string;
  gstin?: string;
  createdAt?: string;
  isGuest?: boolean;
}
