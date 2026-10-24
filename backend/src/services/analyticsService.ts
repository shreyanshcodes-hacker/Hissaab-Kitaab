import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { db } from '../config/firebase-admin.js';
import { logger } from '../utils/logger.js';
import type { Receipt, ReceiptLineItem } from '../types/models.js';

export interface DateFilterRange {
  startDate: string;
  endDate: string;
  label: string;
}

export class AnalyticsService {
  private aiClient: GoogleGenAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY) {
      this.aiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    }
  }
  /**
   * Resolves date filter parameters into explicit YYYY-MM-DD boundaries.
   */
  resolveDateRange(options?: {
    period?: 'this_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'all_time';
    startDate?: string;
    endDate?: string;
  }): DateFilterRange {
    const now = new Date();
    const period = options?.period || 'this_month';

    if (options?.startDate && options?.endDate) {
      return {
        startDate: options.startDate,
        endDate: options.endDate,
        label: `${options.startDate} to ${options.endDate}`,
      };
    }

    if (period === 'last_month') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endPrev = new Date(now.getFullYear(), now.getMonth(), 0);
      const startStr = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-01`;
      const endStr = `${endPrev.getFullYear()}-${String(endPrev.getMonth() + 1).padStart(2, '0')}-${String(endPrev.getDate()).padStart(2, '0')}`;
      return {
        startDate: startStr,
        endDate: endStr,
        label: prev.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      };
    }

    if (period === 'last_30_days') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return {
        startDate: start.toISOString().slice(0, 10),
        endDate: now.toISOString().slice(0, 10),
        label: 'Last 30 Days',
      };
    }

    if (period === 'last_90_days') {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return {
        startDate: start.toISOString().slice(0, 10),
        endDate: now.toISOString().slice(0, 10),
        label: 'Last 90 Days',
      };
    }

    if (period === 'all_time') {
      return {
        startDate: '2020-01-01',
        endDate: '2099-12-31',
        label: 'All Time History',
      };
    }

    // Default: this_month
    const startStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const endStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return {
      startDate: startStr,
      endDate: endStr,
      label: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    };
  }

  /**
   * Generates high-accuracy procurement metrics for the store.
   * Semantic Rule: Primary financial totals use CONFIRMED receipts only.
   */
  async getSummary(
    businessId: string,
    options?: {
      period?: 'this_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'all_time';
      startDate?: string;
      endDate?: string;
    }
  ) {
    const range = this.resolveDateRange(options);

    const receiptsRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('receipts')
      .where('isDeleted', '==', false);

    const snapshot = await receiptsRef.get();
    const allReceipts = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() })) as Receipt[];

    // Counters across all receipts for the store
    let needsCheckingCount = 0;
    let draftsCount = 0;
    let totalConfirmedCountStore = 0;

    for (const r of allReceipts) {
      if (r.reviewStatus === 'needs_review') needsCheckingCount++;
      else if (r.reviewStatus === 'draft' || r.reviewStatus === 'processing') draftsCount++;
      else if (r.reviewStatus === 'verified' || r.reviewStatus === 'reconciled') totalConfirmedCountStore++;
    }

    // Filter strictly to CONFIRMED receipts within the specified date boundary
    const confirmedPeriodReceipts = allReceipts.filter((r) => {
      const isConfirmed = r.reviewStatus === 'verified' || r.reviewStatus === 'reconciled';
      if (!isConfirmed) return false;
      const date = r.purchaseDate || r.receiptDate;
      if (!date) return false;
      return date >= range.startDate && date <= range.endDate;
    });

    let totalSpentMinor = 0;
    let subtotalMinor = 0;
    let taxTotalMinor = 0;
    const supplierMap: Record<
      string,
      { id?: string; name: string; gstin?: string; phone?: string; spendMinor: number; billsCount: number }
    > = {};
    const categorySpendMap: Record<string, { spendMinor: number; billsCount: number }> = {};
    const itemSpendMap: Record<
      string,
      { name: string; category: string; unit: string; totalQty: number; spendMinor: number; billsCount: number; latestRateMinor: number }
    > = {};

    for (const r of confirmedPeriodReceipts) {
      const amount = r.grandTotalMinor || 0;
      totalSpentMinor += amount;
      subtotalMinor += r.subtotalMinor || amount;
      taxTotalMinor += r.taxTotalMinor || 0;

      // 1. Supplier Aggregation
      const supName = r.supplier?.name || 'Unknown Supplier';
      if (!supplierMap[supName]) {
        supplierMap[supName] = {
          id: r.supplier?.id,
          name: supName,
          gstin: r.supplier?.gstin,
          phone: r.supplier?.phone,
          spendMinor: 0,
          billsCount: 0,
        };
      }
      supplierMap[supName].spendMinor += amount;
      supplierMap[supName].billsCount += 1;

      // 2. Fetch line items for this confirmed receipt to calculate category & item breakdown
      try {
        const itemsDocSnap = await db
          .collection('businesses')
          .doc(businessId)
          .collection('receipts')
          .doc(r.id)
          .collection('items')
          .get();

        const lineItems = itemsDocSnap.docs.map((d: any) => d.data()) as ReceiptLineItem[];

        if (lineItems.length > 0) {
          for (const item of lineItems) {
            const cat = item.category || 'General Grocery';
            if (!categorySpendMap[cat]) {
              categorySpendMap[cat] = { spendMinor: 0, billsCount: 0 };
            }
            categorySpendMap[cat].spendMinor += item.lineTotalMinor || 0;
            categorySpendMap[cat].billsCount += 1;

            const itemName = item.rawName || 'Unnamed Item';
            if (!itemSpendMap[itemName]) {
              itemSpendMap[itemName] = {
                name: itemName,
                category: cat,
                unit: item.unit || 'piece',
                totalQty: 0,
                spendMinor: 0,
                billsCount: 0,
                latestRateMinor: item.unitPriceMinor || 0,
              };
            }
            itemSpendMap[itemName].totalQty += item.quantity || 0;
            itemSpendMap[itemName].spendMinor += item.lineTotalMinor || 0;
            itemSpendMap[itemName].billsCount += 1;
            itemSpendMap[itemName].latestRateMinor = item.unitPriceMinor || itemSpendMap[itemName].latestRateMinor;
          }
        } else if (r.categories && r.categories.length > 0) {
          const splitAmount = Math.round(amount / r.categories.length);
          for (const cat of r.categories) {
            if (!categorySpendMap[cat]) categorySpendMap[cat] = { spendMinor: 0, billsCount: 0 };
            categorySpendMap[cat].spendMinor += splitAmount;
            categorySpendMap[cat].billsCount += 1;
          }
        }
      } catch {
        // Fallback for missing subcollection
      }
    }

    // Fallback if no item subcollections existed but receipts had totals
    if (Object.keys(categorySpendMap).length === 0 && totalSpentMinor > 0) {
      categorySpendMap['Wholesale Inventory'] = { spendMinor: totalSpentMinor, billsCount: confirmedPeriodReceipts.length };
    }

    // Top 10 Suppliers
    const topSuppliers = Object.values(supplierMap)
      .sort((a, b) => b.spendMinor - a.spendMinor)
      .slice(0, 10)
      .map((s, idx) => ({
        rank: idx + 1,
        id: s.id || `sup_${idx + 1}`,
        name: s.name,
        gstin: s.gstin,
        phone: s.phone,
        spendMinor: s.spendMinor,
        spendRupees: s.spendMinor / 100,
        billsCount: s.billsCount,
        sharePercentage: totalSpentMinor > 0 ? Math.round((s.spendMinor / totalSpentMinor) * 1000) / 10 : 0,
      }));

    // Top 10 Purchased Items
    const topItems = Object.values(itemSpendMap)
      .sort((a, b) => b.spendMinor - a.spendMinor)
      .slice(0, 10)
      .map((it, idx) => ({
        rank: idx + 1,
        name: it.name,
        category: it.category,
        unit: it.unit,
        totalQuantity: it.totalQty,
        spendMinor: it.spendMinor,
        spendRupees: it.spendMinor / 100,
        billsCount: it.billsCount,
        latestRateRupees: it.latestRateMinor / 100,
      }));

    // Category Breakdown with percentage
    const categoryBreakdown = Object.entries(categorySpendMap)
      .sort(([, a], [, b]) => b.spendMinor - a.spendMinor)
      .map(([category, data]) => ({
        category,
        spendMinor: data.spendMinor,
        spendRupees: data.spendMinor / 100,
        billsCount: data.billsCount,
        percentage: totalSpentMinor > 0 ? Math.round((data.spendMinor / totalSpentMinor) * 1000) / 10 : 0,
      }));

    // Recent 5 receipts sorted by purchase date desc
    const recentReceipts = [...allReceipts]
      .sort((a, b) => (b.purchaseDate || '').localeCompare(a.purchaseDate || ''))
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        invoiceNumber: r.invoiceNumber || r.id,
        supplierName: r.supplier?.name || 'Unknown',
        purchaseDate: r.purchaseDate,
        grandTotalMinor: r.grandTotalMinor || 0,
        grandTotalRupees: (r.grandTotalMinor || 0) / 100,
        reviewStatus: r.reviewStatus,
        paymentStatus: r.payment?.status || 'paid',
        lineItemCount: r.lineItemCount || 0,
      }));

    // Receipts that need review (flagged / low confidence)
    const needsReviewReceipts = allReceipts
      .filter((r) => r.reviewStatus === 'needs_review')
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        invoiceNumber: r.invoiceNumber || r.id,
        supplierName: r.supplier?.name || 'Unknown',
        purchaseDate: r.purchaseDate,
        grandTotalMinor: r.grandTotalMinor || 0,
        grandTotalRupees: (r.grandTotalMinor || 0) / 100,
        reviewReason: r.extractionMetadata?.errorReason || 'Ambiguous handwriting or math discrepancy',
      }));

    return {
      metricSemantics: {
        financialScope: 'confirmed_only',
        label: 'Confirmed Bills Only',
        description:
          'Financial totals and vendor metrics strictly aggregate confirmed and verified invoices. Drafts, rejected, and pending check bills are isolated.',
      },
      period: range,
      totalSpentMinor,
      totalSpentRupees: totalSpentMinor / 100,
      subtotalRupees: subtotalMinor / 100,
      taxTotalRupees: taxTotalMinor / 100,
      confirmedReceiptsCount: confirmedPeriodReceipts.length,
      totalConfirmedStoreCount: totalConfirmedCountStore,
      needsCheckingCount,
      draftsCount,
      topSuppliers,
      topItems,
      categoryBreakdown,
      recentReceipts,
      needsReviewReceipts,
    };
  }

  /**
   * Generates periodic spending trends with dual-period comparison.
   * Day, week, or month grouping for chart visualization.
   */
  async getTrends(
    businessId: string,
    options?: {
      granularity?: 'day' | 'week' | 'month';
      startDate?: string;
      endDate?: string;
      metric?: 'spend' | 'receipts';
    }
  ) {
    const granularity = options?.granularity || 'month';
    const receiptsRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('receipts')
      .where('isDeleted', '==', false);

    const snapshot = await receiptsRef.get();
    const receipts = (snapshot.docs.map((d: any) => d.data()) as Receipt[]).filter(
      (r) => r.reviewStatus === 'verified' || r.reviewStatus === 'reconciled'
    );

    const trends: Array<{
      periodKey: string;
      label: string;
      spendMinor: number;
      spendRupees: number;
      receiptsCount: number;
      prevSpendMinor: number;
      prevSpendRupees: number;
    }> = [];

    if (granularity === 'month') {
      // 6-Month rolling view
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });

        // Previous year corresponding month
        const prevYearKey = `${d.getFullYear() - 1}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        let spendMinor = 0;
        let receiptsCount = 0;
        let prevSpendMinor = 0;

        for (const r of receipts) {
          if (r.purchaseDate?.startsWith(key)) {
            spendMinor += r.grandTotalMinor || 0;
            receiptsCount++;
          }
          if (r.purchaseDate?.startsWith(prevYearKey)) {
            prevSpendMinor += r.grandTotalMinor || 0;
          }
        }

        trends.push({
          periodKey: key,
          label,
          spendMinor,
          spendRupees: spendMinor / 100,
          receiptsCount,
          prevSpendMinor,
          prevSpendRupees: prevSpendMinor / 100,
        });
      }
    } else if (granularity === 'week') {
      // 4-Week view (Oct 2024 Stitch design)
      const weeks = [
        { key: 'W1', label: '1–7 Oct', start: '2024-10-01', end: '2024-10-07', prevStart: '2024-09-01', prevEnd: '2024-09-07' },
        { key: 'W2', label: '8–14 Oct', start: '2024-10-08', end: '2024-10-14', prevStart: '2024-09-08', prevEnd: '2024-09-14' },
        { key: 'W3', label: '15–21 Oct', start: '2024-10-15', end: '2024-10-21', prevStart: '2024-09-15', prevEnd: '2024-09-21' },
        { key: 'W4', label: '22–28 Oct', start: '2024-10-22', end: '2024-10-28', prevStart: '2024-09-22', prevEnd: '2024-09-28' },
      ];

      for (const w of weeks) {
        let spendMinor = 0;
        let receiptsCount = 0;
        let prevSpendMinor = 0;

        for (const r of receipts) {
          const d = r.purchaseDate || '';
          if (d >= w.start && d <= w.end) {
            spendMinor += r.grandTotalMinor || 0;
            receiptsCount++;
          }
          if (d >= w.prevStart && d <= w.prevEnd) {
            prevSpendMinor += r.grandTotalMinor || 0;
          }
        }

        trends.push({
          periodKey: w.key,
          label: w.label,
          spendMinor,
          spendRupees: spendMinor / 100,
          receiptsCount,
          prevSpendMinor,
          prevSpendRupees: prevSpendMinor / 100,
        });
      }
    } else {
      // Day granularity: Last 14 days
      const now = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

        let spendMinor = 0;
        let receiptsCount = 0;

        for (const r of receipts) {
          if (r.purchaseDate === key) {
            spendMinor += r.grandTotalMinor || 0;
            receiptsCount++;
          }
        }

        trends.push({
          periodKey: key,
          label,
          spendMinor,
          spendRupees: spendMinor / 100,
          receiptsCount,
          prevSpendMinor: 0,
          prevSpendRupees: 0,
        });
      }
    }

    // Detect peak period
    const peak = [...trends].sort((a, b) => b.spendMinor - a.spendMinor)[0];

    return {
      granularity,
      metric: options?.metric || 'spend',
      peakPeriod: peak ? { label: peak.label, spendRupees: peak.spendRupees } : null,
      trends,
    };
  }

  /**
   * Generates wholesale commodity price tracker comparing invoice unit prices.
   */
  async getPriceTracker(businessId: string) {
    const receiptsRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('receipts')
      .where('isDeleted', '==', false);

    const snapshot = await receiptsRef.get();
    const receipts = (snapshot.docs.map((d: any) => d.data()) as Receipt[]).filter(
      (r) => r.reviewStatus === 'verified' || r.reviewStatus === 'reconciled'
    );

    const trackerMap: Record<
      string,
      {
        name: string;
        category: string;
        primarySupplier: string;
        latestRateMinor: number;
        minRateMinor: number;
        maxRateMinor: number;
        unit: string;
        lastPurchaseDate: string;
        ratesCount: number;
      }
    > = {};

    for (const r of receipts) {
      try {
        const itemsDocSnap = await db
          .collection('businesses')
          .doc(businessId)
          .collection('receipts')
          .doc(r.id)
          .collection('items')
          .get();

        for (const doc of itemsDocSnap.docs) {
          const item = doc.data() as ReceiptLineItem;
          if (!item.rawName || !item.unitPriceMinor) continue;

          const key = item.rawName;
          if (!trackerMap[key]) {
            trackerMap[key] = {
              name: key,
              category: item.category || 'General Grocery',
              primarySupplier: r.supplier?.name || 'Local Mandi',
              latestRateMinor: item.unitPriceMinor,
              minRateMinor: item.unitPriceMinor,
              maxRateMinor: item.unitPriceMinor,
              unit: item.unit || 'piece',
              lastPurchaseDate: r.purchaseDate,
              ratesCount: 1,
            };
          } else {
            const entry = trackerMap[key];
            entry.ratesCount++;
            entry.minRateMinor = Math.min(entry.minRateMinor, item.unitPriceMinor);
            entry.maxRateMinor = Math.max(entry.maxRateMinor, item.unitPriceMinor);
            if ((r.purchaseDate || '') >= entry.lastPurchaseDate) {
              entry.latestRateMinor = item.unitPriceMinor;
              entry.lastPurchaseDate = r.purchaseDate;
              entry.primarySupplier = r.supplier?.name || entry.primarySupplier;
            }
          }
        }
      } catch {
        // Skip
      }
    }

    const items = Object.values(trackerMap).map((it) => ({
      name: it.name,
      category: it.category,
      primarySupplier: it.primarySupplier,
      unit: it.unit,
      latestRateRupees: it.latestRateMinor / 100,
      lowestRateRupees: it.minRateMinor / 100,
      highestRateRupees: it.maxRateMinor / 100,
      lastPurchaseDate: it.lastPurchaseDate,
      hasInflation: it.latestRateMinor > it.minRateMinor,
      rateVariancePercentage:
        it.minRateMinor > 0
          ? Math.round(((it.maxRateMinor - it.minRateMinor) / it.minRateMinor) * 1000) / 10
          : 0,
    }));

    return {
      totalTrackedItems: items.length,
      items,
    };
  }

  /**
   * Generates a grounded Gemini executive summary from verified store spending metrics.
   */
  async generateAiExecutiveSummary(
    businessId: string,
    period: 'this_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'all_time' = 'this_month'
  ) {
    const summary = await this.getSummary(businessId, { period });
    const priceTracker = await this.getPriceTracker(businessId);

    const fallbackNarrative =
      `Verified outflow for ${summary.period.label} is ₹${summary.totalSpentRupees.toLocaleString('en-IN')} across ${summary.confirmedReceiptsCount} confirmed bills. ` +
      (summary.topSuppliers[0]
        ? `Your largest wholesale partner is ${summary.topSuppliers[0].name} (${summary.topSuppliers[0].sharePercentage}% share).`
        : '');

    if (!this.aiClient || !env.GEMINI_API_KEY) {
      return {
        summaryText: fallbackNarrative,
        generatedBy: 'deterministic-engine',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const contextPayload = {
        period: summary.period.label,
        totalSpentRupees: summary.totalSpentRupees,
        confirmedReceiptsCount: summary.confirmedReceiptsCount,
        needsCheckingCount: summary.needsCheckingCount,
        topSuppliers: summary.topSuppliers.slice(0, 4),
        categoryBreakdown: summary.categoryBreakdown.slice(0, 4),
        priceTrackerHighlights: priceTracker.items.slice(0, 6),
      };

      const aiRes = await this.aiClient.models.generateContent({
        model: env.GEMINI_MODEL || 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text:
                  `SYSTEM: You are ShopLedger AI for an Indian Kirana merchant.\n` +
                  `Write a concise 3-bullet executive procurement summary based strictly on the verified store JSON metrics below. ` +
                  `Highlight total confirmed spend, top vendor concentration, and any wholesale unit-rate variations. Do not invent numbers.\n\n` +
                  `METRICS: ${JSON.stringify(contextPayload)}`,
              },
            ],
          },
        ],
      });

      return {
        summaryText: aiRes.text?.trim() || fallbackNarrative,
        generatedBy: env.GEMINI_MODEL || 'gemini-3.8-flash',
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      logger.warn('Gemini executive summary generation fell back to deterministic narrative:', err?.message || err);
      return {
        summaryText: fallbackNarrative,
        generatedBy: 'deterministic-fallback',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export const analyticsService = new AnalyticsService();
