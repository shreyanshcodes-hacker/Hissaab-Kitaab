import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ReceiptSchema,
  ReceiptLineItemSchema,
  BoundingBoxSchema,
  ReceiptSupplierSnapshotSchema,
} from '../frontend/src/schemas/receipt.schema.ts';

test('Receipt and Line Item Schema Validation', async (t) => {
  await t.test('Validates a complete receipt with integer paise amounts', () => {
    const validReceipt = {
      id: 'rcpt_101',
      businessId: 'biz_sharma_kirana',
      invoiceNumber: 'INV-2024-8842',
      receiptDate: '2024-11-04',
      purchaseDate: '2024-11-04',
      supplier: {
        id: 'sup_gupta_wm',
        name: 'Gupta Wholesale Mart',
        phone: '+91 98101 23456',
        gstin: '07AAAAA0000A1Z5',
      },
      payment: {
        method: 'cash',
        status: 'paid',
        paidAmountMinor: 1425000, // ₹14,250.00
      },
      currency: 'INR',
      subtotalMinor: 1350000,
      taxTotalMinor: 75000,
      discountTotalMinor: 0,
      roundOffMinor: 0,
      grandTotalMinor: 1425000,
      reviewStatus: 'verified',
      imagePath: 'businesses/biz_sharma_kirana/receipts/rcpt_101/original.jpg',
      lineItemCount: 1,
      tags: ['edible_oil', 'wholesale'],
      isDeleted: false,
    };

    const parsed = ReceiptSchema.parse(validReceipt);
    assert.equal(parsed.id, 'rcpt_101');
    assert.equal(parsed.grandTotalMinor, 1425000);
    assert.equal(parsed.currency, 'INR');
  });

  await t.test('Rejects fractional (floating-point) or negative paise in receipt totals', () => {
    const invalidReceipt = {
      id: 'rcpt_bad',
      businessId: 'biz_01',
      receiptDate: '2024-11-04',
      purchaseDate: '2024-11-04',
      supplier: { name: 'Supplier' },
      payment: { method: 'cash', status: 'paid' },
      currency: 'INR',
      subtotalMinor: 142.5, // Invalid: must be integer paise
      taxTotalMinor: 0,
      discountTotalMinor: 0,
      roundOffMinor: 0,
      grandTotalMinor: -500, // Invalid: must be non-negative
      imagePath: 'path/to/img.jpg',
    };

    assert.throws(() => ReceiptSchema.parse(invalidReceipt));
  });

  await t.test('Validates line items with bounding box coordinates', () => {
    const validItem = {
      id: 'item_01',
      receiptId: 'rcpt_101',
      businessId: 'biz_sharma_kirana',
      lineIndex: 0,
      rawName: 'Fortune Kachi Ghani Mustard Oil 1L Pouch',
      category: 'Edible Oils & Ghee',
      quantity: 15,
      unit: 'pouch',
      unitPriceMinor: 14200, // ₹142.00
      discountMinor: 0,
      taxRatePercent: 5,
      taxAmountMinor: 10650,
      lineTotalMinor: 223650, // ₹2,236.50
      confidenceScore: 0.96,
      needsReview: false,
      boundingBox: {
        ymin: 230,
        xmin: 150,
        ymax: 260,
        xmax: 850,
      },
    };

    const parsed = ReceiptLineItemSchema.parse(validItem);
    assert.equal(parsed.rawName, 'Fortune Kachi Ghani Mustard Oil 1L Pouch');
    assert.equal(parsed.needsReview, false);
    assert.equal(parsed.boundingBox?.ymin, 230);
  });

  await t.test('Rejects invalid bounding box coordinates outside 0..1000 range', () => {
    const invalidBox = {
      ymin: -10, // Invalid: below 0
      xmin: 200,
      ymax: 1050, // Invalid: above 1000
      xmax: 500,
    };

    assert.throws(() => BoundingBoxSchema.parse(invalidBox));
  });

  await t.test('Validates Indian GSTIN format in supplier snapshot', () => {
    // Valid 15-char GSTIN
    const valid = ReceiptSupplierSnapshotSchema.parse({
      name: 'Balaji Traders',
      gstin: '07AAAAA0000A1Z5',
    });
    assert.equal(valid.name, 'Balaji Traders');

    // Invalid GSTIN format
    assert.throws(() => {
      ReceiptSupplierSnapshotSchema.parse({
        name: 'Bad GSTIN Vendor',
        gstin: 'INVALID-GST-NUMBER',
      });
    });
  });
});
