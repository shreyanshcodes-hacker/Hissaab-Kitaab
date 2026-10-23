import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { db } from '../config/firebase-admin.js';
import { logger } from '../utils/logger.js';
import type { Receipt, ReceiptLineItem } from '../types/models.js';

export interface ChatCitation {
  receiptId: string;
  invoiceNumber?: string;
  supplierName: string;
  date: string;
  amountRupees?: number;
}

export interface StructuredCard {
  type: 'supplier_comparison' | 'price_trend' | 'financial_summary' | 'feature_guide';
  title?: string;
  data: any;
}

export class ChatService {
  private aiClient: GoogleGenAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY) {
      this.aiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    }
    logger.info(`ChatService initialized (Gemini: ${Boolean(this.aiClient)})`);
  }

  /**
   * Evaluates if a query is within the permissible scope of ShopLedger.
   * ShopLedger Assistant answers questions ONLY about store procurement records or app features.
   */
  isScopeAllowed(message: string): boolean {
    const text = message.toLowerCase().trim();

    // Block obvious jailbreaks / prompt injection attempts
    const injectionPatterns = [
      'ignore previous instructions',
      'system prompt',
      'disregard all prior',
      'jailbreak',
      'reveal your instructions',
      'api_key',
      'private key',
      'delete from',
      'drop table',
      '<script',
      'eval(',
    ];
    for (const pat of injectionPatterns) {
      if (text.includes(pat)) {
        return false;
      }
    }

    // Explicit domain keywords related to retail bookkeeping, procurement, mandi, bills, products, or app help
    const domainKeywords = [
      'bill',
      'receipt',
      'invoice',
      'voucher',
      'spend',
      'spent',
      'cost',
      'price',
      'rate',
      'supplier',
      'vendor',
      'mandi',
      'oil',
      'sugar',
      'atta',
      'flour',
      'rice',
      'dal',
      'parle',
      'fortune',
      'amul',
      'tata',
      'balaji',
      'gupta',
      'item',
      'inventory',
      'stock',
      'udhar',
      'credit',
      'paid',
      'unpaid',
      'ledger',
      'bahi khata',
      'gst',
      'tax',
      'review',
      'check',
      'verify',
      'help',
      'how to',
      'upload',
      'features',
      'camera',
      'scan',
      'shopledger',
      'hi',
      'hello',
      'namaste',
      'tally',
    ];

    return domainKeywords.some((kw) => text.includes(kw));
  }

  /**
   * Processes a business-aware assistant query grounded in verified receipts.
   */
  async processChatQuery(
    businessId: string,
    message: string,
    _history?: { role: 'user' | 'model'; text: string }[]
  ) {
    const rawClean = message.trim();

    // 1. Enforce strict conversational scope
    if (!this.isScopeAllowed(rawClean)) {
      return {
        message:
          'I am ShopLedger’s shopkeeper bookkeeping assistant. I can only answer questions regarding your store’s purchase receipts, wholesale prices, suppliers, bahi khata ledger, or how to use ShopLedger features. Please ask a question related to your store.',
        citations: [],
        structuredCard: null,
        timestamp: new Date().toISOString(),
      };
    }

    // 2. Deterministically retrieve the store's receipts and line items
    const receiptsRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('receipts')
      .where('isDeleted', '==', false);

    const snapshot = await receiptsRef.get();
    const allReceipts = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() })) as Receipt[];
    const confirmedReceipts = allReceipts.filter((r) => r.reviewStatus === 'verified' || r.reviewStatus === 'reconciled');
    const needsReviewReceipts = allReceipts.filter((r) => r.reviewStatus === 'needs_review');

    // Fetch line items for confirmed receipts
    const allLineItems: Array<ReceiptLineItem & { receiptDate: string; supplierName: string }> = [];
    for (const r of confirmedReceipts) {
      try {
        const itemSnap = await db
          .collection('businesses')
          .doc(businessId)
          .collection('receipts')
          .doc(r.id)
          .collection('items')
          .get();

        for (const doc of itemSnap.docs) {
          const it = doc.data() as ReceiptLineItem;
          allLineItems.push({
            ...it,
            receiptDate: r.purchaseDate || r.receiptDate,
            supplierName: r.supplier?.name || 'Unknown',
          });
        }
      } catch {
        // Skip missing subcollection
      }
    }

    const lower = rawClean.toLowerCase();
    let replyText = '';
    let citations: ChatCitation[] = [];
    let structuredCard: StructuredCard | null = null;

    // Pattern 1: App Feature / How-To Questions
    if (lower.includes('how to') || lower.includes('camera') || lower.includes('scan') || lower.includes('upload') || lower.includes('use')) {
      replyText =
        'To add and verify receipts in ShopLedger:\n\n1. Tap **+ Upload Bill** in the top navigation or on your dashboard.\n2. Snap a photo using your phone camera or drag a PDF/JPG invoice.\n3. ShopLedger automatically extracts line items, quantities, and GST rates.\n4. If handwriting is ambiguous, jump into the **Review Workspace** (`/receipts/:id/review`) to adjust values and commit directly to your Bahi Khata ledger.';
      structuredCard = {
        type: 'feature_guide',
        title: 'How ShopLedger Works',
        data: {
          steps: [
            '1. Snap or Upload voucher',
            '2. Automatic Gemini OCR vision extraction',
            '3. 5-Second Review Workspace verification',
            '4. Permanent commit to bahi khata & spending analytics',
          ],
        },
      };
      return {
        message: replyText,
        citations: [],
        structuredCard,
        timestamp: new Date().toISOString(),
      };
    }

    // Pattern 2: Needs Review / Unverified Bills
    if (lower.includes('review') || lower.includes('needs check') || lower.includes('pending') || lower.includes('flagged')) {
      if (needsReviewReceipts.length === 0) {
        replyText = 'All purchase vouchers in your store are currently verified and cleared! There are zero pending review flags.';
      } else {
        replyText = `You currently have **${needsReviewReceipts.length} purchase bills** flagged for review due to low OCR confidence or arithmetic discrepancies:\n\n` +
          needsReviewReceipts
            .map(
              (r) =>
                `• **${r.supplier?.name || 'Wholesale Supplier'}** (Bill #${r.invoiceNumber || r.id}) on ${r.purchaseDate} — ₹${((r.grandTotalMinor || 0) / 100).toFixed(2)}`
            )
            .join('\n') +
          '\n\nYou can verify these now in the Review Workspace.';
        citations = needsReviewReceipts.map((r) => ({
          receiptId: r.id,
          invoiceNumber: r.invoiceNumber,
          supplierName: r.supplier?.name || 'Supplier',
          date: r.purchaseDate,
          amountRupees: (r.grandTotalMinor || 0) / 100,
        }));
      }
      return {
        message: replyText,
        citations,
        structuredCard: null,
        timestamp: new Date().toISOString(),
      };
    }

    // Pattern 3: Specific Supplier Spend Query (e.g. Balaji, Gupta, R.K. Agro, Delhi Flour, Patel)
    const knownSuppliers = ['gupta', 'balaji', 'r.k.', 'motherson', 'himalaya', 'delhi flour', 'patel'];
    let matchedSupplierKw = knownSuppliers.find((kw) => lower.includes(kw));

    if (!matchedSupplierKw && (lower.includes('supplier') || lower.includes('vendor'))) {
      const vendorMatch =
        lower.match(/(?:to|from|for|with)\s+([a-z0-9\s]+?)\s+(?:supplier|vendor|bills|vouchers)/i) ||
        lower.match(/(?:supplier|vendor)\s+([a-z0-9\s]+)/i);
      if (vendorMatch && vendorMatch[1].trim().length > 2) {
        matchedSupplierKw = vendorMatch[1].trim();
      }
    }

    if (matchedSupplierKw) {
      const supplierBills = confirmedReceipts.filter((r) =>
        (r.supplier?.name || '').toLowerCase().includes(matchedSupplierKw)
      );

      if (supplierBills.length === 0) {
        replyText = `I couldn't find any confirmed purchase receipts for supplier "${matchedSupplierKw}" in your recorded store records.`;
      } else {
        const totalMinor = supplierBills.reduce((acc, r) => acc + (r.grandTotalMinor || 0), 0);
        const totalRupees = totalMinor / 100;
        const supName = supplierBills[0].supplier?.name || 'Supplier';

        replyText = `You have recorded **${supplierBills.length} confirmed bills** from **${supName}** totaling **₹${totalRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}**:\n\n` +
          supplierBills
            .map(
              (r) =>
                `• Bill #${r.invoiceNumber || r.id} on ${r.purchaseDate}: ₹${((r.grandTotalMinor || 0) / 100).toLocaleString('en-IN')}`
            )
            .join('\n');

        citations = supplierBills.map((r) => ({
          receiptId: r.id,
          invoiceNumber: r.invoiceNumber,
          supplierName: supName,
          date: r.purchaseDate,
          amountRupees: (r.grandTotalMinor || 0) / 100,
        }));

        structuredCard = {
          type: 'financial_summary',
          title: `Procurement Outflow: ${supName}`,
          data: {
            supplierName: supName,
            totalBills: supplierBills.length,
            totalSpentRupees: totalRupees,
            lastPurchaseDate: supplierBills[0].purchaseDate,
          },
        };
      }
      return {
        message: replyText,
        citations,
        structuredCard,
        timestamp: new Date().toISOString(),
      };
    }

    // Pattern 4: Item Price / Vendor Comparison (e.g. Mustard Oil, Sugar, Atta, Rice, or queried product)
    const itemKeywords = [
      { key: 'mustard', label: 'Fortune Kachi Ghani Mustard Oil 1L' },
      { key: 'oil', label: 'Edible Oils' },
      { key: 'sugar', label: 'Madhur Pure Sugar M-30' },
      { key: 'atta', label: 'Aashirvaad Shudh Chakki Atta 10kg' },
      { key: 'rice', label: 'Basmati Rice Daily Feast 25kg' },
      { key: 'salt', label: 'Tata Salt Vacuum Evaporated 1kg' },
    ];
    let matchedItem = itemKeywords.find((it) => lower.includes(it.key));

    const isRateOrItemQuery =
      lower.includes('rate') ||
      lower.includes('price') ||
      lower.includes('lowest') ||
      lower.includes('cheapest') ||
      lower.includes('cost');

    if (!matchedItem && isRateOrItemQuery) {
      const words = lower
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !['what', 'was', 'the', 'lowest', 'highest', 'paid', 'rate', 'rates', 'price', 'cost', 'store', 'shop', 'bills', 'item', 'items', 'for'].includes(w));

      const foundItemLine = allLineItems.find((l) =>
        words.some((w) => {
          const regex = new RegExp(`\\b${w}\\b`, 'i');
          return regex.test(l.rawName) || regex.test(l.category);
        })
      );

      if (foundItemLine) {
        matchedItem = { key: foundItemLine.rawName.toLowerCase(), label: foundItemLine.rawName };
      } else {
        const queriedSubject = words.join(' ') || 'this item';
        return {
          message: `No confirmed purchase bills found for "${queriedSubject}" in your store records. You can upload an invoice containing this item to begin price tracking.`,
          citations: [],
          structuredCard: null,
          timestamp: new Date().toISOString(),
        };
      }
    }

    if (matchedItem) {
      const relevantLines = allLineItems.filter((l) =>
        l.rawName.toLowerCase().includes(matchedItem.key) || l.category.toLowerCase().includes(matchedItem.key)
      );

      if (relevantLines.length === 0) {
        replyText = `I checked your verified records, but found no confirmed purchase lines for **${matchedItem.label}**. Try scanning a recent wholesale chit to start price tracking.`;
      } else {
        // Group lines by rate
        relevantLines.sort((a, b) => (a.unitPriceMinor || 0) - (b.unitPriceMinor || 0));
        const lowest = relevantLines[0];
        const highest = relevantLines[relevantLines.length - 1];

        const lowestRate = (lowest.unitPriceMinor || 0) / 100;
        const highestRate = (highest.unitPriceMinor || 0) / 100;

        replyText =
          `Based on your recorded bills, you purchased **${matchedItem.label}** across **${relevantLines.length} invoices**:\n\n` +
          `• **Lowest Rate:** ₹${lowestRate.toFixed(2)} / ${lowest.unit} from **${lowest.supplierName}** (${lowest.receiptDate})\n` +
          `• **Highest Rate:** ₹${highestRate.toFixed(2)} / ${highest.unit} from **${highest.supplierName}** (${highest.receiptDate})\n\n` +
          (lowestRate < highestRate
            ? `Buying from **${lowest.supplierName}** saved you **₹${(highestRate - lowestRate).toFixed(2)} / ${lowest.unit}** compared to other vendors.`
            : `Rates have been consistent across your orders at ₹${lowestRate.toFixed(2)} / ${lowest.unit}.`);

        citations = relevantLines.map((l) => ({
          receiptId: l.receiptId,
          supplierName: l.supplierName,
          date: l.receiptDate,
          amountRupees: (l.lineTotalMinor || 0) / 100,
        }));

        structuredCard = {
          type: 'supplier_comparison',
          title: `Wholesale Rate Benchmark: ${matchedItem.label}`,
          data: {
            item: matchedItem.label,
            cheapest: {
              supplier: lowest.supplierName,
              rate: `₹${lowestRate.toFixed(2)}`,
              date: lowest.receiptDate,
            },
            highest: {
              supplier: highest.supplierName,
              rate: `₹${highestRate.toFixed(2)}`,
              date: highest.receiptDate,
            },
            spread: `₹${(highestRate - lowestRate).toFixed(2)}`,
          },
        };
      }
      return {
        message: replyText,
        citations,
        structuredCard,
        timestamp: new Date().toISOString(),
      };
    }

    // Pattern 5: General store summary / open-ended grounded Gemini answer
    const totalConfirmedSpend = confirmedReceipts.reduce((acc, r) => acc + (r.grandTotalMinor || 0), 0) / 100;
    replyText =
      `I analyzed your store's bahi khata records. You currently have **${confirmedReceipts.length} confirmed purchase bills** totaling **₹${totalConfirmedSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}**` +
      (needsReviewReceipts.length > 0 ? `, and **${needsReviewReceipts.length} bills** awaiting review in your inbox.` : '.') +
      `\n\nYou can ask me about supplier price comparisons (e.g. "Which vendor gave me lowest price for mustard oil?"), specific supplier spend totals, or recent price hikes.`;

    if (this.aiClient && env.GEMINI_API_KEY) {
      try {
        const boundedContext = {
          confirmedReceiptsCount: confirmedReceipts.length,
          totalConfirmedSpendRupees: totalConfirmedSpend,
          needsReviewCount: needsReviewReceipts.length,
          recentBills: confirmedReceipts.slice(0, 6).map((r) => ({
            id: r.id,
            invoiceNumber: r.invoiceNumber,
            supplier: r.supplier?.name,
            date: r.purchaseDate,
            totalRupees: (r.grandTotalMinor || 0) / 100,
          })),
          sampleLineItems: allLineItems.slice(0, 12).map((l) => ({
            name: l.rawName,
            supplier: l.supplierName,
            unitRateRupees: (l.unitPriceMinor || 0) / 100,
            unit: l.unit,
            date: l.receiptDate,
          })),
        };

        const aiResponse = await this.aiClient.models.generateContent({
          model: env.GEMINI_MODEL || 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text:
                    `SYSTEM: You are ShopLedger AI, a concise, grounded bookkeeping assistant for an Indian Kirana store.\n` +
                    `STRICT RULES: Answer ONLY using the verified store JSON context below. Never invent totals or transactions. Format currency in ₹.\n` +
                    `VERIFIED STORE CONTEXT: ${JSON.stringify(boundedContext)}\n\n` +
                    `MERCHANT QUESTION: ${rawClean}`,
                },
              ],
            },
          ],
        });

        if (aiResponse.text && aiResponse.text.trim().length > 0) {
          replyText = aiResponse.text.trim();
        }
      } catch (err: any) {
        logger.warn('Gemini chat generation fell back to deterministic summary:', err?.message || err);
      }
    }

    citations = confirmedReceipts.slice(0, 3).map((r) => ({
      receiptId: r.id,
      invoiceNumber: r.invoiceNumber,
      supplierName: r.supplier?.name || 'Supplier',
      date: r.purchaseDate,
      amountRupees: (r.grandTotalMinor || 0) / 100,
    }));

    return {
      message: replyText,
      citations,
      structuredCard: null,
      timestamp: new Date().toISOString(),
    };
  }
}

export const chatService = new ChatService();
