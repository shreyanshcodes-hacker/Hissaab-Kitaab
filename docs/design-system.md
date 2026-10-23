# ShopLedger Design System & Component Specification

## 1. Overview & Stitch Source of Truth

The ShopLedger Design System is a high-density, accessible, Kirana-first visual framework derived directly from the 19 Stitch screen prototypes in `designs/` and [`designs/shopledger/DESIGN.md`](file:///d:/Shreyanshcodes/shopledger-v1/designs/shopledger/DESIGN.md).

It bridges the tactile clarity of India's traditional red-cloth bahi khata ledgers with contemporary computer vision utilities.

---

## 2. Token Architecture

### 2.1 Color Tokens

#### Light Theme (Warm Ivory Palette)
| Token Name | Hex Code | Utility Class | Purpose / Application |
|---|---|---|---|
| `surface` / `background` | `#FAF9F4` | `bg-surface` | Primary application canvas, reducing eyestrain during nightly tallying |
| `surface-container-lowest` | `#FFFFFF` | `bg-surface-container-lowest` | Elevated cards, data table interiors, input backgrounds |
| `surface-container-low` | `#F5F4EF` | `bg-surface-container-low` | Sidebar background, secondary card backing, table headers |
| `surface-container` | `#EFEEE9` | `bg-surface-container` | Search inputs, segmented tab tracks, neutral chips |
| `surface-container-high` | `#E9E8E3` | `bg-surface-container-high` | Interactive hover states, elevated dropdown items |
| `surface-container-highest` | `#E3E3DE` | `bg-surface-container-highest` | Inactive tab counters, subtle dividers |
| `on-surface` | `#1B1C19` | `text-on-surface` | Primary text headings, amounts, high-contrast labels |
| `on-surface-variant` | `#404943` | `text-on-surface-variant` | Secondary labels, descriptions, timestamps |
| `outline` | `#E6E2D6` | `border-outline` | 1px tactile borders framing cards, tables, inputs |
| `outline-variant` | `#C0C9C2` | `border-outline-variant` | Scrollbar thumb, secondary borders |
| `primary` | `#04442F` | `bg-primary`, `text-primary` | Deep evergreen brand actions, hover states |
| `primary-container` | `#245C45` | `bg-primary-container` | Primary buttons (`+ Upload Receipt`, `Confirm & save`) |
| `on-primary` | `#FFFFFF` | `text-on-primary` | Text on primary containers |
| `secondary-container` | `#DBE5DD` | `bg-secondary-container` | Active navigation pill, sage category tags |
| `on-secondary-fixed` | `#151D19` | `text-on-secondary-fixed` | Active navigation text |
| `tertiary` (Warning) | `#D97706` | `text-tertiary` | Low confidence indicator, pending review callouts |
| `tertiary-fixed` | `#FEF3C7` | `bg-tertiary-fixed` | "Needs checking" badge background, flagged OCR rows |
| `tertiary-fixed-dim` | `#FCD34D` | `border-tertiary-fixed-dim` | Border around flagged/uncertain line items |
| `tertiary-on-fixed` | `#92400E` | `text-tertiary-on-fixed` | Text inside "Needs checking" status pills |
| `verified` (Success) | `#15803D` | `text-verified` | Verified bill status, reconciled ledger amounts |
| `verified-container` | `#DCFCE7` | `bg-verified-container` | Verified pill background |
| `error` | `#DC2626` | `text-error`, `bg-error` | Arithmetic mismatch, deleted bill alerts |
| `error-container` | `#FEE2E2` | `bg-error-container` | Error banner background, variance alerts |

#### Dark Theme (Deep Basalt Adaptation)
Implemented via Tailwind's `class` dark mode strategy (`<html class="dark">`):
- `surface` / `background`: `#161815`
- `surface-container-lowest`: `#1E221D`
- `surface-container-low`: `#242823`
- `surface-container`: `#2B302A`
- `surface-container-high`: `#333A32`
- `surface-container-highest`: `#3C443B`
- `on-surface`: `#F2F1EC`
- `on-surface-variant`: `#C0C9C2`
- `outline`: `#2E362C`

---

### 2.2 Typography System

- **Font Family:** `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Tabular Numerics Rule:** Every price, rate, quantity, tax amount, and timestamp applies:
  ```css
  font-feature-settings: "tnum" 1, "cv05" 1;
  font-variant-numeric: tabular-nums;
  ```
- **Type Scale:**
  | Name | Font Size | Line Height | Weight | Letter Spacing |
  |---|---|---|---|---|
  | `display` | `2.25rem` (36px) | `2.75rem` (44px) | 700 (Bold) | `-0.02em` |
  | `headline-lg` | `1.5rem` (24px) | `2.0rem` (32px) | 700 (Bold) | `-0.015em` |
  | `headline-sm` | `1.25rem` (20px) | `1.75rem` (28px) | 600 (Semibold) | `-0.01em` |
  | `currency-stat` | `1.75rem` (28px) | `2.0rem` (32px) | 700 (Bold) | `-0.02em` |
  | `body-lg` | `1.0rem` (16px) | `1.5rem` (24px) | 400 (Regular) | `normal` |
  | `body-sm` | `0.875rem` (14px) | `1.25rem` (20px) | 400 (Regular) | `normal` |
  | `label-md` | `0.875rem` (14px) | `1.25rem` (20px) | 600 (Semibold) | `normal` |
  | `label-xs` | `0.75rem` (12px) | `1.0rem` (16px) | 600 (Semibold) | `0.02em` |

---

### 2.3 Radii & Elevation

- `rounded-sm`: `0.25rem` (4px)
- `rounded` / `DEFAULT`: `0.5rem` (8px) - Inputs, buttons, table cell actions
- `rounded-md`: `0.75rem` (12px)
- `rounded-xl`: `1.0rem` (16px) - Cards, dropzone containers
- `rounded-2xl`: `1.5rem` (24px) - Modals, dialog sheets
- `rounded-full`: `9999px` - Badges, pill tabs, avatar icons
- **Shadows:**
  - `shadow-card`: `0 1px 3px rgba(37, 41, 35, 0.06)`
  - `shadow-elevated`: `0 4px 12px rgba(37, 41, 35, 0.08)`
  - `shadow-modal`: `0 12px 32px rgba(37, 41, 35, 0.16)`

---

## 3. Reusable Shared Component Catalog

### 3.1 Buttons (`components/common/Button.tsx`)
- **Variants:**
  - `primary`: Forest green fill (`bg-primary-container`), hover pine (`bg-primary`), white text.
  - `secondary`: Warm bordered surface (`bg-surface-container`, `border-outline`).
  - `amber`: Low-confidence review actions (`bg-tertiary-fixed`, border `#FCD34D`).
  - `destructive`: Red action for permanent slip deletion (`bg-error`).
  - `outline`: Clean transparent border.
  - `ghost`: Borderless hover pill.
- **States:** Full loading spinner (`isLoading={true}`), disabled opacity (`50%`), active scale depression (`active:scale-[0.98]`).

### 3.2 Form Controls
- **`Input.tsx`:**
  - Supports `isCurrency={true}` with prefixed Indian Rupee (`₹`) symbol and automatic `tabular-nums`.
  - Password visibility toggle (`Eye` / `EyeOff`).
  - Search clear button (`onClear`).
  - Error state with high-contrast red label and helper text.
- **`Select.tsx`:**
  - Custom chevron down icon, styled border and focus states.
- **`Dropdown.tsx`:**
  - Keyboard-accessible popup menu with ESC dismissal and click-outside listener.

### 3.3 Cards & Metric Primitives (`components/common/Card.tsx`)
- **`Card`:** Base container with 1px border and warm card shadow.
- **`MetricCard`:** Displays high-priority financial metrics with Rupee formatting, trend arrows (e.g. `+12.4% vs Sept`), and status badges.
- **`ReviewAlertCard`:** High-visibility amber banner alerting merchants to unverified bills needing attention.

### 3.4 Status Chips & Badges (`components/common/Badge.tsx`)
- **`verified`:** Emerald green pill with checkmark.
- **`needs_checking`:** Warm amber pill with warning triangle.
- **`error`:** Crimson pill with alert circle.
- **`category`:** Sage pill for commodity categorization (Edible oils, grains, spices).
- **`draft`:** Clock icon for unprocessed vouchers.

### 3.5 Modals & Dialogs
- **`Modal.tsx`:** Accessible backdrop blur, focus trap, smooth entrance zoom, responsive sizes (`sm`, `md`, `lg`, `xl`, `full`).
- **`ConfirmationDialog.tsx`:** Guardrail modal for irreversible actions (e.g., discarding a bill or deleting a supplier record).

### 3.6 Navigation & Feedback
- **`Tabs.tsx`:** Supports both `segmented` (pill tabs with count counters) and `underline` (classic ledger tab) variants.
- **`Breadcrumbs.tsx`:** Hierarchical store navigation path.
- **`Tooltip.tsx`:** Hover/focus informative tooltip.
- **`Skeleton.tsx` & `TableSkeleton.tsx`:** Shimmer loading state.
- **`EmptyState.tsx`:** Friendly empty view with illustration, title, description, and primary/secondary CTA.
- **`LoadingIndicator.tsx`:** Includes `OCRAssistantProgress` rendering the 4-stage live extraction pipeline.
- **`ToastContext.tsx`:** Global notification toasts with automatic timeout.

### 3.7 Data Presentation
- **`PageHeader.tsx`:** Title, subtitle, breadcrumbs, status tag, and action toolbar.
- **`FilterToolbar.tsx`:** Search input, status filter dropdowns, date range picker, and clear all.
- **`DataTable.tsx`:** Generic typed table with sorting, tabular numerals, checkbox selection, row click handlers, and empty/skeleton states.

### 3.8 Responsive Application Shell (`components/layout/AppShell.tsx`)
- **Sidebar (Desktop `w-72`):**
  - Brand header with ShopLedger logo and subtitle.
  - Prominent `+ Upload Receipt` button.
  - Core navigation links with active state pill and badge counters.
  - Store profile switcher at bottom with multi-branch dropdown.
- **Top Bar (Sticky `h-16`):**
  - Branch location indicator.
  - Global search bar with `Ctrl + K` visual prompt.
  - Theme toggle (light/dark switch).
  - Notifications bell with unread dot.
  - User avatar dropdown.
- **Mobile Navigation (Sticky Bottom Bar `h-16`):**
  - 5-tab thumb-friendly layout: Home, Receipts, Upload (+ center action button), Analysis, Ask AI.

---

## 4. Visual Verification & Showcase Page

The design system and all application routes have been validated through live interactive components and verified through automated builds:

### Route-to-Stitch Reference Mapping
| Route | Component | Matching Stitch Reference | Notes |
|---|---|---|---|
| `/` | `LandingPage.tsx` | `shopledger_your_shop_s_records_finally_in_order` | Public hero, comparison, and trust assurances |
| `/login` | `AuthPage.tsx` | `authentication_shopledger` (Sign In tab) | Email/Phone + PIN login, guest link |
| `/signup` | `AuthPage.tsx` | `authentication_shopledger` (Sign Up tab) | Shop name, business type selector |
| `/explore` | `GuestDashboardPage.tsx` | `guest_exploration_dashboard_shopledger` | Conspicuous DEMO header, synthetic sample data |
| `/dashboard` | `DashboardPage.tsx` | `dashboard_shopledger_1` & `_2` | KPI cards, evening tally, category spend, recent bills |
| `/receipts` | `ReceiptsPage.tsx` | `your_purchase_receipts_shopledger` | Status tabs (`Needs checking`, `Verified`), filter toolbar |
| `/receipts/new`, `/receipts/upload` | `UploadReceiptPage.tsx` | `add_purchase_receipt_shopledger` & `receipt_processing_shopledger` | 3 ingestion modalities + 4-stage OCR tracker |
| `/receipts/:receiptId` | `ReceiptDetailPage.tsx` | `receipt_detail_gupta_wholesale_mart_shopledger` | High-res scan (#GW-8941), GST slabs, audit log |
| `/receipts/:receiptId/review` | `ReviewReceiptPage.tsx` | `review_receipt_shopledger_1` & `_2` | Split-screen canvas (zoom/rotate/boxes) + editable table |
| `/analysis` | `SpendingAnalysisPage.tsx` | `spending_analysis_shopledger_1` & `_2` | Actionable insights, category spend, wholesale price tracker |
| `/ask-shopledger` | `AskShopLedgerPage.tsx` | `ask_shopledger_shopledger_1` & `_2` | Conversational AI, comparison cards, receipt citations |
| `/suppliers/:supplierId` | `SupplierDetailPage.tsx` | `supplier_details_gupta_wholesale_mart_shopledger` | Vendor CRM, notes editor, procurement ledger |
| `/items/:itemId` | `ItemDetailPage.tsx` | `item_details_fortune_kachi_ghani_mustard_oil_shopledger` | SKU rate divergence history across invoices |
| `/suppliers` | `SuppliersPage.tsx` | Derived from Supplier CRM | Master supplier directory with spend ranking |
| `/catalog` | `CatalogPage.tsx` | Derived from Item Catalog | Master commodity index with 30-day rate ranges |
| `/settings` | `SettingsPage.tsx` | Derived from `first_time_onboarding_shopledger` | Store profile, GST settings, AI confidence cutoff |
| `/profile` | `ProfilePage.tsx` | Derived from Store Switcher | Merchant owner profile, branch status, logout |
| `/help` | `HelpPage.tsx` | Derived from Kirana Help Drawers | Thermal paper tips, mandi slip guidelines, FAQs |
| `*` | `NotFoundPage.tsx` | Tailored Fallback | Clean 404 with return to dashboard CTA |

### Verification Summary
- **Vite Production Build:** Verified passing with zero TypeScript errors (`tsc -b && vite build` -> Exit code 0).
- **Local Server Probed:** `http://localhost:4173` returned HTTP 200 with complete HTML hydration across all public and authenticated routes.
- **Responsive Inspection:** Tested across desktop (1280px+), tablet (768px - 1023px), and mobile (< 768px) breakpoints.
- **Keyboard Navigation:** All interactive elements feature visible focus rings (`focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`).
- **Dark Mode Compatibility:** Toggleable instantly via header sun/moon button with Basalt palette preservation.
