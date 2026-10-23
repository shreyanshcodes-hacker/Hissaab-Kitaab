# ShopLedger - Firebase Authentication Setup & Verification Guide

This document describes the identity provider architecture, client configuration, security rules, emulator setup, and backend token verification contract for ShopLedger.

---

## 1. Architectural Overview

ShopLedger delegates all identity management directly to **Firebase Authentication**. The application never stores raw passwords, performs custom bcrypt hashing, or manages OAuth callbacks on custom application servers.

```
+-------------------------------------------------------------+
|                      Shopkeeper Browser                      |
|                                                             |
|   [Google Sign-In Popup]   OR   [Email & Password Form]     |
|              |                              |               |
|              v                              v               |
|         +---------------------------------------+           |
|         |    Firebase Web SDK (v11+) Client     |           |
|         |      (Auth, Firestore, Storage)       |           |
|         +---------------------------------------+           |
|              |                              |               |
|              | ID Token (JWT)               | User Profile  |
|              v                              v               |
|         +-------------------+        +--------------------+ |
|         | API Client        |        | AuthContext State  | |
|         | Authorization:    |        | (Persistent via    | |
|         | Bearer <id_token> |        | onAuthStateChanged)| |
|         +-------------------+        +--------------------+ |
+-------------------|-----------------------------------------+
                    |
                    | HTTPS Request with Bearer Token
                    v
+-------------------------------------------------------------+
|               Express.js Backend (Module 5)                 |
|                                                             |
|   1. Extract 'Authorization: Bearer <token>' header         |
|   2. Verify cryptographic signature via Firebase Admin SDK  |
|      admin.auth().verifyIdToken(token)                      |
|   3. Enforce tenant isolation via decodedToken.uid          |
|   4. NEVER trust client-supplied user IDs in URL or body    |
+-------------------------------------------------------------+
```

---

## 2. Environment Variables Configuration

The frontend requires the following environment variables in `frontend/.env`:

```bash
# Firebase Client Configuration (Firebase Console -> Project Settings -> General -> Your apps -> Web app)
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="shopledger-prod.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="shopledger-prod"
VITE_FIREBASE_STORAGE_BUCKET="shopledger-prod.appspot.com"
VITE_FIREBASE_APP_ID="1:1234567890:web:abcdef123456"

# Backend API Gateway Base URL
VITE_API_BASE_URL="http://localhost:5001"

# Development & Testing Flags
# Set to 'true' to connect to the local Firebase Emulator Suite
VITE_USE_FIREBASE_EMULATORS="false"
VITE_FIREBASE_AUTH_EMULATOR_HOST="localhost:9099"
VITE_FIRESTORE_EMULATOR_HOST="localhost:8080"
VITE_STORAGE_EMULATOR_HOST="localhost:9199"
```

> [!IMPORTANT]
> **Client Secrets Security Rule:**
> Never include `FIREBASE_ADMIN_PRIVATE_KEY` or `GEMINI_API_KEY` in any `VITE_*` variable. Frontend environment variables are bundled directly into the public client application bundle. Server-side credentials belong exclusively in `backend/.env`.

---

## 3. Supported Authentication Providers

### A. Google Sign-In (Stitch Accurate)
- Uses `GoogleAuthProvider` with standard web popups via `signInWithPopup(auth, provider)`.
- Handles user cancellation gracefully (`auth/popup-closed-by-user`, `auth/cancelled-popup-request`) without surfacing raw stack traces.
- Displays the official Google branding icon and styling conforming to the Stitch authentication reference (`designs/authentication_shopledger`).

### B. Email & Password Authentication
- **Registration**: Calls `createUserWithEmailAndPassword(auth, email, password)`. Generates an initial merchant profile in Firestore under `/merchants/{uid}` with business name, business type (Kirana, Retail, Wholesale, etc.), and role (`shopkeeper`).
- **Login**: Calls `signInWithEmailAndPassword(auth, email, password)` with user-friendly error translations (invalid credentials, disabled accounts, network errors).
- **Password Reset**: Modal dialog triggers `sendPasswordResetEmail(auth, email)` to provide self-service recovery without custom SMTP servers.
- **Email Verification**: Dispatches `sendEmailVerification(user)` after new signups where enabled.

### C. Guest Demo Experience
- For exploration before sign-up, the user can enter `/explore` with synthetic mock data.
- Private routes (e.g., `/receipts/new`, `/receipts/:id/review`, `/settings`, `/profile`) are protected via `ProtectedRoute.tsx`.
- Attempting to access private actions in guest mode prompts a conversion gate modal preserving the intended destination (`state: { from: location }`), seamlessly resuming the user's flow upon login.

---

## 4. Local Development with Firebase Emulator Suite

To develop and test authentication locally without incurring cloud calls or needing live Firebase keys:

### 1. Install Firebase CLI (if not already installed)
```bash
npm install -g firebase-tools
```

### 2. Initialize Emulators (in project root)
```bash
firebase init emulators
# Select Authentication, Firestore, and Storage
```

### 3. Start Emulators
```bash
firebase emulators:start
```
The emulator UI will be available at `http://localhost:4000`.

### 4. Enable Frontend Emulator Connection
Set the following in `frontend/.env`:
```bash
VITE_USE_FIREBASE_EMULATORS=true
VITE_FIREBASE_AUTH_EMULATOR_HOST="localhost:9099"
```
The `frontend/src/config/firebase.ts` module will automatically detect this flag and attach `connectAuthEmulator(auth, 'http://localhost:9099')`.

---

## 5. Backend Authorization Verification (Module 5 Contract)

All protected frontend API calls made through `frontend/src/api/client.ts` automatically fetch the latest ID token and inject the HTTP header:

```http
GET /api/v1/receipts HTTP/1.1
Host: api.shopledger.in
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI...
Content-Type: application/json
```

The Express backend middleware verifies the token using the Firebase Admin SDK:
```typescript
import * as admin from 'firebase-admin';
import type { Request, Response, NextFunction } from 'express';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    (req as any).user = decodedToken;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired Firebase ID token' });
  }
}
```
