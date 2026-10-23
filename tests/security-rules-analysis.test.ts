import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Security Rules, Indexes, and Deployment Configuration Audits', async (t) => {
  const firestoreRules = fs.readFileSync(path.resolve('firestore.rules'), 'utf-8');
  const storageRules = fs.readFileSync(path.resolve('storage.rules'), 'utf-8');
  const firebaseJson = JSON.parse(fs.readFileSync(path.resolve('firebase.json'), 'utf-8'));
  const firestoreIndexes = JSON.parse(fs.readFileSync(path.resolve('firestore.indexes.json'), 'utf-8'));
  const frontendEnvExample = fs.readFileSync(path.resolve('frontend/.env.example'), 'utf-8');
  const backendEnvExample = fs.readFileSync(path.resolve('backend/.env.example'), 'utf-8');

  await t.test('Firestore Rules enforces default deny-all', () => {
    assert.match(firestoreRules, /match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/);
  });

  await t.test('Firestore Rules contains no dangerous broad allow-all patterns', () => {
    assert.doesNotMatch(firestoreRules, /allow\s+read,\s*write:\s*if\s+true;/);
    assert.doesNotMatch(firestoreRules, /allow\s+write:\s*if\s+true;/);
    assert.doesNotMatch(firestoreRules, /allow\s+read:\s*if\s+request\.auth\s*!=\s*null\s*;\s*allow\s+write/);
  });

  await t.test('Firestore Rules enforces business membership isolation for receipts, items, suppliers, and categories', () => {
    assert.match(firestoreRules, /match\s+\/receipts\/\{receiptId\}\s*\{\s*allow\s+read:\s*if\s+isBusinessMember\(businessId\);/);
    assert.match(firestoreRules, /match\s+\/items\/\{itemId\}\s*\{\s*allow\s+read:\s*if\s+isBusinessMember\(businessId\);/);
    assert.match(firestoreRules, /match\s+\/suppliers\/\{supplierId\}\s*\{\s*allow\s+read:\s*if\s+isBusinessMember\(businessId\);/);
    assert.match(firestoreRules, /match\s+\/categories\/\{categoryId\}\s*\{\s*allow\s+read:\s*if\s+isBusinessMember\(businessId\);/);
  });

  await t.test('Firestore Rules enforces integer types and non-negative constraints on minor money totals', () => {
    assert.match(firestoreRules, /request\.resource\.data\.subtotalMinor\s+is\s+int/);
    assert.match(firestoreRules, /request\.resource\.data\.grandTotalMinor\s+is\s+int/);
    assert.match(firestoreRules, /request\.resource\.data\.subtotalMinor\s*>=\s*0/);
    assert.match(firestoreRules, /request\.resource\.data\.grandTotalMinor\s*>=\s*0/);
  });

  await t.test('Storage Rules enforces default deny-all', () => {
    assert.match(storageRules, /match\s+\/\{allPaths=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/);
  });

  await t.test('Storage Rules restricts file uploads to 15MB and supported MIME types', () => {
    assert.match(storageRules, /request\.resource\.size\s*<=\s*15\s*\*\s*1024\s*\*\s*1024/);
    assert.match(storageRules, /image\/\(jpeg\|png\|webp\|heic\)\|application\/pdf/);
  });

  await t.test('Storage Rules verifies membership before allowing image access', () => {
    assert.match(storageRules, /firestore\.get\(\/databases\/\(default\)\/documents\/businesses\/\$\(businessId\)\)/);
  });

  await t.test('firebase.json configures Hosting public output, security headers, and rules paths', () => {
    assert.equal(firebaseJson.hosting.public, 'frontend/dist');
    assert.equal(firebaseJson.firestore.rules, 'firestore.rules');
    assert.equal(firebaseJson.firestore.indexes, 'firestore.indexes.json');
    assert.equal(firebaseJson.storage.rules, 'storage.rules');
    assert.ok(Array.isArray(firebaseJson.hosting.headers));
    assert.ok(Array.isArray(firebaseJson.hosting.rewrites));
  });

  await t.test('firestore.indexes.json defines composite indexes for receipt filters, items, and suppliers', () => {
    assert.ok(Array.isArray(firestoreIndexes.indexes));
    assert.ok(firestoreIndexes.indexes.length >= 10);
    const groups = new Set(firestoreIndexes.indexes.map((i: any) => i.collectionGroup));
    assert.ok(groups.has('receipts'));
    assert.ok(groups.has('items'));
    assert.ok(groups.has('suppliers'));
  });

  await t.test('Environment example files contain only placeholders and zero real secrets', () => {
    assert.match(frontendEnvExample, /VITE_FIREBASE_API_KEY=<YOUR_FIREBASE_WEB_API_KEY>/);
    assert.doesNotMatch(frontendEnvExample, /^VITE_.*GEMINI/m);
    assert.doesNotMatch(frontendEnvExample, /^VITE_.*PRIVATE_KEY/m);
    assert.match(backendEnvExample, /GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>/);
    assert.match(backendEnvExample, /FIREBASE_PROJECT_ID=<YOUR_FIREBASE_PROJECT_ID>/);
  });
});
