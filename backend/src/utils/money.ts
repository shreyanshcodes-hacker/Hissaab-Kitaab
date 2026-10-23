/**
 * ShopLedger Backend Financial Arithmetic & Currency Utilities
 *
 * All amounts are represented in integer minor units (paise for INR).
 * 100 paise = 1 Indian Rupee (₹).
 */

export const CURRENCY_CODE = 'INR';
export const MINOR_UNITS_PER_MAJOR = 100;

export function paiseToRupees(paise: number | undefined | null): number {
  if (paise === undefined || paise === null || isNaN(paise)) return 0;
  return paise / MINOR_UNITS_PER_MAJOR;
}

export function rupeesToPaise(rupees: number | undefined | null): number {
  if (rupees === undefined || rupees === null || isNaN(rupees)) return 0;
  return Math.round(rupees * MINOR_UNITS_PER_MAJOR);
}

export function sumMinor(amounts: (number | undefined | null)[]): number {
  return amounts.reduce<number>((acc, curr) => acc + (curr ? Math.round(curr) : 0), 0);
}

export function formatPaise(
  paise: number | undefined | null,
  options: { showSymbol?: boolean; decimals?: number } = {}
): string {
  const { showSymbol = true, decimals = 2 } = options;
  const rupees = paiseToRupees(paise);
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(rupees);
  return showSymbol ? `₹${formatted}` : formatted;
}

export function calculateTaxMinor(amountMinor: number, taxRatePercent: number): number {
  if (!amountMinor || !taxRatePercent) return 0;
  return Math.round((amountMinor * taxRatePercent) / 100);
}

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
