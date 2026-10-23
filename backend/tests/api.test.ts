import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../dist/app.js';
import { calculateLineTotalMinor } from '../dist/utils/money.js';

const app = createApp();
const AUTH_OWNER = 'Bearer guest-demo-token';
const AUTH_STRANGER = 'Bearer demo_stranger_token';
const BIZ_ID = 'biz_sharma_kirana';

test('ShopLedger Backend API, End-to-End Workflows & Security Verification', async (t) => {
  // ---------------------------------------------------------------------------
  // 1. Health & Infrastructure Probes
  // ---------------------------------------------------------------------------
  await t.test('GET /api/health returns 200 with service metadata', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'shopledger-backend');
    assert.ok(typeof res.body.uptimeSeconds === 'number');
  });

  await t.test('404 catch-all returns clean JSON without exposing stack traces', async () => {
    const res = await request(app).get('/api/non-existent-endpoint');
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'NOT_FOUND');
    assert.equal(res.body.status, 404);
    assert.equal(res.body.stack, undefined);
  });

  // ---------------------------------------------------------------------------
  // 2. Authentication Enforcement
  // ---------------------------------------------------------------------------
  await t.test('GET /api/me without Authorization header returns 401 Unauthorized', async () => {
    const res = await request(app).get('/api/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'UNAUTHORIZED');
    assert.match(res.body.message, /Missing or malformed Authorization header/);
  });

  await t.test('GET /api/receipts without Authorization header returns 401 Unauthorized', async () => {
    const res = await request(app).get('/api/receipts');
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });

  await t.test('Malformed Authorization header (no Bearer scheme) returns 401 Unauthorized', async () => {
    const res = await request(app)
      .get('/api/receipts')
      .set('Authorization', 'Basic dXNlcjpwYXNz');
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });

  await t.test('Forged or invalid Bearer token returns 401 Unauthorized', async () => {
    const res = await request(app)
      .get('/api/receipts')
      .set('Authorization', 'Bearer forged-jwt-token-xyz-invalid')
      .set('x-business-id', BIZ_ID);
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'UNAUTHORIZED');
  });

  // ---------------------------------------------------------------------------
  // 3. Cross-Business Access Prevention (Tenant Isolation)
  // ---------------------------------------------------------------------------
  await t.test('Cross-business access by non-member user returns 403 Forbidden across all resources', async () => {
    const receiptsRes = await request(app)
      .get('/api/receipts')
      .set('Authorization', AUTH_STRANGER)
      .set('x-business-id', BIZ_ID);
    assert.equal(receiptsRes.status, 403);
    assert.equal(receiptsRes.body.code, 'FORBIDDEN');

    const analyticsRes = await request(app)
      .get('/api/analytics/summary')
      .set('Authorization', AUTH_STRANGER)
      .set('x-business-id', BIZ_ID);
    assert.equal(analyticsRes.status, 403);

    const chatRes = await request(app)
      .post('/api/chat')
      .set('Authorization', AUTH_STRANGER)
      .set('x-business-id', BIZ_ID)
      .send({ message: 'How much did I spend with Gupta Wholesale Mart?' });
    assert.equal(chatRes.status, 403);
  });

  await t.test('Accessing non-existent business ID returns 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/receipts')
      .set('Authorization', AUTH_OWNER)
      .set('x-business-id', 'biz_non_existent_999');
    assert.equal(res.status, 403);
  });

  // ---------------------------------------------------------------------------
  // 4. Security Headers & Rate Limiting
  // ---------------------------------------------------------------------------
  await t.test('Applies Helmet security headers (X-Content-Type-Options, etc.)', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-frame-options'], 'SAMEORIGIN');
  });

  await t.test('Applies rate limit headers to /api endpoints', async () => {
    const res = await request(app).get('/api/health');
    assert.ok(res.headers['ratelimit-limit'] !== undefined);
    assert.ok(res.headers['ratelimit-remaining'] !== undefined);
  });

  // ---------------------------------------------------------------------------
  // 5. Server-Side Financial Recalculation & Arithmetic Integrity
  // ---------------------------------------------------------------------------
  await t.test('Server-side calculation guarantees tamper-proof totals', () => {
    const calc = calculateLineTotalMinor({
      quantity: 10,
      unitPriceMinor: 14000,
      discountMinor: 1000,
      taxRatePercent: 5,
    });

    assert.equal(calc.baseMinor, 140000);
    assert.equal(calc.discountMinor, 1000);
    assert.equal(calc.taxMinor, 6950);
    assert.equal(calc.lineTotalMinor, 145950);
  });

  // ---------------------------------------------------------------------------
  // 6. Ingestion Pipeline, Upload Validation, Review, Confirmation & Duplicate Protection
  // ---------------------------------------------------------------------------
  await t.test('POST /api/receipts/upload without auth returns 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/receipts/upload')
      .attach('file', Buffer.from('fake image content'), 'receipt.jpg');
    assert.equal(res.status, 401);
  });

  await t.test('POST /api/receipts/upload rejects unsupported executable file types with 400', async () => {
    const res = await request(app)
      .post('/api/receipts/upload')
      .set('Authorization', AUTH_OWNER)
      .set('x-business-id', BIZ_ID)
      .attach('file', Buffer.from('MZ-fake-exe'), {
        filename: 'malware.exe',
        contentType: 'application/x-msdownload',
      });
    assert.equal(res.status, 400);
  });

  await t.test('End-to-end manual receipt creation, review edit, confirmation, and duplicate submission prevention', async () => {
    // 1. Create draft receipt
    const createRes = await request(app)
      .post('/api/receipts')
      .set('Authorization', AUTH_OWNER)
      .set('x-business-id', BIZ_ID)
      .send({
        invoiceNumber: 'TEST-INV-901',
        receiptDate: '2026-10-20',
        purchaseDate: '2026-10-20',
        supplier: {
          id: 'sup-gupta-wholesale',
          name: 'Gupta Wholesale Mart',
          gstin: '07AACPG4819M1Z3',
        },
        payment: {
          method: 'upi',
          status: 'paid',
        },
        imagePath: 'businesses/biz_sharma_kirana/receipts/test-901/original.jpg',
        items: [
          {
            rawName: 'Tata Salt Vacuum Evaporated 1kg',
            category: 'Spices & Salt',
            quantity: 10,
            unit: 'packet',
            unitPriceMinor: 2400,
            discountMinor: 0,
            taxRatePercent: 0,
          },
        ],
      });

    assert.equal(createRes.status, 201);
    const createdId = createRes.body.data.receipt.id;
    assert.ok(createdId);
    assert.equal(createRes.body.data.receipt.grandTotalMinor, 24000);
    assert.equal(createRes.body.data.receipt.reviewStatus, 'draft');

    // 2. Edit receipt in review workspace (update quantity to 20 packets)
    const patchRes = await request(app)
      .patch(`/api/receipts/${createdId}`)
      .set('Authorization', AUTH_OWNER)
      .set('x-business-id', BIZ_ID)
      .send({
        notes: 'Verified quantity against delivery slip',
        items: [
          {
            rawName: 'Tata Salt Vacuum Evaporated 1kg',
            category: 'Spices & Salt',
            quantity: 20,
            unit: 'packet',
            unitPriceMinor: 2400,
            discountMinor: 0,
            taxRatePercent: 0,
          },
        ],
      });
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.data.receipt.grandTotalMinor, 48000);

    // 3. Confirm receipt
    const confirmRes = await request(app)
      .post(`/api/receipts/${createdId}/confirm`)
      .set('Authorization', AUTH_OWNER)
      .set('x-business-id', BIZ_ID)
      .send({ notes: 'Confirmed by Ramesh' });
    assert.equal(confirmRes.status, 200);
    assert.equal(confirmRes.body.data.receipt.reviewStatus, 'verified');

    // 4. Duplicate confirmation submission is rejected with 400 Bad Request
    const duplicateConfirmRes = await request(app)
      .post(`/api/receipts/${createdId}/confirm`)
      .set('Authorization', AUTH_OWNER)
      .set('x-business-id', BIZ_ID)
      .send({});
    assert.equal(duplicateConfirmRes.status, 400);
    assert.match(duplicateConfirmRes.body.message, /already been verified/);

    // 5. Editing or retrying an already confirmed receipt is rejected with 400 Bad Request
    const editVerifiedRes = await request(app)
      .patch(`/api/receipts/${createdId}`)
      .set('Authorization', AUTH_OWNER)
      .set('x-business-id', BIZ_ID)
      .send({ notes: 'Attempt tamper after confirmation' });
    assert.equal(editVerifiedRes.status, 400);

    const retryVerifiedRes = await request(app)
      .post(`/api/receipts/${createdId}/retry`)
      .set('Authorization', AUTH_OWNER)
      .set('x-business-id', BIZ_ID);
    assert.equal(retryVerifiedRes.status, 400);
  });
});
