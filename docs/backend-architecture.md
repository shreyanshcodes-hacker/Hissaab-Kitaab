# ShopLedger Backend Architecture & API Contract Specification

This document details the production backend architecture for **ShopLedger**, implemented with Node.js, Express, and TypeScript, optimized for deployment to **Google Cloud Run** and integration with the Firebase Admin SDK and Google Gemini API.

---

## 1. Architectural Strategy & Deployment Model

```
                                  +---------------------------------------+
                                  |            Cloudflare / CDN           |
                                  +-------------------+-------------------+
                                                      |
                                    HTTPS Traffic     |
                                                      v
                                  +---------------------------------------+
                                  |        Google Cloud Run Service       |
                                  |    Containerized Express.js Service   |
                                  |       (Non-root user, port 8080)      |
                                  +-------------------+-------------------+
                                                      |
                  +-----------------------------------+-----------------------------------+
                  |                                   |                                   |
                  v                                   v                                   v
    +---------------------------+       +---------------------------+       +---------------------------+
    |    Firebase Auth Admin    |       |      Cloud Firestore      |       |      Cloud Storage        |
    |  JWT Verification via ADC |       | Multi-Tenant /businesses/ |       | Scoped Receipt Images     |
    +---------------------------+       +---------------------------+       +---------------------------+
                  |
                  v
    +---------------------------+
    |   Google Gemini 2.5 API   |
    |  Multimodal Receipt OCR   |
    |  & Grounded Financial AI  |
    +---------------------------+
```

### 1.1 Deployment Target: Google Cloud Run
- **Stateless Managed Container Runtime:** The backend is packaged into a minimal multi-stage Docker container (`backend/Dockerfile`) running on Node.js 22 Alpine under a non-privileged `node` user.
- **Port Binding:** Automatically binds to the `$PORT` environment variable provided by Cloud Run (defaulting to `8080` in production, `5001` in local development).
- **Probes:** `GET /api/health` serves as the container startup and liveness probe.
- **Zero Secrets in Frontend:** The Gemini API key and Firebase Admin credentials are used strictly on the server and are never exposed in the client bundle.

---

## 2. Security Architecture & Authorization Enforcement

### 2.1 Identity Verification (`requireAuth`)
- Every private endpoint requires an `Authorization: Bearer <FirebaseIdToken>` header.
- The token signature, expiry, and revocation state are cryptographically verified using `admin.auth().verifyIdToken()`.
- Identity is derived **only** from the verified token (`req.user = decodedToken`). Client-supplied user IDs in URLs or request payloads are ignored.

### 2.2 Tenant Membership & Ownership Isolation (`requireBusinessTenant`)
- The backend Admin SDK bypasses Firestore Security Rules, meaning **the application layer must enforce multi-tenant isolation**.
- The `requireBusinessTenant` middleware inspects the `x-business-id` header or the authenticated user's active business record.
- It queries `businesses/{businessId}` and confirms that `req.user.uid` exists within `memberUids` or the `members` role map.
- If the user is not an authorized member, the request is immediately rejected with HTTP `403 FORBIDDEN`.

### 2.3 Server-Side Totals & Arithmetic Authority
- **No Client Tampering:** Clients cannot send fabricated `subtotalMinor` or `grandTotalMinor` values.
- When receipt line items are created or updated, the server recalculates:
  $$\text{baseMinor} = \text{quantity} \times \text{unitPriceMinor}$$
  $$\text{taxMinor} = \text{round}\left(\frac{(\text{baseMinor} - \text{discountMinor}) \times \text{taxRatePercent}}{100}\right)$$
  $$\text{grandTotalMinor} = \sum \text{taxableMinor} + \sum \text{taxMinor}$$
- All calculations are performed in integer paise ($1\text{ Rupee} = 100\text{ Paise}$) to prevent floating-point drift.

### 2.4 Hardening & Redaction
- **Helmet:** Sets security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, etc.).
- **CORS:** Restricts cross-origin requests to configured origins (`env.CORS_ORIGIN`).
- **Rate Limiting:**
  - Standard API rate limit: 300 requests / 15 minutes.
  - Strict AI rate limit: 30 operations / minute for `/api/receipts/:id/extract` and `/api/chat`.
- **Payload Limits:** Request bodies are restricted to 10MB.
- **Redacting Logger:** Strips `authorization`, `token`, `password`, `secret`, and raw image buffers before printing to logs.
- **Centralized Error Handler:** Strips stack traces and internal errors in production, emitting sanitized `{ status, code, message }` JSON.

---

## 3. API Contract Reference

### 3.1 Infrastructure & Auth Endpoints

#### `GET /api/health`
- **Auth:** None (Public)
- **Description:** Uptime and health check for container orchestrators.
- **Response:**
  ```json
  {
    "status": "ok",
    "service": "shopledger-backend",
    "version": "1.0.0",
    "timestamp": "2026-10-23T15:00:00.000Z",
    "uptimeSeconds": 142
  }
  ```

#### `GET /api/me`
- **Auth:** Bearer Token
- **Description:** Returns the authenticated shopkeeper profile and authorized business tenants.
- **Response:**
  ```json
  {
    "status": 200,
    "data": {
      "uid": "usr_99182",
      "email": "sharma.kirana@gmail.com",
      "displayName": "Ramesh Sharma",
      "photoURL": null,
      "activeBusinessId": "biz_sharma_kirana",
      "businesses": [
        {
          "id": "biz_sharma_kirana",
          "name": "Sharma Kirana Store",
          "businessType": "kirana",
          "currency": "INR",
          "role": "owner"
        }
      ]
    }
  }
  ```

---

### 3.2 Receipts Ledger Endpoints

#### `GET /api/receipts`
- **Auth:** Bearer Token + Business Member
- **Headers:** `x-business-id: <businessId>`
- **Query Parameters:**
  - `page` (number, default: 1)
  - `limit` (number, default: 20, max: 100)
  - `status` (`draft` | `processing` | `needs_review` | `verified` | `reconciled` | `archived`)
  - `supplierId` (string)
  - `paymentStatus` (`paid` | `unpaid_udhar` | `partially_paid`)
  - `startDate` (YYYY-MM-DD)
  - `endDate` (YYYY-MM-DD)
  - `search` (string)
- **Response:**
  ```json
  {
    "status": 200,
    "data": {
      "items": [
        {
          "id": "rcpt_001",
          "businessId": "biz_sharma_kirana",
          "invoiceNumber": "INV-8842",
          "receiptDate": "2024-11-04",
          "purchaseDate": "2024-11-04",
          "supplier": { "id": "sup_01", "name": "Balaji Traders" },
          "payment": { "method": "cash", "status": "paid" },
          "currency": "INR",
          "subtotalMinor": 1425000,
          "taxTotalMinor": 71250,
          "discountTotalMinor": 0,
          "grandTotalMinor": 1496250,
          "reviewStatus": "verified",
          "imagePath": "businesses/biz_sharma_kirana/receipts/rcpt_001/original.jpg",
          "lineItemCount": 3,
          "createdAt": "2024-11-04T10:00:00.000Z"
        }
      ],
      "pagination": { "page": 1, "limit": 20, "total": 45, "totalPages": 3 }
    }
  }
  ```

#### `POST /api/receipts`
- **Auth:** Bearer Token + Business Role (`owner`, `manager`, `accountant`)
- **Headers:** `x-business-id: <businessId>`
- **Body:**
  ```json
  {
    "invoiceNumber": "BILL-1049",
    "receiptDate": "2024-11-04",
    "purchaseDate": "2024-11-04",
    "supplier": { "name": "Gupta Wholesale Mart", "phone": "+91 98101 23456" },
    "payment": { "method": "cash", "status": "paid" },
    "imagePath": "businesses/biz_01/receipts/new/original.jpg",
    "items": [
      {
        "rawName": "Fortune Kachi Ghani Mustard Oil 1L",
        "category": "Edible Oils & Ghee",
        "quantity": 15,
        "unit": "pouch",
        "unitPriceMinor": 14200,
        "discountMinor": 0,
        "taxRatePercent": 5
      }
    ]
  }
  ```

#### `GET /api/receipts/:receiptId`
- **Auth:** Bearer Token + Business Member
- **Response:** Returns the full receipt header and its `lineItems` snapshot array.

#### `PATCH /api/receipts/:receiptId`
- **Auth:** Bearer Token + Business Role (`owner`, `manager`, `accountant`)
- **Description:** Updates receipt metadata and editable line items. Totals are automatically recalculated on the server.

#### `POST /api/receipts/:receiptId/extract`
- **Auth:** Bearer Token + Rate Limited (30/min)
- **Description:** Triggers Gemini multimodal OCR extraction, extracts line items and bounding boxes, and transitions status to `needs_review`.

#### `POST /api/receipts/:receiptId/confirm`
- **Auth:** Bearer Token + Business Role (`owner`, `manager`, `accountant`)
- **Description:** Permanently confirms the bahi khata entry, transitions status to `verified`, updates supplier aggregate spend, and updates product catalog rates (`lowestPriceMinor`, `lastPurchasePriceMinor`).

#### `POST /api/receipts/:receiptId/retry`
- **Auth:** Bearer Token + Rate Limited
- **Description:** Resets status to `processing` and schedules re-extraction.

---

### 3.3 CRM & Catalog Endpoints

#### `GET /api/suppliers` & `GET /api/suppliers/:supplierId`
- **Auth:** Bearer Token + Business Member
- **Description:** Returns suppliers sorted by total procurement spend (`totalSpendMinor`) with recent invoice history.

#### `GET /api/items` & `GET /api/items/:itemId`
- **Auth:** Bearer Token + Business Member
- **Description:** Returns product catalog entries with lowest, highest, and latest purchase price points.

---

### 3.4 Spending Analytics Endpoints

#### `GET /api/analytics/summary`
- **Auth:** Bearer Token + Business Member
- **Description:** Serves dashboard metrics: `totalSpentMonthMinor`, `receiptsCountMonth`, `needsCheckingCount`, `topSuppliers`, and category breakdown percentages.

#### `GET /api/analytics/trends`
- **Auth:** Bearer Token + Business Member
- **Description:** Serves a 6-month historical trajectory of monthly procurement amounts.

---

### 3.5 Grounded Financial AI Chat

#### `POST /api/chat`
- **Auth:** Bearer Token + Rate Limited (30/min)
- **Body:**
  ```json
  {
    "message": "Who supplied Fortune mustard oil cheapest this month?",
    "history": []
  }
  ```
- **Response:**
  ```json
  {
    "status": 200,
    "data": {
      "message": "Based on your verified bahi khata vouchers for this month, Balaji Traders supplied Fortune Kachi Ghani Mustard Oil (1L Pouch) at ₹138.00 on 4 Nov, whereas Gupta Wholesale Mart charged ₹142.00 on 2 Nov. Buying from Balaji saved you ₹4.00 per pouch.",
      "citations": [
        {
          "receiptId": "rcpt_001",
          "invoiceNumber": "INV-8841",
          "supplierName": "Balaji Traders",
          "date": "2024-11-04"
        }
      ],
      "structuredComparison": {
        "item": "Fortune Kachi Ghani Mustard Oil (1L)",
        "cheapestSupplier": "Balaji Traders (₹138/pouch)",
        "higherSupplier": "Gupta Wholesale Mart (₹142/pouch)",
        "spreadRupees": 4.0
      },
      "timestamp": "2026-10-23T15:00:00.000Z"
    }
  }
  ```

---

## 4. Operational Commands & Testing

```bash
# Install dependencies
pnpm install

# Build backend TypeScript
pnpm --filter backend run build

# Run backend unit & integration tests
pnpm --filter backend run test

# Run development server with live reload
pnpm --filter backend run dev

# Start compiled production server
pnpm --filter backend run start
```
