# ShopLedger (Bahi-Khata Digital)

**ShopLedger** is a production-grade receipt ingestion, verification workspace, spending analytics, and grounded conversational bookkeeping platform built for Indian retail merchants, Kirana stores, and Mandi wholesalers.

---

Platform URL:- https://my-ledgeriq.web.app/

---

## 1. Architecture & Repository Structure

ShopLedger is organized as a `pnpm` monorepo with strict separation between the static React SPA and the privileged Express + TypeScript backend API:

```text
shopledger-v1/
├── frontend/                  # React 19 + TypeScript + Vite + Tailwind CSS SPA (Firebase Hosting target)
│   ├── src/api/               # Authenticated HTTP client (Bearer <Firebase_ID_Token> + x-business-id)
│   ├── src/components/        # Stitch-accurate design system & reusable accessible primitives
│   ├── src/config/firebase.ts # Centralized Firebase Web SDK initialization (Auth, Firestore, Storage)
│   ├── src/context/           # AuthContext, ThemeContext, ToastContext
│   ├── src/pages/             # Public & authenticated routes matching Stitch references
│   └── .env.example           # Public client configuration template (placeholders only)
├── backend/                   # Node.js + Express + TypeScript API (Google Cloud Run target)
│   ├── src/config/            # Zod-validated env, Firebase Admin SDK (ADC-first), DevFirestore fallback
│   ├── src/controllers/       # Thin HTTP controllers
│   ├── src/middleware/        # Firebase JWT verification, tenant authorization, rate limits, Multer upload
│   ├── src/routes/            # Modular Express routers (/api/health, /me, /receipts, /suppliers, /items, /analytics, /chat)
│   ├── src/schemas/           # Runtime Zod request/response schemas
│   ├── src/services/          # Business logic, Gemini Vision OCR, deterministic paise math, grounded chat
│   ├── tests/                 # Supertest API, security, analytics, and chat integration test suites
│   ├── Dockerfile             # Multi-stage Node 22 Alpine production container for Cloud Run
│   └── .env.example           # Backend configuration template (placeholders only)
├── tests/                     # Root unit tests for integer paise arithmetic, schemas, and security rules
├── docs/                      # Architecture, data model, auth setup, design inventory, and deployment guides
├── firebase.json              # Firebase Hosting, Firestore, Storage, and Emulator Suite configuration
├── .firebaserc.example        # Project alias template (<YOUR_FIREBASE_PROJECT_ID>)
├── firestore.rules            # Tenant-scoped Firestore Security Rules (default deny-all)
├── firestore.indexes.json     # Composite indexes for receipt filtering, sorting, and catalog lookups
└── storage.rules              # Private business-scoped Cloud Storage Rules (15MB max, MIME allowlist)
```

---

## 2. Environment Variables Reference

### Frontend (`frontend/.env` / `frontend/.env.production`)
Copy [`frontend/.env.example`](file:///d:/Shreyanshcodes/shopledger-v1/frontend/.env.example) to `frontend/.env`. Never place backend secrets or Gemini API keys in `VITE_*` variables.

| Variable | Required | Description |
| :--- | :---: | :--- |
| `VITE_FIREBASE_API_KEY` | Yes | Firebase Web App API Key from Firebase Console |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | `<YOUR_FIREBASE_PROJECT_ID>.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Your Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | `<YOUR_FIREBASE_PROJECT_ID>.firebasestorage.app` |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase Web App ID |
| `VITE_API_BASE_URL` | Yes | Express API URL (`http://localhost:5001/api` locally, or `https://<CLOUD_RUN_URL>/api` in production) |
| `VITE_USE_FIREBASE_EMULATORS` | No | Set to `true` only when connecting to local Firebase Emulators |

### Backend (`backend/.env` / Cloud Run Environment)
Copy [`backend/.env.example`](file:///d:/Shreyanshcodes/shopledger-v1/backend/.env.example) to `backend/.env` for local development.

| Variable | Required | Description |
| :--- | :---: | :--- |
| `NODE_ENV` | Yes | `development`, `test`, or `production` |
| `PORT` | Yes | HTTP port (`5001` locally, `8080` on Cloud Run) |
| `FIREBASE_PROJECT_ID` | Yes | Target Firebase Project ID |
| `FIREBASE_STORAGE_BUCKET` | No | Defaults to `<FIREBASE_PROJECT_ID>.firebasestorage.app` |
| `CORS_ORIGIN` | Yes | Comma-separated allowed frontend origins |
| `GEMINI_API_KEY` | Yes (Prod) | Server-side Gemini API key (store in Secret Manager in production) |
| `GEMINI_MODEL` | No | Defaults to `gemini-2.5-flash` |

> **Production Credentials Best Practice:** On Google Cloud Run, leave `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` unset. `firebase-admin` automatically authenticates using **Application Default Credentials (ADC)** attached to the Cloud Run service account. For local development against a real project, run `gcloud auth application-default login` or set `GOOGLE_APPLICATION_CREDENTIALS` to a key file stored outside the repository.

---

## 3. Local Development & Testing

### Install Dependencies
```bash
pnpm install
```

### Run Automated Test Suites & Linting
```bash
# Run all 59 root + backend unit, schema, security rules, and integration tests
pnpm test:all

# Run frontend linter (oxlint)
pnpm lint:frontend

# Build both frontend (Vite) and backend (tsc) for production
pnpm build
```

### Start Local Development Servers
```bash
# Terminal 1: Start Express API (http://localhost:5001)
pnpm --filter backend run dev

# Terminal 2: Start Vite Frontend (http://localhost:5173)
pnpm --filter frontend run dev
```

---

## 4. Production Deployment Summary

See the complete step-by-step instructions in [`docs/deployment-guide.md`](file:///d:/Shreyanshcodes/shopledger-v1/docs/deployment-guide.md):

1. **Link Firebase Project**:
   ```bash
   npx firebase-tools login
   npx firebase-tools use --add <YOUR_FIREBASE_PROJECT_ID>
   ```
2. **Deploy Security Rules & Composite Indexes**:
   ```bash
   pnpm deploy:rules
   pnpm deploy:indexes
   ```
3. **Deploy Backend to Google Cloud Run**:
   ```bash
   gcloud run deploy shopledger-backend \
     --source ./backend \
     --region <YOUR_CLOUD_RUN_REGION> \
     --platform managed \
     --allow-unauthenticated \
     --set-env-vars="NODE_ENV=production,FIREBASE_PROJECT_ID=<YOUR_FIREBASE_PROJECT_ID>,FIREBASE_STORAGE_BUCKET=<YOUR_FIREBASE_PROJECT_ID>.firebasestorage.app,GEMINI_MODEL=gemini-2.5-flash,CORS_ORIGIN=https://<YOUR_FIREBASE_PROJECT_ID>.web.app,https://<YOUR_FIREBASE_PROJECT_ID>.firebaseapp.com" \
     --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
   ```
4. **Build & Deploy Frontend to Firebase Hosting**:
   Update `frontend/.env.production` with your Firebase Web SDK config and `VITE_API_BASE_URL`, then run:
   ```bash
   pnpm deploy:hosting
   ```

---

## 5. Security & Financial Integrity Guarantees

- **Zero Client-Side Secret Exposure**: Gemini keys and Admin credentials never enter `frontend/`.
- **Strict Tenant Isolation**: Every private API route verifies both the Firebase ID token (`requireAuth`) and business membership (`requireBusinessTenant`). Firestore and Storage rules enforce matching membership predicates (`isBusinessMember`).
- **Paise-Precise Integer Arithmetic**: All monetary values (`subtotalMinor`, `taxTotalMinor`, `discountTotalMinor`, `grandTotalMinor`, `unitPriceMinor`, `lineTotalMinor`) are stored and summed as integers in paise (`1 INR = 100 paise`) and recalculated server-side.
- **Confirmed-Only Financial Metrics**: Dashboard and Analytics totals aggregate strictly `verified`/`reconciled` receipts; drafts and `needs_review` bills are tracked separately and never inflate financial spend.
- **Immutable Receipt Snapshots**: Confirming a receipt runs an atomic Firestore transaction (all reads before writes) that locks line-item snapshots and prevents duplicate confirmation or post-verification tampering.
