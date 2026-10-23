import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsService } from '../dist/services/analyticsService.js';
import { receiptService } from '../dist/services/receiptService.js';
import { devStore } from '../dist/config/firebase-admin.js';

test('ShopLedger Real Analytics & Receipt Pipeline Verification', async (t) => {
  const bizId = 'biz_sharma_kirana';

  // ---------------------------------------------------------------------------
  // 1. Metric Semantics & Known Receipt Fixture Verification
  // ---------------------------------------------------------------------------
  await t.test('Primary financial totals aggregate strictly CONFIRMED receipts', async () => {
    const summary = await analyticsService.getSummary(bizId, { period: 'all_time' });

    assert.equal(summary.metricSemantics.financialScope, 'confirmed_only');
    assert.ok(summary.totalSpentMinor > 0);
    assert.equal(summary.totalSpentRupees, summary.totalSpentMinor / 100);

    // Verify confirmed receipts count
    assert.equal(summary.confirmedReceiptsCount, 9);

    // Verify unverified drafts & low-confidence receipts are tracked separately
    assert.equal(summary.needsCheckingCount, 2);
    assert.equal(summary.draftsCount, 1);
  });

  await t.test('Drafts and needs-review bills are excluded from financial outflow', async () => {
    const summary = await analyticsService.getSummary(bizId, { period: 'all_time' });

    // In devStore fixtures, REC-2024-1089 (₹12,450.00) and REC-2024-1082 (₹8,900.00) are needs_review
    // and REC-2024-DRAFT-01 (₹6,500.00) is draft.
    // Confirmed spend sum of 9 receipts = ₹2,45,000.00 (24,500,000 paise).
    assert.equal(summary.totalSpentMinor, 24500000);
    assert.equal(summary.totalSpentRupees, 245000);
  });

  // ---------------------------------------------------------------------------
  // 2. Date Boundary Enforcement
  // ---------------------------------------------------------------------------
  await t.test('Date boundaries correctly isolate periods without leakage', async () => {
    const now = new Date();
    const currMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthPrefix = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    // Current month query
    const currSummary = await analyticsService.getSummary(bizId, { period: 'this_month' });
    assert.equal(currSummary.confirmedReceiptsCount, 6);
    assert.equal(currSummary.totalSpentRupees, 149000);

    // Previous month query
    const prevSummary = await analyticsService.getSummary(bizId, { period: 'last_month' });
    assert.equal(prevSummary.confirmedReceiptsCount, 3);
    assert.equal(prevSummary.totalSpentRupees, 96000);

    // Combined: 149000 + 96000 = 245000
    assert.equal(currSummary.totalSpentRupees + prevSummary.totalSpentRupees, 245000);
  });

  // ---------------------------------------------------------------------------
  // 3. Empty Business Account Handling
  // ---------------------------------------------------------------------------
  await t.test('Empty business returns zero totals and empty arrays gracefully', async () => {
    const emptyBizId = 'biz_empty_store_new';
    const summary = await analyticsService.getSummary(emptyBizId);

    assert.equal(summary.totalSpentMinor, 0);
    assert.equal(summary.totalSpentRupees, 0);
    assert.equal(summary.confirmedReceiptsCount, 0);
    assert.equal(summary.needsCheckingCount, 0);
    assert.equal(summary.draftsCount, 0);
    assert.deepEqual(summary.topSuppliers, []);
    assert.deepEqual(summary.categoryBreakdown, []);
    assert.deepEqual(summary.recentReceipts, []);
  });

  // ---------------------------------------------------------------------------
  // 4. Pagination & Sorting Integrity
  // ---------------------------------------------------------------------------
  await t.test('Receipts library pagination partitions records correctly', async () => {
    const page1 = await receiptService.listReceipts(bizId, { page: 1, limit: 3 });
    const page2 = await receiptService.listReceipts(bizId, { page: 2, limit: 3 });

    assert.equal(page1.items.length, 3);
    assert.equal(page2.items.length, 3);
    assert.equal(page1.pagination.total, 12);
    assert.equal(page1.pagination.totalPages, 4);

    // Check no duplicate IDs across pages
    const ids1 = page1.items.map((i) => i.id);
    const ids2 = page2.items.map((i) => i.id);
    for (const id of ids1) {
      assert.ok(!ids2.includes(id), `Page overlap detected for id ${id}`);
    }
  });

  // ---------------------------------------------------------------------------
  // 5. Supplier & Item Ranking
  // ---------------------------------------------------------------------------
  await t.test('Top suppliers and items are sorted strictly in descending order', async () => {
    const summary = await analyticsService.getSummary(bizId, { period: 'all_time' });

    assert.ok(summary.topSuppliers.length > 0);
    for (let i = 0; i < summary.topSuppliers.length - 1; i++) {
      assert.ok(
        summary.topSuppliers[i].spendMinor >= summary.topSuppliers[i + 1].spendMinor,
        'Suppliers not sorted desc by spend'
      );
    }

    assert.ok(summary.topItems.length > 0);
    for (let i = 0; i < summary.topItems.length - 1; i++) {
      assert.ok(
        summary.topItems[i].spendMinor >= summary.topItems[i + 1].spendMinor,
        'Items not sorted desc by spend'
      );
    }
  });

  // ---------------------------------------------------------------------------
  // 6. Cross-Business Isolation (Tenant Security)
  // ---------------------------------------------------------------------------
  await t.test('Cross-business queries are strictly isolated', async () => {
    const bizA = 'biz_store_alpha';
    const bizB = 'biz_store_beta';

    await receiptService.createReceipt(bizA, 'user_a', {
      invoiceNumber: 'ALPHA-001',
      receiptDate: '2024-10-24',
      purchaseDate: '2024-10-24',
      supplier: { name: 'Alpha Supplier' },
      payment: { method: 'cash', status: 'paid' },
      imagePath: 'path/a',
      items: [
        { rawName: 'Item A', quantity: 2, unitPriceMinor: 5000 },
      ],
    });

    const receiptsB = await receiptService.listReceipts(bizB, {});
    const alphaLeak = receiptsB.items.find((r) => r.invoiceNumber === 'ALPHA-001');
    assert.equal(alphaLeak, undefined, 'Tenant leakage detected across business IDs');
  });

  // ---------------------------------------------------------------------------
  // 7. Wholesale Price Tracker & Historical Comparison
  // ---------------------------------------------------------------------------
  await t.test('Price tracker tracks historical unit rates across suppliers', async () => {
    const tracker = await analyticsService.getPriceTracker(bizId);

    assert.ok(tracker.totalTrackedItems > 0);
    const fortuneOil = tracker.items.find((i) => i.name.includes('Fortune Sunlite'));
    assert.ok(fortuneOil, 'Fortune oil not tracked in price tracker');
    assert.ok(fortuneOil.latestRateRupees > 0);
    assert.ok(fortuneOil.lowestRateRupees <= fortuneOil.highestRateRupees);
  });
});
