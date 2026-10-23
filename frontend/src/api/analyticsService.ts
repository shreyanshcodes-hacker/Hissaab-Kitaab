import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { apiClient, getActiveTenantContext } from './client';
import { DEMO_ANALYTICS } from '../data/demoData';

export interface AnalyticsSummary {
  metricSemantics: {
    financialScope: string;
    label: string;
    description: string;
  };
  period: {
    startDate: string;
    endDate: string;
    label: string;
  };
  totalSpentMinor: number;
  totalSpentRupees: number;
  subtotalRupees: number;
  taxTotalRupees: number;
  confirmedReceiptsCount: number;
  totalConfirmedStoreCount: number;
  needsCheckingCount: number;
  draftsCount: number;
  topSuppliers: Array<{
    rank: number;
    id: string;
    name: string;
    gstin?: string;
    phone?: string;
    spendMinor: number;
    spendRupees: number;
    billsCount: number;
    sharePercentage: number;
  }>;
  topItems: Array<{
    rank: number;
    name: string;
    category: string;
    unit: string;
    totalQuantity: number;
    spendMinor: number;
    spendRupees: number;
    billsCount: number;
    latestRateRupees: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    spendMinor: number;
    spendRupees: number;
    billsCount: number;
    percentage: number;
  }>;
  recentReceipts: Array<{
    id: string;
    invoiceNumber: string;
    supplierName: string;
    purchaseDate: string;
    grandTotalMinor: number;
    grandTotalRupees: number;
    reviewStatus: string;
    paymentStatus: string;
    lineItemCount: number;
  }>;
  needsReviewReceipts: Array<{
    id: string;
    invoiceNumber: string;
    supplierName: string;
    purchaseDate: string;
    grandTotalMinor: number;
    grandTotalRupees: number;
    reviewReason: string;
  }>;
}

export interface AnalyticsTrends {
  granularity: 'day' | 'week' | 'month';
  metric: 'spend' | 'receipts';
  peakPeriod?: {
    label: string;
    spendRupees: number;
  } | null;
  trends: Array<{
    periodKey: string;
    label: string;
    spendMinor: number;
    spendRupees: number;
    receiptsCount: number;
    prevSpendMinor: number;
    prevSpendRupees: number;
  }>;
}

export interface PriceTrackerItem {
  name: string;
  category: string;
  primarySupplier: string;
  unit: string;
  latestRateRupees: number;
  lowestRateRupees: number;
  highestRateRupees: number;
  lastPurchaseDate: string;
  hasInflation: boolean;
  rateVariancePercentage: number;
}

async function computeFirestoreSummary(
  businessId: string,
  period: string = 'this_month'
): Promise<AnalyticsSummary> {
  const now = new Date();
  const currentMonthLabel = now.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const receiptsSnap = await getDocs(collection(db, 'businesses', businessId, 'receipts'));
  const allReceipts = receiptsSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((r) => !r.isDeleted);

  allReceipts.sort((a, b) =>
    (b.purchaseDate || b.receiptDate || '').localeCompare(a.purchaseDate || a.receiptDate || '')
  );

  const confirmedReceipts = allReceipts.filter((r) => r.reviewStatus === 'verified');
  const needsReviewReceipts = allReceipts.filter((r) => r.reviewStatus === 'needs_review');
  const draftReceipts = allReceipts.filter((r) => r.reviewStatus === 'draft');

  let totalSpentMinor = 0;
  let subtotalMinor = 0;
  let taxTotalMinor = 0;

  const supplierMap = new Map<
    string,
    { id: string; name: string; gstin?: string; phone?: string; spendMinor: number; billsCount: number }
  >();
  const categoryMap = new Map<string, { spendMinor: number; billsCount: number }>();

  for (const r of confirmedReceipts) {
    const grand = Number(r.grandTotalMinor) || 0;
    const sub = Number(r.subtotalMinor) || grand;
    const tax = Number(r.taxTotalMinor) || 0;

    totalSpentMinor += grand;
    subtotalMinor += sub;
    taxTotalMinor += tax;

    const supId = r.supplier?.id || 'sup_default';
    const supName = r.supplier?.name || 'Wholesale Supplier';
    const prevSup = supplierMap.get(supId) || {
      id: supId,
      name: supName,
      gstin: r.supplier?.gstin,
      phone: r.supplier?.phone,
      spendMinor: 0,
      billsCount: 0,
    };
    prevSup.spendMinor += grand;
    prevSup.billsCount += 1;
    supplierMap.set(supId, prevSup);

    const cats: string[] =
      Array.isArray(r.categories) && r.categories.length > 0 ? r.categories : ['General Grocery'];
    const sharePerCat = Math.round(grand / cats.length);
    for (const c of cats) {
      const prevCat = categoryMap.get(c) || { spendMinor: 0, billsCount: 0 };
      prevCat.spendMinor += sharePerCat;
      prevCat.billsCount += 1;
      categoryMap.set(c, prevCat);
    }
  }

  const topSuppliers = Array.from(supplierMap.values())
    .sort((a, b) => b.spendMinor - a.spendMinor)
    .slice(0, 10)
    .map((s, idx) => ({
      rank: idx + 1,
      id: s.id,
      name: s.name,
      gstin: s.gstin,
      phone: s.phone,
      spendMinor: s.spendMinor,
      spendRupees: Math.round(s.spendMinor / 100),
      billsCount: s.billsCount,
      sharePercentage:
        totalSpentMinor > 0 ? Math.round((s.spendMinor / totalSpentMinor) * 1000) / 10 : 0,
    }));

  const categoryBreakdown = Array.from(categoryMap.entries())
    .sort((a, b) => b[1].spendMinor - a[1].spendMinor)
    .map(([category, stats]) => ({
      category,
      spendMinor: stats.spendMinor,
      spendRupees: Math.round(stats.spendMinor / 100),
      billsCount: stats.billsCount,
      percentage:
        totalSpentMinor > 0 ? Math.round((stats.spendMinor / totalSpentMinor) * 100) : 0,
    }));

  return {
    metricSemantics: {
      financialScope: 'confirmed_only',
      label: 'Confirmed Bills Only',
      description: 'Calculated strictly from your verified store receipts.',
    },
    period: {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
      endDate: now.toISOString().slice(0, 10),
      label: period === 'all_time' ? 'All Time History' : currentMonthLabel,
    },
    totalSpentMinor,
    totalSpentRupees: Math.round(totalSpentMinor / 100),
    subtotalRupees: Math.round(subtotalMinor / 100),
    taxTotalRupees: Math.round(taxTotalMinor / 100),
    confirmedReceiptsCount: confirmedReceipts.length,
    totalConfirmedStoreCount: confirmedReceipts.length,
    needsCheckingCount: needsReviewReceipts.length,
    draftsCount: draftReceipts.length,
    topSuppliers,
    topItems: [],
    categoryBreakdown,
    recentReceipts: allReceipts.slice(0, 5).map((r) => ({
      id: r.id,
      invoiceNumber: r.invoiceNumber || r.id,
      supplierName: r.supplier?.name || 'Unknown Supplier',
      purchaseDate: r.purchaseDate || r.receiptDate || now.toISOString().slice(0, 10),
      grandTotalMinor: Number(r.grandTotalMinor) || 0,
      grandTotalRupees: Math.round((Number(r.grandTotalMinor) || 0) / 100),
      reviewStatus: r.reviewStatus || 'draft',
      paymentStatus: r.payment?.status || 'paid',
      lineItemCount: Number(r.lineItemCount) || 0,
    })),
    needsReviewReceipts: needsReviewReceipts.map((r) => ({
      id: r.id,
      invoiceNumber: r.invoiceNumber || r.id,
      supplierName: r.supplier?.name || 'Unknown Supplier',
      purchaseDate: r.purchaseDate || r.receiptDate || now.toISOString().slice(0, 10),
      grandTotalMinor: Number(r.grandTotalMinor) || 0,
      grandTotalRupees: Math.round((Number(r.grandTotalMinor) || 0) / 100),
      reviewReason: 'Pending storekeeper verification',
    })),
  };
}

export const analyticsService = {
  async getSummary(options?: {
    period?: 'this_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'all_time';
    startDate?: string;
    endDate?: string;
  }): Promise<AnalyticsSummary> {
    const { isGuestMode, businessId } = getActiveTenantContext();

    if (!isGuestMode && businessId) {
      try {
        const params: Record<string, string> = {};
        if (options?.period) params.period = options.period;
        if (options?.startDate) params.startDate = options.startDate;
        if (options?.endDate) params.endDate = options.endDate;

        const res: any = await apiClient.get('/analytics/summary', params, businessId);
        if (res?.data) {
          return res.data;
        }
      } catch {
        // Express backend unreachable — compute directly from user's Firestore receipts
      }

      try {
        return await computeFirestoreSummary(businessId, options?.period);
      } catch (err) {
        console.warn('[AnalyticsService] Direct Firestore summary computation failed:', err);
      }
    }

    if (!isGuestMode) {
      const now = new Date();
      return {
        metricSemantics: {
          financialScope: 'confirmed_only',
          label: 'Confirmed Bills Only',
          description: 'Calculated strictly from your verified store receipts.',
        },
        period: {
          startDate: now.toISOString().slice(0, 10),
          endDate: now.toISOString().slice(0, 10),
          label: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        },
        totalSpentMinor: 0,
        totalSpentRupees: 0,
        subtotalRupees: 0,
        taxTotalRupees: 0,
        confirmedReceiptsCount: 0,
        totalConfirmedStoreCount: 0,
        needsCheckingCount: 0,
        draftsCount: 0,
        topSuppliers: [],
        topItems: [],
        categoryBreakdown: [],
        recentReceipts: [],
        needsReviewReceipts: [],
      };
    }

    // Guest Demo Mode ONLY
    return {
      metricSemantics: {
        financialScope: 'confirmed_only',
        label: 'Confirmed Bills Only',
        description: 'Mock demonstration data for Guest Demo preview.',
      },
      period: {
        startDate: '2024-10-01',
        endDate: '2024-10-31',
        label: 'October 2024',
      },
      totalSpentMinor: 14865000,
      totalSpentRupees: 148650,
      subtotalRupees: 141571,
      taxTotalRupees: 7079,
      confirmedReceiptsCount: 32,
      totalConfirmedStoreCount: 32,
      needsCheckingCount: 2,
      draftsCount: 1,
      topSuppliers: DEMO_ANALYTICS.topSuppliers.map((s, idx) => ({
        rank: idx + 1,
        id: `sup_${idx + 1}`,
        name: s.name,
        spendMinor: s.amount * 100,
        spendRupees: s.amount,
        billsCount: s.bills,
        sharePercentage: parseFloat(s.share) || 20,
      })),
      topItems: [],
      categoryBreakdown: DEMO_ANALYTICS.categorySpend.map((c) => ({
        category: c.name,
        spendMinor: c.amount * 100,
        spendRupees: c.amount,
        billsCount: 5,
        percentage: c.percentage,
      })),
      recentReceipts: [],
      needsReviewReceipts: [],
    };
  },

  async getTrends(options?: {
    granularity?: 'day' | 'week' | 'month';
    metric?: 'spend' | 'receipts';
  }): Promise<AnalyticsTrends> {
    const { isGuestMode, businessId } = getActiveTenantContext();

    if (!isGuestMode && businessId) {
      try {
        const params: Record<string, string> = {};
        if (options?.granularity) params.granularity = options.granularity;
        if (options?.metric) params.metric = options.metric;

        const res: any = await apiClient.get('/analytics/trends', params, businessId);
        if (res?.data) {
          return res.data;
        }
      } catch {
        // Fallback to direct Firestore aggregation
      }

      try {
        const receiptsSnap = await getDocs(collection(db, 'businesses', businessId, 'receipts'));
        const confirmed = receiptsSnap.docs
          .map((d) => d.data() as any)
          .filter((r) => !r.isDeleted && r.reviewStatus === 'verified');

        const bucketMap = new Map<string, { spendMinor: number; receiptsCount: number }>();
        for (const r of confirmed) {
          const dateStr: string = r.purchaseDate || r.receiptDate || new Date().toISOString().slice(0, 10);
          const key = dateStr.slice(0, 10);
          const prev = bucketMap.get(key) || { spendMinor: 0, receiptsCount: 0 };
          prev.spendMinor += Number(r.grandTotalMinor) || 0;
          prev.receiptsCount += 1;
          bucketMap.set(key, prev);
        }

        const trends = Array.from(bucketMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([periodKey, val]) => ({
            periodKey,
            label: periodKey,
            spendMinor: val.spendMinor,
            spendRupees: Math.round(val.spendMinor / 100),
            receiptsCount: val.receiptsCount,
            prevSpendMinor: 0,
            prevSpendRupees: 0,
          }));

        const peak =
          trends.length > 0
            ? [...trends].sort((a, b) => b.spendRupees - a.spendRupees)[0]
            : null;

        return {
          granularity: options?.granularity || 'week',
          metric: options?.metric || 'spend',
          peakPeriod: peak ? { label: peak.label, spendRupees: peak.spendRupees } : null,
          trends,
        };
      } catch {
        return {
          granularity: options?.granularity || 'week',
          metric: options?.metric || 'spend',
          peakPeriod: null,
          trends: [],
        };
      }
    }

    // Guest Demo Mode ONLY
    return {
      granularity: options?.granularity || 'week',
      metric: options?.metric || 'spend',
      peakPeriod: { label: 'Oct 15–21 (Diwali advance mandi bulk)', spendRupees: 98400 },
      trends: [
        { periodKey: 'W1', label: '1–7 Oct', spendMinor: 8840000, spendRupees: 88400, receiptsCount: 8, prevSpendMinor: 7600000, prevSpendRupees: 76000 },
        { periodKey: 'W2', label: '8–14 Oct', spendMinor: 9420000, spendRupees: 94200, receiptsCount: 9, prevSpendMinor: 8920000, prevSpendRupees: 89200 },
        { periodKey: 'W3', label: '15–21 Oct', spendMinor: 11200000, spendRupees: 112000, receiptsCount: 12, prevSpendMinor: 9210000, prevSpendRupees: 92100 },
        { periodKey: 'W4', label: '22–28 Oct', spendMinor: 8965000, spendRupees: 89650, receiptsCount: 7, prevSpendMinor: 9700000, prevSpendRupees: 97000 },
      ],
    };
  },

  async getPriceTracker(): Promise<{ totalTrackedItems: number; items: PriceTrackerItem[] }> {
    const { isGuestMode, businessId } = getActiveTenantContext();

    if (!isGuestMode && businessId) {
      try {
        const res: any = await apiClient.get('/analytics/price-tracker', undefined, businessId);
        if (res?.data?.items) {
          return res.data;
        }
      } catch {
        // Fallback to direct Firestore items query
      }

      try {
        const snap = await getDocs(collection(db, 'businesses', businessId, 'items'));
        const items: PriceTrackerItem[] = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((it) => !it.isDeleted)
          .map((it) => {
            const latest = Math.round((it.lastPurchasePriceMinor || 0) / 100);
            const lowest = Math.round((it.lowestPriceMinor || it.lastPurchasePriceMinor || 0) / 100);
            const highest = Math.round((it.highestPriceMinor || it.lastPurchasePriceMinor || 0) / 100);
            const variance = lowest > 0 ? Math.round(((latest - lowest) / lowest) * 1000) / 10 : 0;

            return {
              name: it.name || 'Item',
              category: it.category || 'General Grocery',
              primarySupplier: it.primarySupplierName || 'Wholesale Supplier',
              unit: it.defaultUnit || 'piece',
              latestRateRupees: latest,
              lowestRateRupees: lowest,
              highestRateRupees: highest,
              lastPurchaseDate: it.lastPurchaseDate || '—',
              hasInflation: variance > 0,
              rateVariancePercentage: variance,
            };
          });

        return {
          totalTrackedItems: items.length,
          items,
        };
      } catch {
        return { totalTrackedItems: 0, items: [] };
      }
    }

    // Guest Demo Mode ONLY
    return {
      totalTrackedItems: 3,
      items: [
        {
          name: 'Fortune Kachi Ghani Mustard Oil 1L Pouch',
          category: 'Edible Oils',
          primarySupplier: 'Gupta Wholesale Mart',
          unit: 'pouch',
          latestRateRupees: 148,
          lowestRateRupees: 142,
          highestRateRupees: 148,
          lastPurchaseDate: '2024-10-23',
          hasInflation: true,
          rateVariancePercentage: 4.2,
        },
        {
          name: 'Madhur Pure Sugar M-30 Grade 50kg Bag',
          category: 'Groceries',
          primarySupplier: 'Shree Balaji Traders',
          unit: 'bag',
          latestRateRupees: 2120,
          lowestRateRupees: 2040,
          highestRateRupees: 2120,
          lastPurchaseDate: '2024-10-23',
          hasInflation: true,
          rateVariancePercentage: 3.9,
        },
        {
          name: 'Aashirvaad Shudh Chakki Atta 10kg Bag',
          category: 'Grains',
          primarySupplier: 'Shree Balaji Traders',
          unit: 'bag',
          latestRateRupees: 385,
          lowestRateRupees: 380,
          highestRateRupees: 388,
          lastPurchaseDate: '2024-10-24',
          hasInflation: true,
          rateVariancePercentage: 2.1,
        },
      ],
    };
  },

  async generateAiSummary(
    period: 'this_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'all_time' = 'this_month'
  ): Promise<{ summaryText: string; generatedBy: string; timestamp: string }> {
    const { isGuestMode, businessId } = getActiveTenantContext();

    if (!isGuestMode && businessId) {
      try {
        const res: any = await apiClient.post('/analytics/ai-summary', { period }, false, businessId);
        if (res?.data?.summaryText) {
          return res.data;
        }
      } catch {
        // Compute grounded summary from the user's own Firestore summary
      }

      const summary = await this.getSummary({ period });
      if (summary.confirmedReceiptsCount === 0) {
        return {
          summaryText:
            '• **No Confirmed Bills Yet:** Your shop ledger currently has ₹0 in verified purchases for this period.\n' +
            (summary.needsCheckingCount > 0
              ? `• **Pending Verification:** You have ${summary.needsCheckingCount} bill(s) awaiting review—confirm them to include their totals in your store analytics.\n`
              : '• **Get Started:** Click "+ Upload Receipt" to scan your first wholesale bill or enter a purchase voucher manually.'),
          generatedBy: 'shopledger-deterministic-grounding',
          timestamp: new Date().toISOString(),
        };
      }

      const topSup = summary.topSuppliers[0];
      return {
        summaryText:
          `• **Confirmed Store Outflow:** ₹${summary.totalSpentRupees.toLocaleString('en-IN')} across ${summary.confirmedReceiptsCount} verified bill(s) (${summary.needsCheckingCount} pending review).\n` +
          (topSup
            ? `• **Top Supplier:** ${topSup.name} accounts for ₹${topSup.spendRupees.toLocaleString('en-IN')} (${topSup.sharePercentage}% of total spend across ${topSup.billsCount} bill(s)).`
            : ''),
        generatedBy: 'shopledger-deterministic-grounding',
        timestamp: new Date().toISOString(),
      };
    }

    // Guest Demo Mode ONLY
    return {
      summaryText:
        '• **Confirmed Store Outflow:** ₹1,49,000.00 across 6 verified wholesale vouchers this month (2 bills pending review).\n' +
        '• **Vendor Concentration:** Gupta Wholesale Mart (₹66,400) and R.K. Agro Commodities (₹48,900) account for 77.4% of your verified purchases.\n' +
        '• **Commodity Rate Watch:** Fortune Mustard Oil 1L is ₹6.00/pouch cheaper at Gupta Wholesale Mart (₹142.00) compared to Shree Balaji Traders (₹148.00).',
      generatedBy: 'gemini-2.5-flash-grounded',
      timestamp: new Date().toISOString(),
    };
  },
};
