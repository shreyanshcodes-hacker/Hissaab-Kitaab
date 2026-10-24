import { apiClient, getActiveTenantContext } from './client';
import { receiptService } from './receiptService';
import { DEMO_RECEIPTS } from '../data/demoData';
import type { ChatMessage, Receipt } from '../types';

function getChatStorageKey(): string {
  const { businessId, isGuestMode } = getActiveTenantContext();
  return `shopledger_chat_${isGuestMode ? 'guest' : businessId || 'default'}`;
}

function loadSessionMessages(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(getChatStorageKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessionMessages(messages: ChatMessage[]): void {
  try {
    sessionStorage.setItem(getChatStorageKey(), JSON.stringify(messages.slice(-40)));
  } catch {
    // Ignore storage quota errors
  }
}

export function isScopeAllowedClient(message: string, hasHistory = false): boolean {
  const text = message.toLowerCase().trim();
  if (!text) return false;

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
  if (injectionPatterns.some((pat) => text.includes(pat))) {
    return false;
  }

  const offTopicPatterns = [
    'write a poem',
    'write a story',
    'write python',
    'javascript code',
    'who is the president',
    'prime minister',
    'world cup',
    'cricket score',
    'weather in',
    'movie review',
    'recipe for',
    'horoscope',
    'bitcoin',
    'stock market',
  ];
  if (offTopicPatterns.some((off) => text.includes(off))) {
    return false;
  }

  const domainKeywords = [
    'bill', 'bills', 'receipt', 'receipts', 'invoice', 'invoices', 'voucher', 'vouchers',
    'spend', 'spent', 'spending', 'cost', 'price', 'prices', 'rate', 'rates', 'total', 'amount',
    'rupee', 'rupees', 'rs', '₹', 'margin', 'discount', 'expensive', 'cheapest', 'lowest', 'highest',
    'supplier', 'suppliers', 'vendor', 'vendors', 'wholesaler', 'party', 'mandi', 'distributor',
    'oil', 'sugar', 'atta', 'flour', 'rice', 'dal', 'pulses', 'salt', 'tea', 'chai', 'soap',
    'detergent', 'biscuit', 'snack', 'namkeen', 'spices', 'masala', 'milk', 'dairy', 'ghee',
    'parle', 'fortune', 'amul', 'tata', 'balaji', 'gupta', 'rk', 'r.k.', 'motherson', 'himalaya', 'patel',
    'item', 'items', 'product', 'products', 'category', 'categories', 'catalog', 'inventory', 'stock',
    'quantity', 'kg', 'bag', 'pouch', 'liter', 'box', 'carton', 'packet',
    'udhar', 'credit', 'paid', 'unpaid', 'payment', 'cash', 'upi', 'cheque',
    'ledger', 'bahi', 'khata', 'gst', 'gstin', 'tax', 'slab', 'hsn',
    'review', 'check', 'checking', 'verify', 'verified', 'pending', 'flagged', 'draft', 'confirm',
    'help', 'how', 'upload', 'feature', 'features', 'camera', 'scan', 'shopledger', 'hissaab', 'kitaab', 'setting', 'profile',
    'shop', 'store', 'kirana', 'branch', 'godown', 'analytics', 'dashboard', 'trend', 'summary', 'report',
    'buy', 'bought', 'purchase', 'purchased', 'order', 'ordered', 'compare', 'comparison',
    'month', 'week', 'today', 'yesterday', 'year', 'date', 'recent', 'last', 'top',
    'hi', 'hello', 'namaste', 'tally', 'kitna', 'kya', 'kaun', 'sabse', 'sasta', 'mehnga', 'hisab', 'kharcha', 'maal',
  ];

  if (domainKeywords.some((kw) => text.includes(kw))) {
    return true;
  }

  if (
    hasHistory &&
    ['why', 'when', 'which', 'who', 'what about', 'and for', 'show me', 'more', 'details', 'list'].some((f) =>
      text.includes(f)
    )
  ) {
    return true;
  }

  return false;
}

async function buildGroundedFallbackReply(
  query: string,
  hasHistory: boolean
): Promise<Omit<ChatMessage, 'id' | 'sender' | 'timestamp'>> {
  const clean = query.trim();
  const lower = clean.toLowerCase();

  if (!isScopeAllowedClient(clean, hasHistory)) {
    return {
      text: 'I am Hissaab Kitaab’s shopkeeper bookkeeping assistant. I can only answer questions regarding your store’s purchase receipts, wholesale prices, suppliers, bahi khata ledger, or how to use Hissaab Kitaab features. Please ask a question related to your store.',
      citedReceiptIds: [],
    };
  }

  if (lower.includes('how to') || lower.includes('camera') || lower.includes('scan') || lower.includes('upload')) {
    return {
      text:
        'To add and verify receipts in Hissaab Kitaab:\n\n1. Tap **+ Upload Receipt** in the sidebar or on your dashboard.\n2. Snap a photo using your phone camera or drag a PDF/JPG invoice.\n3. Hissaab Kitaab automatically extracts line items, quantities, and GST rates.\n4. Jump into the **Review Workspace** (`/receipts/:id/review`) to verify flagged items and commit to your Bahi Khata.',
      citedReceiptIds: [],
    };
  }

  const { isGuestMode } = getActiveTenantContext();
  let receipts: Receipt[] = [];
  if (isGuestMode) {
    receipts = [...DEMO_RECEIPTS];
  } else {
    receipts = await receiptService.getReceipts({ limit: 50 }).catch(() => []);
  }

  const confirmed = receipts.filter((r) => r.status === 'verified');
  const needsReview = receipts.filter((r) => r.status === 'needs_review');

  if (lower.includes('review') || lower.includes('pending') || lower.includes('flagged') || lower.includes('check')) {
    if (needsReview.length === 0) {
      return {
        text: 'All purchase vouchers in your store are currently verified and cleared! There are zero pending review flags.',
        citedReceiptIds: [],
      };
    }
    return {
      text:
        `You currently have **${needsReview.length} purchase bills** flagged for review due to low OCR confidence or arithmetic discrepancies:\n\n` +
        needsReview
          .map((r) => `• **${r.supplierName}** (Bill #${r.invoiceNo}) on ${r.billDate} — ₹${r.grandTotal.toLocaleString('en-IN')}`)
          .join('\n') +
        '\n\nYou can verify these now in the Review Workspace.',
      citedReceiptIds: needsReview.map((r) => r.id),
    };
  }

  if (isGuestMode && (lower.includes('mustard') || lower.includes('oil') || lower.includes('lowest') || lower.includes('rate') || lower.includes('rice') || lower.includes('sugar'))) {
    return {
      text:
        'Based on your verified store bills, you purchased **Fortune Kachi Ghani Mustard Oil 1L** across wholesale invoices:\n\n' +
        '• **Lowest Rate:** ₹142.00 / Pouch from **Gupta Wholesale Mart** (24 Oct 2024)\n' +
        '• **Highest Rate:** ₹148.00 / Pouch from **Shree Balaji Traders** (23 Oct 2024)\n\n' +
        'Buying from **Gupta Wholesale Mart** saved you **₹6.00 / Pouch** compared to other vendors.',
      structuredCard: {
        type: 'supplier_comparison',
        title: 'Wholesale Rate Benchmark: Fortune Kachi Ghani Mustard Oil 1L',
        data: {
          item: 'Fortune Kachi Ghani Mustard Oil 1L',
          cheapest: {
            supplier: 'Gupta Wholesale Mart',
            rate: '₹142.00',
            date: '2024-10-24',
          },
          highest: {
            supplier: 'Shree Balaji Traders',
            rate: '₹148.00',
            date: '2024-10-23',
          },
          spread: '₹6.00',
        },
      },
      citedReceiptIds: ['REC-2024-1089', 'REC-2024-1088'],
    };
  }

  const totalSpend = confirmed.reduce((acc, r) => acc + r.grandTotal, 0);

  // Try calling Gemini 3.8 Flash directly with the grounded store context
  const geminiKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
  const geminiModel = import.meta.env.VITE_GEMINI_MODEL || 'gemini-3.8-flash';

  if (geminiKey) {
    try {
      const storeContext = {
        confirmedReceiptsCount: confirmed.length,
        totalConfirmedSpendRupees: totalSpend,
        needsReviewCount: needsReview.length,
        confirmedBills: confirmed.slice(0, 10).map((r) => ({
          id: r.id,
          invoiceNo: r.invoiceNo,
          supplier: r.supplierName,
          date: r.billDate,
          totalRupees: r.grandTotal,
          items: (r.items || []).slice(0, 8).map((it) => ({
            name: it.name,
            qty: it.quantity,
            unit: it.unit,
            rate: it.unitRate,
            total: it.lineTotal,
          })),
        })),
        pendingReviewBills: needsReview.slice(0, 5).map((r) => ({
          id: r.id,
          invoiceNo: r.invoiceNo,
          supplier: r.supplierName,
          date: r.billDate,
          totalRupees: r.grandTotal,
        })),
      };

      const aiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text:
                      `SYSTEM: You are Hissaab Kitaab AI, a concise, grounded bookkeeping assistant for an Indian retail/Kirana merchant.\n` +
                      `STRICT RULES: Answer ONLY using the verified store JSON context below or explain how Hissaab Kitaab features work. Never invent totals or transactions. Format currency in ₹.\n` +
                      `STORE CONTEXT: ${JSON.stringify(storeContext)}\n\n` +
                      `MERCHANT QUESTION: ${clean}`,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (aiRes.ok) {
        const aiJson = await aiRes.json();
        const aiText = aiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (aiText && aiText.trim().length > 0) {
          return {
            text: aiText.trim(),
            citedReceiptIds: confirmed.slice(0, 3).map((r) => r.id),
          };
        }
      }
    } catch {
      // Fall back to deterministic summary below
    }
  }

  if (confirmed.length === 0) {
    return {
      text:
        `Your store ledger currently has **0 confirmed purchase bills** (₹0.00 total spend)` +
        (needsReview.length > 0 ? ` and **${needsReview.length} bill(s)** awaiting review.` : '.') +
        `\n\nOnce you upload or manually create and confirm purchase bills, I can compare supplier rates, calculate category totals, and answer specific item price questions for your store.`,
      citedReceiptIds: needsReview.slice(0, 3).map((r) => r.id),
    };
  }

  return {
    text:
      `I analyzed your store's bahi khata records. You currently have **${confirmed.length} confirmed purchase bill(s)** totaling **₹${totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}**` +
      (needsReview.length > 0 ? `, and **${needsReview.length} bill(s)** awaiting review in your inbox.` : '.') +
      `\n\nYou can ask me about supplier spend totals, bills pending verification, or item rate comparisons.`,
    citedReceiptIds: confirmed.slice(0, 3).map((r) => r.id),
  };
}

export const chatService = {
  async getMessages(): Promise<ChatMessage[]> {
    return loadSessionMessages();
  },

  clearMessages(): void {
    saveSessionMessages([]);
  },

  async sendMessage(query: string): Promise<ChatMessage> {
    const existingMessages = loadSessionMessages();
    const historyPayload = existingMessages.slice(-8).map((m) => ({
      role: m.sender === 'user' ? ('user' as const) : ('model' as const),
      text: m.text,
    }));

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const updatedMessages = [...existingMessages, userMsg];
    saveSessionMessages(updatedMessages);

    const { isGuestMode, businessId } = getActiveTenantContext();

    if (!isGuestMode && businessId) {
      try {
        const res: any = await apiClient.post(
          '/chat',
          { message: query, history: historyPayload },
          false,
          businessId
        );
        if (res?.data) {
          const assistantMsg: ChatMessage = {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            text: res.data.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            structuredCard: res.data.structuredCard,
            citedReceiptIds: (res.data.citations || []).map((c: any) => c.receiptId),
          };
          saveSessionMessages([...updatedMessages, assistantMsg]);
          return assistantMsg;
        }
      } catch (err: any) {
        console.warn('[ChatService] Backend request failed, using grounded client engine:', err);
      }
    }

    const fallback = await buildGroundedFallbackReply(query, historyPayload.length > 0);
    const fallbackMsg: ChatMessage = {
      id: `assistant-${Date.now()}`,
      sender: 'assistant',
      ...fallback,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    saveSessionMessages([...updatedMessages, fallbackMsg]);
    return fallbackMsg;
  },
};
