import admin from 'firebase-admin';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { DevFirestore } from './devFirestore.js';

let firestoreInstance: any;

const storageBucket = env.FIREBASE_STORAGE_BUCKET || `${env.FIREBASE_PROJECT_ID}.firebasestorage.app`;

if (!admin.apps.length) {
  try {
    if (env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
      // Service account credentials explicitly supplied via environment
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId: env.FIREBASE_PROJECT_ID,
        storageBucket,
      });
      logger.info('Firebase Admin initialized with service account certificate credentials');
      firestoreInstance = admin.firestore();
    } else if (env.FIRESTORE_EMULATOR_HOST) {
      admin.initializeApp({
        projectId: env.FIREBASE_PROJECT_ID,
        storageBucket,
      });
      logger.info('Firebase Admin initialized with Firestore Emulator', {
        host: env.FIRESTORE_EMULATOR_HOST,
      });
      firestoreInstance = admin.firestore();
    } else {
      // Managed runtime (Cloud Run) or local ADC via GOOGLE_APPLICATION_CREDENTIALS
      try {
        admin.initializeApp({
          projectId: env.FIREBASE_PROJECT_ID,
          storageBucket,
        });
        firestoreInstance = admin.firestore();
        logger.info('Firebase Admin initialized with Application Default Credentials / Project ID', {
          projectId: env.FIREBASE_PROJECT_ID,
        });
      } catch (err: any) {
        logger.warn('Default credentials not found, initializing DevFirestore memory store:', err.message);
        firestoreInstance = new DevFirestore();
      }
    }
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK', error);
    firestoreInstance = new DevFirestore();
  }
}

// In local dev/tests without cloud credentials or emulator, use DevFirestore memory store
const hasCloudOrEmulatorConfig = Boolean(
  env.NODE_ENV === 'production' ||
  env.FIREBASE_CLIENT_EMAIL ||
  env.FIRESTORE_EMULATOR_HOST ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS
);

export const devStore = new DevFirestore();
export const firebaseAdmin = admin;
export const auth = admin.apps.length ? admin.auth() : (null as any);
export const db: any = hasCloudOrEmulatorConfig
  ? (firestoreInstance || admin.firestore())
  : devStore;
export const storage = admin.apps.length ? admin.storage() : (null as any);
