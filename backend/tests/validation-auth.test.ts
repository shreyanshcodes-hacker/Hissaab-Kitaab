import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PaginationQuerySchema,
  ReceiptsFilterQuerySchema,
  CreateReceiptSchema,
  UpdateReceiptSchema,
  ChatRequestSchema,
} from '../dist/schemas/api.schemas.js';

test('Backend Input Validation & Authorization Schemas', async (t) => {
  await t.test('Pagination schema coerces string query parameters to positive integers', () => {
    const parsed = PaginationQuerySchema.parse({
      page: '3',
      limit: '50',
    });
    assert.equal(parsed.page, 3);
    assert.equal(parsed.limit, 50);
    assert.equal(parsed.sortOrder, 'desc');
  });

  await t.test('Pagination schema rejects negative or zero page/limit', () => {
    assert.throws(() => PaginationQuerySchema.parse({ page: 0 }));
    assert.throws(() => PaginationQuerySchema.parse({ limit: -10 }));
    assert.throws(() => PaginationQuerySchema.parse({ limit: 150 })); // Exceeds max 100
  });

  await t.test('Receipts filter schema validates status enums and date patterns', () => {
    const valid = ReceiptsFilterQuerySchema.parse({
      status: 'needs_review',
      startDate: '2024-11-01',
      endDate: '2024-11-30',
    });
    assert.equal(valid.status, 'needs_review');

    // Invalid status enum
    assert.throws(() =>
      ReceiptsFilterQuerySchema.parse({
        status: 'invalid_status_enum',
      })
    );

    // Invalid date pattern
    assert.throws(() =>
      ReceiptsFilterQuerySchema.parse({
        startDate: '01-11-2024', // Expected YYYY-MM-DD
      })
    );
  });

  await t.test('CreateReceiptSchema enforces non-negative integer minor prices', () => {
    const invalidReceipt = {
      receiptDate: '2024-11-04',
      purchaseDate: '2024-11-04',
      supplier: { name: 'Supplier' },
      imagePath: 'path/to/img.jpg',
      items: [
        {
          rawName: 'Rice 25kg',
          quantity: 2,
          unitPriceMinor: -1500, // Invalid: negative price
        },
      ],
    };

    assert.throws(() => CreateReceiptSchema.parse(invalidReceipt));
  });

  await t.test('UpdateReceiptSchema allows partial updates without overwriting existing fields', () => {
    const partial = UpdateReceiptSchema.parse({
      notes: 'Verified against physically stamped cash memo',
    });
    assert.equal(partial.notes, 'Verified against physically stamped cash memo');
    assert.equal(partial.items, undefined);
  });

  await t.test('ChatRequestSchema rejects empty messages and messages exceeding 1000 chars', () => {
    assert.throws(() => ChatRequestSchema.parse({ message: '' }));
    assert.throws(() => ChatRequestSchema.parse({ message: 'a'.repeat(1005) }));

    const valid = ChatRequestSchema.parse({
      message: 'Who supplied Fortune oil cheapest this month?',
    });
    assert.equal(valid.message, 'Who supplied Fortune oil cheapest this month?');
  });
});
