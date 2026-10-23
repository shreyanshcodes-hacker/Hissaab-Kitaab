import type { Receipt } from '../types';
import { DEMO_RECEIPTS } from '../data/demoData';
import { apiClient } from './client';

let localReceipts: Receipt[] = [...DEMO_RECEIPTS];

function mapBackendToFrontendReceipt(r: any): Receipt {
  return {
    id: r.id,
    invoiceNo: r.invoiceNumber || r.id,
    billDate: r.purchaseDate || r.receiptDate || new Date().toISOString().slice(0, 10),
    scannedAt: r.createdAt || new Date().toISOString(),
    supplierId: r.supplier?.id || 'sup_unknown',
    supplierName: r.supplier?.name || 'Unknown Supplier',
    paymentMode: r.payment?.method || 'upi',
    paymentStatus: r.payment?.status || 'paid',
    subtotal: (r.subtotalMinor || 0) / 100,
    taxTotal: (r.taxTotalMinor || 0) / 100,
    grandTotal: (r.grandTotalMinor || 0) / 100,
    itemCount: r.lineItemCount || 0,
    taxBreakdown: [],
    items: [],
    status: r.reviewStatus === 'needs_review' ? 'needs_review' : r.reviewStatus === 'verified' ? 'verified' : 'draft',
    ocrConfidence: {
      overall: r.extractionMetadata?.overallConfidence || 0.92,
      hasFlaggedItems: (r.extractionMetadata?.flaggedFieldsCount || 0) > 0,
      flaggedCount: r.extractionMetadata?.flaggedFieldsCount || 0,
    },
    sourceVoucherUrl: r.imagePath || 'https://images.unsplash.com/photo-1554415707-9e4466bfe0dc?auto=format&fit=crop&q=80&w=600',
  };
}

export const receiptService = {
  async getReceipts(filter?: {
    status?: string;
    supplierId?: string;
    category?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<Receipt[]> {
    const res = await this.getReceiptsWithPagination(filter);
    return res.items;
  },

  async getReceiptsWithPagination(filter?: {
    page?: number;
    limit?: number;
    status?: string;
    supplierId?: string;
    category?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ items: Receipt[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    try {
      const queryParams: Record<string, string> = {};
      if (filter?.status && filter.status !== 'all') queryParams.status = filter.status;
      if (filter?.supplierId) queryParams.supplierId = filter.supplierId;
      if (filter?.category) queryParams.category = filter.category;
      if (filter?.search) queryParams.search = filter.search;
      if (filter?.startDate) queryParams.startDate = filter.startDate;
      if (filter?.endDate) queryParams.endDate = filter.endDate;
      if (filter?.page) queryParams.page = String(filter.page);
      if (filter?.limit) queryParams.limit = String(filter.limit);

      const response: any = await apiClient.get('/receipts', queryParams);
      if (response?.data?.items && Array.isArray(response.data.items)) {
        return {
          items: response.data.items.map(mapBackendToFrontendReceipt),
          pagination: response.data.pagination || {
            page: filter?.page || 1,
            limit: filter?.limit || 20,
            total: response.data.items.length,
            totalPages: 1,
          },
        };
      }
    } catch {
      // Offline / demo fallback
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
    let result = [...localReceipts];

    if (filter?.status && filter.status !== 'all') {
      result = result.filter((r) => r.status === filter.status);
    }
    if (filter?.supplierId) {
      result = result.filter((r) => r.supplierId === filter.supplierId);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.invoiceNo.toLowerCase().includes(q) ||
          r.supplierName.toLowerCase().includes(q) ||
          r.items.some((item) => item.name.toLowerCase().includes(q))
      );
    }

    const page = filter?.page || 1;
    const limit = filter?.limit || 20;
    const total = result.length;
    const offset = (page - 1) * limit;
    const paginatedItems = result.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  async getReceiptById(id: string): Promise<Receipt | null> {
    try {
      const response: any = await apiClient.get(`/receipts/${id}`);
      if (response?.data?.receipt) {
        const r = response.data.receipt;
        const lineItems = response.data.lineItems || [];
        return {
          id: r.id,
          invoiceNo: r.invoiceNumber || r.id,
          billDate: r.purchaseDate || r.receiptDate || new Date().toISOString().split('T')[0],
          scannedAt: r.createdAt || new Date().toISOString(),
          supplierId: r.supplier?.id || 'sup_unknown',
          supplierName: r.supplier?.name || 'Unknown Supplier',
          paymentMode: r.payment?.method || 'upi',
          paymentStatus: r.payment?.status || 'paid',
          subtotal: (r.subtotalMinor || 0) / 100,
          taxTotal: (r.taxTotalMinor || 0) / 100,
          grandTotal: (r.grandTotalMinor || 0) / 100,
          itemCount: lineItems.length,
          taxBreakdown: [],
          status: r.reviewStatus === 'needs_review' ? 'needs_review' : r.reviewStatus === 'verified' ? 'verified' : 'draft',
          items: lineItems.map((item: any) => ({
            id: item.id,
            name: item.rawName,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            unitRate: (item.unitPriceMinor || 0) / 100,
            lineTotal: (item.lineTotalMinor || 0) / 100,
            taxRate: item.taxRatePercent || 0,
            taxAmount: (item.taxAmountMinor || 0) / 100,
            confidenceScore: item.confidenceScore || 0.95,
            needsReview: item.needsReview || false,
            reviewReason: item.reviewReason,
            boundingBox: item.boundingBox,
          })),
          ocrConfidence: {
            overall: r.extractionMetadata?.overallConfidence || 0.88,
            hasFlaggedItems: (r.extractionMetadata?.flaggedFieldsCount || 0) > 0,
            flaggedCount: r.extractionMetadata?.flaggedFieldsCount || 0,
          },
          sourceVoucherUrl: r.imagePath || 'https://images.unsplash.com/photo-1554415707-9e4466bfe0dc?auto=format&fit=crop&q=80&w=600',
        };
      }
    } catch {
      // Fallback
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
    const found = localReceipts.find((r) => r.id === id);
    return found ? { ...found } : null;
  },

  async createReceipt(data: {
    invoiceNumber?: string;
    receiptDate: string;
    purchaseDate: string;
    supplier: { name: string; phone?: string; gstin?: string };
    payment: { method: string; status: string };
    items: Array<{
      rawName: string;
      category?: string;
      quantity: number;
      unit?: string;
      unitPriceMinor: number;
      taxRatePercent?: number;
    }>;
  }): Promise<Receipt> {
    const payload = {
      ...data,
      imagePath: 'manual-entry',
    };

    const res: any = await apiClient.post('/receipts', payload);
    if (res?.data?.receipt) {
      return mapBackendToFrontendReceipt(res.data.receipt);
    }

    // Fallback
    const newReceipt: Receipt = {
      id: `REC-${Date.now().toString().slice(-4)}`,
      invoiceNo: data.invoiceNumber || `MANUAL-${Date.now().toString().slice(-4)}`,
      billDate: data.purchaseDate,
      scannedAt: new Date().toISOString(),
      supplierId: 'sup_manual',
      supplierName: data.supplier.name,
      paymentMode: (data.payment.method as any) || 'cash',
      paymentStatus: (data.payment.status as any) || 'paid',
      subtotal: data.items.reduce((acc, it) => acc + (it.quantity * it.unitPriceMinor) / 100, 0),
      taxTotal: 0,
      grandTotal: data.items.reduce((acc, it) => acc + (it.quantity * it.unitPriceMinor) / 100, 0),
      items: [],
      itemCount: data.items.length,
      taxBreakdown: [],
      status: 'verified',
      ocrConfidence: { overall: 1.0, hasFlaggedItems: false },
    };
    localReceipts.unshift(newReceipt);
    return newReceipt;
  },

  async verifyReceipt(id: string, updatedItems: Receipt['items'], headerInfo?: any): Promise<Receipt> {
    try {
      // 1. Update receipt line items on server first
      await apiClient.patch(`/receipts/${id}`, {
        invoiceNumber: headerInfo?.invoiceNo,
        receiptDate: headerInfo?.date,
        purchaseDate: headerInfo?.date,
        supplier: {
          name: headerInfo?.supplierName,
          phone: headerInfo?.supplierPhone,
          gstin: headerInfo?.supplierGstin,
        },
        items: updatedItems.map((item) => ({
          id: item.id,
          rawName: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit || 'piece',
          unitPriceMinor: Math.round(item.unitRate * 100),
          taxRatePercent: item.taxRate || 0,
          needsReview: false,
        })),
      });

      // 2. Commit transaction to bahi khata
      await apiClient.post(`/receipts/${id}/confirm`, {
        notes: 'Verified via 5-second check screen',
      });
    } catch (err) {
      console.warn('[ReceiptService] Backend confirmation API call failed, falling back to local verification:', err);
    }

    // Local state sync
    const index = localReceipts.findIndex((r) => r.id === id);
    const subtotal = updatedItems.reduce((acc, item) => acc + item.lineTotal, 0);
    const taxTotal = updatedItems.reduce((acc, item) => acc + (item.taxAmount || 0), 0);
    const grandTotal = subtotal + taxTotal;

    const baseReceipt = index !== -1 ? localReceipts[index] : DEMO_RECEIPTS[0];
    const updated: Receipt = {
      ...baseReceipt,
      id,
      supplierName: headerInfo?.supplierName || baseReceipt.supplierName,
      invoiceNo: headerInfo?.invoiceNo || baseReceipt.invoiceNo,
      billDate: headerInfo?.date || baseReceipt.billDate,
      items: updatedItems.map((i) => ({ ...i, needsReview: false })),
      subtotal,
      taxTotal,
      grandTotal,
      status: 'verified',
      ocrConfidence: {
        overall: 1.0,
        hasFlaggedItems: false,
        flaggedCount: 0,
      },
    };

    if (index !== -1) {
      localReceipts[index] = updated;
    } else {
      localReceipts.push(updated);
    }

    return updated;
  },
};
