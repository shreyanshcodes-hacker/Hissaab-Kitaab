import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Supplier } from '../types';
import { DEMO_SUPPLIERS } from '../data/demoData';
import { apiClient, getActiveTenantContext } from './client';

let guestDemoSuppliers: Supplier[] = [...DEMO_SUPPLIERS];

function mapFirestoreSupplier(s: any): Supplier {
  return {
    id: s.id,
    name: s.name || 'Wholesale Supplier',
    phone: s.phone || '',
    mandiMarket: s.address?.city || s.mandiMarket || 'Local Mandi',
    gstin: s.gstin || '',
    aliases: [s.tradeName].filter(Boolean),
    notes: s.notes || '',
    metrics: {
      totalSpendCurrentMonth: (s.totalSpendMinor || 0) / 100,
      totalSpendAllTime: (s.totalSpendMinor || 0) / 100,
      billsCount: s.totalReceiptsCount || 0,
      lastPurchaseDate: s.lastPurchaseDate || '—',
      topCategories:
        Array.isArray(s.topCategories) && s.topCategories.length > 0
          ? s.topCategories
          : ['General Grocery'],
    },
  };
}

export const supplierService = {
  async getSuppliers(): Promise<Supplier[]> {
    const { isGuestMode, businessId } = getActiveTenantContext();

    if (!isGuestMode && businessId) {
      try {
        const res: any = await apiClient.get('/suppliers', undefined, businessId);
        if (res?.data?.items && Array.isArray(res.data.items)) {
          return res.data.items.map(mapFirestoreSupplier);
        }
      } catch {
        // Express backend unreachable — query user's isolated Firestore tenant directly
      }

      try {
        const snap = await getDocs(collection(db, 'businesses', businessId, 'suppliers'));
        const items = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((s) => !s.isDeleted)
          .map(mapFirestoreSupplier);

        items.sort((a, b) => b.metrics.totalSpendAllTime - a.metrics.totalSpendAllTime);
        return items;
      } catch (err) {
        console.warn('[SupplierService] Direct Firestore getSuppliers failed:', err);
        return [];
      }
    }

    // Guest Demo Mode ONLY
    return [...guestDemoSuppliers];
  },

  async getSupplierById(id: string): Promise<Supplier | null> {
    const { isGuestMode, businessId } = getActiveTenantContext();

    if (!isGuestMode && businessId) {
      try {
        const res: any = await apiClient.get(`/suppliers/${id}`, undefined, businessId);
        if (res?.data?.supplier) {
          return mapFirestoreSupplier(res.data.supplier);
        }
      } catch {
        // Fallback to direct Firestore read
      }

      try {
        const supRef = doc(db, 'businesses', businessId, 'suppliers', id);
        const snap = await getDoc(supRef);
        if (snap.exists()) {
          return mapFirestoreSupplier({ id: snap.id, ...(snap.data() as any) });
        }
        return null;
      } catch (err) {
        console.warn('[SupplierService] Direct Firestore getSupplierById failed:', err);
        return null;
      }
    }

    // Guest Demo Mode ONLY
    const found = guestDemoSuppliers.find((s) => s.id === id);
    return found ? { ...found } : guestDemoSuppliers[0];
  },

  async updateSupplierNotes(id: string, notes: string): Promise<Supplier> {
    const { isGuestMode, businessId } = getActiveTenantContext();

    if (!isGuestMode && businessId) {
      try {
        const supRef = doc(db, 'businesses', businessId, 'suppliers', id);
        await setDoc(
          supRef,
          {
            id,
            businessId,
            notes,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        const updated = await this.getSupplierById(id);
        if (updated) return updated;
      } catch (err) {
        console.warn('[SupplierService] Direct Firestore updateSupplierNotes failed:', err);
      }
    }

    const index = guestDemoSuppliers.findIndex((s) => s.id === id);
    if (index !== -1) {
      guestDemoSuppliers[index] = { ...guestDemoSuppliers[index], notes };
      return guestDemoSuppliers[index];
    }
    const sup = { ...guestDemoSuppliers[0], id, notes };
    guestDemoSuppliers.push(sup);
    return sup;
  },
};
