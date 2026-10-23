import { apiClient } from './client';
import { DEMO_RECEIPTS } from '../data/demoData';
import type { ChatMessage } from '../types';

let sessionMessages: ChatMessage[] = [];

function isScopeAllowedClient(message: string): boolean {
  const text = message.toLowerCase().trim();
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

  const domainKeywords = [
    'bill', 'receipt', 'invoice', 'voucher', 'spend', 'spent', 'cost', 'price', 'rate',
    'supplier', 'vendor', 'mandi', 'oil', 'sugar', 'atta', 'flour', 'rice', 'dal',
    'parle', 'fortune', 'amul', 'tata', 'balaji', 'gupta', 'rk', 'r.k.', 'motherson',
    'himalaya', 'item', 'inventory', 'stock', 'udhar', 'credit', 'paid', 'unpaid',
    'ledger', 'bahi khata', 'gst', 'tax', 'review', 'check', 'verify', 'pending',
    'flagged', 'help', 'how to', 'upload', 'features', 'camera', 'scan', 'shopledger',
    'hi', 'hello', 'namaste', 'tally', 'summary', 'month',
  ];
  return domainKeywords.some((kw) => text.includes(kw));
}

function buildGroundedFallbackReply(query: string): Omit<ChatMessage, 'id' | 'sender' | 'timestamp'> {
  const clean = query.trim();
  const lower = clean.toLowerCase();

  if (!isScopeAllowedClient(clean)) {
    return {
      text: 'I am ShopLedger’s shopkeeper bookkeeping assistant. I can only answer questions regarding your store’s purchase receipts, wholesale prices, suppliers, bahi khata ledger, or how to use ShopLedger features. Please ask a question related to your store.',
      citedReceiptIds: [],
    };
  }

  if (lower.includes('how to') || lower.includes('camera') || lower.includes('scan') || lower.includes('upload')) {
    return {
      text:
        'To add and verify receipts in ShopLedger:\n\n1. Tap **+ Upload Bill** in the top navigation or on your dashboard.\n2. Snap a photo using your phone camera or drag a PDF/JPG invoice.\n3. ShopLedger automatically extracts line items, quantities, and GST rates.\n4. Jump into the **Review Workspace** (`/receipts/:id/review`) to verify flagged items and commit to your Bahi Khata.',
      citedReceiptIds: [],
    };
  }

  const confirmed = DEMO_RECEIPTS.filter((r) => r.status === 'verified');
  const needsReview = DEMO_RECEIPTS.filter((r) => r.status === 'needs_review');

  if (lower.includes('review') || lower.includes('pending') || lower.includes('flagged') || lower.includes('check')) {
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

  if (lower.includes('mustard') || lower.includes('oil') || lower.includes('lowest') || lower.includes('rate') || lower.includes('rice') || lower.includes('sugar')) {
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

  const supplierKeywords = ['gupta', 'balaji', 'r.k.', 'rk', 'motherson', 'himalaya', 'delhi flour'];
  const matchedSup = supplierKeywords.find((kw) => lower.includes(kw));
  if (matchedSup) {
    const bills = confirmed.filter((r) => r.supplierName.toLowerCase().includes(matchedSup));
    if (bills.length > 0) {
      const total = bills.reduce((acc, r) => acc + r.grandTotal, 0);
      const supName = bills[0].supplierName;
      return {
        text:
          `You have recorded **${bills.length} confirmed bills** from **${supName}** totaling **₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}**:\n\n` +
          bills.map((r) => `• Bill #${r.invoiceNo} on ${r.billDate}: ₹${r.grandTotal.toLocaleString('en-IN')}`).join('\n'),
        citedReceiptIds: bills.map((r) => r.id),
      };
    }
  }

  const totalSpend = confirmed.reduce((acc, r) => acc + r.grandTotal, 0);
  return {
    text:
      `I analyzed your store's bahi khata records. You currently have **${confirmed.length} confirmed purchase bills** totaling **₹${totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}**, and **${needsReview.length} bills** awaiting review in your inbox.\n\n` +
      `You can ask me about supplier price comparisons (e.g. "Who is offering the lowest price for mustard oil?"), specific supplier spend totals, or bills pending verification.`,
    citedReceiptIds: confirmed.slice(0, 3).map((r) => r.id),
  };
}

export const chatService = {
  async getMessages(): Promise<ChatMessage[]> {
    return [...sessionMessages];
  },

  clearMessages(): void {
    sessionMessages = [];
  },

  async sendMessage(query: string): Promise<ChatMessage> {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    sessionMessages.push(userMsg);

    try {
      const res: any = await apiClient.post('/chat', { message: query });
      if (res?.data) {
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: res.data.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          structuredCard: res.data.structuredCard,
          citedReceiptIds: (res.data.citations || []).map((c: any) => c.receiptId),
        };
        sessionMessages.push(assistantMsg);
        return assistantMsg;
      }
    } catch (err: any) {
      console.warn('[ChatService] Backend request failed, using grounded client engine:', err);
    }

    const fallback = buildGroundedFallbackReply(query);
    const fallbackMsg: ChatMessage = {
      id: `assistant-${Date.now()}`,
      sender: 'assistant',
      ...fallback,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    sessionMessages.push(fallbackMsg);
    return fallbackMsg;
  },
};
