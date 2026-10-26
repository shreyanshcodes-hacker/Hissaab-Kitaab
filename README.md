# Hissaab Kitaab (हिसाब किताब) — Digital Bahi-Khata & Wholesale Receipt Intelligence

[![Firebase Hosting](https://img.shields.io/badge/Hosting-my--ledgeriq.web.app-039be5?logo=firebase&logoColor=white)](https://my-ledgeriq.web.app)
[![React 19](https://img.shields.io/badge/Frontend-React_19_+_TypeScript-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Node Express](https://img.shields.io/badge/Backend-Node.js_+_Express_+_TypeScript-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Google Gemini](https://img.shields.io/badge/AI_Vision-Google_Gemini-4285f4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Bilingual](https://img.shields.io/badge/Languages-English_%7C_हिन्दी-ff9933)](https://my-ledgeriq.web.app)

**Hissaab Kitaab** is a production-grade, bilingual digital bahi-khata (ledger) and wholesale purchase intelligence platform designed specifically for Indian retail merchants, Kirana store owners, and Mandi traders. It automates receipt ingestion through multimodal Gemini Vision OCR, reconciles bills with integer-paise arithmetic, generates authentic digital voucher slips, and provides an isolated AI bookkeeping assistant for instant financial queries.

---

## 1. Executive Summary & Core Capabilities

Traditional Indian retail and wholesale businesses handle dozens of physical paper slips daily—faded thermal printouts, handwritten Mandi chits, GST tax invoices, and cash vouchers. **Hissaab Kitaab** turns this paper chaos into an audit-ready, searchable ledger with zero data entry drudgery:

1. **Multimodal Bill Ingestion**: Snap photos with camera, upload device files, or enter manual purchases. Gemini Vision extracts line items, quantities, units, rates, taxes, and vendor details in seconds.
2. **Review & Verification Workspace**: Split-screen interface with a visual voucher scan inspector (zoom, pan, rotate 90°, fullscreen) beside an editable line-item ledger table.
3. **Digital Voucher Slip**: Instant digital thermal receipt formatting with store header, supplier particulars, line items, taxes, net totals, and rubber stamp with payment mode.
4. **Real-Time Bahi-Khata Ledger**: Reactive Firestore listener with real-time discrepancy alerts (`⚠️ Flags`, `Needs Review`, `Udhar (Unpaid)`, or `✓ Verified`).
5. **Full Bilingual Localization**: Seamless one-click switching between **English** and **हिन्दी** across all screens, controls, tables, and AI responses.
6. **Private & Grounded AI Assistant**: Conversational assistant strictly restricted to the merchant's verified purchase documents with integer ledger math and formatted markdown.
7. **Security & Financial Integrity**: Client-side secrets completely eliminated, strict tenant isolation via Firebase Auth + custom tenant middleware, and integer paise (`1 INR = 100 paise`) arithmetic.

---

## 2. Detailed Breakdown of What We Built & Implemented

### A. Brand Identity & Design System
- **Rebranding to "Hissaab Kitaab" (हिसाब किताब)**: Complete branding across app shell, navigation sidebars, headers, breadcrumbs, footers, page titles, and web manifests.
- **Custom Bahi-Khata Logo Mark**: Handcrafted SVG vector brand icon depicting a traditional red-and-gold bound ledger with the Indian Rupee glyph (`₹`).
- **Cleaned UI & Minimalist Action Buttons**: Replaced verbose button text across the app (e.g., Back buttons trimmed to clean `←` icons; `Review & Verify` → `Review`; `View Scan` → `View`; `+ Manual Entry` → `+ Manual`; `Confirm & Save` → `Save`; `Download CA Report` → `CA Report`).

### B. AI Vision Ingestion & OCR Pipeline
- **Multimodal Capture**: Direct video stream camera capture with front/back camera selection, drag-and-drop file upload (JPEG, PNG, WebP, PDF), and file pickers.
- **Image Pre-processing & Cropping**: In-browser client-side image cropping, canvas downscaling (max 1400px), auto-orientation, and compression to prevent bandwidth bottlenecks.
- **Cascading Gemini Vision Models**: Dynamic server/client extraction pipeline utilizing `gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`, and fallback vision models.
- **Automated Discrepancy Detection**: Real-time detection of low-confidence OCR fields, arithmetic mismatches, unverified tax slabs, and handwritten rates.
- **Auto-Healing & Re-Scan**: Capability to re-run Gemini Vision OCR on existing voucher scans directly from the receipt detail view.

### C. Receipt Review Workspace & Line-Item Verification
- **Dual-Pane Interactive Inspector**: Split-screen view linking source voucher pixels with ledger line items. Features zoom in/out, 90-degree rotation, and fullscreen toggles.
- **Full Line-Item Editing**: Edit names, quantities, packaging units (`kg`, `litre`, `piece`, `bag`, `carton`, `box`), unit rates, and GST tax percentages (`0%`, `5%`, `12%`, `18%`, `28%`).
- **Dynamic Row Controls**: Add new items on the fly, delete spurious rows, and navigate directly to flagged items with the "Jump to Flagged" button.
- **Editable Receipt Metadata**: Real-time inline editing of Supplier Name, Bill/Invoice Number, and Purchase Date.

### D. Digital Voucher Slip & Export Tools
- **In-App Digital Slip Generator**: Embedded in the Receipt Detail view with a toggle between `Digital Slip` and `Original Photo`.
- **Thermal Receipt Typography**: Displays merchant store name, vendor details, tax invoice number, date, itemized table, subtotal, CGST/SGST tax breakdown, net total, and authentic rubber stamp simulation.
- **Multi-Format Export**:
  - Export digital voucher slips to clean PNG/PDF.
  - One-click CA Report export generating a comprehensive accounting CSV file.
  - Download original high-resolution bill photos preserved in tenant storage.

### E. Persistent Payment Methods & Udhar Tracking
- **Interactive Payment Controls**: Live dropdown selector on the Receipt Detail page allowing instant editing of:
  - **Payment Mode**: `Cash (Rokad)`, `UPI (GPay/PhonePe)`, `Credit (Udhar)`, `Bank Transfer / NEFT`, `Cheque`.
  - **Payment Status**: `Paid (चुक्ता)`, `Unpaid (उधार)`, `Partial (आंशिक)`.
- **Multi-Tier Persistence**: Dedicated `updateReceiptPayment` engine persisting changes to the Express API, Firestore documents, and local tenant caches simultaneously.
- **Real-Time Payment Stamps**: Voucher slips and ledger badges reflect the active payment method and settlement state immediately.

### F. Real-Time Receipts Tab & Ledger Management
- **Live Firestore Subscription**: Powered by `onSnapshot` real-time listeners; new bills, verification status, payment edits, and deletions reflect instantly without page reloads.
- **Live Attention Beacons**: Row-level status badges featuring pulsating live indicator dots:
  - `⚠️ X Flags` (amber alert for low OCR confidence or arithmetic checks).
  - `• Udhar (Unpaid)` (prominent debt indicator).
  - `✓ Verified` (clean reconciliation checkmark).
- **Multi-Dimensional Filter Toolbar**: Instant filtering by Status (`All`, `Needs Checking`, `Verified Bahi Khata`, `Drafts`), Category, Payment Mode, Supplier, and Date Range (`This Month`, `Last Month`, `Last 30 Days`, `All Dates`).
- **Soft-Delete & Purge**: Delete button with safe confirmation modals on both the Receipts ledger and the Receipt Detail page.
- **Manual Purchase Bill Entry**: Fast modal to record cash or Mandi purchases directly into the ledger when physical slips are not available.

### G. Comprehensive English & Hindi Localization (i18n)
- **Centralized Translation Framework**: Single source of truth in `translations.ts` paired with `LanguageContext`.
- **Complete Coverage**: Translates app navigation, dashboard metrics, filter toolbars, table headers, review workspaces, settings, help guides, and toast notifications.
- **Persistent Language Preference**: Remembers the selected language across sessions in browser storage.

### H. Formatted AI Bahi-Khata Chat ("Ask Hissaab Kitaab AI")
- **Grounded Financial Intelligence**: Answers are derived strictly from the merchant's verified purchase bills with zero cross-tenant leakage.
- **Rich Markdown Engine (`FormattedText.tsx`)**:
  - **Bold**: `**text**` or `__text__`.
  - *Italic*: `*text*` or `_text_`.
  - <u>Underline</u>: `<u>text</u>`, `++text++`, or `__text__` with double-underscore detection.
  - ~~Strikethrough~~: `~~text~~`.
  - Inline code, syntax-highlighted code blocks, numbered lists, bullet points, and headers.
  - Fully sanitized with zero risk of Cross-Site Scripting (XSS).
- **Bilingual Kirana Prompt Starters**: Pre-built prompt chips for checking lowest commodity rates, vendor totals, and pending review warnings.

### I. Analytics, Item Catalog & Supplier Directory
- **Dashboard Overview**: Financial procurement cards (Total Procurement Spend, Verified Bills, Pending Review Count, Active Suppliers).
- **Night Tally Reconciliation Helper**: Evening checklist for storekeepers to reconcile cash outflows and Udhar balances before closing the shop.
- **Master Item Catalog**: Normalized product catalog tracking purchase price history, lowest rate, highest rate, and primary suppliers.
- **Supplier Directory**: Vendor address book recording total procurement spend, bill counts, contact phone, and GSTIN.
- **Wholesale Commodity Price Tracker**: Real rate comparisons across suppliers based on physical verified bills (speculative/fake inflation warnings completely removed).

### J. Production Architecture & Security Hardening
- **Secret Zero-Exposure**: Removed all fallback API keys from client source code; backend uses Application Default Credentials (ADC) / Google Secret Manager.
- **Multi-Tenant Authorization**: All backend API endpoints enforce Firebase JWT verification (`requireAuth`) and business tenant validation (`requireBusinessTenant`).
- **HTTP Security Headers**: Configured in `firebase.json` (`Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).
- **Vite Bundle Optimization**: Route-level `React.lazy()` chunking and vendor split reducing the main bundle from 1,660 kB to 268 kB.

---

## 3. Architecture & Repository Structure

```text
shopledger-v1/
├── frontend/                  # React 19 + TypeScript + Vite + Tailwind CSS SPA
│   ├── src/api/               # Authenticated clients (receiptService, analyticsService, itemService, etc.)
│   ├── src/components/        # Design system primitives, modals, tables, badges, chat formatters
│   │   ├── chat/              # FormattedText.tsx (safe bold, italic, underline, lists, code)
│   │   └── common/            # Button, Badge, Card, DataTable, Dropdown, Modal, Tabs
│   ├── src/config/            # Firebase SDK setup (Auth, Firestore, Storage)
│   ├── src/context/           # AuthContext, LanguageContext (i18n), ToastContext, ThemeContext
│   ├── src/i18n/              # Centralized translations.ts (English & Hindi)
│   ├── src/pages/             # Route pages (Dashboard, Receipts, Upload, Review, Detail, Analysis, AI)
│   ├── src/utils/             # exportSlip.ts, money.ts (paise math), cn.ts
│   └── vite.config.ts         # Manual chunking, code splitting, asset optimization
├── backend/                   # Node.js + Express + TypeScript API
│   ├── src/config/            # Environment validation (Zod), Firebase Admin SDK (ADC-first)
│   ├── src/controllers/       # Receipt, Supplier, Item, Analytics, and Chat controllers
│   ├── src/middleware/        # Firebase auth, tenant authorization, Multer file handling
│   ├── src/routes/            # Express routers (/api/receipts, /api/analytics, /api/chat, etc.)
│   ├── src/schemas/           # Zod validation schemas
│   ├── src/services/          # ReceiptService, Gemini Vision OCR, integer paise calculations
│   └── Dockerfile             # Multi-stage production container for Cloud Run
├── docs/                      # Comprehensive technical specifications & guides
├── firestore.rules            # Multi-tenant security rules with default deny-all
├── storage.rules              # Private business-scoped Cloud Storage security rules
└── firebase.json              # Firebase Hosting configuration & HTTP security headers
```

---

## 4. Environment Variables Reference

### Frontend Configuration (`frontend/.env`)
Copy [`frontend/.env.example`](file:///d:/Shreyanshcodes/shopledger-v1/frontend/.env.example) to `frontend/.env`:

| Variable | Required | Description |
| :--- | :---: | :--- |
| `VITE_FIREBASE_API_KEY` | Yes | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | `<project-id>.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase Project ID (`my-ledgeriq`) |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | `<project-id>.firebasestorage.app` |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase Web Application ID |
| `VITE_API_BASE_URL` | Yes | Express API URL (`http://localhost:5001/api` or production URL) |
| `VITE_GEMINI_API_KEY` | No | Optional client vision fallback key |
| `VITE_GEMINI_MODEL` | No | Defaults to `gemini-3.1-flash-lite` |

### Backend Configuration (`backend/.env`)
Copy [`backend/.env.example`](file:///d:/Shreyanshcodes/shopledger-v1/backend/.env.example) to `backend/.env`:

| Variable | Required | Description |
| :--- | :---: | :--- |
| `NODE_ENV` | Yes | `development`, `test`, or `production` |
| `PORT` | Yes | Server port (`5001` locally, `8080` in Cloud Run) |
| `FIREBASE_PROJECT_ID` | Yes | Firebase Project ID |
| `CORS_ORIGIN` | Yes | Allowed frontend origins (e.g. `https://my-ledgeriq.web.app`) |
| `GEMINI_API_KEY` | Yes | Server-side Gemini API key (via Secret Manager in production) |
| `GEMINI_MODEL` | No | Defaults to `gemini-2.5-flash` |

---

## 5. Local Development & Testing

### Installation
```bash
pnpm install
```

### Running the Test Suites & Linters
```bash
# Run all unit, schema, security rules, and integration tests
pnpm test:all

# Run frontend linter
pnpm lint:frontend

# Build both frontend and backend
pnpm build
```

### Starting Development Servers
```bash
# Terminal 1: Backend Express API (http://localhost:5001)
pnpm --filter backend run dev

# Terminal 2: Frontend Vite App (http://localhost:5173)
pnpm --filter frontend run dev
```

---

## 6. Production Deployment

### Live Application
- **Hosting URL**: [https://my-ledgeriq.web.app](https://my-ledgeriq.web.app)
- **Firebase Project**: `my-ledgeriq`

### Deploy Frontend to Firebase Hosting
```bash
# 1. Compile frontend production bundle
pnpm build:frontend

# 2. Deploy to Firebase Hosting
npx firebase-tools deploy --only hosting --project my-ledgeriq
```

### Deploy Security Rules & Indexes
```bash
pnpm deploy:rules
pnpm deploy:indexes
```

---

## 7. Financial & Security Guarantees

- **Integer Paise Representation**: All calculations (`subtotal`, `taxTotal`, `grandTotal`, `lineTotal`, `unitRate`) are processed and stored as integer paise (`100 paise = ₹1.00`), eliminating floating-point rounding errors.
- **Tenant Isolation**: Every Firestore collection is nested under `/businesses/{businessId}/` with Firestore Security Rules enforcing user membership verification.
- **Confirmed-Only Analytics**: Financial summary statistics include only `verified` bills, preventing unreviewed drafts from skewing store metrics.
- **Zero XSS in AI Markdown**: Custom parser compiles markdown AST into React elements without `dangerouslySetInnerHTML`.
