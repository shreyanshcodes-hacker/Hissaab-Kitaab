import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Download,
  ExternalLink,
  RefreshCw,
  Pencil,
  Check,
  X,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { receiptService } from '../api/receiptService';
import type { Receipt as ReceiptType } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { exportReceiptSlipPdf, downloadOriginalVoucherImage } from '../utils/exportSlip';

export const ReceiptDetailPage: React.FC = () => {
  const { receiptId = 'REC-2024-1089' } = useParams<{ receiptId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isHindi } = useLanguage();

  const [receipt, setReceipt] = useState<ReceiptType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isReScanning, setIsReScanning] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editedInvoiceNo, setEditedInvoiceNo] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await receiptService.getReceiptById(receiptId);
        if (data) {
          setReceipt(data);
          // Auto-heal any previously saved receipt that has a real image but 0 extracted total
          const hasImage = Boolean(data.sourceVoucherUrl && data.sourceVoucherUrl.startsWith('data:image/'));
          const needsAiHeal =
            hasImage &&
            (data.grandTotal === 0 ||
              data.supplierName.toLowerCase().startsWith('counter receipt') ||
              (data.items.length === 1 && data.items[0].name === 'Item' && data.items[0].lineTotal === 0));

          if (needsAiHeal) {
            setIsReScanning(true);
            try {
              const healed = await receiptService.reExtractExistingReceipt(data);
              setReceipt(healed);
            } catch {
              // Keep existing receipt data if re-extraction fails
            } finally {
              setIsReScanning(false);
            }
          }
        }
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

  const handleExportSlip = async () => {
    if (!receipt || isExporting) return;
    setIsExporting(true);
    try {
      await exportReceiptSlipPdf(
        receipt,
        user?.shopName || 'My Store',
        user?.displayName || 'Store Owner'
      );
      showToast({
        type: 'success',
        title: 'Voucher Slip Downloaded',
        message: `Saved Hissaab_Kitaab_Slip_${receipt.invoiceNo}.pdf to your device.`,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Export Failed',
        message: err?.message || 'Unable to generate PDF slip.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleReScanWithAi = async () => {
    if (!receipt || isReScanning) return;
    setIsReScanning(true);
    try {
      const updated = await receiptService.reExtractExistingReceipt(receipt);
      setReceipt(updated);
      showToast({
        type: 'success',
        title: 'Receipt Re-Scanned by Gemini AI',
        message: `Extracted ${updated.items.length} item(s) from ${updated.supplierName} (₹${updated.grandTotal.toLocaleString('en-IN')}).`,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Re-Scan Failed',
        message: err?.message || 'Could not re-extract image.',
      });
    } finally {
      setIsReScanning(false);
    }
  };

  const handleDeleteReceipt = async () => {
    if (!receipt) return;
    setIsDeleting(true);
    try {
      await receiptService.deleteReceipt(receipt.id);
      showToast({
        type: 'success',
        title: isHindi ? 'बिल हटाया गया' : 'Receipt Deleted',
        message: isHindi
          ? `वाउचर "${receipt.invoiceNo}" बही-खाते से हटा दिया गया है।`
          : `Receipt "${receipt.invoiceNo}" has been removed from your ledger.`,
      });
      navigate('/receipts');
    } catch (err: any) {
      showToast({
        type: 'error',
        title: isHindi ? 'हटाने में त्रुटि' : 'Failed to delete receipt',
        message: err?.message || (isHindi ? 'कृपया पुनः प्रयास करें।' : 'Please try again.'),
      });
      setIsDeleting(false);
    }
  };

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
    <div className="space-y-6 pb-16 min-w-0 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/receipts')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="self-start sm:self-auto"
          >
            Back to Receipts
          </Button>
          <div className="min-w-0 flex-1">
            {isEditingName ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Supplier / Receipt Name"
                  className="px-3 py-1.5 rounded-xl border border-primary bg-surface-container-lowest text-on-surface font-bold text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px]"
                  autoFocus
                />
                <input
                  type="text"
                  value={editedInvoiceNo}
                  onChange={(e) => setEditedInvoiceNo(e.target.value)}
                  placeholder="Invoice #"
                  className="px-2.5 py-1.5 rounded-xl border border-outline bg-surface-container-lowest text-on-surface font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary w-36"
                />
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isSavingName}
                  onClick={async () => {
                    if (!editedName.trim()) return;
                    setIsSavingName(true);
                    try {
                      const updated = await receiptService.updateReceiptName(
                        receipt.id,
                        editedName.trim(),
                        editedInvoiceNo.trim()
                      );
                      setReceipt(
                        updated || {
                          ...receipt,
                          supplierName: editedName.trim(),
                          invoiceNo: editedInvoiceNo.trim() || receipt.invoiceNo,
                        }
                      );
                      setIsEditingName(false);
                      showToast({
                        type: 'success',
                        title: 'Receipt Name Saved',
                        message: `Updated receipt name to "${editedName.trim()}".`,
                      });
                    } finally {
                      setIsSavingName(false);
                    }
                  }}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingName(false)}
                  leftIcon={<X className="w-4 h-4" />}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-headline-lg text-lg sm:text-2xl font-bold text-on-surface break-words">
                  {receipt.supplierName} (#{receipt.invoiceNo})
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    setEditedName(receipt.supplierName);
                    setEditedInvoiceNo(receipt.invoiceNo);
                    setIsEditingName(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-label-xs font-bold bg-surface-container hover:bg-surface-container-high text-primary border border-outline/60 transition-colors"
                  title="Edit Supplier / Receipt Name"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Name</span>
                </button>
                <Badge variant={receipt.status === 'verified' ? 'verified' : 'needs_checking'} icon={true}>
                  {receipt.status === 'verified' ? 'Verified in Ledger' : 'Needs Checking'}
                </Badge>
              </div>
            )}
            <p className="text-label-xs text-on-surface-variant mt-0.5">
              Bill Date: {receipt.billDate} • Store: {user?.shopName || 'My Store'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {receipt.sourceVoucherUrl && receipt.sourceVoucherUrl.startsWith('data:image/') && (
            <Button
              variant="ghost"
              size="sm"
              isLoading={isReScanning}
              onClick={handleReScanWithAi}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              {isReScanning ? (isHindi ? 'AI स्कैन हो रहा है…' : 'Scanning AI…') : (isHindi ? 'AI री-स्कैन' : 'Re-Scan AI')}
            </Button>
          )}
          <Button
            variant={receipt.status === 'needs_review' ? 'amber' : 'outline'}
            size="sm"
            onClick={() => navigate(`/receipts/${receipt.id}/review`)}
          >
            {receipt.status === 'needs_review'
              ? isHindi ? 'सामान जांचें' : 'Verify Lines'
              : isHindi ? 'जांचें और बदलें' : 'Review & Edit'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            isLoading={isExporting}
            onClick={handleExportSlip}
            leftIcon={<Download className="w-4 h-4" />}
          >
            {isExporting ? (isHindi ? 'एक्सपोर्ट हो रहा है…' : 'Exporting…') : (isHindi ? 'पर्ची डाउनलोड' : 'Export Slip')}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            {isHindi ? 'बिल हटाएं' : 'Delete'}
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
              <span className="text-label-xs text-on-surface-variant font-mono">{receipt.invoiceNo}</span>
            </h3>

            <div className="aspect-3/4 w-full bg-[#1B1E19] rounded-xl border border-outline flex items-center justify-center p-3 text-center overflow-hidden">
              {receipt.sourceVoucherUrl && receipt.sourceVoucherUrl !== 'manual-entry' ? (
                <img
                  src={receipt.sourceVoucherUrl}
                  alt={receipt.supplierName}
                  className="w-full h-full object-contain rounded"
                />
              ) : (
                <div className="w-full h-full bg-[#FAF9F4] text-[#1B1C19] rounded p-4 text-[0.625rem] font-mono overflow-hidden shadow">
                  <p className="font-bold text-xs uppercase tracking-wider">{receipt.supplierName}</p>
                  <p className="text-on-surface-variant">M/s: {user?.shopName || 'My Store'}</p>
                  <div className="my-2 border-b border-dashed border-black/30" />
                  <p>Tax Invoice: {receipt.invoiceNo}</p>
                  <p>Date: {receipt.billDate}</p>
                  <div className="mt-3 text-left space-y-1">
                    {receipt.items.slice(0, 6).map((it) => (
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
              )}
            </div>

            <div className="flex flex-col items-center gap-2">
              <p className="text-[0.6875rem] text-on-surface-variant text-center">
                {receipt.sourceVoucherUrl && receipt.sourceVoucherUrl !== 'manual-entry'
                  ? 'Original uploaded bill image preserved in tenant storage'
                  : 'Digital voucher summary generated from recorded entry'}
              </p>
              {receipt.sourceVoucherUrl && receipt.sourceVoucherUrl !== 'manual-entry' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center text-xs"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  onClick={() => {
                    downloadOriginalVoucherImage(receipt);
                    showToast({
                      type: 'success',
                      title: 'Original Image Downloaded',
                      message: `Saved Voucher_Scan_${receipt.invoiceNo}.jpg`,
                    });
                  }}
                >
                  Download Original Scan (.jpg)
                </Button>
              )}
            </div>
          </Card>

          {/* Supplier Price Intelligence Card */}
          <Card className="p-4 bg-tertiary-fixed/30 border-tertiary-fixed-dim/60 space-y-2">
            <div className="flex items-center gap-2 text-tertiary-on-fixed font-bold text-xs">
              <TrendingUp className="w-4 h-4 text-tertiary" />
              <span>Supplier Rate Intelligence</span>
            </div>
            {receipt.items.length > 0 ? (
              <>
                <p className="text-body-sm text-xs text-on-surface-variant leading-relaxed">
                  <strong>{receipt.items[0].name}</strong> on this invoice was billed at{' '}
                  <strong>
                    ₹{receipt.items[0].unitRate.toFixed(2)}/{receipt.items[0].unit}
                  </strong>{' '}
                  from <strong>{receipt.supplierName}</strong>.
                </p>
                <button
                  onClick={() => navigate('/items')}
                  className="text-label-xs text-primary font-bold hover:underline flex items-center gap-1"
                >
                  Inspect Item Price Catalog <ExternalLink className="w-3 h-3" />
                </button>
              </>
            ) : (
              <p className="text-body-sm text-xs text-on-surface-variant leading-relaxed">
                Verify line items on this bill to track unit rate history across suppliers.
              </p>
            )}
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
                  <span>Processed via Gemini 3.8 Flash Vision ({receipt.billDate})</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-verified flex-shrink-0" />
                  <span>
                    {receipt.status === 'verified'
                      ? `Verified by ${user?.displayName || 'Store Owner'} (${user?.role || 'Owner'})`
                      : `Pending review by ${user?.displayName || 'Store Owner'}`}
                  </span>
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

      {/* Delete Confirmation Modal */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteReceipt}
        title={isHindi ? 'क्या आप यह बिल हटाना चाहते हैं?' : 'Delete This Receipt?'}
        message={
          receipt ? (
            <div className="space-y-2 text-left">
              <p>
                {isHindi
                  ? 'क्या आप वाकई इस बिल को बही-खाते से हटाना चाहते हैं?'
                  : 'Are you sure you want to delete this purchase receipt from your store records?'}
              </p>
              <div className="p-3 rounded-lg bg-surface-container-low border border-outline text-xs space-y-1">
                <div>
                  <strong>{isHindi ? 'सप्लायर:' : 'Supplier:'}</strong> {receipt.supplierName}
                </div>
                <div>
                  <strong>{isHindi ? 'बिल नंबर:' : 'Bill / Invoice No:'}</strong> {receipt.invoiceNo}
                </div>
                <div>
                  <strong>{isHindi ? 'रकम:' : 'Amount:'}</strong> ₹{receipt.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <p className="text-xs text-error font-medium">
                {isHindi
                  ? 'यह कार्रवाई बही-खाते और खर्च विश्लेषण के कुल योग को अपडेट कर देगी।'
                  : 'This will update your store procurement balance and spending totals.'}
              </p>
            </div>
          ) : ''
        }
        confirmText={isHindi ? 'हाँ, बिल हटाएं' : 'Delete Receipt'}
        cancelText={isHindi ? 'रद्द करें' : 'Cancel'}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
