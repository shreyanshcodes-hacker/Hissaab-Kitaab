# ShopLedger Production Deployment & Firebase Console Guide

This guide provides the complete, step-by-step instructions to deploy **ShopLedger** to a real Firebase and Google Cloud Run environment.

> **Important Principle:** Never assume a project ID, region, domain, or production secret. Replace all `<YOUR_...>` placeholders with your actual project-specific values.

---

## 1. Deployment Architecture Overview

```mermaid
flowchart LR
    User["Merchant Browser / Mobile"] -->|HTTPS Static SPA| Hosting["Firebase Hosting (frontend/dist)"]
    User -->|Firebase Web SDK| Auth["Firebase Authentication (Google / Email)"]
    User -->|Bearer <ID Token> + x-business-id| CloudRun["Google Cloud Run (Express API)"]
    CloudRun -->|Application Default Credentials (ADC)| Firestore["Cloud Firestore (Business & Receipt Ledger)"]
    CloudRun -->|Application Default Credentials (ADC)| Storage["Cloud Storage (Private Receipt Scans)"]
    CloudRun -->|Secret Manager API Key| Gemini["Google Gemini 2.5 Flash API"]
```

- **Frontend (`frontend/`)**: Static React + TypeScript + Vite SPA deployed to **Firebase Hosting**.
- **Backend (`backend/`)**: Stateless Node.js + Express + TypeScript container deployed to **Google Cloud Run**.
- **Identity**: **Firebase Authentication** handles Google OAuth and Email/Password sign-in directly via the Web SDK; the backend verifies ID tokens using `firebase-admin`.
- **Database & Storage**: **Cloud Firestore** and **Cloud Storage** enforce tenant isolation (`businesses/{businessId}/...`) via declarative security rules (`firestore.rules`, `storage.rules`) and server-side middleware (`requireBusinessTenant`).
- **Credentials in Production**: Cloud Run uses **Application Default Credentials (ADC)** attached to its runtime service account—no JSON private keys need to be exported or passed in environment variables. The `GEMINI_API_KEY` is injected via **Google Cloud Secret Manager**.

---

## 2. Firebase Console & GCP Manual Setup Checklist

The project owner must complete the following actions in the [Firebase Console](https://console.firebase.google.com/) and [Google Cloud Console](https://console.cloud.google.com/):

### Step 2.1: Create or Select the Firebase Project
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project (or select your existing GCP/Firebase project) and note your **`<YOUR_FIREBASE_PROJECT_ID>`**.
3. Upgrade the project to the **Blaze (Pay-as-you-go)** billing plan (required for Cloud Run, Cloud Build, Secret Manager, and modern Cloud Storage buckets).

### Step 2.2: Register the Web Application
1. In Firebase Console, go to **Project Settings (gear icon) → General → Your apps**.
2. Click the **Web (`</>`)** icon to register a web app (e.g., `ShopLedger Web`).
3. Copy the configuration values into `frontend/.env.production` (do not commit this file):
   ```ini
   VITE_FIREBASE_API_KEY=<YOUR_FIREBASE_WEB_API_KEY>
   VITE_FIREBASE_AUTH_DOMAIN=<YOUR_FIREBASE_PROJECT_ID>.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=<YOUR_FIREBASE_PROJECT_ID>
   VITE_FIREBASE_STORAGE_BUCKET=<YOUR_FIREBASE_PROJECT_ID>.firebasestorage.app
   VITE_FIREBASE_APP_ID=<YOUR_FIREBASE_WEB_APP_ID>
   ```

### Step 2.3: Enable Firebase Authentication Providers & Authorized Domains
1. Navigate to **Build → Authentication → Get started**.
2. Open the **Sign-in method** tab:
   - Enable **Email/Password** (enable Email link / password reset as desired).
   - Enable **Google**: select a project support email and save.
3. Open **Authentication → Settings → Authorized domains**:
   - Confirm `localhost`, `<YOUR_FIREBASE_PROJECT_ID>.firebaseapp.com`, and `<YOUR_FIREBASE_PROJECT_ID>.web.app` are listed.
   - If using a custom domain (e.g., `app.yourstoreledger.in`), add it here.

### Step 2.4: Provision Cloud Firestore & Cloud Storage
1. Navigate to **Build → Firestore Database → Create database**:
   - Select your target region (e.g., `asia-south1` for Mumbai or `asia-south2` for Delhi).
   - Start in **Production mode** (we will deploy `firestore.rules` next).
2. Navigate to **Build → Storage → Get started**:
   - Provision the default bucket in the same region (`<YOUR_FIREBASE_PROJECT_ID>.firebasestorage.app`).

### Step 2.5: Link Local Repository & Deploy Rules + Indexes
1. Authenticate the Firebase CLI and bind your project:
   ```bash
   npx firebase-tools login
   npx firebase-tools use --add <YOUR_FIREBASE_PROJECT_ID>
   ```
   *(This generates your local `.firebaserc`, which is git-ignored so project IDs are not hardcoded for other environments.)*
2. Deploy Firestore rules, composite indexes, and Cloud Storage rules:
   ```bash
   pnpm deploy:rules
   pnpm deploy:indexes
   ```

### Step 2.6: Enable Required Google Cloud APIs & Secret Manager
1. Authenticate `gcloud` and set your project:
   ```bash
   gcloud auth login
   gcloud config set project <YOUR_FIREBASE_PROJECT_ID>
   ```
2. Enable Cloud Run, Cloud Build, Artifact Registry, and Secret Manager APIs:
   ```bash
   gcloud services enable \
     run.googleapis.com \
     cloudbuild.googleapis.com \
     artifactregistry.googleapis.com \
     secretmanager.googleapis.com \
     firestore.googleapis.com \
     storage.googleapis.com
   ```
3. Store your Gemini API key in **Google Cloud Secret Manager**:
   ```bash
   printf "<YOUR_GEMINI_API_KEY>" | gcloud secrets create GEMINI_API_KEY --data-file=-
   ```
4. Grant the Cloud Run runtime service account access to read the secret and access Firebase services.

---

## 3. Deploying the Express Backend to Cloud Run

From the repository root, build and deploy `backend/` to Cloud Run:

```bash
gcloud run deploy shopledger-backend \
  --source ./backend \
  --region <YOUR_CLOUD_RUN_REGION> \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,FIREBASE_PROJECT_ID=<YOUR_FIREBASE_PROJECT_ID>,FIREBASE_STORAGE_BUCKET=<YOUR_FIREBASE_PROJECT_ID>.firebasestorage.app,GEMINI_MODEL=gemini-2.5-flash,CORS_ORIGIN=https://<YOUR_FIREBASE_PROJECT_ID>.web.app,https://<YOUR_FIREBASE_PROJECT_ID>.firebaseapp.com" \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

> **Why `--allow-unauthenticated` at the Cloud Run ingress layer?**
> Public HTTPS browsers must reach the Express API directly (or via Firebase Hosting rewrites) and pass `Authorization: Bearer <Firebase_ID_Token>`. Every private route in `backend/src/routes/index.ts` enforces `requireAuth` (Firebase ID token verification) and `requireBusinessTenant` (Firestore membership verification).

After deployment completes, note the deployed service URL (e.g., `https://shopledger-backend-xxxxx-el.a.run.app`) and verify its health check:
```bash
curl https://<YOUR_CLOUD_RUN_SERVICE_URL>/api/health
```

---

## 4. Configuring Frontend API URL & Deploying Firebase Hosting

You have two supported ways to connect the React frontend on Firebase Hosting to your Cloud Run backend:

### Option A: Direct Cloud Run URL
Set `VITE_API_BASE_URL` in `frontend/.env.production` to your deployed Cloud Run URL:
```ini
VITE_API_BASE_URL=https://<YOUR_CLOUD_RUN_SERVICE_URL>/api
```

### Option B: Same-Origin Firebase Hosting Rewrite (Optional — Only After Cloud Run Is Deployed)
Once `shopledger-backend` is live in Cloud Run, you may add a `/api/**` rewrite rule *above* the `**` catch-all in `firebase.json`:
```json
"rewrites": [
  {
    "source": "/api/**",
    "run": {
      "serviceId": "shopledger-backend",
      "region": "<YOUR_CLOUD_RUN_REGION>"
    }
  },
  {
    "source": "**",
    "destination": "/index.html"
  }
]
```
With this rewrite active, set `VITE_API_BASE_URL=/api` in `frontend/.env.production`.

### Build and Deploy Hosting
```bash
pnpm build:frontend
npx firebase-tools deploy --only hosting
```

---

## 5. End-to-End Post-Deployment Verification Checklist

After deploying both backend and frontend, verify the live application in your browser:
1. **Health Probe**: Visit `https://<YOUR_CLOUD_RUN_SERVICE_URL>/api/health` and confirm `200 OK` JSON response.
2. **Guest Exploration**: Visit `https://<YOUR_FIREBASE_PROJECT_ID>.web.app/explore` and verify synthetic demo data loads with conspicuous **DEMO** badges and zero writes to production Firestore.
3. **Authentication**:
   - Sign in with Google on `/login` and confirm redirect to `/dashboard`.
   - Confirm `users/{uid}` and `businesses/{businessId}` documents are initialized in Firestore.
   - Sign out from `/profile` and confirm protected routes (`/dashboard`, `/receipts`) redirect to `/login`.
4. **Receipt Intake & Gemini Vision OCR**:
   - Upload a JPG/PNG/PDF receipt (<15MB) on `/receipts/upload`.
   - Confirm the file is stored privately under `businesses/{businessId}/receipts/{receiptId}/original.*` in Cloud Storage.
   - Confirm Gemini extraction populates the Review Workspace (`/receipts/:id/review`).
5. **Review, Math Integrity & Confirmation**:
   - Edit a line item quantity or unit rate in `/receipts/:id/review` and confirm paise-accurate totals update.
   - Click **Confirm & Save to Bahi Khata** and verify the receipt transitions to `verified`, supplier totals increment, and duplicate confirmation attempts are blocked.
6. **Dashboard, Analytics & Ask ShopLedger**:
   - Verify `/dashboard` and `/analysis` reflect only `verified` receipts in financial totals.
   - Ask a procurement question in `/ask-shopledger` and verify grounded citations link to the verified receipt.
