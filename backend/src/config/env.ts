import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { z } from 'zod';

// Load .env variables from either backend/.env (when started from monorepo root) or ./.env
const backendEnvPath = path.resolve(process.cwd(), 'backend', '.env');
const localEnvPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: fs.existsSync(backendEnvPath) ? backendEnvPath : localEnvPath });

const envSchema = z.object({
  PORT: z.string().default('5001').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:4173'),
  FIREBASE_PROJECT_ID: z.string().default('shopledger-v1'),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  FIREBASE_STORAGE_EMULATOR_HOST: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid backend environment configuration:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

export const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
