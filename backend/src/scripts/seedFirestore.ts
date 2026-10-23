import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import admin from 'firebase-admin';
import { DevFirestore } from '../config/devFirestore.js';

/**
 * Converts a plain JS value into Cloud Firestore REST API Value format.
 * Preserves integer types (`integerValue`) for minor-unit paise fields so Firestore Rules pass.
 */
function toFirestoreValue(val: any): Record<string, any> {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((item) => toFirestoreValue(item)),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function resolveProjectId(): string {
  const argIdx = process.argv.indexOf('--project');
  if (argIdx !== -1 && process.argv[argIdx + 1]) {
    return process.argv[argIdx + 1];
  }

  const rcCandidates = [
    path.resolve(process.cwd(), '.firebaserc'),
    path.resolve(process.cwd(), '..', '.firebaserc'),
  ];
  for (const rcPath of rcCandidates) {
    if (fs.existsSync(rcPath)) {
      try {
        const rc = JSON.parse(fs.readFileSync(rcPath, 'utf-8'));
        const defaultProj = rc?.projects?.default;
        if (defaultProj && !defaultProj.includes('<YOUR_')) {
          return defaultProj;
        }
      } catch {
        // Ignore parse error
      }
    }
  }

  if (process.env.FIREBASE_PROJECT_ID && !process.env.FIREBASE_PROJECT_ID.includes('<YOUR_')) {
    return process.env.FIREBASE_PROJECT_ID;
  }

  throw new Error(
    'No Firebase Project ID found. Run `firebase use --add <YOUR_PROJECT_ID>` or pass `--project <YOUR_PROJECT_ID>`.'
  );
}

function getFirebaseCliAccessToken(): string | null {
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  if (!fs.existsSync(configPath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const token = raw?.tokens?.access_token;
    const expiresAt = Number(raw?.tokens?.expires_at || 0);
    if (token && (!expiresAt || expiresAt > Date.now() + 30_000)) {
      return token;
    }
    return token || null;
  } catch {
    return null;
  }
}

async function ensureFirestoreProvisioned(projectId: string, accessToken: string) {
  console.log(`🔧 Verifying Cloud Firestore API & database provisioning for ${projectId}...`);

  // 1. Enable firestore.googleapis.com & firebaserules.googleapis.com via Service Usage API
  for (const serviceName of ['firestore.googleapis.com', 'firebaserules.googleapis.com']) {
    const enableUrl = `https://serviceusage.googleapis.com/v1/projects/${projectId}/services/${serviceName}:enable`;
    const enableRes = await fetch(enableUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (enableRes.ok) {
      console.log(`   ✔ Enabled ${serviceName}`);
    }
  }

  // Wait briefly for API propagation if newly enabled
  const dbUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)`;
  for (let attempt = 1; attempt <= 6; attempt++) {
    const checkRes = await fetch(dbUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (checkRes.ok) {
      console.log(`   ✔ Cloud Firestore (default) database is active.`);
      return;
    }

    if (checkRes.status === 404) {
      console.log(`   • Creating (default) Firestore Native database in asia-south1 (Mumbai)...`);
      const createRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases?databaseId=(default)`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            locationId: 'asia-south1',
            type: 'FIRESTORE_NATIVE',
          }),
        }
      );
      if (createRes.ok) {
        console.log(`   • Waiting for database creation to finalize...`);
        await new Promise((r) => setTimeout(r, 8000));
        return;
      } else {
        const errBody = await createRes.text();
        console.warn(`   ! Database creation status (${createRes.status}): ${errBody}`);
      }
    } else if (checkRes.status === 403) {
      console.log(`   • Waiting for Cloud Firestore API activation to propagate (attempt ${attempt}/6)...`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

async function seedViaFirestoreRestApi(
  projectId: string,
  accessToken: string,
  writes: Array<{ docPath: string; data: Record<string, any> }>
) {
  await ensureFirestoreProvisioned(projectId, accessToken);
  const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;
  const firestoreWrites = writes.map(({ docPath, data }) => {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return {
      update: {
        name: `projects/${projectId}/databases/(default)/documents/${docPath}`,
        fields,
      },
    };
  });

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ writes: firestoreWrites }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore REST commit failed (HTTP ${res.status}): ${errText}`);
  }
}

async function main() {
  const projectId = resolveProjectId();
  console.log(`\n🚀 Seeding ShopLedger database into Cloud Firestore project: ${projectId} ...`);

  const devStore = new DevFirestore();
  const collections = devStore.getAllCollections();

  const allDocuments: Array<{ docPath: string; data: Record<string, any> }> = [];
  for (const [colPath, docMap] of collections.entries()) {
    for (const [docId, record] of docMap.entries()) {
      allDocuments.push({
        docPath: `${colPath}/${docId}`,
        data: record.data,
      });
    }
  }

  console.log(`📦 Prepared ${allDocuments.length} documents across ${collections.size} collections:`);
  for (const [colPath, docMap] of collections.entries()) {
    console.log(`   • ${colPath} (${docMap.size} docs)`);
  }

  const hasAdminCreds = Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) ||
      process.env.FIRESTORE_EMULATOR_HOST
  );

  if (hasAdminCreds) {
    if (!admin.apps.length) {
      if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
          projectId,
        });
      } else {
        admin.initializeApp({ projectId });
      }
    }
    const firestore = admin.firestore();
    const batch = firestore.batch();
    for (const { docPath, data } of allDocuments) {
      batch.set(firestore.doc(docPath), data, { merge: true });
    }
    await batch.commit();
    console.log(`\n✅ Successfully seeded ${allDocuments.length} documents into Firestore (${projectId}) via Firebase Admin SDK!`);
    return;
  }

  const cliToken = getFirebaseCliAccessToken();
  if (cliToken) {
    await seedViaFirestoreRestApi(projectId, cliToken, allDocuments);
    console.log(`\n✅ Successfully seeded ${allDocuments.length} documents into Cloud Firestore (${projectId}) via Firebase CLI credentials!`);
    return;
  }

  throw new Error(
    'Not authenticated to Firebase. Please run `firebase login` first (or set GOOGLE_APPLICATION_CREDENTIALS), then re-run `pnpm deploy:seed-db`.'
  );
}

main().catch((err) => {
  console.error(`\n❌ Database seed failed: ${err.message}`);
  process.exit(1);
});
