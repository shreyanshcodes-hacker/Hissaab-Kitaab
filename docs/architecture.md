# ShopLedger System Architecture & Technical Specification

## 1. Executive Overview & Architectural Philosophy

ShopLedger is a production-grade receipt digitizer, ledger reconciliation tool (*Bahi Khata*), and procurement intelligence platform engineered specifically for Indian kiranas, grocery shops, retail merchants, wholesale traders, and mandi godowns.

### Core Architectural Principles
1. **Zero Blind Writes to the Ledger:** AI extractions are treated as drafts until human verification. The merchant retains absolute authority over every cell, rate, and quantity.
2. **Strict Backend-Mediated AI Processing:** The Gemini API is accessible **exclusively** from the authenticated Node.js/Express backend. No API keys or AI prompts are ever bundled into client-side assets.
3. **Multi-Tenant Shop Isolation:** All database collections and cloud storage paths enforce cryptographic and rule-based scoping to a merchant's authenticated `shopId`.
4. **Resilient Kirana Connectivity:** Accommodates high-latency 4G mobile connections, camera shake, low-light thermal slips, and regional invoice formats (Hindi / English / bilingual mandi slips).

---

## 2. Monorepo Structure & Organization

The repository is organized into a streamlined, maintainable monorepo with clean separation between the user-facing Single Page Application (`frontend/`) and the authenticated API services (`backend/`), with shared TypeScript interfaces.

```
shopledger/
├── docs/
│   ├── design-reference-inventory.md
│   ├── architecture.md
│   ├── data-model.md
│   └── implementation-roadmap.md
├── designs/                           # Stitch design source of truth (HTML + PNGs)
│   ├── add_purchase_receipt_shopledger/
│   ├── ask_shopledger_shopledger_1/
│   ├── ask_shopledger_shopledger_2/
│   ├── ... (19 screen folders)
│   └── shopledger/DESIGN.md
├── frontend/                          # React + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── api/                       # Typed HTTP clients calling Express backend
│   │   ├── components/                # Reusable UI components matching Stitch tokens
│   │   │   ├── common/                # Buttons, Inputs, Modal, Badges, Header, Sidebar
│   │   │   ├── dashboard/             # KPI Cards, Reconciliation Helper, Spend Grid
│   │   │   ├── receipts/              # UploadModal, LiveOCRProgress, BoundingBoxViewer, LineItemEditor
│   │   │   ├── analytics/             # Charts, PriceTracker, SupplierRanking
│   │   │   └── chat/                  # AssistantDrawer, ComparisonCard, CitationChip
│   │   ├── context/                   # AuthContext, ShopContext, ThemeContext
│   │   ├── hooks/                     # useReceipts, useSuppliers, useCamera, useGuestMode
│   │   ├── pages/                     # Routed view components
│   │   │   ├── LandingPage.tsx
│   │   │   ├── AuthPage.tsx
│   │   │   ├── OnboardingPage.tsx
│   │   │   ├── SetupCompletePage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── GuestDashboardPage.tsx
│   │   │   ├── ReceiptsPage.tsx
│   │   │   ├── ReviewReceiptPage.tsx
│   │   │   ├── ReceiptDetailPage.tsx
│   │   │   ├── SpendingAnalysisPage.tsx
│   │   │   ├── SupplierDetailPage.tsx
│   │   │   ├── ItemDetailPage.tsx
│   │   │   ├── AskShopLedgerPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   └── HelpPage.tsx
│   │   ├── types/                     # Frontend state and UI types
│   │   ├── utils/                     # Currency formatting (₹), Date utils, OCR box math
│   │   ├── App.tsx                    # Routes & layout shell
│   │   ├── main.tsx                   # React root mount
│   │   └── index.css                  # Tailwind styles + Inter tabular numeric config
│   ├── tailwind.config.js             # Stitch color tokens & typography scale
│   ├── vite.config.ts                 # Vite bundle config + proxy for local dev
│   ├── package.json
│   └── tsconfig.json
├── backend/                           # Node.js + Express + TypeScript + Firebase Admin
│   ├── src/
│   │   ├── config/                    # Firebase Admin init, Gemini Client, Environment loader
│   │   ├── controllers/               # Route handlers (Receipts, OCR, Analysis, Chat, Suppliers)
│   │   ├── middleware/                # Auth token verification, Shop scoping, Rate limiter
│   │   ├── routes/                    # API route definitions (/api/v1/...)
│   │   ├── services/                  # Business logic
│   │   │   ├── geminiVisionService.ts # Receipt multimodal extraction with structured JSON schemas
│   │   │   ├── geminiChatService.ts   # Shop financial assistant with grounding & citations
│   │   │   ├── receiptMathService.ts  # GST tax slab & subtotal verification engine
│   │   │   ├── analyticsService.ts    # Aggregations, price trends & spend rollups
│   │   │   └── storageService.ts      # Cloud Storage signed URLs & upload handlers
│   │   ├── types/                     # Shared backend domain models
│   │   ├── utils/                     # Sanitization, error handling, logging
│   │   └── index.ts                   # Express server entry point
│   ├── Dockerfile                     # Cloud Run production container build
│   ├── package.json
│   └── tsconfig.json
├── firebase.json                      # Firebase Hosting & Firestore rules configuration
├── firestore.rules                    # Production security rules for Cloud Firestore
├── storage.rules                      # Production security rules for Firebase Cloud Storage
└── README.md
```

---

## 3. Screen-to-File Mapping Matrix

Every screen in the Stitch `designs/` inventory maps directly to a modular page and subcomponent hierarchy:

| Stitch Reference Folder | Target Frontend Page Component | Key Subcomponents | Associated Backend Route(s) |
|---|---|---|---|
| `shopledger_your_shop_s_records_finally_in_order` | `pages/LandingPage.tsx` | `Hero`, `ComparisonTable`, `SegmentCards` | `N/A` (Static SPA route) |
| `authentication_shopledger` | `pages/AuthPage.tsx` | `SignInTab`, `SignUpTab`, `HelpDrawer`, `ThemeToggle` | `POST /api/v1/auth/session` |
| `first_time_onboarding_shopledger` | `pages/OnboardingPage.tsx` | `BusinessTypeSelector`, `StepIndicator`, `LanguagePicker` | `POST /api/v1/shops` |
| `shop_setup_complete_shopledger` | `pages/SetupCompletePage.tsx` | `SetupSummaryCard`, `ActionToolbar` | `GET /api/v1/shops/:shopId` |
| `dashboard_shopledger_1` & `_2` | `pages/DashboardPage.tsx` | `KPISummaryStrip`, `RecentReceiptsTable`, `NightReconHelper`, `CategorySpendGrid` | `GET /api/v1/analytics/dashboard` |
| `guest_exploration_dashboard_shopledger` | `pages/GuestDashboardPage.tsx` | `DemoBanner`, `GuidedTourCards`, `GateConversionModal` | `GET /api/v1/demo/sample-data` |
| `add_purchase_receipt_shopledger` | `components/receipts/UploadReceiptModal.tsx` | `CameraViewfinder`, `Dropzone`, `ManualFormFallback`, `ErrorAccordion` | `POST /api/v1/receipts/upload` |
| `receipt_processing_shopledger` | `components/receipts/ReceiptProcessingState.tsx` | `ExtractionStageTracker`, `LiveFindingPill` | `GET /api/v1/receipts/:id/status` (SSE / Polling) |
| `review_receipt_shopledger_1` & `_2` | `pages/ReviewReceiptPage.tsx` | `VoucherCanvasViewer`, `BoundingBoxOverlay`, `LineItemsTable`, `ConfidenceAlertBanner`, `StickyReviewFooter` | `GET /api/v1/receipts/:id`, `PUT /api/v1/receipts/:id/verify` |
| `your_purchase_receipts_shopledger` | `pages/ReceiptsPage.tsx` | `StatusTabs`, `ReceiptsDataTable`, `DateFilterDropdown`, `EmptyStateView` | `GET /api/v1/receipts` |
| `receipt_detail_gupta_wholesale_mart_shopledger` | `pages/ReceiptDetailPage.tsx` | `VoucherScanViewer`, `GSTReconciliationBox`, `AuditLogDrawer`, `PriceTrendAlert` | `GET /api/v1/receipts/:id` |
| `spending_analysis_shopledger_1` & `_2` | `pages/SpendingAnalysisPage.tsx` | `InsightsCarousel`, `SpendTrajectoryChart`, `SupplierDonut`, `MandiRateTracker` | `GET /api/v1/analytics/spend` |
| `supplier_details_gupta_wholesale_mart_shopledger` | `pages/SupplierDetailPage.tsx` | `ProcurementChart`, `SupplierReceiptsTable`, `TopItemsList`, `NotesEditor` | `GET /api/v1/suppliers/:id` |
| `item_details_fortune_kachi_ghani_mustard_oil_shopledger` | `pages/ItemDetailPage.tsx` | `RateHistoryChart`, `VendorRateTable`, `SKUMetaDrawer` | `GET /api/v1/items/:id` |
| `ask_shopledger_shopledger_1` & `_2` | `pages/AskShopLedgerPage.tsx` | `PromptLibrary`, `ChatMessageList`, `SupplierComparisonCard`, `CitationChip` | `POST /api/v1/chat/query` |

---

## 4. End-to-End Receipt OCR & Reconciliation Pipeline

The receipt extraction pipeline transforms noisy physical slips (thermal paper, handwritten Mandi bills, stamped invoices) into verified, structured Bahi Khata entries.

```mermaid
sequenceDiagram
    autonumber
    actor Merchant as Shopkeeper (Client)
    participant Front as Frontend (React)
    participant Back as Backend (Express)
    participant Store as Firebase Storage
    participant Gemini as Google Gemini 2.5 API
    participant DB as Cloud Firestore

    Merchant->>Front: Snaps photo or uploads PDF voucher
    Front->>Back: POST /api/v1/receipts/upload (Multipart image)
    Note over Back: Authenticate user & verify shop membership
    Back->>Store: Upload raw image to /shops/{shopId}/receipts/{receiptId}/raw.jpg
    Store-->>Back: Return signed storage URI
    Back->>DB: Create Receipt doc (Status: "processing")
    Back-->>Front: Return receiptId & begin live tracking

    Back->>Gemini: Call multimodal vision model with structured JSON Schema
    Note over Gemini: Extract: Vendor, InvoiceNo, Date, LineItems, Taxes, Totals & BoundingBoxes
    Gemini-->>Back: Structured OCR payload with bounding boxes & field confidence

    Back->>Back: Run ReceiptMathService (Subtotal + Taxes == Total, Low-Confidence Scoring)
    Back->>DB: Update Receipt doc (Status: "needs_review", extractedItems, confidenceSummary)
    Back-->>Front: Notify extraction complete

    Front->>Merchant: Render Split-Screen Review (Voucher + Editable Ledger)
    Merchant->>Front: Edits low-confidence cells & taps "Confirm & save"
    Front->>Back: PUT /api/v1/receipts/{receiptId}/verify
    Back->>DB: Commit verified ledger record, update Supplier & Item Catalog metrics
    Back-->>Front: Confirmation success -> Redirect to Receipt Detail
```

### 4.1 Gemini Vision Prompt & Schema Strategy
- **Target Model:** `gemini-2.5-flash` for high-speed, cost-efficient invoice extraction; fallback to `gemini-2.5-pro` for highly degraded or handwritten mandi slips.
- **Structured Outputs:** Utilizes Gemini's strict JSON Schema response mode (`responseMimeType: "application/json"` and `responseSchema`).
- **Bounding Boxes:** Coordinates are normalized (`[ymin, xmin, ymax, xmax]` in `0..1000` integer space) enabling pixel-perfect canvas highlights in the frontend split viewer.
- **Field Confidence Grading:**
  - High confidence (`>= 0.85`): Marked with green status pill.
  - Low confidence (`< 0.85`): Highlighted with amber background (`#FEF3C7`) and border (`#FCD34D`).

---

## 5. Security & Access Control Model

### 5.1 Authentication Handshake
1. Client authenticates via Firebase Authentication (Email/Password or Google Identity Services).
2. Client receives a Firebase ID Token (JWT).
3. Every API request transmits the header:
   ```http
   Authorization: Bearer <FIREBASE_ID_TOKEN>
   ```
4. Backend `authMiddleware` verifies the token via `firebase-admin.auth().verifyIdToken()`, extracts the `uid`, and resolves the active `shopId` from the user's shop membership.

### 5.2 Multi-Tenant Data Protection
- **No Shared Unscoped Queries:** Every Firestore read or write requires a valid `shopId`.
- **Cloud Firestore Security Rules:**
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      function isAuthenticated() {
        return request.auth != null;
      }
      function belongsToShop(shopId) {
        return isAuthenticated() && 
          request.auth.uid in get(/databases/$(database)/documents/shops/$(shopId)).data.members;
      }

      match /shops/{shopId} {
        allow read, write: if isAuthenticated() && request.auth.uid in resource.data.members;
        
        match /{document=**} {
          allow read, write: if belongsToShop(shopId);
        }
      }
    }
  }
  ```
- **Firebase Cloud Storage Security Rules:**
  ```javascript
  rules_version = '2';
  service firebase.storage {
    match /b/{bucket}/o {
      match /shops/{shopId}/{allPaths=**} {
        allow read, write: if request.auth != null && 
          request.auth.token.shopId == shopId;
      }
    }
  }
  ```

---

## 6. Deployment & Infrastructure Strategy

### 6.1 Frontend Deployment: Firebase Hosting
- Configured via `firebase.json` with SPA URL rewrites:
  ```json
  {
    "hosting": {
      "public": "frontend/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  }
  ```
- Global CDN delivery with edge caching of static Vite assets.

### 6.2 Backend Deployment: Google Cloud Run
- Containerized Node.js runtime executing in managed Google Cloud Run (Region: `asia-south1` - Mumbai for low latency across India).
- Zero cold-start optimizations: Min-instances configured to 1 for uninterrupted merchant checkout and tallying.
- Auto-scaling up to 20 instances during peak evening hours (8:00 PM - 11:00 PM IST) when shopkeepers tally day slips.

---

## 7. Environment Variables & Secret Configuration

### 7.1 Backend Environment (`backend/.env`)
| Variable | Description | Example / Required Format |
|---|---|---|
| `PORT` | Local and Cloud Run listen port | `8080` |
| `NODE_ENV` | Runtime environment | `production` or `development` |
| `GEMINI_API_KEY` | Google Gemini API Key (Secret) | `AIzaSy...` |
| `FIREBASE_PROJECT_ID` | GCP Project ID | `shopledger-prod` |
| `FIREBASE_CLIENT_EMAIL` | Service Account email | `firebase-adminsdk@shopledger-prod.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Service Account PEM key | `"-----BEGIN PRIVATE KEY-----\nMIIE..."` |
| `FIREBASE_STORAGE_BUCKET` | Default Cloud Storage bucket | `shopledger-prod.appspot.com` |
| `ALLOWED_ORIGINS` | CORS whitelist for web client | `https://shopledger-prod.web.app,http://localhost:5173` |

### 7.2 Frontend Environment (`frontend/.env`)
| Variable | Description | Example / Required Format |
|---|---|---|
| `VITE_API_BASE_URL` | Endpoint for backend API | `/api/v1` (prod) or `http://localhost:8080/api/v1` (dev) |
| `VITE_FIREBASE_API_KEY` | Firebase Web Client Key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `shopledger-prod.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Project Identifier | `shopledger-prod` |
| `VITE_FIREBASE_STORAGE_BUCKET`| Storage Bucket | `shopledger-prod.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | FCM Sender ID | `1234567890` |
| `VITE_FIREBASE_APP_ID` | Firebase Web App ID | `1:1234567890:web:abcdef` |

---

## 8. Package & Dependency Rationale

Only essential, battle-tested libraries are approved. Unnecessary kitchen-sink utilities are strictly excluded.

### Frontend Dependencies
- `react`, `react-dom` (`^18.3.1`): Standard reactive view layer.
- `react-router-dom` (`^6.26.0`): Client-side routing and layout hierarchies.
- `firebase` (`^10.13.0`): Client authentication, Firestore subscriptions, and file upload references.
- `lucide-react` / `@google/material-symbols`: Crisp UI iconography matching Stitch designs.
- `clsx`, `tailwind-merge`: Predictable conditional class composition for Stitch color states.
- `chart.js`, `react-chartjs-2`: Lightweight canvas-rendered procurement trajectory and category charts.

### Backend Dependencies
- `express` (`^4.19.2`): Minimalist, robust HTTP server.
- `firebase-admin` (`^12.4.0`): Trusted server-side authentication, Firestore transactions, and Storage admin.
- `@google/genai`: Official Google Gen AI SDK for structured Gemini 2.5 multimodal calls.
- `multer`: In-memory multipart handling for voucher image and PDF uploads.
- `zod`: Request body validation and OCR response schema verification.
- `cors`, `helmet`: Security headers and cross-origin policy enforcement.
