import { db } from '../config/firebase-admin.js';
import { NotFoundError } from '../utils/errors.js';
import type { Supplier, Receipt } from '../types/models.js';

export class SupplierService {
  async listSuppliers(
    businessId: string,
    filters: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const sortBy = filters.sortBy || 'totalSpendMinor';
    const sortOrder = filters.sortOrder || 'desc';

    const suppliersRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('suppliers');

    let query: FirebaseFirestore.Query = suppliersRef.orderBy(sortBy, sortOrder);

    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    const offset = (page - 1) * limit;
    const snapshot = await query.offset(offset).limit(limit).get();

    let items = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Supplier[];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.phone?.includes(q) ||
          s.gstin?.toLowerCase().includes(q)
      );
    }

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

  async getSupplierById(businessId: string, supplierId: string) {
    const supplierRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('suppliers')
      .doc(supplierId);

    const doc = await supplierRef.get();
    if (!doc.exists) {
      throw new NotFoundError(`Supplier with ID ${supplierId} not found`);
    }

    const supplier = { id: doc.id, ...doc.data() } as Supplier;

    // Fetch recent 10 purchase vouchers from this supplier
    const receiptsSnapshot = await db
      .collection('businesses')
      .doc(businessId)
      .collection('receipts')
      .where('supplier.id', '==', supplierId)
      .where('isDeleted', '==', false)
      .orderBy('purchaseDate', 'desc')
      .limit(10)
      .get();

    const recentReceipts = receiptsSnapshot.docs.map((d: any) => ({
      id: d.id,
      ...d.data(),
    })) as Receipt[];

    return {
      supplier,
      recentReceipts,
    };
  }
}

export const supplierService = new SupplierService();
