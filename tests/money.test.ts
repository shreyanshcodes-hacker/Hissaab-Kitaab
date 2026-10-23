import test from 'node:test';
import assert from 'node:assert/strict';
import {
  paiseToRupees,
  rupeesToPaise,
  formatPaise,
  sumMinor,
  calculateTaxMinor,
  calculateLineTotalMinor,
} from '../frontend/src/utils/money.ts';

test('Financial Arithmetic & Minor Units (Paise) Conversion', async (t) => {
  await t.test('Converts rupees to paise and rounds properly', () => {
    assert.equal(rupeesToPaise(142.5), 14250);
    assert.equal(rupeesToPaise(0), 0);
    assert.equal(rupeesToPaise(100.999), 10100);
    // Floating point protection test: 0.1 + 0.2 = 0.30000000000000004
    const floatingSum = 0.1 + 0.2;
    assert.equal(rupeesToPaise(floatingSum), 30);
  });

  await t.test('Converts paise to rupees accurately', () => {
    assert.equal(paiseToRupees(14250), 142.5);
    assert.equal(paiseToRupees(0), 0);
    assert.equal(paiseToRupees(50), 0.5);
    assert.equal(paiseToRupees(null), 0);
    assert.equal(paiseToRupees(undefined), 0);
  });

  await t.test('Formats paise into Indian Rupee strings with Indian numbering system', () => {
    assert.equal(formatPaise(14250), '₹142.50');
    assert.equal(formatPaise(10000000), '₹1,00,000.00'); // 1 Lakh
    assert.equal(formatPaise(1000000000), '₹1,00,00,000.00'); // 1 Crore
    assert.equal(formatPaise(14250, { showSymbol: false }), '142.50');
  });

  await t.test('Formats compact values for dashboards', () => {
    assert.equal(formatPaise(1500000000, { compact: true }), '₹1.50 Cr');
    assert.equal(formatPaise(25000000, { compact: true }), '₹2.50 L');
    assert.equal(formatPaise(450000, { compact: true }), '₹4.5 k');
  });

  await t.test('Sums an array of minor units safely without float drift', () => {
    const items = [1000, 2550, 4200, 150]; // Total = 7900 paise (₹79.00)
    assert.equal(sumMinor(items), 7900);
    assert.equal(sumMinor([]), 0);
  });

  await t.test('Calculates tax in minor units accurately', () => {
    // ₹100.00 base (10000 paise) at 5% GST = ₹5.00 (500 paise)
    assert.equal(calculateTaxMinor(10000, 5), 500);
    // ₹142.50 base (14250 paise) at 18% GST = ₹25.65 (2565 paise)
    assert.equal(calculateTaxMinor(14250, 18), 2565);
    // Zero tax rate
    assert.equal(calculateTaxMinor(10000, 0), 0);
  });

  await t.test('Calculates line item totals with discounts and GST', () => {
    // 10 pouches at ₹140.00 (14000 paise) = 140000 base
    // Discount ₹10.00 (1000 paise) = 139000 taxable
    // 5% GST on 139000 = 6950 paise
    // Line total = 139000 + 6950 = 145950 paise (₹1459.50)
    const result = calculateLineTotalMinor({
      quantity: 10,
      unitPriceMinor: 14000,
      discountMinor: 1000,
      taxRatePercent: 5,
    });

    assert.equal(result.baseMinor, 140000);
    assert.equal(result.discountMinor, 1000);
    assert.equal(result.taxMinor, 6950);
    assert.equal(result.lineTotalMinor, 145950);
  });
});
