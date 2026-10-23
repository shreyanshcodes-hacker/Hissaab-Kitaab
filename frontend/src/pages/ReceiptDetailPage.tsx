import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Download,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { receiptService } from '../api/receiptService';
import type { Receipt as ReceiptType } from '../types';
import { useToast } from '../context/ToastContext';

export const ReceiptDetailPage: React.FC = () => {
  const { receiptId = 'REC-2024-1089' } = useParams<{ receiptId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [receipt, setReceipt] = useState<ReceiptType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await receiptService.getReceiptById(receiptId);
        if (data) setReceipt(data);
      } catch (err: any) {
        showToast({
          type: 'error',
          title: 'Error loading receipt',
          message: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [receiptId, showToast]);

  if (isLoading || !receipt) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-body-sm text-on-surface-variant animate-pulse">
          Loading receipt details…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/receipts')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Receipts
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-lg text-2xl font-bold text-on-surface">
                {receipt.supplierName} (#{receipt.invoiceNo})
              </h1>
              <Badge variant={receipt.status === 'verified' ? 'verified' : 'needs_checking'} icon={true}>
                {receipt.status === 'verified' ? 'Verified in Ledger' : 'Needs Checking'}
              </Badge>
            </div>
            <p className="text-label-xs text-on-surface-variant mt-0.5">
              Bill Date: {receipt.billDate} • Mandi: {receipt.mandiMarket || 'Khari Baoli'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={receipt.status === 'needs_review' ? 'amber' : 'outline'}
            size="sm"
            onClick={() => navigate(`/receipts/${receipt.id}/review`)}
          >
            {receipt.status === 'needs_review' ? 'Verify Lines' : 'Review & Edit'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              showToast({
                type: 'success',
                title: 'Exporting Voucher',
                message: `Downloading PDF export for #${receipt.invoiceNo}`,
              })
            }
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export Slip
          </Button>
        </div>
      </div>

      {/* Grid: Left Scan Preview, Right Detailed Ledger Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Scan View (4 Columns) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="font-headline-sm text-base font-bold text-on-surface flex items-center justify-between">
              <span>Original Voucher Scan</span>
              <span className="text-label-xs text-on-surface-variant font-mono">GW-8941</span>
            </h3>

            <div className="aspect-3/4 w-full bg-[#1B1E19] rounded-xl border border-outline flex items-center justify-center p-3 text-center">
              <div className="w-full h-full bg-[#FAF9F4] text-[#1B1C19] rounded p-4 text-[0.625rem] font-mono overflow-hidden shadow">
                <p className="font-bold text-xs uppercase tracking-wider">GUPTA WHOLESALE MART</p>
                <p className="text-on-surface-variant">Khari Baoli • Old Delhi</p>
                <div className="my-2 border-b border-dashed border-black/30" />
                <p>Tax Invoice: GW-8941</p>
                <p>Date: {receipt.billDate}</p>
                <div className="mt-3 text-left space-y-1">
                  {receipt.items.slice(0, 4).map((it) => (
                    <div key={it.id} className="flex justify-between">
                      <span className="truncate max-w-[120px]">{it.name}</span>
                      <span>₹{it.lineTotal.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-2 border-t border-dashed border-black/30 font-bold flex justify-between">
                  <span>Grand Total:</span>
                  <span>₹{receipt.grandTotal.toFixed(0)}</span>
                </div>
              </div>
            </div>

            <p className="text-[0.6875rem] text-on-surface-variant text-center">
              Scanned voucher archived in Cloud Storage (read-only)
            </p>
          </Card>

          {/* Supplier Price Intelligence Card */}
          <Card className="p-4 bg-tertiary-fixed/30 border-tertiary-fixed-dim/60 space-y-2">
            <div className="flex items-center gap-2 text-tertiary-on-fixed font-bold text-xs">
              <TrendingUp className="w-4 h-4 text-tertiary" />
              <span>Supplier Rate Intelligence</span>
            </div>
            <p className="text-body-sm text-xs text-on-surface-variant leading-relaxed">
              Fortune Mustard Oil on this invoice was billed at <strong>₹148.00/L</strong>. This is
              ₹6.00 higher than what Shree Balaji billed you on 16 Oct (₹142.00/L).
            </p>
            <button
              onClick={() => navigate('/items/item-fortune-mustard-1l')}
              className="text-label-xs text-primary font-bold hover:underline flex items-center gap-1"
            >
              Inspect Fortune Oil Price History <ExternalLink className="w-3 h-3" />
            </button>
          </Card>
        </div>

        {/* Right Ledger Breakdown (8 Columns) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Commercial Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-surface-container-lowest border border-outline shadow-card">
            <div>
              <span className="text-label-xs text-on-surface-variant uppercase font-semibold">
                Payment Mode
              </span>
              <p className="font-bold text-body-lg text-on-surface capitalize mt-0.5">
                {receipt.paymentMode.replace('_', ' ')}
              </p>
            </div>
            <div>
              <span className="text-label-xs text-on-surface-variant uppercase font-semibold">
                Payment Status
              </span>
              <p className="font-bold text-body-lg text-verified capitalize mt-0.5">
                {receipt.paymentStatus}
              </p>
            </div>
            <div>
              <span className="text-label-xs text-on-surface-variant uppercase font-semibold">
                Subtotal
              </span>
              <p className="font-bold text-body-lg text-on-surface tabular-nums mt-0.5">
                ₹{receipt.subtotal.toFixed(2)}
              </p>
            </div>
            <div>
              <span className="text-label-xs text-on-surface-variant uppercase font-semibold">
                Grand Total
              </span>
              <p className="font-bold text-body-lg text-primary tabular-nums mt-0.5">
                ₹{receipt.grandTotal.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline shadow-card space-y-4">
            <h3 className="font-headline-sm text-base font-bold text-on-surface">
              Verified Line Items ({receipt.items.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-body-sm">
                <thead>
                  <tr className="border-b border-outline bg-surface-container-low text-label-xs font-semibold text-on-surface-variant">
                    <th className="p-3">Item Description</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-center">Quantity</th>
                    <th className="p-3 text-right">Unit Rate</th>
                    <th className="p-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline/60">
                  {receipt.items.map((it) => (
                    <tr key={it.id} className="hover:bg-surface-container-low/60">
                      <td className="p-3 font-semibold text-on-surface">{it.name}</td>
                      <td className="p-3">
                        <Badge variant="category" size="xs">
                          {it.category}
                        </Badge>
                      </td>
                      <td className="p-3 text-center tabular-nums">
                        {it.quantity} {it.unit}
                      </td>
                      <td className="p-3 text-right tabular-nums font-medium">
                        ₹{it.unitRate.toFixed(2)}
                      </td>
                      <td className="p-3 text-right tabular-nums font-bold text-on-surface">
                        ₹{it.lineTotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* GST Slabs & Audit Trail */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tax Reconciliation */}
            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline shadow-card space-y-2">
              <h4 className="font-headline-sm text-body-md font-bold text-on-surface">
                GST Tax Reconciliation
              </h4>
              <div className="text-body-sm space-y-1 text-on-surface-variant">
                <div className="flex justify-between">
                  <span>Taxable Amount (5% Slab):</span>
                  <span className="tabular-nums font-semibold text-on-surface">
                    ₹{receipt.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>CGST (2.5%):</span>
                  <span className="tabular-nums font-semibold text-on-surface">
                    ₹{(receipt.taxTotal / 2).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>SGST (2.5%):</span>
                  <span className="tabular-nums font-semibold text-on-surface">
                    ₹{(receipt.taxTotal / 2).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-outline font-bold text-on-surface">
                  <span>Total Tax Cleared:</span>
                  <span className="tabular-nums">₹{receipt.taxTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Audit Trail & Operator Log */}
            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline shadow-card space-y-2">
              <h4 className="font-headline-sm text-body-md font-bold text-on-surface">
                Audit Trail & AI Log
              </h4>
              <ul className="text-label-xs text-on-surface-variant space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-verified flex-shrink-0" />
                  <span>OCR extracted via Gemini 2.5 Vision on 24 Oct, 08:45 PM</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-verified flex-shrink-0" />
                  <span>Verified by Ramesh Sharma (Owner) on 24 Oct, 09:10 PM</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Permanent Bahi Khata record locked against cross-tenant access</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
