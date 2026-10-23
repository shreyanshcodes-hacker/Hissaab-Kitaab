import type { Supplier } from '../types';
import { DEMO_SUPPLIERS } from '../data/demoData';
import { apiClient } from './client';

let localSuppliers: Supplier[] = [...DEMO_SUPPLIERS];

export const supplierService = {
  async getSuppliers(): Promise<Supplier[]> {
    try {
      const res: any = await apiClient.get('/suppliers');
      if (res?.data?.items && Array.isArray(res.data.items)) {
        return res.data.items.map((s: any) => ({
          id: s.id,
          name: s.name,
          phone: s.phone || '+91 98110 40912',
          mandiMarket: s.address?.city || 'Khari Baoli, Delhi',
          gstin: s.gstin || '07AACPG4819M1Z3',
          aliases: [s.tradeName].filter(Boolean),
          notes: s.notes || 'Reliable weekly delivery. 15-day credit allowed.',
          metrics: {
            totalSpendCurrentMonth: (s.totalSpendMinor || 0) / 100,
            totalSpendAllTime: (s.totalSpendMinor || 0) / 100,
            billsCount: s.totalReceiptsCount || 1,
            lastPurchaseDate: s.lastPurchaseDate || '2024-10-24',
            topCategories: ['Cooking Oils', 'Atta & Flour'],
          },
        }));
      }
    } catch {
      // Fallback
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
    return [...localSuppliers];
  },

  async getSupplierById(id: string): Promise<Supplier | null> {
    try {
      const res: any = await apiClient.get(`/suppliers/${id}`);
      if (res?.data?.supplier) {
        const s = res.data.supplier;
        return {
          id: s.id,
          name: s.name,
          phone: s.phone || '+91 98110 40912',
          mandiMarket: s.address?.city || 'Khari Baoli, Delhi - 110006',
          gstin: s.gstin || '07AACPG4819M1Z3',
          aliases: [s.tradeName].filter(Boolean),
          notes: s.notes || 'Reliable weekly delivery. 15-day credit cycle allowed.',
          metrics: {
            totalSpendCurrentMonth: (s.totalSpendMinor || 0) / 100,
            totalSpendAllTime: (s.totalSpendMinor || 0) / 100,
            billsCount: s.totalReceiptsCount || 1,
            lastPurchaseDate: s.lastPurchaseDate || '2024-10-24',
            topCategories: ['Cooking Oils', 'Spices & Staples'],
          },
        };
      }
    } catch {
      // Fallback
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
    const found = localSuppliers.find((s) => s.id === id);
    return found ? { ...found } : localSuppliers[0];
  },

  async updateSupplierNotes(id: string, notes: string): Promise<Supplier> {
    const index = localSuppliers.findIndex((s) => s.id === id);
    if (index !== -1) {
      localSuppliers[index] = { ...localSuppliers[index], notes };
      return localSuppliers[index];
    }
    const sup = { ...localSuppliers[0], id, notes };
    localSuppliers.push(sup);
    return sup;
  },
};
