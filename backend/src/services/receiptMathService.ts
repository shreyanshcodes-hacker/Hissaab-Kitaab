import { calculateLineTotalMinor, formatPaise } from '../utils/money.js';

export interface ReconciliationCheckResult {
  isBalanced: boolean;
  calculatedSubtotalMinor: number;
  calculatedTaxMinor: number;
  calculatedDiscountMinor: number;
  calculatedGrandTotalMinor: number;
  printedGrandTotalMinor: number;
  varianceMinor: number;
  discrepancyWarning?: string;
  flaggedItemsCount: number;
}

export class ReceiptMathService {
  /**
   * Cross-verifies extracted or edited line items against printed receipt totals.
   */
  reconcileTotals(
    items: Array<{
      quantity: number;
      unitPriceMinor: number;
      discountMinor?: number;
      taxRatePercent?: number;
      lineTotalMinor?: number;
      confidenceScore?: number;
      needsReview?: boolean;
    }>,
    printedTotals: {
      subtotalMinor?: number;
      taxTotalMinor?: number;
      discountTotalMinor?: number;
      grandTotalMinor?: number;
    }
  ): ReconciliationCheckResult {
    let calculatedSubtotalMinor = 0;
    let calculatedDiscountMinor = 0;
    let calculatedTaxMinor = 0;
    let flaggedItemsCount = 0;

    for (const item of items) {
      const calc = calculateLineTotalMinor({
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
        discountMinor: item.discountMinor,
        taxRatePercent: item.taxRatePercent,
      });

      calculatedSubtotalMinor += calc.baseMinor;
      calculatedDiscountMinor += calc.discountMinor;
      calculatedTaxMinor += calc.taxMinor;

      if (item.needsReview || (item.confidenceScore !== undefined && item.confidenceScore < 0.85)) {
        flaggedItemsCount++;
      }
    }

    const calculatedGrandTotalMinor =
      calculatedSubtotalMinor - calculatedDiscountMinor + calculatedTaxMinor;

    const printedGrandTotalMinor =
      printedTotals.grandTotalMinor !== undefined
        ? printedTotals.grandTotalMinor
        : calculatedGrandTotalMinor;

    const varianceMinor = Math.abs(calculatedGrandTotalMinor - printedGrandTotalMinor);

    // Variance threshold: 100 paise (₹1.00) to allow for minor rounding on paper cash memos
    const isBalanced = varianceMinor <= 100;

    let discrepancyWarning: string | undefined;
    if (!isBalanced) {
      const formattedDiff = formatPaise(varianceMinor);
      const direction = calculatedGrandTotalMinor > printedGrandTotalMinor ? 'higher' : 'lower';
      discrepancyWarning = `Calculated items sum (${formatPaise(calculatedGrandTotalMinor)}) is ${formattedDiff} ${direction} than printed bill total (${formatPaise(printedGrandTotalMinor)}). Please inspect highlighted line items.`;
    }

    return {
      isBalanced,
      calculatedSubtotalMinor,
      calculatedTaxMinor,
      calculatedDiscountMinor,
      calculatedGrandTotalMinor,
      printedGrandTotalMinor,
      varianceMinor,
      discrepancyWarning,
      flaggedItemsCount,
    };
  }
}

export const receiptMathService = new ReceiptMathService();
