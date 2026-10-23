---
name: ShopLedger
colors:
  surface: '#faf9f4'
  surface-dim: '#dbdad5'
  surface-bright: '#faf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f4ef'
  surface-container: '#efeee9'
  surface-container-high: '#e9e8e3'
  surface-container-highest: '#e3e3de'
  on-surface: '#1b1c19'
  on-surface-variant: '#404943'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f1ec'
  outline: '#707973'
  outline-variant: '#c0c9c2'
  surface-tint: '#316951'
  primary: '#04442f'
  on-primary: '#ffffff'
  primary-container: '#245c45'
  on-primary-container: '#99d2b5'
  inverse-primary: '#99d3b6'
  secondary: '#57615b'
  on-secondary: '#ffffff'
  secondary-container: '#dbe5dd'
  on-secondary-container: '#5d6760'
  tertiary: '#5d3000'
  on-tertiary: '#ffffff'
  tertiary-container: '#7f4300'
  on-tertiary-container: '#ffb77d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b5efd1'
  primary-fixed-dim: '#99d3b6'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#16503a'
  secondary-fixed: '#dbe5dd'
  secondary-fixed-dim: '#bfc9c1'
  on-secondary-fixed: '#151d19'
  on-secondary-fixed-variant: '#404943'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#faf9f4'
  on-background: '#1b1c19'
  surface-variant: '#e3e3de'
typography:
  display:
    fontFamily: Inter
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: 2.75rem
    letterSpacing: -0.02em
  display-mobile:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: '700'
    lineHeight: 2.25rem
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '700'
    lineHeight: 2rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  currency-stat:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: '700'
    lineHeight: 2rem
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.25rem
  label-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
  label-xs:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

ShopLedger balances the timeless dependability of the traditional red-cloth Indian ledger (*bahi khata*) with the efficiency of modern computer vision. The target audience encompasses Indian kirana owners, small merchant traders, and multi-generational family storekeepers who demand immediate utility, utter clarity, and zero ambiguity. 

The aesthetic is grounded, warm, and utilitarian—rejecting ephemeral Silicon Valley SaaS gradients and noisy neon accents in favor of a tactile, print-inspired visual environment. Surfaces mimic warm, natural paper sheets while primary accents carry the dignity of deep evergreen currency notes. Plain English action labels (e.g., "Money spent", "Bought from", "Confirm & save") supersede technical accounting jargon to build lasting trust and rapid daily muscle memory.

## Colors

The palette grounds high-speed daily retail bookkeeping in calming, organic tones with high contrast ratios (WCAG AAA compliant for critical figures and text).

- **Background & Canvas:** Primary canvas uses Warm Ivory (`#FAF9F4`) in light mode and Deep Basalt (`#161815`) in dark mode to relieve eyestrain during prolonged tallying.
- **Surfaces & Cards:** Crisp White (`#FFFFFF`) layered over Ivory with Warm Neutral secondary card backing (`#F4F2EA`) framed by fine tactile borders (`#E6E2D6`).
- **Primary Brand & Actions:** Forest Green (`#245C45`), transitioning to deeper pine (`#1B4735`) on hover, and luminous sage-emerald (`#388465`) in dark mode. Signals financial balance, growth, and trust.
- **Secondary Surfaces & Badges:** Soft Sage (`#E5EFE7`) bordered by Pale Jade (`#C2DAC7`) for neutral tags, receipt metadata, and category pills.
- **Text & Hierarchy:** Deep Charcoal (`#252923`) for primary amounts and headings, Earth Olive (`#5C6359`) for secondary labels, and Muted Khaki (`#878E84`) for non-critical timestamps.
- **Feedback & Extraction Status:**
  - *Needs Checking (AI Low Confidence):* Warm Amber (`#D97706`) paired with `#FEF3C7` background and `#FCD34D` outline.
  - *Error / Out of Balance:* Crimson (`#DC2626`) on `#FEE2E2`.
  - *Verified / Cleared:* Calming Emerald (`#15803D`) on `#DCFCE7`.

## Typography

The design system relies on **Inter** for its neutral construction, open aperture, and tabular numeric features.

### Numbers and Currency Rule
All prices, quantities, and cash metrics must enforce `font-feature-settings: "tnum" 1, "cv05" 1` (tabular figures and clean Indian Rupee symbol glyphs). This ensures strict vertical alignment across ledger sheets and receipt line-items.

### Content Tone and Vocabulary
- Never use abstract accounting abstractions where tangible shop terms exist:
  - Use **"Money received"** instead of *Accounts Receivable*.
  - Use **"Money spent"** instead of *Debited Capital / Accounts Payable*.
  - Use **"Bought from"** instead of *Vendor / Supplier Entity*.
  - Use **"Needs checking"** instead of *Pending AI Anomaly Heuristic*.
  - Use **"Confirm & save"** instead of *Commit Transaction*.

## Layout & Spacing

ShopLedger utilizes a fluid, flexible 12-column grid system designed for rapid keyboard-driven desktop entry during night reconciliation, as well as single-column density on shop-floor mobile screens.

- **Desktop (1024px+):** Fixed max-width workspace container (`1280px`), 12 columns, `1.5rem` gutters, and `2rem` outer margin. Dual-column balance allows side-by-side verification: original receipt scan pinned on the left, extracted ledger line-items on the right.
- **Tablet (768px - 1023px):** 8 columns, `1rem` gutters, collapsible navigation drawer.
- **Mobile (< 768px):** Single vertical stream with persistent sticky bottom action bars for thumb-reachable saving (`Confirm & save`), `1rem` outer canvas padding, and compact horizontal card gutters.

## Elevation & Depth

Visual hierarchy uses physical, paper-like layering rather than deep multi-tier digital blurs.

- **Surface Base:** Flat, un-elevated Warm Ivory (`#FAF9F4`) background.
- **Surface Level 1 (Receipt/Ledger Cards):** Pure White (`#FFFFFF`) with 1px border (`#E6E2D6`) and a soft, warm ambient micro-shadow: `box-shadow: 0 1px 3px rgba(37, 41, 35, 0.06)`.
- **Surface Level 2 (Selected Row / Active Modal / Drawer):** Elevated with a diffused warm shadow: `box-shadow: 0 4px 12px rgba(37, 41, 35, 0.08)`.
- **Low-Confidence Highlight:** Flat 1px solid stroke (`#FCD34D`) combined with an interior amber fill (`#FEF3C7`), bypassing shadows entirely to ensure visual priority on data integrity checks.

## Shapes

The design system employs a **Rounded** shape profile (`roundedness: 2`), yielding 10px to 14px outer corner radii (`0.5rem` base, up to `0.75rem` - `1rem` for larger card containers).

- **Standard Elements (Buttons, Inputs, Table Cells):** `0.5rem` (8px - 10px) to balance modern softness with dense, non-wasted screen area.
- **Containers (Receipt Preview Panels, Ledger Groupings):** `0.75rem` to `1rem` (12px - 14px) for distinct structural containment.
- **Status Tags & Badges:** `9999px` (Pill shape) to contrast sharply with rectangular grid rows.

## Components

### Buttons
- **Primary Action ("Confirm & save", "Upload bill"):** Deep forest green background (`#245C45`), pure white text, bold `0.875rem`, `0.5rem` border radius, minimum height of 44px for thumb accessibility. Hover shifts to `#1B4735`.
- **Secondary Action ("Add manual line", "Cancel"):** Transparent fill with 1.5px solid warm border (`#E6E2D6`), text `#252923`. Hover shifts to `#F4F2EA`.
- **Destructive Action ("Delete bill"):** Crisp `#DC2626` text, light red hover fill (`#FEE2E2`).

### AI Review Status Chips & Badges
- **Needs Checking (Low Confidence):** Muted amber text (`#D97706`), amber fill (`#FEF3C7`), and border (`#FCD34D`). Accompanied by a warning dot icon. Clicking opens the cropped receipt coordinate popup.
- **Verified / Clean:** Calming emerald text (`#15803D`) with pale green tint (`#DCFCE7`).

### Ledger Input Fields & Tables
- **Table Structure:** Border-bottom only (`#E6E2D6`), alternating row hover fill (`#FAF9F4`). Numbers use clean tabular alignment (`font-variant-numeric: tabular-nums; text-align: right;`).
- **Inputs:** Clean white interior, `1px solid #E6E2D6` border, `0.5rem` radius. On focus, outline changes to Forest Green (`#245C45`) with no harsh blue default glow.

### Receipt Inspector Card
- Split-screen or card overlay showing the uploaded paper receipt on one side with bounding boxes corresponding to extracted item names, taxes, and amounts. Yellow bounding boxes highlight values flagged as "Needs checking".

### Checkboxes & Radios
- Forest green checked fill with white checkmark. 20px x 20px hit target to comfortably support non-mouse stylus or thumb taps.