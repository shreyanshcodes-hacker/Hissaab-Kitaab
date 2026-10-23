import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Receipt } from '../types';
import { DEMO_RECEIPTS } from '../data/demoData';
import { apiClient, getActiveTenantContext } from './client';

let guestDemoReceipts: Receipt[] = [...DEMO_RECEIPTS];

function mapBackendToFrontendReceipt(r: any, lineItems: any[] = []): Receipt {
  const mappedItems = Array.isArray(lineItems) && lineItems.length > 0
    ? lineItems.map((item: any) => ({
        id: item.id,
        name: item.rawName || item.name || 'Item',
        category: item.category || 'General Grocery',
        quantity: Number(item.quantity) || 1,
        unit: item.unit || 'piece',
        unitRate: (item.unitPriceMinor || 0) / 100,
        lineTotal: (item.lineTotalMinor || 0) / 100,
        taxRate: item.taxRatePercent || 0,
        taxAmount: (item.taxAmountMinor || 0) / 100,
        confidenceScore: item.confidenceScore ?? 0.95,
        needsReview: Boolean(item.needsReview),
        reviewReason: item.reviewReason,
        boundingBox: item.boundingBox,
      }))
    : [];

  return {
    id: r.id,
    invoiceNo: r.invoiceNumber || r.id,
    billDate: r.purchaseDate || r.receiptDate || new Date().toISOString().slice(0, 10),
    scannedAt:
      typeof r.createdAt?.toDate === 'function'
        ? r.createdAt.toDate().toISOString()
        : r.createdAt || new Date().toISOString(),
    supplierId: r.supplier?.id || 'sup_unknown',
    supplierName: r.supplier?.name || 'Unknown Supplier',
    paymentMode: r.payment?.method || 'upi',
    paymentStatus: r.payment?.status === 'partially_paid' ? 'partial' : r.payment?.status || 'paid',
    subtotal: (r.subtotalMinor || 0) / 100,
    taxTotal: (r.taxTotalMinor || 0) / 100,
    grandTotal: (r.grandTotalMinor || 0) / 100,
    itemCount: r.lineItemCount ?? mappedItems.length,
    taxBreakdown: [],
    items: mappedItems,
    status:
      r.reviewStatus === 'needs_review'
        ? 'needs_review'
        : r.reviewStatus === 'verified'
          ? 'verified'
          : 'draft',
    ocrConfidence: {
      overall: r.extractionMetadata?.overallConfidence ?? 0.92,
      hasFlaggedItems: (r.extractionMetadata?.flaggedFieldsCount || 0) > 0,
      flaggedCount: r.extractionMetadata?.flaggedFieldsCount || 0,
    },
    sourceVoucherUrl:
      r.imagePath && r.imagePath !== 'manual-entry'
        ? r.imagePath
        : 'https://images.unsplash.com/photo-1554415707-9e4466bfe0dc?auto=format&fit=crop&q=80&w=600',
  };
}

function slugifyId(prefix: string, name: string): string {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return `${prefix}_${clean || 'default'}`;
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
  }): Promise<{
    items: Receipt[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { isGuestMode, businessId } = getActiveTenantContext();

    // 1. Authenticated user: Try Express API first, then fallback to direct Firestore /businesses/{businessId}/receipts
    if (!isGuestMode && businessId) {
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

        const response: any = await apiClient.get('/receipts', queryParams, businessId);
        if (response?.data?.items && Array.isArray(response.data.items)) {
          return {
            items: response.data.items.map((r: any) => mapBackendToFrontendReceipt(r)),
            pagination: response.data.pagination || {
              page: filter?.page || 1,
              limit: filter?.limit || 20,
              total: response.data.items.length,
              totalPages: 1,
            },
          };
        }
      } catch {
        // Express backend unreachable — query user's isolated Firestore tenant directly
      }

      try {
        const receiptsRef = collection(db, 'businesses', businessId, 'receipts');
        const snap = await getDocs(receiptsRef);
        let docs = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((r) => !r.isDeleted);

        // Sort newest purchaseDate first
        docs.sort((a, b) => {
          const dateA = a.purchaseDate || a.receiptDate || '';
          const dateB = b.purchaseDate || b.receiptDate || '';
          return dateB.localeCompare(dateA);
        });

        let mapped = docs.map((r) => mapBackendToFrontendReceipt(r));

        if (filter?.status && filter.status !== 'all') {
          mapped = mapped.filter((r) => r.status === filter.status);
        }
        if (filter?.supplierId) {
          mapped = mapped.filter((r) => r.supplierId === filter.supplierId);
        }
        if (filter?.startDate) {
          mapped = mapped.filter((r) => r.billDate >= filter.startDate!);
        }
        if (filter?.endDate) {
          mapped = mapped.filter((r) => r.billDate <= filter.endDate!);
        }
        if (filter?.search) {
          const q = filter.search.toLowerCase();
          mapped = mapped.filter(
            (r) =>
              r.invoiceNo.toLowerCase().includes(q) ||
              r.supplierName.toLowerCase().includes(q) ||
              r.id.toLowerCase().includes(q)
          );
        }

        const page = filter?.page || 1;
        const limit = filter?.limit || 20;
        const total = mapped.length;
        const offset = (page - 1) * limit;
        const paginatedItems = mapped.slice(offset, offset + limit);

        return {
          items: paginatedItems,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
          },
        };
      } catch (fsErr) {
        console.warn('[ReceiptService] Direct Firestore read failed:', fsErr);
        return {
          items: [],
          pagination: { page: 1, limit: filter?.limit || 20, total: 0, totalPages: 1 },
        };
      }
    }

    // 2. Guest Demo Mode ONLY: use DEMO_RECEIPTS
    let result = [...guestDemoReceipts];

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
    const { isGuestMode, businessId } = getActiveTenantContext();

    if (!isGuestMode && businessId) {
      try {
        const response: any = await apiClient.get(`/receipts/${id}`, undefined, businessId);
        if (response?.data?.receipt) {
          return mapBackendToFrontendReceipt(
            response.data.receipt,
            response.data.lineItems || []
          );
        }
      } catch {
        // Express backend unreachable — query user's Firestore directly
      }

      try {
        const receiptDocRef = doc(db, 'businesses', businessId, 'receipts', id);
        const receiptSnap = await getDoc(receiptDocRef);
        if (!receiptSnap.exists()) return null;

        const itemsSnap = await getDocs(
          collection(db, 'businesses', businessId, 'receipts', id, 'items')
        );
        const lineItems = itemsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

        return mapBackendToFrontendReceipt(
          { id: receiptSnap.id, ...(receiptSnap.data() as any) },
          lineItems
        );
      } catch (fsErr) {
        console.warn('[ReceiptService] Direct Firestore getReceiptById failed:', fsErr);
        return null;
      }
    }

    // Guest Demo Mode ONLY
    const found = guestDemoReceipts.find((r) => r.id === id);
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
    const { isGuestMode, businessId } = getActiveTenantContext();
    const payload = {
      ...data,
      imagePath: 'manual-entry',
    };

    if (!isGuestMode && businessId) {
      try {
        const res: any = await apiClient.post('/receipts', payload, false, businessId);
        if (res?.data?.receipt) {
          return mapBackendToFrontendReceipt(res.data.receipt, res.data.lineItems || []);
        }
      } catch {
        // Fallback to direct Firestore write in user's isolated tenant
      }

      const receiptId = `rec_${Date.now()}`;
      const supplierId = slugifyId('sup', data.supplier.name);
      const nowIso = new Date().toISOString();

      let subtotalMinor = 0;
      let taxTotalMinor = 0;

      const lineItemDocs = data.items.map((it, idx) => {
        const unitPriceMinor = Math.max(0, Math.round(it.unitPriceMinor));
        const baseMinor = Math.round(it.quantity * unitPriceMinor);
        const taxRate = it.taxRatePercent || 0;
        const taxAmountMinor = Math.round((baseMinor * taxRate) / 100);
        const lineTotalMinor = Math.max(0, baseMinor + taxAmountMinor);

        subtotalMinor += baseMinor;
        taxTotalMinor += taxAmountMinor;

        return {
          id: `item_${idx + 1}`,
          businessId,
          receiptId,
          lineNumber: idx + 1,
          rawName: it.rawName,
          normalizedName: it.rawName.toLowerCase().trim(),
          category: it.category || 'General Grocery',
          quantity: it.quantity,
          unit: it.unit || 'piece',
          unitPriceMinor,
          taxRatePercent: taxRate,
          taxAmountMinor,
          lineTotalMinor,
          confidenceScore: 1.0,
          needsReview: false,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
      });

      const grandTotalMinor = Math.max(0, subtotalMinor + taxTotalMinor);
      const categories = Array.from(new Set(lineItemDocs.map((l) => l.category)));

      const receiptDoc = {
        id: receiptId,
        businessId,
        invoiceNumber: data.invoiceNumber || `INV-${Date.now().toString().slice(-5)}`,
        receiptDate: data.receiptDate,
        purchaseDate: data.purchaseDate,
        supplier: {
          id: supplierId,
          name: data.supplier.name,
          phone: data.supplier.phone || '',
          gstin: data.supplier.gstin || '',
        },
        payment: {
          method: data.payment.method || 'cash',
          status: data.payment.status || 'paid',
          paidAmountMinor: grandTotalMinor,
        },
        reviewStatus: 'needs_review',
        subtotalMinor,
        taxTotalMinor,
        grandTotalMinor,
        lineItemCount: lineItemDocs.length,
        categories,
        imagePath: 'manual-entry',
        extractionMetadata: {
          overallConfidence: 1.0,
          flaggedFieldsCount: 0,
        },
        isDeleted: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const batch = writeBatch(db);
      batch.set(doc(db, 'businesses', businessId, 'receipts', receiptId), receiptDoc);
      for (const itemDoc of lineItemDocs) {
        batch.set(
          doc(db, 'businesses', businessId, 'receipts', receiptId, 'items', itemDoc.id),
          itemDoc
        );
      }
      await batch.commit();

      return mapBackendToFrontendReceipt(receiptDoc, lineItemDocs);
    }

    // Guest Demo Mode ONLY
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
    guestDemoReceipts.unshift(newReceipt);
    return newReceipt;
  },

  async verifyReceipt(
    id: string,
    updatedItems: Receipt['items'],
    headerInfo?: any
  ): Promise<Receipt> {
    const { isGuestMode, businessId } = getActiveTenantContext();

    if (!isGuestMode && businessId) {
      try {
        await apiClient.patch(
          `/receipts/${id}`,
          {
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
          },
          businessId
        );

        await apiClient.post(
          `/receipts/${id}/confirm`,
          { notes: 'Verified via receipt review workspace' },
          false,
          businessId
        );

        const refreshed = await this.getReceiptById(id);
        if (refreshed) return refreshed;
      } catch {
        // Express backend unreachable — persist confirmation directly to user's Firestore tenant
      }

      const nowIso = new Date().toISOString();
      const supplierName = headerInfo?.supplierName || 'Wholesale Supplier';
      const supplierId = slugifyId('sup', supplierName);
      const purchaseDate = headerInfo?.date || new Date().toISOString().slice(0, 10);

      let subtotalMinor = 0;
      let taxTotalMinor = 0;

      const lineItemDocs = updatedItems.map((item, idx) => {
        const unitPriceMinor = Math.max(0, Math.round(item.unitRate * 100));
        const baseMinor = Math.round(item.quantity * unitPriceMinor);
        const taxRate = item.taxRate || 0;
        const taxAmountMinor = Math.round((baseMinor * taxRate) / 100);
        const lineTotalMinor = Math.max(0, baseMinor + taxAmountMinor);

        subtotalMinor += baseMinor;
        taxTotalMinor += taxAmountMinor;

        return {
          id: item.id || `item_${idx + 1}`,
          businessId,
          receiptId: id,
          lineNumber: idx + 1,
          rawName: item.name,
          normalizedName: item.name.toLowerCase().trim(),
          category: item.category || 'General Grocery',
          quantity: item.quantity,
          unit: item.unit || 'piece',
          unitPriceMinor,
          taxRatePercent: taxRate,
          taxAmountMinor,
          lineTotalMinor,
          confidenceScore: 1.0,
          needsReview: false,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
      });

      const grandTotalMinor = Math.max(0, subtotalMinor + taxTotalMinor);
      const categories = Array.from(new Set(lineItemDocs.map((l) => l.category)));

      const batch = writeBatch(db);
      const receiptRef = doc(db, 'businesses', businessId, 'receipts', id);
      batch.set(
        receiptRef,
        {
          id,
          businessId,
          invoiceNumber: headerInfo?.invoiceNo || id,
          receiptDate: purchaseDate,
          purchaseDate,
          supplier: {
            id: supplierId,
            name: supplierName,
            phone: headerInfo?.supplierPhone || '',
            gstin: headerInfo?.supplierGstin || '',
          },
          reviewStatus: 'verified',
          subtotalMinor,
          taxTotalMinor,
          grandTotalMinor,
          lineItemCount: lineItemDocs.length,
          categories,
          extractionMetadata: {
            overallConfidence: 1.0,
            flaggedFieldsCount: 0,
          },
          isDeleted: false,
          confirmedAt: nowIso,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      for (const itemDoc of lineItemDocs) {
        batch.set(
          doc(db, 'businesses', businessId, 'receipts', id, 'items', itemDoc.id),
          itemDoc,
          { merge: true }
        );

        // Upsert catalog item under /businesses/{businessId}/items
        const catalogItemId = slugifyId('itm', itemDoc.rawName);
        batch.set(
          doc(db, 'businesses', businessId, 'items', catalogItemId),
          {
            id: catalogItemId,
            businessId,
            name: itemDoc.rawName,
            normalizedName: itemDoc.normalizedName,
            category: itemDoc.category,
            defaultUnit: itemDoc.unit,
            lastPurchasePriceMinor: itemDoc.unitPriceMinor,
            lowestPriceMinor: itemDoc.unitPriceMinor,
            highestPriceMinor: itemDoc.unitPriceMinor,
            primarySupplierName: supplierName,
            lastPurchaseDate: purchaseDate,
            updatedAt: nowIso,
          },
          { merge: true }
        );
      }

      // Upsert supplier under /businesses/{businessId}/suppliers
      const supplierRef = doc(db, 'businesses', businessId, 'suppliers', supplierId);
      const existingSupSnap = await getDoc(supplierRef).catch(() => null);
      const existingSup = existingSupSnap?.exists() ? (existingSupSnap.data() as any) : null;

      batch.set(
        supplierRef,
        {
          id: supplierId,
          businessId,
          name: supplierName,
          normalizedName: supplierName.toLowerCase().trim(),
          phone: headerInfo?.supplierPhone || existingSup?.phone || '',
          gstin: headerInfo?.supplierGstin || existingSup?.gstin || '',
          totalSpendMinor: (existingSup?.totalSpendMinor || 0) + grandTotalMinor,
          totalReceiptsCount: (existingSup?.totalReceiptsCount || 0) + 1,
          lastPurchaseDate: purchaseDate,
          topCategories: categories,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      await batch.commit();

      return {
        id,
        invoiceNo: headerInfo?.invoiceNo || id,
        billDate: purchaseDate,
        scannedAt: nowIso,
        supplierId,
        supplierName,
        paymentMode: 'upi',
        paymentStatus: 'paid',
        subtotal: subtotalMinor / 100,
        taxTotal: taxTotalMinor / 100,
        grandTotal: grandTotalMinor / 100,
        itemCount: updatedItems.length,
        taxBreakdown: [],
        items: updatedItems.map((i) => ({ ...i, needsReview: false })),
        status: 'verified',
        ocrConfidence: {
          overall: 1.0,
          hasFlaggedItems: false,
          flaggedCount: 0,
        },
      };
    }

    // Guest Demo Mode ONLY
    const index = guestDemoReceipts.findIndex((r) => r.id === id);
    const subtotal = updatedItems.reduce((acc, item) => acc + item.lineTotal, 0);
    const taxTotal = updatedItems.reduce((acc, item) => acc + (item.taxAmount || 0), 0);
    const grandTotal = subtotal + taxTotal;

    const baseReceipt = index !== -1 ? guestDemoReceipts[index] : DEMO_RECEIPTS[0];
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
      guestDemoReceipts[index] = updated;
    } else {
      guestDemoReceipts.push(updated);
    }

    return updated;
  },
};
