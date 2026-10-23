import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { CatalogItem } from '../types';
import { DEMO_CATALOG_ITEMS } from '../data/demoData';
import { apiClient, getActiveTenantContext } from './client';

let guestDemoItems: CatalogItem[] = [...DEMO_CATALOG_ITEMS];

function mapFirestoreCatalogItem(it: any): CatalogItem {
  const latestRate = (it.lastPurchasePriceMinor || it.typicalPurchasePriceMinor || 0) / 100;
  const lowestRate = (it.lowestPriceMinor || it.lastPurchasePriceMinor || 0) / 100;
  const highestRate = (it.highestPriceMinor || it.lastPurchasePriceMinor || 0) / 100;
  const supplierName = it.primarySupplierName || 'Wholesale Supplier';
  const lastDate = it.lastPurchaseDate || new Date().toISOString().slice(0, 10);

  return {
    id: it.id,
    name: it.name || 'Store Item',
    category: it.category || 'General Grocery',
    hsnCode: it.hsnCode || '',
    defaultUnit: it.defaultUnit || 'piece',
    latestPurchaseRate: latestRate,
    lowestRate30Days: lowestRate,
    highestRate30Days: highestRate,
    primarySupplierName: supplierName,
    priceHistory: Array.isArray(it.priceHistory) && it.priceHistory.length > 0
      ? it.priceHistory
      : latestRate > 0
        ? [
            {
              date: lastDate,
              supplierName,
              supplierId: it.primarySupplierId || 'sup_default',
              receiptId: it.lastReceiptId || 'Verified Bill',
              unitRate: latestRate,
              unit: it.defaultUnit || 'piece',
              quantity: 1,
            },
          ]
        : [],
  };
}

export const itemService = {
  async getCatalogItems(): Promise<CatalogItem[]> {
    const { isGuestMode, businessId } = getActiveTenantContext();

    if (!isGuestMode && businessId) {
      try {
        const res: any = await apiClient.get('/items', undefined, businessId);
        if (res?.data?.items && Array.isArray(res.data.items)) {
          return res.data.items.map(mapFirestoreCatalogItem);
        }
      } catch {
        // Express backend unreachable — query user's isolated Firestore tenant directly
      }

      try {
        const snap = await getDocs(collection(db, 'businesses', businessId, 'items'));
        const items = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((i) => !i.isDeleted)
          .map(mapFirestoreCatalogItem);

        items.sort((a, b) => a.name.localeCompare(b.name));
        return items;
      } catch (err) {
        console.warn('[ItemService] Direct Firestore getCatalogItems failed:', err);
        return [];
      }
    }

    // Guest Demo Mode ONLY
    return [...guestDemoItems];
  },

  async getItemById(id: string): Promise<CatalogItem | null> {
    const { isGuestMode, businessId } = getActiveTenantContext();

    if (!isGuestMode && businessId) {
      try {
        const res: any = await apiClient.get(`/items/${id}`, undefined, businessId);
        if (res?.data?.item) {
          return mapFirestoreCatalogItem(res.data.item);
        }
      } catch {
        // Fallback to direct Firestore read
      }

      try {
        const itemRef = doc(db, 'businesses', businessId, 'items', id);
        const snap = await getDoc(itemRef);
        if (snap.exists()) {
          return mapFirestoreCatalogItem({ id: snap.id, ...(snap.data() as any) });
        }
        return null;
      } catch (err) {
        console.warn('[ItemService] Direct Firestore getItemById failed:', err);
        return null;
      }
    }

    // Guest Demo Mode ONLY
    const found = guestDemoItems.find((i) => i.id === id);
    return found ? { ...found } : guestDemoItems[0];
  },
};
