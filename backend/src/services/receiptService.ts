import { db } from '../config/firebase-admin.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { calculateLineTotalMinor } from '../utils/money.js';
import { logger } from '../utils/logger.js';
import type {
  Receipt,
  ReceiptLineItem,
  ReceiptReviewStatus,
} from '../types/models.js';

export class ReceiptService {
  /**
   * Retrieves a paginated list of purchase receipts for a business with validated filters.
   */
  async listReceipts(
    businessId: string,
    filters: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      status?: string;
      supplierId?: string;
      category?: string;
      paymentStatus?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    }
  ) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const sortBy = filters.sortBy || 'purchaseDate';
    const sortOrder = filters.sortOrder || 'desc';

    const receiptsRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('receipts');

    let query: any = receiptsRef.where('isDeleted', '==', false);

    if (filters.status && filters.status !== 'all') {
      query = query.where('reviewStatus', '==', filters.status);
    }
    if (filters.supplierId) {
      query = query.where('supplier.id', '==', filters.supplierId);
    }
    if (filters.paymentStatus) {
      query = query.where('payment.status', '==', filters.paymentStatus);
    }
    if (filters.startDate) {
      query = query.where('purchaseDate', '>=', filters.startDate);
    }
    if (filters.endDate) {
      query = query.where('purchaseDate', '<=', filters.endDate);
    }
    if (filters.category) {
      query = query.where('categories', 'array-contains', filters.category);
    }

    query = query.orderBy(sortBy, sortOrder);

    // If search is present, filter memory-safely across supplier, bill ID, or categories
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const allMatchingDocs = await query.get();
      const filtered = (allMatchingDocs.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as Receipt[]).filter(
        (r) =>
          r.supplier?.name?.toLowerCase().includes(q) ||
          r.invoiceNumber?.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          (r.tags && r.tags.some((t: string) => t.toLowerCase().includes(q)))
      );

      const total = filtered.length;
      const offset = (page - 1) * limit;
      const items = filtered.slice(offset, offset + limit);

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    }

    // Fetch total count before pagination
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    // Apply pagination offset
    const offset = (page - 1) * limit;
    const snapshot = await query.offset(offset).limit(limit).get();

    const items = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) as Receipt[];

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves an individual receipt by ID including its line item snapshots.
   */
  async getReceiptById(businessId: string, receiptId: string) {
    const receiptRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('receipts')
      .doc(receiptId);

    const doc = await receiptRef.get();
    if (!doc.exists) {
      throw new NotFoundError(`Receipt with ID ${receiptId} not found in this store`);
    }

    const receipt = { id: doc.id, ...doc.data() } as Receipt;

    // Fetch line items from subcollection
    const itemsSnapshot = await receiptRef.collection('items').orderBy('lineIndex', 'asc').get();
    const lineItems = itemsSnapshot.docs.map((d: any) => ({
      id: d.id,
      ...d.data(),
    })) as ReceiptLineItem[];

    return {
      receipt,
      lineItems,
    };
  }

  /**
   * Creates a new receipt draft with server-recalculated totals.
   */
  async createReceipt(
    businessId: string,
    _userId: string,
    data: {
      invoiceNumber?: string;
      receiptDate: string;
      purchaseDate: string;
      supplier: { id?: string; name: string; phone?: string; gstin?: string; address?: string };
      payment: {
        method: 'cash' | 'upi' | 'credit_udhar' | 'bank_transfer' | 'cheque';
        status: 'paid' | 'unpaid_udhar' | 'partially_paid';
        dueDate?: string;
        paidAmountMinor?: number;
        transactionRef?: string;
      };
      imagePath: string;
      thumbnailPath?: string;
      notes?: string;
      tags?: string[];
      items?: any[];
    }
  ) {
    const receiptRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('receipts')
      .doc();

    const now = new Date().toISOString();

    // Calculate line items and totals server-side
    const rawItems = data.items || [];
    let subtotalMinor = 0;
    let taxTotalMinor = 0;
    let discountTotalMinor = 0;

    const processedLineItems: ReceiptLineItem[] = rawItems.map((item, index) => {
      const calc = calculateLineTotalMinor({
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
        discountMinor: item.discountMinor,
        taxRatePercent: item.taxRatePercent,
      });

      subtotalMinor += calc.baseMinor;
      discountTotalMinor += calc.discountMinor;
      taxTotalMinor += calc.taxMinor;

      return {
        id: item.id || `line_${index + 1}`,
        receiptId: receiptRef.id,
        businessId,
        lineIndex: index,
        rawName: item.rawName,
        normalizedItemId: item.normalizedItemId,
        category: item.category || 'General Grocery',
        hsnCode: item.hsnCode,
        quantity: item.quantity,
        unit: item.unit || 'piece',
        unitPriceMinor: item.unitPriceMinor,
        discountMinor: calc.discountMinor,
        taxRatePercent: item.taxRatePercent || 0,
        taxAmountMinor: calc.taxMinor,
        lineTotalMinor: calc.lineTotalMinor,
        confidenceScore: item.confidenceScore ?? 1.0,
        needsReview: item.needsReview ?? false,
        reviewReason: item.reviewReason,
        boundingBox: item.boundingBox,
        createdAt: now,
        updatedAt: now,
      };
    });

    const grandTotalMinor = subtotalMinor - discountTotalMinor + taxTotalMinor;

    const receiptData: Receipt = {
      id: receiptRef.id,
      businessId,
      invoiceNumber: data.invoiceNumber,
      receiptDate: data.receiptDate,
      purchaseDate: data.purchaseDate,
      supplier: data.supplier,
      payment: data.payment,
      currency: 'INR',
      subtotalMinor,
      taxTotalMinor,
      discountTotalMinor,
      roundOffMinor: 0,
      grandTotalMinor,
      reviewStatus: 'draft',
      imagePath: data.imagePath,
      thumbnailPath: data.thumbnailPath,
      lineItemCount: processedLineItems.length,
      categories: Array.from(new Set(processedLineItems.map((i) => i.category).filter(Boolean))),
      notes: data.notes,
      tags: data.tags || [],
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    const batch = db.batch();
    batch.set(receiptRef, receiptData);

    for (const line of processedLineItems) {
      const itemRef = receiptRef.collection('items').doc(line.id);
      batch.set(itemRef, line);
    }

    await batch.commit();

    return {
      receipt: receiptData,
      lineItems: processedLineItems,
    };
  }

  /**
   * Updates receipt metadata or line items, recalculating all totals server-side.
   */
  async updateReceipt(
    businessId: string,
    receiptId: string,
    updates: {
      invoiceNumber?: string;
      receiptDate?: string;
      purchaseDate?: string;
      supplier?: any;
      payment?: any;
      notes?: string;
      tags?: string[];
      items?: any[];
    }
  ) {
    const receiptRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('receipts')
      .doc(receiptId);

    const doc = await receiptRef.get();
    if (!doc.exists) {
      throw new NotFoundError(`Receipt ${receiptId} not found`);
    }

    const currentReceipt = doc.data() as Receipt;
    if (currentReceipt.reviewStatus === 'verified') {
      throw new BadRequestError('Cannot edit an already verified and closed bahi khata receipt');
    }

    const now = new Date().toISOString();
    const updatePayload: Partial<Receipt> = {
      updatedAt: now,
    };

    if (updates.invoiceNumber !== undefined) updatePayload.invoiceNumber = updates.invoiceNumber;
    if (updates.receiptDate !== undefined) updatePayload.receiptDate = updates.receiptDate;
    if (updates.purchaseDate !== undefined) updatePayload.purchaseDate = updates.purchaseDate;
    if (updates.supplier !== undefined) updatePayload.supplier = updates.supplier;
    if (updates.payment !== undefined) updatePayload.payment = updates.payment;
    if (updates.notes !== undefined) updatePayload.notes = updates.notes;
    if (updates.tags !== undefined) updatePayload.tags = updates.tags;

    const batch = db.batch();

    // If line items were supplied, recalculate totals server-side and update subcollection
    if (updates.items && Array.isArray(updates.items)) {
      let subtotalMinor = 0;
      let taxTotalMinor = 0;
      let discountTotalMinor = 0;

      // Delete existing line items in subcollection
      const existingItems = await receiptRef.collection('items').get();
      existingItems.docs.forEach((d: any) => batch.delete(d.ref));

      const processedLineItems: ReceiptLineItem[] = updates.items.map((item, index) => {
        const calc = calculateLineTotalMinor({
          quantity: item.quantity,
          unitPriceMinor: item.unitPriceMinor,
          discountMinor: item.discountMinor,
          taxRatePercent: item.taxRatePercent,
        });

        subtotalMinor += calc.baseMinor;
        discountTotalMinor += calc.discountMinor;
        taxTotalMinor += calc.taxMinor;

        const lineItemDoc = receiptRef.collection('items').doc(item.id || `line_${index + 1}`);
        const lineItemData: ReceiptLineItem = {
          id: lineItemDoc.id,
          receiptId,
          businessId,
          lineIndex: index,
          rawName: item.rawName,
          normalizedItemId: item.normalizedItemId,
          category: item.category || 'General Grocery',
          hsnCode: item.hsnCode,
          quantity: item.quantity,
          unit: item.unit || 'piece',
          unitPriceMinor: item.unitPriceMinor,
          discountMinor: calc.discountMinor,
          taxRatePercent: item.taxRatePercent || 0,
          taxAmountMinor: calc.taxMinor,
          lineTotalMinor: calc.lineTotalMinor,
          confidenceScore: item.confidenceScore ?? 1.0,
          needsReview: item.needsReview ?? false,
          reviewReason: item.reviewReason,
          boundingBox: item.boundingBox,
          createdAt: now,
          updatedAt: now,
        };

        batch.set(lineItemDoc, lineItemData);
        return lineItemData;
      });

      updatePayload.subtotalMinor = subtotalMinor;
      updatePayload.discountTotalMinor = discountTotalMinor;
      updatePayload.taxTotalMinor = taxTotalMinor;
      updatePayload.grandTotalMinor = subtotalMinor - discountTotalMinor + taxTotalMinor;
      updatePayload.lineItemCount = processedLineItems.length;
    }

    batch.update(receiptRef, updatePayload);
    await batch.commit();

    return this.getReceiptById(businessId, receiptId);
  }

  /**
   * Confirms a receipt, permanently locking historical line item snapshots
   * and updating supplier & SKU inventory metrics.
   */
  async confirmReceipt(businessId: string, receiptId: string, userId: string, notes?: string) {
    const receiptRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('receipts')
      .doc(receiptId);

    const doc = await receiptRef.get();
    if (!doc.exists) {
      throw new NotFoundError(`Receipt ${receiptId} not found`);
    }

    const receipt = doc.data() as Receipt;
    if (receipt.reviewStatus === 'verified') {
      throw new BadRequestError('Receipt has already been verified and confirmed');
    }

    const itemsSnapshot = await receiptRef.collection('items').get();
    if (itemsSnapshot.empty) {
      throw new BadRequestError('Cannot confirm a receipt with no line items. Add at least one item before verifying.');
    }

    const now = new Date().toISOString();

    // Pre-resolve supplier and item references outside or before transaction writes
    const suppliersRef = db.collection('businesses').doc(businessId).collection('suppliers');
    let supplierDocRef: any = receipt.supplier?.id ? suppliersRef.doc(receipt.supplier.id) : null;
    if (!supplierDocRef && receipt.supplier?.name) {
      const match = await suppliersRef.where('name', '==', receipt.supplier.name).limit(1).get();
      if (!match.empty) {
        supplierDocRef = match.docs[0].ref;
      }
    }

    const itemsRef = db.collection('businesses').doc(businessId).collection('items');
    const resolvedItemRefs: Array<{ item: ReceiptLineItem; ref: any | null }> = [];
    for (const itemDoc of itemsSnapshot.docs) {
      const item = itemDoc.data() as ReceiptLineItem;
      if (!item.rawName) continue;
      let catalogDocRef: any = item.normalizedItemId ? itemsRef.doc(item.normalizedItemId) : null;
      if (!catalogDocRef) {
        const match = await itemsRef.where('name', '==', item.rawName).limit(1).get();
        if (!match.empty) {
          catalogDocRef = match.docs[0].ref;
        }
      }
      resolvedItemRefs.push({ item, ref: catalogDocRef });
    }

    await db.runTransaction(async (transaction: any) => {
      // =======================================================================
      // PHASE 1: ALL TRANSACTION READS FIRST (Required by Cloud Firestore)
      // =======================================================================
      const freshReceiptDoc = await transaction.get(receiptRef);
      if (!freshReceiptDoc.exists) {
        throw new NotFoundError(`Receipt ${receiptId} not found`);
      }
      const freshReceipt = freshReceiptDoc.data() as Receipt;
      if (freshReceipt.reviewStatus === 'verified') {
        throw new BadRequestError('Receipt has already been verified and confirmed');
      }

      const supplierDoc = supplierDocRef ? await transaction.get(supplierDocRef) : null;

      const catalogDocs = await Promise.all(
        resolvedItemRefs.map(async ({ item, ref }) => ({
          item,
          ref,
          doc: ref ? await transaction.get(ref) : null,
        }))
      );

      // =======================================================================
      // PHASE 2: ALL TRANSACTION WRITES
      // =======================================================================
      // 1. Mark receipt as verified
      transaction.update(receiptRef, {
        reviewStatus: 'verified' as ReceiptReviewStatus,
        confirmedAt: now,
        confirmedBy: userId,
        updatedAt: now,
        ...(notes ? { notes } : {}),
      });

      // 2. Update or Create Supplier Aggregate Statistics
      if (receipt.supplier?.name) {
        if (supplierDoc && supplierDoc.exists) {
          const currentData = supplierDoc.data();
          transaction.update(supplierDocRef, {
            totalReceiptsCount: (currentData?.totalReceiptsCount || 0) + 1,
            totalSpendMinor: (currentData?.totalSpendMinor || 0) + receipt.grandTotalMinor,
            lastPurchaseDate: receipt.purchaseDate,
            updatedAt: now,
          });
        } else {
          const newSuppRef = supplierDocRef || suppliersRef.doc();
          transaction.set(newSuppRef, {
            id: newSuppRef.id,
            businessId,
            name: receipt.supplier.name,
            phone: receipt.supplier.phone || '',
            gstin: receipt.supplier.gstin || '',
            totalReceiptsCount: 1,
            totalSpendMinor: receipt.grandTotalMinor,
            lastPurchaseDate: receipt.purchaseDate,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      // 3. Update or Create Item Catalog Price Points
      for (const { item, ref, doc: catDoc } of catalogDocs) {
        if (catDoc && catDoc.exists) {
          const catData = catDoc.data();
          const currentLowest = catData?.lowestPriceMinor || item.unitPriceMinor;
          const currentHighest = catData?.highestPriceMinor || item.unitPriceMinor;

          transaction.update(ref, {
            lastPurchasePriceMinor: item.unitPriceMinor,
            lowestPriceMinor: Math.min(currentLowest, item.unitPriceMinor),
            highestPriceMinor: Math.max(currentHighest, item.unitPriceMinor),
            lastSupplierId: receipt.supplier?.id || catData?.lastSupplierId,
            lastPurchaseDate: receipt.purchaseDate,
            updatedAt: now,
          });
        } else {
          const newCatRef = ref || itemsRef.doc();
          transaction.set(newCatRef, {
            id: newCatRef.id,
            businessId,
            name: item.rawName,
            category: item.category || 'General Grocery',
            defaultUnit: item.unit || 'piece',
            typicalPurchasePriceMinor: item.unitPriceMinor,
            lastPurchasePriceMinor: item.unitPriceMinor,
            lowestPriceMinor: item.unitPriceMinor,
            highestPriceMinor: item.unitPriceMinor,
            lastSupplierId: receipt.supplier?.id,
            lastPurchaseDate: receipt.purchaseDate,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    });

    return this.getReceiptById(businessId, receiptId);
  }

  /**
   * Resets receipt status to 'processing' to allow retry extraction.
   */
  async retryReceipt(businessId: string, receiptId: string) {
    const receiptRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('receipts')
      .doc(receiptId);

    const doc = await receiptRef.get();
    if (!doc.exists) {
      throw new NotFoundError(`Receipt ${receiptId} not found`);
    }

    const currentReceipt = doc.data() as Receipt;
    if (currentReceipt.reviewStatus === 'verified') {
      throw new BadRequestError('Cannot retry extraction on an already verified receipt');
    }

    await receiptRef.update({
      reviewStatus: 'processing' as ReceiptReviewStatus,
      updatedAt: new Date().toISOString(),
    });

    return {
      message: 'Receipt reset to processing. Extraction job scheduled.',
      receiptId,
      status: 'processing',
    };
  }

  /**
   * Soft-deletes a receipt and marks it removed from bahi khata ledger aggregations.
   */
  async deleteReceipt(businessId: string, receiptId: string): Promise<void> {
    const receiptRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('receipts')
      .doc(receiptId);

    const doc = await receiptRef.get();
    if (!doc.exists) {
      throw new NotFoundError(`Receipt ${receiptId} not found`);
    }

    const now = new Date().toISOString();
    await receiptRef.update({
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    });

    logger.info(`Receipt ${receiptId} soft-deleted for business ${businessId}`);
  }
}

export const receiptService = new ReceiptService();
