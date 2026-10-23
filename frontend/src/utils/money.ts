/**
 * ShopLedger Financial Arithmetic & Currency Utilities
 *
 * Financial values in ShopLedger are stored as integer minor units (paise for INR).
 * 1 Rupee (₹) = 100 Paise.
 *
 * Storing currency as integers prevents IEEE-754 binary floating-point precision
 * errors (such as 0.1 + 0.2 = 0.30000000000000004) across all calculations.
 */

export const CURRENCY_CODE = 'INR';
export const CURRENCY_SYMBOL = '₹';
export const MINOR_UNITS_PER_MAJOR = 100;

/**
 * Converts integer paise into fractional rupees (for display or formula calculations).
 * e.g. 14250 paise -> 142.50 rupees
 */
export function paiseToRupees(paise: number | undefined | null): number {
  if (paise === undefined || paise === null || isNaN(paise)) return 0;
  return paise / MINOR_UNITS_PER_MAJOR;
}

/**
 * Converts decimal rupees into integer paise.
 * Uses Math.round to protect against floating point inaccuracy during input parsing.
 * e.g. 142.50 rupees -> 14250 paise
 */
export function rupeesToPaise(rupees: number | undefined | null): number {
  if (rupees === undefined || rupees === null || isNaN(rupees)) return 0;
  return Math.round(rupees * MINOR_UNITS_PER_MAJOR);
}

/**
 * Formats integer paise into an Indian Rupee currency string using Indian number grouping (Lakhs / Crores).
 * e.g. 15000000 paise -> ₹1,50,000.00
 */
export function formatPaise(
  paise: number | undefined | null,
  options: {
    showSymbol?: boolean;
    compact?: boolean;
    decimals?: number;
  } = {}
): string {
  const { showSymbol = true, compact = false, decimals = 2 } = options;
  const rupees = paiseToRupees(paise);

  if (compact && Math.abs(rupees) >= 10000000) {
    // Crores
    const cr = (rupees / 10000000).toFixed(2);
    return `${showSymbol ? CURRENCY_SYMBOL : ''}${cr} Cr`;
  }

  if (compact && Math.abs(rupees) >= 100000) {
    // Lakhs
    const lk = (rupees / 100000).toFixed(2);
    return `${showSymbol ? CURRENCY_SYMBOL : ''}${lk} L`;
  }

  if (compact && Math.abs(rupees) >= 1000) {
    // Thousands
    const k = (rupees / 1000).toFixed(1);
    return `${showSymbol ? CURRENCY_SYMBOL : ''}${k} k`;
  }

  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(rupees);

  return showSymbol ? `${CURRENCY_SYMBOL}${formatted}` : formatted;
}

/**
 * Safely sums an array of minor unit amounts.
 */
export function sumMinor(amounts: (number | undefined | null)[]): number {
  return amounts.reduce<number>((acc, curr) => acc + (curr ? Math.round(curr) : 0), 0);
}

/**
 * Calculates tax in minor units given a base minor amount and a percentage rate (e.g., 5, 12, 18, 28).
 */
export function calculateTaxMinor(amountMinor: number, taxRatePercent: number): number {
  if (!amountMinor || !taxRatePercent) return 0;
  return Math.round((amountMinor * taxRatePercent) / 100);
}

/**
 * Calculates line total in minor units: (quantity * unitPriceMinor) - discountMinor + taxMinor
 */
export function calculateLineTotalMinor(params: {
  quantity: number;
  unitPriceMinor: number;
  discountMinor?: number;
  taxRatePercent?: number;
}): {
  baseMinor: number;
  discountMinor: number;
  taxMinor: number;
  lineTotalMinor: number;
} {
  const quantity = Math.max(0, params.quantity || 0);
  const unitPriceMinor = Math.max(0, Math.round(params.unitPriceMinor || 0));
  const baseMinor = Math.round(quantity * unitPriceMinor);
  const discountMinor = Math.max(0, Math.round(params.discountMinor || 0));
  const taxableMinor = Math.max(0, baseMinor - discountMinor);
  const taxMinor = calculateTaxMinor(taxableMinor, params.taxRatePercent || 0);
  const lineTotalMinor = taxableMinor + taxMinor;

  return {
    baseMinor,
    discountMinor,
    taxMinor,
    lineTotalMinor,
  };
}
