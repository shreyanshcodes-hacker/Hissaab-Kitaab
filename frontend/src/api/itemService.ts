import type { CatalogItem } from '../types';
import { DEMO_CATALOG_ITEMS } from '../data/demoData';
import { apiClient } from './client';

let localItems: CatalogItem[] = [...DEMO_CATALOG_ITEMS];

export const itemService = {
  async getCatalogItems(): Promise<CatalogItem[]> {
    try {
      const res: any = await apiClient.get('/items');
      if (res?.data?.items && Array.isArray(res.data.items)) {
        return res.data.items.map((it: any) => ({
          id: it.id,
          name: it.name,
          category: it.category || 'General Grocery',
          hsnCode: it.hsnCode || '1514',
          defaultUnit: it.defaultUnit || 'piece',
          latestPurchaseRate: (it.lastPurchasePriceMinor || it.typicalPurchasePriceMinor || 14800) / 100,
          lowestRate30Days: (it.lowestPriceMinor || 14200) / 100,
          highestRate30Days: (it.highestPriceMinor || 14800) / 100,
          primarySupplierName: 'Gupta Wholesale Mart',
          priceHistory: [
            {
              date: '24 Oct 2024',
              supplierName: 'Gupta Wholesale Mart',
              supplierId: 'sup-gupta-wholesale',
              receiptId: 'REC-2024-1089',
              unitRate: (it.lastPurchasePriceMinor || 14800) / 100,
              unit: it.defaultUnit || 'piece',
              quantity: 30,
            },
          ],
        }));
      }
    } catch {
      // Fallback
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
    return [...localItems];
  },

  async getItemById(id: string): Promise<CatalogItem | null> {
    try {
      const res: any = await apiClient.get(`/items/${id}`);
      if (res?.data?.item) {
        const it = res.data.item;
        return {
          id: it.id,
          name: it.name,
          category: it.category || 'Cooking Oils & Ghee',
          hsnCode: it.hsnCode || '1514',
          defaultUnit: it.defaultUnit || 'liter',
          latestPurchaseRate: (it.lastPurchasePriceMinor || 14800) / 100,
          lowestRate30Days: (it.lowestPriceMinor || 14200) / 100,
          highestRate30Days: (it.highestPriceMinor || 14800) / 100,
          primarySupplierName: 'Gupta Wholesale Mart',
          priceHistory: [
            {
              date: '24 Oct 2024',
              supplierName: 'Gupta Wholesale Mart',
              supplierId: 'sup-gupta-wholesale',
              receiptId: 'REC-2024-1089',
              unitRate: 148.0,
              unit: 'liter',
              quantity: 30,
            },
            {
              date: '16 Oct 2024',
              supplierName: 'Shree Balaji Traders',
              supplierId: 'sup-balaji-traders',
              receiptId: 'REC-2024-1088',
              unitRate: 142.0,
              unit: 'liter',
              quantity: 20,
            },
          ],
        };
      }
    } catch {
      // Fallback
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
    const found = localItems.find((i) => i.id === id);
    return found ? { ...found } : localItems[0];
  },
};
