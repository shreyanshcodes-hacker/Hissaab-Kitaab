import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Download,
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
import type { Receipt as ReceiptType, PaymentMode, PaymentStatus } from '../types';
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
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [voucherDisplayMode, setVoucherDisplayMode] = useState<'slip' | 'photo'>('slip');

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

  const handlePaymentChange = async (
    newMode: PaymentMode,
    newStatus?: PaymentStatus
  ) => {
    if (!receipt) return;
    setIsUpdatingPayment(true);
    try {
      const updated = await receiptService.updateReceiptPayment(
        receipt.id,
        newMode,
        newStatus
      );
      if (updated) {
        setReceipt(updated);
      } else {
        setReceipt((prev) =>
          prev
            ? {
                ...prev,
                paymentMode: newMode,
                paymentStatus: newStatus || prev.paymentStatus,
              }
            : null
        );
      }
      showToast({
        type: 'success',
        title: isHindi ? 'भुगतान माध्यम सेव हो गया' : 'Payment Saved',
        message: `${newMode.replace('_', ' ').toUpperCase()} • ${(
          newStatus || receipt.paymentStatus
        ).toUpperCase()}`,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: isHindi ? 'सेव करने में विफल' : 'Failed to save payment',
        message: err?.message || 'Could not update payment mode',
      });
    } finally {
      setIsUpdatingPayment(false);
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
            leftIcon={<ArrowLeft className="w-5 h-5" />}
            className="self-start sm:self-auto px-2"
            title={isHindi ? 'वापस' : 'Back'}
          >
            ←
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
            <div className="flex items-center justify-between border-b border-outline/30 pb-2.5">
              <h3 className="font-headline-sm text-sm font-bold text-on-surface">
                {voucherDisplayMode === 'slip'
                  ? isHindi
                    ? 'डिजिटल पर्ची (Voucher Slip)'
                    : 'Digital Slip'
                  : isHindi
                  ? 'मूल बिल फोटो'
                  : 'Original Photo'}
              </h3>
              {receipt.sourceVoucherUrl && receipt.sourceVoucherUrl !== 'manual-entry' && (
                <div className="flex items-center bg-surface-container rounded-lg p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setVoucherDisplayMode('slip')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      voucherDisplayMode === 'slip'
                        ? 'bg-primary text-on-primary shadow-xs font-bold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Slip
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoucherDisplayMode('photo')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      voucherDisplayMode === 'photo'
                        ? 'bg-primary text-on-primary shadow-xs font-bold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Photo
                  </button>
                </div>
              )}
            </div>

            {/* Display Area: Digital Thermal Voucher Slip or Original Photo */}
            {voucherDisplayMode === 'slip' || !receipt.sourceVoucherUrl || receipt.sourceVoucherUrl === 'manual-entry' ? (
              <div
                style={{
                  fontFamily: "'Courier New', Courier, monospace",
                }}
                className="relative w-full bg-[#fbf9f1] text-[#2b2923] p-4 sm:p-5 shadow-sm rounded-lg border border-[#d8d2c4] select-text"
              >
                {/* Vintage paper subtle texture tint */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-900/[0.015] to-amber-900/[0.04] pointer-events-none rounded-lg" />

                {/* Vendor Header */}
                <div className="text-center pb-2 leading-tight">
                  <div className="text-[0.625rem] tracking-widest text-[#736e65] font-sans uppercase font-bold">
                    Tax Invoice / Purchase Voucher
                  </div>
                  <div className="font-bold text-base tracking-tight uppercase mt-1 font-sans text-[#181714]">
                    {receipt.supplierName || 'WHOLESALE VENDOR'}
                  </div>
                  <div className="text-[0.6875rem] text-[#524e47] mt-0.5 font-sans">
                    Store: <strong>{user?.shopName || 'Hissaab Kitaab Store'}</strong>
                  </div>
                </div>

                <div className="my-2 border-b border-dashed border-[#b8b2a3]" />

                {/* Metadata */}
                <div className="text-[0.6875rem] flex justify-between items-center py-0.5">
                  <span>
                    Bill No: <strong className="font-sans text-[#151d19]">{receipt.invoiceNo}</strong>
                  </span>
                  <span>
                    Date: <strong className="font-sans text-[#151d19]">{receipt.billDate}</strong>
                  </span>
                </div>

                <div className="my-1.5 border-b border-[#2b2923]" />

                {/* Table Headers on Paper Receipt */}
                <div className="text-[0.625rem] font-bold flex justify-between py-1 text-[#423f38] uppercase">
                  <span className="w-5">Sn</span>
                  <span className="flex-1">Item</span>
                  <span className="w-12 text-right">Qty</span>
                  <span className="w-12 text-right">Rate</span>
                  <span className="w-14 text-right">Total</span>
                </div>
                <div className="border-b border-dashed border-[#b8b2a3] mb-1" />

                {/* Line Items */}
                <div className="flex flex-col gap-1 text-[0.6875rem] max-h-[360px] overflow-y-auto pr-0.5">
                  {receipt.items.map((item, idx) => (
                    <div key={item.id || idx} className="flex justify-between items-center py-0.5">
                      <span className="w-5 text-[#757064]">{idx + 1}</span>
                      <span className="flex-1 font-semibold truncate pr-1" title={item.name}>
                        {item.name || 'Unnamed Item'}
                      </span>
                      <span className="w-12 text-right">
                        {item.quantity} {item.unit?.slice(0, 2)}
                      </span>
                      <span className="w-12 text-right font-mono">
                        {item.unitRate.toFixed(0)}
                      </span>
                      <span className="w-14 text-right font-mono font-bold">
                        {item.lineTotal.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="my-2 border-b border-[#2b2923]" />

                {/* Totals */}
                <div className="text-[0.6875rem] space-y-0.5">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{receipt.subtotal.toFixed(2)}</span>
                  </div>
                  {receipt.taxTotal > 0 && (
                    <>
                      <div className="flex justify-between text-[#5f5a50]">
                        <span>CGST:</span>
                        <span className="font-mono">₹{(receipt.taxTotal / 2).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[#5f5a50]">
                        <span>SGST:</span>
                        <span className="font-mono">₹{(receipt.taxTotal / 2).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="border-t border-double border-[#2b2923] pt-1.5 mt-1 flex justify-between font-bold text-sm font-sans">
                    <span>NET TOTAL:</span>
                    <span className="text-primary font-bold">₹{receipt.grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Rubber Stamp Simulation */}
                <div className="mt-3 pt-2 border-t border-dashed border-[#b8b2a3] flex justify-between items-end">
                  <div className="inline-block transform -rotate-3 border-2 border-dashed border-red-700/70 p-1.5 rounded text-[0.625rem] font-bold text-red-800 font-sans tracking-wide">
                    {receipt.paymentMode.replace('_', ' ').toUpperCase()} • {receipt.paymentStatus.toUpperCase()}
                    <br />
                    <span className="text-[0.5rem]">{receipt.supplierName.toUpperCase()}</span>
                  </div>
                  <div className="text-[0.625rem] text-right text-[#57534b]">
                    Authorized Slip
                    <br />
                    <span className="italic font-bold">{receipt.supplierName}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-3/4 w-full bg-[#1B1E19] rounded-xl border border-outline flex items-center justify-center p-3 text-center overflow-hidden">
                <img
                  src={receipt.sourceVoucherUrl}
                  alt={receipt.supplierName}
                  className="w-full h-full object-contain rounded"
                />
              </div>
            )}

            <div className="flex flex-col items-center gap-2 pt-1">
              <p className="text-[0.6875rem] text-on-surface-variant text-center">
                {voucherDisplayMode === 'slip'
                  ? isHindi ? 'बही-खाता डिजिटल वाउचर पर्ची' : 'Verified digital bahi-khata slip'
                  : isHindi ? 'मूल स्कैन की गई बिल प्रति' : 'Original scan preserved in tenant storage'}
              </p>
              {receipt.sourceVoucherUrl && receipt.sourceVoucherUrl !== 'manual-entry' && voucherDisplayMode === 'photo' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center text-xs"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  onClick={() => {
                    downloadOriginalVoucherImage(receipt);
                    showToast({
                      type: 'success',
                      title: isHindi ? 'फोटो डाउनलोड हुई' : 'Scan Downloaded',
                      message: `Voucher_Scan_${receipt.invoiceNo}.jpg`,
                    });
                  }}
                >
                  {isHindi ? 'फोटो डाउनलोड (.jpg)' : 'Download Scan (.jpg)'}
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Right Ledger Breakdown (8 Columns) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Commercial Summary Banner with Editable Payment */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-surface-container-lowest border border-outline shadow-card">
            <div>
              <label className="text-label-xs text-on-surface-variant uppercase font-semibold block mb-1">
                {isHindi ? 'भुगतान माध्यम' : 'Payment Mode'}
              </label>
              <select
                value={receipt.paymentMode}
                disabled={isUpdatingPayment}
                onChange={(e) =>
                  handlePaymentChange(e.target.value as PaymentMode, receipt.paymentStatus)
                }
                className="bg-surface-container-low text-on-surface font-bold text-xs sm:text-sm rounded-lg px-2.5 py-1.5 border border-outline/70 focus:ring-2 focus:ring-primary outline-none w-full cursor-pointer"
              >
                <option value="cash">Cash (Rokad)</option>
                <option value="upi">UPI / GPay / PhonePe</option>
                <option value="credit_udhar">Credit (Udhar)</option>
                <option value="bank_transfer">Bank Transfer / NEFT</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label className="text-label-xs text-on-surface-variant uppercase font-semibold block mb-1">
                {isHindi ? 'भुगतान स्थिति' : 'Payment Status'}
              </label>
              <select
                value={receipt.paymentStatus}
                disabled={isUpdatingPayment}
                onChange={(e) =>
                  handlePaymentChange(receipt.paymentMode, e.target.value as PaymentStatus)
                }
                className="bg-surface-container-low text-on-surface font-bold text-xs sm:text-sm rounded-lg px-2.5 py-1.5 border border-outline/70 focus:ring-2 focus:ring-primary outline-none w-full cursor-pointer"
              >
                <option value="paid">Paid (चुक्ता)</option>
                <option value="unpaid_udhar">Unpaid (उधार)</option>
                <option value="partial">Partial (आंशिक)</option>
              </select>
            </div>
            <div>
              <span className="text-label-xs text-on-surface-variant uppercase font-semibold block mb-1">
                {isHindi ? 'उप-कुल' : 'Subtotal'}
              </span>
              <p className="font-bold text-body-lg text-on-surface tabular-nums mt-1">
                ₹{receipt.subtotal.toFixed(2)}
              </p>
            </div>
            <div>
              <span className="text-label-xs text-on-surface-variant uppercase font-semibold block mb-1">
                {isHindi ? 'कुल रकम' : 'Grand Total'}
              </span>
              <p className="font-bold text-body-lg text-primary tabular-nums mt-1">
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
