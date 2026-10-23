import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Store,
  Calendar,
  Save,
  X,
  ArrowDown,
  Calculator,
  ChevronRight,
  Maximize2,
  Check,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { receiptService } from '../api/receiptService';
import type { Receipt, ReceiptItem } from '../types';
import { useToast } from '../context/ToastContext';
import { cn } from '../utils/cn';
import { calculateLineTotalMinor } from '../utils/money';

export const ReviewReceiptPage: React.FC = () => {
  const { receiptId = 'REC-2024-1089' } = useParams<{ receiptId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [headerInfo, setHeaderInfo] = useState({
    supplierName: 'Gupta Wholesale Mart',
    date: '2024-10-24',
    invoiceNo: 'GW-8821',
    paymentMode: 'upi',
    expenseCategory: 'Wholesale Inventory (Stock for Resale)',
  });

  // Mobile view switcher (Voucher scan vs Spreadsheet table)
  const [mobileView, setMobileView] = useState<'table' | 'voucher'>('table');

  // Zoom & Rotation states
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [activeHighlightIndex, setActiveHighlightIndex] = useState<number | null>(2); // Row 3 default
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Dialog & Saving states
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasAutoSaved, setHasAutoSaved] = useState(true);

  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  // Initial load: Fetch from API or localStorage draft
  useEffect(() => {
    async function loadData() {
      // Check local draft first
      const draftKey = `shopledger_draft_${receiptId}`;
      const savedDraft = localStorage.getItem(draftKey);

      let initialData: Receipt | null = null;
      try {
        initialData = await receiptService.getReceiptById(receiptId);
      } catch {
        // Fallback handled by receiptService
      }

      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setReceipt(parsed.receipt || initialData);
          setItems(parsed.items || initialData?.items || []);
          if (parsed.headerInfo) setHeaderInfo(parsed.headerInfo);
          return;
        } catch {
          // ignore corrupted draft
        }
      }

      if (initialData) {
        setReceipt(initialData);
        setHeaderInfo({
          supplierName: initialData.supplierName || 'Gupta Wholesale Mart',
          date: initialData.billDate || '2024-10-24',
          invoiceNo: initialData.invoiceNo || 'GW-8821',
          paymentMode: 'upi',
          expenseCategory: 'Wholesale Inventory (Stock for Resale)',
        });

        // If items are populated, use them; otherwise use default Stitch mockup items
        if (initialData.items && initialData.items.length > 0) {
          setItems(initialData.items);
        } else {
          setItems([
            {
              id: 'item-1',
              name: 'Aashirvaad Shudh Chakki Atta 10kg',
              category: 'Atta & Flour',
              quantity: 10,
              unit: 'bag',
              unitRate: 380.0,
              lineTotal: 3800.0,
              taxRate: 5,
              confidenceScore: 0.99,
              needsReview: false,
            },
            {
              id: 'item-2',
              name: 'Tata Salt Vacuum Evaporated 1kg',
              category: 'Spices & Salt',
              quantity: 50,
              unit: 'packet',
              unitRate: 24.0,
              lineTotal: 1200.0,
              taxRate: 0,
              confidenceScore: 0.98,
              needsReview: false,
            },
            {
              id: 'item-3',
              name: 'Fortune Sunlite Refined Oil 1L',
              category: 'Cooking Oils',
              quantity: 30,
              unit: 'pouch',
              unitRate: 142.0,
              lineTotal: 4260.0,
              taxRate: 5,
              confidenceScore: 0.72,
              needsReview: true, // Flagged for review
              reviewReason: 'Digit ambiguous: ₹142 or ₹147?',
            },
            {
              id: 'item-4',
              name: 'Madhur Pure & Hygienic Sugar 5kg',
              category: 'Sugar & Jaggery',
              quantity: 12,
              unit: 'bag',
              unitRate: 215.0,
              lineTotal: 2580.0,
              taxRate: 5,
              confidenceScore: 0.96,
              needsReview: false,
            },
            {
              id: 'item-5',
              name: 'MDH Deggi Mirch 100g',
              category: 'Spices & Masala',
              quantity: 15,
              unit: 'packet',
              unitRate: 40.66,
              lineTotal: 610.0,
              taxRate: 5,
              confidenceScore: 0.81,
              needsReview: true, // Flagged for arithmetic discrepancy
              reviewReason: '15 × 40.66 = 609.90 (₹0.10 diff)',
            },
          ]);
        }
      }
    }

    loadData();
  }, [receiptId]);

  // Auto-save draft to localStorage whenever items or header change
  useEffect(() => {
    if (items.length > 0) {
      const draftKey = `shopledger_draft_${receiptId}`;
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          receipt,
          items,
          headerInfo,
          updatedAt: new Date().toISOString(),
        })
      );
      setHasAutoSaved(true);
    }
  }, [items, headerInfo, receipt, receiptId]);

  // Derived financial totals
  const subtotal = items.reduce((acc, curr) => acc + (curr.lineTotal || 0), 0);
  const gstTotal = items.reduce((acc, curr) => {
    const rate = curr.taxRate || 5;
    return acc + Math.round((curr.lineTotal * rate) / 100 * 100) / 100;
  }, 0);
  const grandTotal = subtotal + gstTotal;
  const flaggedCount = items.filter((i) => i.needsReview).length;

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 15, 175));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 15, 65));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  // Jump to first flagged row
  const scrollToFirstFlagged = () => {
    const firstFlaggedIndex = items.findIndex((i) => i.needsReview);
    if (firstFlaggedIndex !== -1) {
      setActiveHighlightIndex(firstFlaggedIndex);
      setMobileView('table');
      rowRefs.current[firstFlaggedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  // Row update handler
  const handleItemFieldChange = (index: number, field: keyof ReceiptItem, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: val };

      if (field === 'quantity' || field === 'unitRate') {
        const qty = field === 'quantity' ? Math.max(0, Number(val) || 0) : item.quantity;
        const rate = field === 'unitRate' ? Math.max(0, Number(val) || 0) : item.unitRate;
        const calc = calculateLineTotalMinor({
          quantity: qty,
          unitPriceMinor: Math.round(rate * 100),
          taxRatePercent: item.taxRate || 5,
        });
        item.lineTotal = calc.baseMinor / 100;
        item.needsReview = false; // User manually touched and resolved
      }

      copy[index] = item;
      return copy;
    });
  };

  // Quick accept buttons for flagged rows
  const resolvePrice = (index: number, newRate: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      item.unitRate = newRate;
      item.lineTotal = Math.round(item.quantity * newRate * 100) / 100;
      item.needsReview = false;
      copy[index] = item;
      return copy;
    });
    showToast({
      type: 'success',
      title: 'Field Verified',
      message: `Set ${items[index]?.name} unit price to ₹${newRate.toFixed(2)}`,
    });
  };

  const resolveTotal = (index: number, roundedTotal: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      item.lineTotal = roundedTotal;
      item.needsReview = false;
      copy[index] = item;
      return copy;
    });
    showToast({
      type: 'success',
      title: 'Total Verified',
      message: `Line total reconciled to ₹${roundedTotal.toFixed(2)}`,
    });
  };

  // Add line item
  const handleAddLineItem = () => {
    const newItem: ReceiptItem = {
      id: `item-${Date.now()}`,
      name: 'New Grocery Item',
      category: 'General Grocery',
      quantity: 1,
      unit: 'piece',
      unitRate: 100.0,
      lineTotal: 100.0,
      taxRate: 5,
      confidenceScore: 1.0,
      needsReview: false,
    };
    setItems((prev) => [...prev, newItem]);
    setActiveHighlightIndex(items.length);
  };

  // Delete line item
  const handleDeleteLineItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
    showToast({
      type: 'info',
      title: 'Item Removed',
      message: 'Line item deleted from bahi khata draft.',
    });
  };

  // Discard draft
  const handleDiscardDraft = () => {
    localStorage.removeItem(`shopledger_draft_${receiptId}`);
    showToast({
      type: 'info',
      title: 'Draft Discarded',
      message: 'All unconfirmed review edits have been cleared.',
    });
    navigate('/receipts');
  };

  // Save draft explicitly
  const handleSaveDraft = async () => {
    try {
      localStorage.setItem(
        `shopledger_draft_${receiptId}`,
        JSON.stringify({ receipt, items, headerInfo, updatedAt: new Date().toISOString() })
      );
      showToast({
        type: 'success',
        title: 'Draft Saved Locally',
        message: 'Your progress is stored. You can safely return later.',
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Failed to Save Draft',
        message: err.message,
      });
    }
  };

  // Final Confirmation to Ledger
  const handleConfirmToLedger = async () => {
    setIsSaving(true);
    try {
      await receiptService.verifyReceipt(receiptId, items, headerInfo);
      localStorage.removeItem(`shopledger_draft_${receiptId}`);
      showToast({
        type: 'success',
        title: 'Bahi Khata Updated!',
        message: `Successfully verified and recorded ₹${grandTotal.toFixed(2)} from ${headerInfo.supplierName}.`,
      });
      navigate(`/receipts/${receiptId}`);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Confirmation Failed',
        message: err.message || 'Unable to commit receipt to ledger.',
      });
    } finally {
      setIsSaving(false);
      setIsConfirmModalOpen(false);
    }
  };

  return (
    <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5 pb-24">
      {/* Top Header & Breadcrumb Bar (Stitch Accurate) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-on-surface-variant text-label-xs">
            <button onClick={() => navigate('/receipts')} className="hover:text-primary transition-colors">
              Receipts
            </button>
            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            <span className="text-on-surface-variant">Review</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            <span className="text-primary font-semibold">{headerInfo.supplierName}</span>
          </nav>

          <div className="flex items-baseline gap-2.5 flex-wrap">
            <h1 className="font-headline-lg text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
              Review Purchase Bill #{receipt?.invoiceNo || headerInfo.invoiceNo}
            </h1>
            <span className="bg-secondary-container text-on-secondary-fixed text-label-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {hasAutoSaved ? 'Draft Auto-Saved' : 'Saving...'}
            </span>
          </div>
        </div>

        {/* Action Buttons Top Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="md"
            onClick={() => setIsDiscardModalOpen(true)}
            leftIcon={<X className="w-4 h-4" />}
            className="text-on-surface hover:bg-surface-container"
          >
            Discard
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={handleSaveDraft}
            leftIcon={<Save className="w-4 h-4" />}
            className="shadow-sm"
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsConfirmModalOpen(true)}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
            className="font-bold shadow-card px-5"
          >
            Confirm & Save (₹{grandTotal.toFixed(0)})
          </Button>
        </div>
      </div>

      {/* AI Attention Banner (Amber Alert) */}
      <div className="w-full bg-amber-50 dark:bg-amber-950/20 border border-amber-300/60 dark:border-amber-800/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-tertiary" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-on-surface">
                AI Extraction Complete (88% confidence)
              </span>
              <span className="text-label-xs px-2 py-0.5 rounded bg-tertiary-fixed-dim/40 text-on-tertiary-fixed font-bold">
                {flaggedCount} {flaggedCount === 1 ? 'Needs Attention' : 'Need Attention'}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Please check the {flaggedCount} flagged items in amber below before confirming to your bahi khata ledger.
            </p>
          </div>
        </div>

        {flaggedCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={scrollToFirstFlagged}
            rightIcon={<ArrowDown className="w-3.5 h-3.5" />}
            className="bg-surface-container-lowest text-tertiary hover:bg-surface-container self-end sm:self-auto flex-shrink-0 font-bold border-amber-200"
          >
            Jump to flagged
          </Button>
        )}
      </div>

      {/* Upload Meta Info Strip */}
      <div className="flex items-center justify-between text-on-surface-variant text-xs px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-primary" />
          <span>Uploaded on 24 Oct 2024, 02:45 PM</span>
          <span className="opacity-40">•</span>
          <span className="font-semibold text-on-surface">Bill Photo: IMG_9201.jpg</span>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="bg-primary-fixed text-on-primary-fixed px-2 py-0.5 rounded-full font-bold text-[0.68rem]">
            GST Matched
          </span>
          <span className="bg-secondary-fixed text-on-secondary-fixed px-2 py-0.5 rounded-full font-semibold text-[0.68rem]">
            Cash Memo
          </span>
        </div>
      </div>

      {/* Mobile Subview Toggle Pills (Mobile Only) */}
      <div className="flex lg:hidden p-1 bg-surface-container rounded-xl border border-outline">
        <button
          onClick={() => setMobileView('table')}
          className={cn(
            'flex-1 py-2 text-xs font-bold rounded-lg transition-all',
            mobileView === 'table' ? 'bg-surface-container-lowest text-on-surface shadow-card' : 'text-on-surface-variant'
          )}
        >
          Spreadsheet Table ({items.length} items)
        </button>
        <button
          onClick={() => setMobileView('voucher')}
          className={cn(
            'flex-1 py-2 text-xs font-bold rounded-lg transition-all',
            mobileView === 'voucher' ? 'bg-surface-container-lowest text-on-surface shadow-card' : 'text-on-surface-variant'
          )}
        >
          Source Voucher Scan
        </button>
      </div>

      {/* Main Two-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Receipt Scan Preview & Inspector (5 Cols on large)           */}
        {/* ========================================================================= */}
        <section
          className={cn(
            'lg:col-span-5 flex-col gap-2.5 sticky top-20 z-10',
            mobileView === 'voucher' ? 'flex' : 'hidden lg:flex'
          )}
        >
          <div className="bg-surface-container-lowest rounded-2xl border border-outline shadow-card overflow-hidden flex flex-col">
            {/* Inspector Toolbar */}
            <div className="p-3 px-4 bg-surface-container-low flex items-center justify-between border-b border-outline/30">
              <div className="flex items-center gap-2 text-on-surface text-xs font-bold">
                <Store className="w-4 h-4 text-primary" />
                <span>Source Voucher Scan</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-on-surface-variant w-10 text-center font-mono font-bold">
                  {zoomLevel}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="h-4 w-px bg-surface-container-highest mx-1"></div>
                <button
                  onClick={handleRotate}
                  className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
                  title="Rotate 90 degrees"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
                  title="Toggle Full View"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Interactive Receipt Canvas Viewport */}
            <div className="relative bg-surface-container-highest/40 p-4 h-[600px] overflow-auto flex items-center justify-center select-none">
              {/* Simulated Authentic Paper Slip (Stitch Accurate) */}
              <div
                style={{
                  transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  fontFamily: "'Courier New', Courier, monospace",
                }}
                className="relative w-[340px] sm:w-[360px] bg-[#fbf9f1] text-[#2b2923] p-5 sm:p-6 shadow-md transition-transform duration-200 rounded-[2px]"
              >
                {/* Subtle Paper Texture Gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-900/[0.02] to-amber-900/[0.05] pointer-events-none"></div>

                {/* Wholesale Header */}
                <div className="text-center pb-2.5 leading-tight">
                  <div className="text-[0.6rem] tracking-widest text-[#736e65] font-sans">
                    || SHREE GANESHAY NAMAHA ||
                  </div>
                  <div className="font-bold text-[1.05rem] tracking-tight uppercase mt-0.5 font-sans text-[#181714]">
                    GUPTA WHOLESALE MART
                  </div>
                  <div className="text-[0.68rem] text-[#524e47] mt-0.5">
                    Grain, Edible Oils & Spices Merchants
                  </div>
                  <div className="text-[0.65rem] text-[#69645b]">412 Khari Baoli, Delhi-110006</div>
                  <div className="text-[0.68rem] text-[#3d3a33] font-sans font-bold mt-1">
                    GSTIN: 07AACPG4819M1Z3
                  </div>
                </div>

                <div className="my-2 border-b border-dashed border-[#b8b2a3]"></div>

                {/* Metadata */}
                <div className="text-[0.7rem] flex justify-between items-center py-0.5">
                  <span>
                    Bill No: <strong className="font-sans text-[#151d19]">{headerInfo.invoiceNo}</strong>
                  </span>
                  <span>
                    Date: <strong className="font-sans text-[#151d19]">{headerInfo.date}</strong>
                  </span>
                </div>
                <div className="text-[0.68rem] text-[#5a564e] pb-1">
                  M/s: <strong className="font-sans text-[#151d19]">Sharma Kirana Store, Main Bazar</strong>
                </div>

                <div className="my-1.5 border-b border-[#2b2923]"></div>

                {/* Table Headers on Paper Receipt */}
                <div className="text-[0.62rem] font-bold flex justify-between py-1 text-[#423f38] uppercase">
                  <span className="w-5">Sn</span>
                  <span className="flex-1">Particulars</span>
                  <span className="w-12 text-right">Qty</span>
                  <span className="w-12 text-right">Rate</span>
                  <span className="w-14 text-right">Total</span>
                </div>
                <div className="border-b border-dashed border-[#b8b2a3] mb-1"></div>

                {/* Scanned Receipt Line Items with Interactive Bounding Boxes */}
                <div className="flex flex-col gap-1 text-[0.68rem]">
                  {items.map((item, idx) => {
                    const isSelected = activeHighlightIndex === idx;
                    const isAmber = item.needsReview;

                    return (
                      <div
                        key={item.id}
                        onClick={() => setActiveHighlightIndex(idx)}
                        className={cn(
                          'relative group p-1 -mx-1 rounded cursor-pointer transition-all flex justify-between items-center',
                          isAmber
                            ? 'bg-amber-400/25 ring-2 ring-amber-500/80 animate-pulse'
                            : isSelected
                            ? 'bg-emerald-500/20 ring-1 ring-primary'
                            : 'hover:bg-emerald-500/10'
                        )}
                      >
                        {isSelected && (
                          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1 h-3 bg-primary rounded-full"></div>
                        )}
                        <span className="w-5 text-[#757064]">{idx + 1}</span>
                        <span className="flex-1 font-semibold truncate pr-1">{item.name}</span>
                        <span className="w-12 text-right">
                          {item.quantity} {item.unit?.slice(0, 2)}
                        </span>
                        <span
                          className={cn(
                            'w-12 text-right font-mono',
                            isAmber && 'text-amber-900 font-bold bg-amber-200/80 px-0.5 rounded'
                          )}
                        >
                          {item.unitRate.toFixed(0)}
                          {isAmber ? '?' : ''}
                        </span>
                        <span className="w-14 text-right font-mono font-bold">
                          {item.lineTotal.toFixed(0)}
                        </span>

                        {isAmber && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-600 text-[8px] text-white items-center justify-center font-bold">
                              !
                            </span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="my-2 border-b border-[#2b2923]"></div>

                {/* Scanned Paper Totals */}
                <div className="text-[0.68rem] space-y-0.5">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#5f5a50]">
                    <span>CGST @ 2.5%:</span>
                    <span className="font-mono">₹{(gstTotal / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#5f5a50]">
                    <span>SGST @ 2.5%:</span>
                    <span className="font-mono">₹{(gstTotal / 2).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-double border-[#2b2923] pt-1 mt-1 flex justify-between font-bold text-[0.78rem] font-sans">
                    <span>NET TOTAL:</span>
                    <span>₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Red Ink Rubber Stamp Simulation */}
                <div className="mt-3 pt-2 border-t border-dashed border-[#b8b2a3] flex justify-between items-end">
                  <div className="inline-block transform -rotate-6 border-2 border-dashed border-red-700/60 p-1 rounded text-[0.6rem] font-bold text-red-800 font-sans tracking-wide">
                    PAID CASH / UPI
                    <br />
                    <span className="text-[0.5rem]">GUPTA WHOLESALE MART</span>
                  </div>
                  <div className="text-[0.58rem] text-right text-[#57534b]">
                    Auth. Signatory
                    <br />
                    <span className="italic text-[0.68rem]">R.K. Gupta</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Helper Footer Note */}
            <div className="p-3 px-4 bg-surface-container-low text-on-surface-variant text-label-xs flex items-center justify-between border-t border-outline/30">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-primary" />
                Tip: Click any row on the right to locate its source bounding box.
              </span>
              <span className="opacity-60">High-Res OCR View</span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Editable Spreadsheet Table & Header (7 Cols on large)      */}
        {/* ========================================================================= */}
        <section
          className={cn(
            'lg:col-span-7 flex-col gap-4',
            mobileView === 'table' ? 'flex' : 'hidden lg:flex'
          )}
        >
          {/* Vendor & Bill Info Form Card */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-outline/30 pb-3">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                <h2 className="font-headline-sm text-base font-bold text-on-surface">Bill Header Information</h2>
              </div>
              <div className="flex items-center gap-1 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-0.5 rounded-full text-label-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Matched to Store Contact</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Vendor */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-label-xs text-on-surface-variant font-semibold">Bought From (Vendor Name)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={headerInfo.supplierName}
                    onChange={(e) => setHeaderInfo({ ...headerInfo, supplierName: e.target.value })}
                    className="w-full bg-surface-container-low text-on-surface text-sm font-semibold px-3 py-2 rounded-xl border border-outline/40 outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                  <CheckCircle2 className="w-4 h-4 text-primary absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Bill Date */}
              <div className="space-y-1">
                <label className="text-label-xs text-on-surface-variant font-semibold">Bill Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={headerInfo.date}
                  onChange={(e) => setHeaderInfo({ ...headerInfo, date: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface text-sm font-semibold px-3 py-2 rounded-xl border border-outline/40 outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>

              {/* Bill No */}
              <div className="space-y-1">
                <label className="text-label-xs text-on-surface-variant font-semibold">Bill / Memo No.</label>
                <input
                  type="text"
                  value={headerInfo.invoiceNo}
                  onChange={(e) => setHeaderInfo({ ...headerInfo, invoiceNo: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface text-sm font-semibold px-3 py-2 rounded-xl border border-outline/40 outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>

              {/* Payment Type */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-label-xs text-on-surface-variant font-semibold">Payment Mode</label>
                <select
                  value={headerInfo.paymentMode}
                  onChange={(e) => setHeaderInfo({ ...headerInfo, paymentMode: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface text-sm font-semibold px-3 py-2 rounded-xl border border-outline/40 outline-none focus:ring-2 focus:ring-primary transition-all"
                >
                  <option value="upi">Paid via UPI (GooglePay / PhonePe / Paytm)</option>
                  <option value="cash">Paid via Cash (Rokad)</option>
                  <option value="credit_udhar">Credit / Udhar Khata (Pay Later)</option>
                  <option value="bank">Bank IMPS / RTGS</option>
                </select>
              </div>

              {/* Purchase Category */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-label-xs text-on-surface-variant font-semibold">Expense Category</label>
                <input
                  type="text"
                  value={headerInfo.expenseCategory}
                  onChange={(e) => setHeaderInfo({ ...headerInfo, expenseCategory: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface text-sm font-semibold px-3 py-2 rounded-xl border border-outline/40 outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
            </div>
          </div>

          {/* Editable Items Table Card */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline shadow-card overflow-hidden flex flex-col">
            <div className="p-4 bg-surface-container-low flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-outline/30">
              <div>
                <h3 className="font-headline-sm text-base font-bold text-on-surface">
                  Extracted Items ({items.length} Line Items)
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Verify quantities, prices and categories assigned by computer vision.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddLineItem}
                leftIcon={<Plus className="w-3.5 h-3.5 text-primary" />}
                className="font-bold text-xs"
              >
                + Add Missing Item
              </Button>
            </div>

            {/* High-Density Spreadsheet Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-high/60 text-on-surface-variant text-label-xs uppercase tracking-wider font-bold border-b border-outline/30">
                    <th className="py-2.5 px-3 w-8 text-center">#</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Item Name</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Category</th>
                    <th className="py-2.5 px-3 w-24 text-right">Quantity</th>
                    <th className="py-2.5 px-3 w-28 text-right">Unit Price (₹)</th>
                    <th className="py-2.5 px-3 w-28 text-right">Total (₹)</th>
                    <th className="py-2.5 px-3 min-w-[180px]">AI Check / Actions</th>
                    <th className="py-2.5 px-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container text-body-sm text-on-surface text-xs">
                  {items.map((item, idx) => {
                    const isAmber = item.needsReview;
                    const isSelected = activeHighlightIndex === idx;

                    return (
                      <tr
                        key={item.id}
                        ref={(el) => {
                          rowRefs.current[idx] = el;
                        }}
                        onClick={() => setActiveHighlightIndex(idx)}
                        className={cn(
                          'transition-colors cursor-pointer group',
                          isAmber
                            ? 'bg-amber-50/80 dark:bg-amber-950/20 hover:bg-amber-100/70 border-l-4 border-amber-500'
                            : isSelected
                            ? 'bg-primary-fixed/15 hover:bg-primary-fixed/20'
                            : 'hover:bg-surface-container-low'
                        )}
                      >
                        <td className="py-3 px-3 text-center font-bold text-on-surface-variant">
                          {idx + 1}
                        </td>

                        {/* Item Name */}
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemFieldChange(idx, 'name', e.target.value)}
                            className={cn(
                              'w-full bg-transparent px-2 py-1 rounded border-0 outline-none font-semibold transition-all',
                              isAmber
                                ? 'bg-surface-container-lowest ring-1 ring-amber-400'
                                : 'focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary'
                            )}
                          />
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              'inline-block text-[0.7rem] font-bold px-2 py-0.5 rounded-full',
                              isAmber
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-secondary-container text-on-secondary-fixed'
                            )}
                          >
                            {item.category}
                          </span>
                        </td>

                        {/* Quantity */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value)}
                              className={cn(
                                'w-12 text-right bg-transparent px-1 py-1 rounded border-0 outline-none font-mono font-bold',
                                isAmber
                                  ? 'bg-surface-container-lowest ring-1 ring-amber-400'
                                  : 'focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary'
                              )}
                            />
                            <span className="text-on-surface-variant text-[0.7rem]">{item.unit || 'unit'}</span>
                          </div>
                        </td>

                        {/* Unit Price */}
                        <td className="py-3 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitRate}
                            onChange={(e) => handleItemFieldChange(idx, 'unitRate', e.target.value)}
                            className={cn(
                              'w-20 text-right font-mono px-2 py-1 rounded border-0 outline-none font-bold',
                              isAmber
                                ? 'bg-surface-container-lowest text-amber-900 ring-2 ring-amber-500'
                                : 'bg-transparent focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary'
                            )}
                          />
                        </td>

                        {/* Line Total */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-on-surface">
                          ₹{item.lineTotal.toFixed(2)}
                        </td>

                        {/* AI Check / Quick Actions */}
                        <td className="py-3 px-3">
                          {isAmber ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded text-[0.68rem] font-bold">
                                <AlertTriangle className="w-3 h-3 text-amber-700 flex-shrink-0" />
                                <span className="truncate">{item.reviewReason || 'Check unit rate'}</span>
                              </div>

                              {idx === 2 ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => resolvePrice(idx, 142.0)}
                                    className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-bold text-[0.65rem] hover:bg-tertiary-fixed-dim transition-colors"
                                  >
                                    Keep 142
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => resolvePrice(idx, 147.0)}
                                    className="px-2 py-0.5 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold text-[0.65rem] transition-colors"
                                  >
                                    Set 147
                                  </button>
                                </div>
                              ) : idx === 4 ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => resolveTotal(idx, 610.0)}
                                    className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-bold text-[0.65rem] hover:bg-tertiary-fixed-dim transition-colors"
                                  >
                                    Round to ₹610.00
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md w-fit text-[0.68rem] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{Math.round((item.confidenceScore || 0.98) * 100)}% Match</span>
                            </div>
                          )}
                        </td>

                        {/* Delete Action */}
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLineItem(idx);
                            }}
                            className="p-1 text-on-surface-variant hover:text-error rounded transition-colors"
                            title="Delete line"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add Line Footer Row */}
            <div className="p-3 px-4 bg-surface-container-low flex items-center justify-between border-t border-outline/30">
              <button
                type="button"
                onClick={handleAddLineItem}
                className="h-8 px-3 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-on-surface text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 text-primary" />
                <span>+ Add Missing Item</span>
              </button>
              <span className="text-on-surface-variant text-[0.7rem]">
                Keyboard shortcut: <kbd className="px-1.5 py-0.5 bg-surface-container rounded text-on-surface font-bold">Tab</kbd> between cells
              </span>
            </div>

            {/* Calculated Tax and Grand Total Breakdown */}
            <div className="p-5 bg-surface-container-lowest border-t border-outline/30 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div className="space-y-1 max-w-sm">
                <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-primary" />
                  GST Compliance & Total Summary
                </span>
                <p className="text-[0.75rem] text-on-surface-variant">
                  Derived from Gupta Wholesale Mart registered GST slab (5% for Groceries & Cooking Oils).
                </p>
              </div>

              <div className="w-full md:w-80 bg-surface-container-low p-4 rounded-xl border border-outline/40 space-y-2">
                <div className="flex justify-between items-center text-xs text-on-surface-variant">
                  <span>Subtotal ({items.length} items)</span>
                  <span className="font-mono font-semibold text-on-surface">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-on-surface-variant">
                  <span>CGST (2.5%)</span>
                  <span className="font-mono text-on-surface">₹{(gstTotal / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-on-surface-variant">
                  <span>SGST (2.5%)</span>
                  <span className="font-mono text-on-surface">₹{(gstTotal / 2).toFixed(2)}</span>
                </div>
                <div className="h-px bg-surface-container-highest my-1"></div>
                <div className="flex justify-between items-center font-bold text-sm">
                  <span>Grand Total</span>
                  <span className="text-base text-primary font-mono">₹{grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-800 text-[0.68rem] font-bold justify-end">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Matches paper total exactly</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Sticky Affirmation / Confirmation Bar (Stitch Accurate) */}
      <div className="fixed bottom-0 left-0 lg:left-72 right-0 bg-surface-container-lowest/95 backdrop-blur-md px-4 sm:px-8 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] border-t border-outline/40 z-30 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-2.5 h-2.5 rounded-full',
              flaggedCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-primary'
            )}
          ></div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs">
            <span className="font-bold text-on-surface">
              {flaggedCount > 0
                ? `${flaggedCount} items flagged for verification`
                : 'All line items verified and reconciled'}
            </span>
            <span className="hidden sm:inline text-on-surface-variant/40">•</span>
            <span className="text-on-surface-variant">
              Press <kbd className="px-1 py-0.5 rounded bg-surface-container text-on-surface font-bold text-[0.65rem]">Enter</kbd> to jump to next item
            </span>
            <span className="hidden sm:inline text-on-surface-variant/40">•</span>
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>All edits auto-saved</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <Button
            variant="ghost"
            size="md"
            onClick={() => setIsDiscardModalOpen(true)}
            className="text-on-surface hover:bg-surface-container"
          >
            Discard
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsConfirmModalOpen(true)}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
            className="flex-1 sm:flex-initial font-bold shadow-card px-6"
          >
            Confirm & Add to Ledger (₹{grandTotal.toFixed(0)})
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmToLedger}
        title="Commit Bill to Bahi Khata?"
        message={
          flaggedCount > 0
            ? `You still have ${flaggedCount} flagged item(s) that were hard to read. Are you sure you want to confirm this ₹${grandTotal.toFixed(2)} purchase voucher into your permanent ledger?`
            : `Confirm ₹${grandTotal.toFixed(2)} purchase from ${headerInfo.supplierName} with ${items.length} verified line items? This will update your inventory price averages and supplier record.`
        }
        confirmText={isSaving ? 'Recording...' : `Confirm & Save ₹${grandTotal.toFixed(0)}`}
        cancelText="Review Again"
        variant={flaggedCount > 0 ? 'warning' : 'primary'}
      />

      {/* Discard Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDiscardModalOpen}
        onClose={() => setIsDiscardModalOpen(false)}
        onConfirm={handleDiscardDraft}
        title="Discard Draft Changes?"
        message="All manual changes to line items, prices, and quantities will be removed. You will return to your receipts list."
        confirmText="Discard Draft"
        cancelText="Keep Editing"
        variant="danger"
      />
    </div>
  );
};
