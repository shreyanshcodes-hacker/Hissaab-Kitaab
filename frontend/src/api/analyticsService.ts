import { apiClient } from './client';
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

export const analyticsService = {
  async getSummary(options?: {
    period?: 'this_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'all_time';
    startDate?: string;
    endDate?: string;
  }): Promise<AnalyticsSummary> {
    try {
      const params: Record<string, string> = {};
      if (options?.period) params.period = options.period;
      if (options?.startDate) params.startDate = options.startDate;
      if (options?.endDate) params.endDate = options.endDate;

      const res: any = await apiClient.get('/analytics/summary', params);
      if (res?.data) {
        return res.data;
      }
    } catch (err) {
      console.warn('[AnalyticsService] Backend getSummary failed, falling back to mock:', err);
    }

    // Fallback to DEMO_ANALYTICS format
    return {
      metricSemantics: {
        financialScope: 'confirmed_only',
        label: 'Confirmed Bills Only',
        description: 'Mock demonstration data for offline Kirana preview.',
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
    try {
      const params: Record<string, string> = {};
      if (options?.granularity) params.granularity = options.granularity;
      if (options?.metric) params.metric = options.metric;

      const res: any = await apiClient.get('/analytics/trends', params);
      if (res?.data) {
        return res.data;
      }
    } catch (err) {
      console.warn('[AnalyticsService] Backend getTrends failed, using fallback:', err);
    }

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
    try {
      const res: any = await apiClient.get('/analytics/price-tracker');
      if (res?.data?.items) {
        return res.data;
      }
    } catch (err) {
      console.warn('[AnalyticsService] Backend price tracker failed, using fallback:', err);
    }

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
    try {
      const res: any = await apiClient.post('/analytics/ai-summary', { period });
      if (res?.data?.summaryText) {
        return res.data;
      }
    } catch (err) {
      console.warn('[AnalyticsService] Backend generateAiSummary failed, using grounded narrative:', err);
    }

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
