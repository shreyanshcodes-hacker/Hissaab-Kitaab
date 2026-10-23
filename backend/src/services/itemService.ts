import { db } from '../config/firebase-admin.js';
import { NotFoundError } from '../utils/errors.js';
import type { CatalogItem } from '../types/models.js';

export class ItemService {
  async listItems(
    businessId: string,
    filters: {
      page?: number;
      limit?: number;
      category?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const sortBy = filters.sortBy || 'name';
    const sortOrder = filters.sortOrder || 'asc';

    const itemsRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('items');

    let query: FirebaseFirestore.Query = itemsRef;

    if (filters.category) {
      query = query.where('category', '==', filters.category);
    }

    query = query.orderBy(sortBy, sortOrder);

    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    const offset = (page - 1) * limit;
    const snapshot = await query.offset(offset).limit(limit).get();

    let items = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as CatalogItem[];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (i) => i.name.toLowerCase().includes(q) || i.brand?.toLowerCase().includes(q)
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

  async getItemById(businessId: string, itemId: string) {
    const itemRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('items')
      .doc(itemId);

    const doc = await itemRef.get();
    if (!doc.exists) {
      throw new NotFoundError(`Item with ID ${itemId} not found in catalog`);
    }

    const item = { id: doc.id, ...doc.data() } as CatalogItem;

    return {
      item,
      priceSummary: {
        lowestPriceMinor: item.lowestPriceMinor,
        highestPriceMinor: item.highestPriceMinor,
        lastPriceMinor: item.lastPurchasePriceMinor,
        typicalPriceMinor: item.typicalPurchasePriceMinor,
        lastPurchaseDate: item.lastPurchaseDate,
      },
    };
  }
}

export const itemService = new ItemService();
