import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Camera,
  Upload,
  FileEdit,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Check,
  AlertCircle,
  X,
  Lock,
  FileText,
  Trash2,
  RefreshCw,
  Sliders,
  Sparkles,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { receiptService } from '../api/receiptService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../utils/cn';
import { formatPaise } from '../utils/money';
import type { Receipt } from '../types';

type ViewMode = 'methods' | 'camera' | 'preview' | 'processing' | 'manual' | 'errors';

interface StagedFile {
  file: File;
  previewUrl: string;
  name: string;
  sizeFormatted: string;
  ext: string;
}

interface ManualLineItemDraft {
  id: string;
  rawName: string;
  category: string;
  quantity: string;
  unit: string;
  unitPriceRupees: string;
  taxRatePercent: number;
}

const CATEGORY_OPTIONS = [
  'General Grocery',
  'Edible Oils & Ghee',
  'Grains & Atta',
  'Pulses & Dal',
  'Spices & Staples',
  'Dairy & Beverages',
  'Snacks & Biscuits',
  'Personal Care & Cleaning',
  'Packaging & Supplies',
];

const UNIT_OPTIONS = ['piece', 'kg', 'gram', 'packet', 'pouch', 'bag', 'box', 'carton', 'tin', 'liter', 'ml', 'dozen'];

export const UploadReceiptPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isHindi } = useLanguage();

  const initialMode = (searchParams.get('mode') as ViewMode) || 'methods';
  const [viewMode, setViewMode] = useState<ViewMode>(
    ['methods', 'camera', 'preview', 'processing', 'manual', 'errors'].includes(initialMode)
      ? initialMode
      : 'methods'
  );
  const [stagedFile, setStagedFile] = useState<StagedFile | null>(null);
  const [customReceiptName, setCustomReceiptName] = useState<string>('');
  const [isEditingReceiptName, setIsEditingReceiptName] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Camera stream states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // OCR Processing progress & real extracted receipt states
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [ocrStep, setOcrStep] = useState<number>(1);
  const [ocrProgressPercent, setOcrProgressPercent] = useState<number>(15);
  const [extractedReceipt, setExtractedReceipt] = useState<Receipt | null>(null);

  // Manual Entry Form State
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [manualSupplierName, setManualSupplierName] = useState('');
  const [manualSupplierPhone, setManualSupplierPhone] = useState('');
  const [manualSupplierGstin, setManualSupplierGstin] = useState('');
  const [manualInvoiceNumber, setManualInvoiceNumber] = useState('');
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualPaymentMethod, setManualPaymentMethod] = useState<'upi' | 'cash' | 'credit' | 'bank_transfer'>('upi');
  const [manualPaymentStatus, setManualPaymentStatus] = useState<'paid' | 'pending' | 'partial'>('paid');
  const [manualItems, setManualItems] = useState<ManualLineItemDraft[]>([
    {
      id: 'item_1',
      rawName: '',
      category: 'General Grocery',
      quantity: '1',
      unit: 'piece',
      unitPriceRupees: '',
      taxRatePercent: 0,
    },
  ]);

  // Attach cameraStream to <video> element whenever viewMode === 'camera' and cameraStream changes
  useEffect(() => {
    if (viewMode === 'camera' && cameraStream && videoRef.current) {
      const videoEl = videoRef.current;
      if (videoEl.srcObject !== cameraStream) {
        videoEl.srcObject = cameraStream;
      }
      videoEl
        .play()
        .then(() => setIsVideoReady(true))
        .catch((err) => {
          console.warn('Video play warning:', err);
        });
    }
  }, [viewMode, cameraStream]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Start live camera stream
  const startCamera = async (overrideFacing?: 'environment' | 'user') => {
    setCameraError(null);
    setIsVideoReady(false);
    setViewMode('camera');

    const targetFacing = overrideFacing || facingMode;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Live webcam streaming is not supported by this browser. Use the button below to snap or pick a photo.');
      }

      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch {
        // Fallback to any available video camera if specific constraints fail on laptop/desktop
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera stream request failed:', err);
      setCameraError(
        err?.message || 'Unable to access live camera stream. You can capture or pick an image directly from your device.'
      );
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setIsVideoReady(false);
  };

  const toggleCameraFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Capture still frame from live video
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      cameraCaptureInputRef.current?.click();
      return;
    }

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      showToast({
        type: 'warning',
        title: 'Camera Warming Up',
        message: 'Wait a second for the camera feed to appear, or click "Use Device Camera / Pick Photo".',
      });
      return;
    }

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `counter_receipt_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        stageSelectedFile(file, true);
        stopCamera();
      },
      'image/jpeg',
      0.92
    );
  };

  // Process selected file
  const stageSelectedFile = (file: File, switchToPreview = false) => {
    setErrorMessage(null);

    // Validate size (max 15MB)
    const MAX_BYTES = 15 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setErrorMessage(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 15 MB.`);
      showToast({
        type: 'error',
        title: 'File Too Large',
        message: 'Please choose an image or invoice under 15 MB.',
      });
      return;
    }

    // Validate type (allow any image/* or PDF)
    const isImage = file.type.toLowerCase().startsWith('image/') || /\.(jpg|jpeg|png|webp|heic)$/i.test(file.name);
    const isPdf = file.type.toLowerCase() === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isImage && !isPdf) {
      setErrorMessage(`Unsupported format (${file.type || 'unknown'}). Please upload JPG, PNG, WebP, HEIC, or PDF.`);
      showToast({
        type: 'error',
        title: 'Unsupported Format',
        message: 'Only image files (JPG, PNG, WebP, HEIC) and PDFs are supported.',
      });
      return;
    }

    const previewUrl = isPdf ? '' : URL.createObjectURL(file);
    const sizeMb = file.size / (1024 * 1024);
    const sizeFormatted = sizeMb < 0.1 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${sizeMb.toFixed(1)} MB`;
    const ext = file.name.split('.').pop()?.toUpperCase() || 'JPG';

    setStagedFile({
      file,
      previewUrl,
      name: file.name,
      sizeFormatted,
      ext,
    });
    const cleanDefaultName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
    setCustomReceiptName(cleanDefaultName);
    setIsEditingReceiptName(false);

    if (switchToPreview) {
      setViewMode('preview');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      stageSelectedFile(e.target.files[0], viewMode === 'camera');
      stopCamera();
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      stageSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // Begin Real Gemini AI OCR Extraction Pipeline
  const startExtraction = async () => {
    if (!stagedFile || isExtracting) return;

    setIsExtracting(true);
    setExtractedReceipt(null);
    setViewMode('processing');
    setOcrStep(1);
    setOcrProgressPercent(18);

    const stepTimer1 = setTimeout(() => {
      setOcrStep(2);
      setOcrProgressPercent(40);
    }, 550);

    const stepTimer2 = setTimeout(() => {
      setOcrStep(3);
      setOcrProgressPercent(65);
    }, 1150);

    const stepTimer3 = setTimeout(() => {
      setOcrStep(4);
      setOcrProgressPercent(84);
    }, 1800);

    try {
      const cleanDefault = stagedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
      const userModifiedName =
        customReceiptName.trim() && customReceiptName.trim() !== cleanDefault
          ? customReceiptName.trim()
          : undefined;
      const result = await receiptService.uploadAndExtractReceipt(stagedFile.file, userModifiedName);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      setExtractedReceipt(result);
      setCustomReceiptName(result.supplierName);
      setOcrStep(5);
      setOcrProgressPercent(100);
      setIsExtracting(false);

      const flaggedCount = result.items.filter((i) => i.needsReview).length;
      showToast({
        type: result.items.length > 0 ? 'success' : 'warning',
        title: result.items.length > 0 ? 'Bill Extracted by Gemini AI' : 'Manual Check Needed',
        message:
          result.items.length > 0
            ? `Extracted ${result.items.length} item(s) from ${result.supplierName} (₹${result.grandTotal.toLocaleString('en-IN')}).${flaggedCount > 0 ? ` ${flaggedCount} item(s) flagged for review.` : ''}`
            : 'No structured price rows were detected in this image. You can enter or verify details in the Review Workspace.',
      });
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setIsExtracting(false);
      setErrorMessage(err?.message || 'Failed to extract data from image. Please try again or use the Manual Form.');
      setViewMode('methods');
    }
  };

  // Manual Entry Form helpers
  const handleAddManualItem = () => {
    setManualItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}_${prev.length + 1}`,
        rawName: '',
        category: 'General Grocery',
        quantity: '1',
        unit: 'piece',
        unitPriceRupees: '',
        taxRatePercent: 0,
      },
    ]);
  };

  const handleRemoveManualItem = (id: string) => {
    if (manualItems.length <= 1) return;
    setManualItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateManualItem = (id: string, field: keyof ManualLineItemDraft, value: string | number) => {
    setManualItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const manualTotals = manualItems.reduce(
    (acc, item) => {
      const qty = Math.max(0, parseFloat(item.quantity) || 0);
      const rate = Math.max(0, parseFloat(item.unitPriceRupees) || 0);
      const base = qty * rate;
      const tax = (base * (item.taxRatePercent || 0)) / 100;
      acc.subtotal += base;
      acc.tax += tax;
      acc.grandTotal += base + tax;
      return acc;
    },
    { subtotal: 0, tax: 0, grandTotal: 0 }
  );

  const handleSubmitManualReceipt = async (targetStatus: 'verified' | 'needs_review') => {
    if (!manualSupplierName.trim()) {
      showToast({
        type: 'warning',
        title: 'Supplier Name Required',
        message: 'Please enter the wholesale supplier or shop name.',
      });
      return;
    }

    const validItems = manualItems.filter(
      (i) => i.rawName.trim() !== '' && (parseFloat(i.unitPriceRupees) || 0) >= 0
    );

    if (validItems.length === 0) {
      showToast({
        type: 'warning',
        title: 'Add At Least One Item',
        message: 'Please enter at least one item name and unit rate.',
      });
      return;
    }

    setIsSubmittingManual(true);
    try {
      const created = await receiptService.createReceipt({
        invoiceNumber: manualInvoiceNumber.trim() || `INV-${Date.now().toString().slice(-5)}`,
        receiptDate: manualDate,
        purchaseDate: manualDate,
        supplier: {
          name: manualSupplierName.trim(),
          phone: manualSupplierPhone.trim(),
          gstin: manualSupplierGstin.trim().toUpperCase(),
        },
        payment: {
          method: manualPaymentMethod,
          status: manualPaymentStatus,
        },
        reviewStatus: targetStatus,
        items: validItems.map((it) => ({
          rawName: it.rawName.trim(),
          category: it.category,
          quantity: Math.max(0.01, parseFloat(it.quantity) || 1),
          unit: it.unit,
          unitPriceMinor: Math.round(Math.max(0, parseFloat(it.unitPriceRupees) || 0) * 100),
          taxRatePercent: it.taxRatePercent || 0,
        })),
      });

      showToast({
        type: 'success',
        title: targetStatus === 'verified' ? 'Bill Recorded to Ledger' : 'Draft Saved for Review',
        message:
          targetStatus === 'verified'
            ? `Recorded ₹${created.grandTotal.toLocaleString('en-IN')} bill from ${created.supplierName}.`
            : `Created bill for ${created.supplierName}. Opening Review Workspace.`,
      });

      if (targetStatus === 'verified') {
        navigate(`/receipts/${created.id}`);
      } else {
        navigate(`/receipts/${created.id}/review`);
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Failed to Save Bill',
        message: err?.message || 'Could not save manual receipt.',
      });
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const detectedCategories =
    extractedReceipt && extractedReceipt.items.length > 0
      ? Array.from(new Set(extractedReceipt.items.map((i) => i.category))).join(', ')
      : 'Awaiting item classification';

  const flaggedItems = extractedReceipt ? extractedReceipt.items.filter((i) => i.needsReview) : [];

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Hidden offscreen elements */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        ref={cameraCaptureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Top Flow Breadcrumbs & Context Header */}
      <div className="flex flex-col gap-3 min-w-0 max-w-full">
        <div className="flex items-center justify-between flex-wrap gap-2 bg-surface-container-low px-3 sm:px-4 py-2.5 rounded-xl border border-outline/30 max-w-full">
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-label-xs sm:text-label-md">
            <div className="flex items-center gap-1.5 text-on-surface">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#1B5E3A] text-white font-bold text-xs flex-shrink-0">
                1
              </span>
              <span className="font-bold text-primary dark:text-emerald-400">
                {viewMode === 'manual' ? 'Manual Bill Entry' : 'Add Receipt'}
              </span>
            </div>
            <span className="text-outline-variant">›</span>
            <div className="flex items-center gap-1.5 text-on-surface-variant opacity-70">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-container text-on-surface-variant text-xs flex-shrink-0">
                2
              </span>
              <span>5-Second Review</span>
            </div>
            <span className="text-outline-variant">›</span>
            <div className="flex items-center gap-1.5 text-on-surface-variant opacity-70">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-container text-on-surface-variant text-xs flex-shrink-0">
                3
              </span>
              <span>Ledger Updated</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-surface-container-lowest px-3 py-1 rounded-full shadow-sm text-label-xs max-w-full">
            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></span>
            <span className="text-on-surface font-semibold truncate">{user?.shopName || 'My Store'}</span>
            {user?.gstin && <span className="text-on-surface-variant truncate">• {user.gstin}</span>}
          </div>
        </div>

        {/* Title Block & Subview Pill Buttons */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-1 min-w-0 max-w-full">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-secondary font-label-xs uppercase tracking-wider mb-1 flex-wrap">
              <span>Bahi Khata Auto-Entry</span>
              <span>•</span>
              <span>खरीद रसीद जोड़ें</span>
            </div>
            <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface tracking-tight break-words">
              {viewMode === 'processing'
                ? isExtracting
                  ? isHindi ? 'Gemini AI से आपकी अपलोड की गई रसीद को पढ़ा जा रहा है…' : 'Reading your uploaded receipt with Gemini AI…'
                  : `${isHindi ? 'स्कैन पूरा हुआ:' : 'Scan Complete:'} ${extractedReceipt?.supplierName || (isHindi ? 'जांच के लिए तैयार' : 'Ready for Review')}`
                : viewMode === 'manual'
                  ? isHindi ? 'हाथ से खरीद बिल दर्ज करें' : 'Create purchase bill manually'
                  : isHindi ? 'नया खरीद बिल जोड़ें' : 'Add a purchase receipt'}
            </h1>
            <p className="text-body-sm text-on-surface-variant mt-1 max-w-2xl">
              {viewMode === 'processing'
                ? isHindi
                  ? 'Gemini Vision AI आपके बिल इमेज से सप्लायर, मात्रा, टैक्स स्लैब और दरों का विश्लेषण कर रहा है।'
                  : 'Gemini Vision OCR is extracting the actual vendor details, quantities, tax breakdowns, and rates directly from your image.'
                : viewMode === 'manual'
                  ? isHindi
                    ? 'नीचे अपने सप्लायर का बिल या कच्चा पर्चा दर्ज करें और सीधे अपने बही-खाते में सेव करें।'
                    : 'Enter your supplier invoice or kachha parchi items directly below and save straight to your store ledger.'
                  : isHindi
                    ? 'अपने सप्लायर का बिल अपलोड करें। AI असली इमेज से सारा सामान और जोड़ निकाल लेगा।'
                    : "Bring in a bill from your supplier. We'll read the actual image data and organize your line items."}
            </p>
          </div>

          {/* Subview Pill Toggles */}
          <div className="flex items-center bg-surface-container-high p-1 rounded-xl w-full md:w-auto max-w-full overflow-x-auto border border-outline/30">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setViewMode('methods');
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all select-none whitespace-nowrap',
                viewMode === 'methods'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              {isHindi ? '1. तरीका चुनें' : '1. Choose Method'}
            </button>
            <button
              type="button"
              onClick={() => startCamera()}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all select-none whitespace-nowrap',
                viewMode === 'camera'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              {isHindi ? '2. लाइव कैमरा' : '2. Live Camera'}
            </button>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setViewMode('manual');
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all select-none whitespace-nowrap',
                viewMode === 'manual'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              {isHindi ? '3. हाथ से दर्ज करें' : '3. Manual Form'}
            </button>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setViewMode('preview');
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all select-none whitespace-nowrap',
                viewMode === 'preview'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              {isHindi ? '4. पर्चा देखें' : '4. Review Snap'}
            </button>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setViewMode('errors');
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 select-none whitespace-nowrap',
                viewMode === 'errors'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <span>5. Help & Tips</span>
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-error-container/80 border border-error/30 text-error-on-container text-body-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong>Upload Error:</strong> {errorMessage}
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-error-container rounded">
            <X className="w-4 h-4 text-error" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: 3-OPTION METHOD SELECTION                                         */}
      {/* ========================================================================= */}
      {viewMode === 'methods' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Option 1: Take Photo */}
            <div
              onClick={() => startCamera()}
              className="group relative flex flex-col justify-between bg-surface-container-lowest p-6 rounded-2xl border border-outline/60 shadow-sm hover:shadow-card hover:border-primary/50 transition-all cursor-pointer"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center text-primary-container shadow-sm">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="bg-primary-fixed text-on-primary-fixed font-label-xs text-xs px-2.5 py-1 rounded-full font-bold">
                    {isHindi ? 'सबसे लोकप्रिय' : 'Most Popular'}
                  </span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-lg font-bold text-on-surface group-hover:text-primary transition-colors">
                    {isHindi ? 'फोटो खींचें' : 'Take a photo'}
                  </h2>
                  <p className="text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                    {isHindi
                      ? 'काउंटर कैमरा, वेबकैम या फोन से सीधे खरीद पर्चे की फोटो खींचें।'
                      : 'Use your counter camera, webcam, or phone camera to capture a paper voucher directly.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="bg-surface-container px-2.5 py-0.5 rounded-full text-on-surface-variant text-label-xs font-medium">
                    Instant Gemini OCR
                  </span>
                  <span className="bg-surface-container px-2.5 py-0.5 rounded-full text-on-surface-variant text-label-xs font-medium">
                    Webcam & Mobile
                  </span>
                </div>
              </div>

              <div className="pt-6">
                <Button
                  type="button"
                  variant="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    startCamera();
                  }}
                  className="w-full justify-center font-bold shadow-sm"
                  leftIcon={<Camera className="w-4 h-4" />}
                >
                  {isHindi ? 'कैमरा खोलें' : 'Open Camera'}
                </Button>
              </div>
            </div>

            {/* Option 2: Upload File / Drag Drop (with Staged File Inside) */}
            <div className="group relative flex flex-col justify-between bg-surface-container-lowest p-6 rounded-2xl border border-outline/60 shadow-sm hover:shadow-card hover:border-primary/50 transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-secondary shadow-sm">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="bg-surface-container-high text-on-surface font-label-xs text-xs px-2.5 py-1 rounded-full font-semibold">
                    {isHindi ? 'व्हाट्सएप पर्चा' : 'WhatsApp Ready'}
                  </span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-lg font-bold text-on-surface group-hover:text-primary transition-colors">
                    {isHindi ? 'बिल की फोटो अपलोड करें' : 'Upload a photo'}
                  </h2>
                  <p className="text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                    {isHindi
                      ? 'अपने फोन या कंप्यूटर से पहले से मौजूद बिल इमेज या PDF फ़ाइल चुनें।'
                      : 'Choose an existing invoice picture or supplier PDF from this computer or device.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="bg-surface-container px-2.5 py-0.5 rounded-full text-on-surface-variant text-label-xs font-medium">
                    JPG, PNG, PDF &lt; 15MB
                  </span>
                  <span className="bg-surface-container px-2.5 py-0.5 rounded-full text-on-surface-variant text-label-xs font-medium">
                    {isHindi ? 'मंडी पर्ची' : 'Mandi slips'}
                  </span>
                </div>
              </div>

              <div className="pt-5 space-y-3">
                {stagedFile ? (
                  <div className="p-3.5 rounded-xl border-2 border-primary/50 bg-surface-container-low space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-14 rounded-lg bg-surface-container flex-shrink-0 overflow-hidden relative shadow-sm border border-outline/40 flex items-center justify-center">
                        {stagedFile.previewUrl ? (
                          <img
                            src={stagedFile.previewUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText className="w-6 h-6 text-on-surface-variant" />
                        )}
                        <span className="absolute bottom-0 inset-x-0 bg-primary/90 text-on-primary font-bold text-[0.55rem] text-center uppercase py-0.5">
                          {stagedFile.ext}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
                            {isHindi ? 'स्कैन के लिए तैयार' : 'Ready to Scan'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setStagedFile(null)}
                            className="p-1 text-error hover:bg-error-container/40 rounded"
                            title={isHindi ? 'फ़ाइल हटाएं' : 'Remove file'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs font-semibold text-on-surface truncate">
                          {stagedFile.name}
                        </p>
                        <p className="text-[11px] text-on-surface-variant">
                          {stagedFile.sizeFormatted}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-on-surface-variant block mb-1">
                        {isHindi ? 'बिल / सप्लायर का नाम (बदल सकते हैं):' : 'Receipt / Supplier Name (Editable):'}
                      </label>
                      <input
                        type="text"
                        value={customReceiptName}
                        onChange={(e) => setCustomReceiptName(e.target.value)}
                        placeholder={isHindi ? 'सप्लायर या बिल का नाम लिखें (उदा. रमेश ऑयल्स मंडी पर्चा)...' : 'Enter supplier or receipt name...'}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-outline bg-surface-container-lowest text-on-surface font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        leftIcon={<Upload className="w-3.5 h-3.5" />}
                        className="text-xs px-2.5"
                      >
                        {isHindi ? 'बदलें' : 'Change'}
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={startExtraction}
                        rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                        className="flex-1 justify-center font-bold shadow-card text-xs"
                      >
                        {isHindi ? 'AI से स्कैन शुरू करें' : 'Process this Bill'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    className={cn(
                      'p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all cursor-pointer bg-surface-container-low hover:bg-surface-container',
                      dragActive ? 'border-primary bg-primary-fixed/20' : 'border-outline'
                    )}
                  >
                    <Upload className="w-5 h-5 text-secondary mb-1" />
                    <span className="font-label-md text-xs sm:text-sm font-semibold text-on-surface">
                      {isHindi ? 'फ़ाइल चुनने के लिए क्लिक करें या यहां लाएं' : 'Click to browse or drop here'}
                    </span>
                    <span className="text-label-xs text-on-surface-variant font-medium mt-0.5">
                      {isHindi ? '15 MB तक की फ़ाइलें' : 'Up to 15 MB files'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Option 3: Create Manually */}
            <div
              onClick={() => setViewMode('manual')}
              className="group relative flex flex-col justify-between bg-surface-container-lowest p-6 rounded-2xl border border-outline/60 shadow-sm hover:shadow-card hover:border-primary/50 transition-all cursor-pointer"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-secondary shadow-sm">
                    <FileEdit className="w-6 h-6" />
                  </div>
                  <span className="bg-surface-container-high text-on-surface font-label-xs text-xs px-2.5 py-1 rounded-full font-semibold">
                    {isHindi ? 'कच्चा खाता' : 'Kachha Khata'}
                  </span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-lg font-bold text-on-surface group-hover:text-primary transition-colors">
                    {isHindi ? 'सीधे हाथ से दर्ज करें' : 'Create manually'}
                  </h2>
                  <p className="text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                    {isHindi
                      ? 'बिना किसी पर्चे के सीधे टेबल में लिखें। स्थानीय नकद खरीद के लिए उत्तम।'
                      : 'Quick tabular entry without any paper receipt. Perfect for local cash purchases.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="bg-surface-container px-2.5 py-0.5 rounded-full text-on-surface-variant text-label-xs font-medium">
                    {isHindi ? 'फोटो की ज़रूरत नहीं' : 'No scan needed'}
                  </span>
                  <span className="bg-surface-container px-2.5 py-0.5 rounded-full text-on-surface-variant text-label-xs font-medium">
                    Fast tab typing
                  </span>
                </div>
              </div>

              <div className="pt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewMode('manual');
                  }}
                  className="w-full justify-center font-bold"
                  leftIcon={<FileEdit className="w-4 h-4" />}
                >
                  {isHindi ? 'हाथ से फॉर्म भरें' : 'Open Manual Form'}
                </Button>
              </div>
            </div>
          </div>

          {/* Zero-Risk Kirana Assurance Callout */}
          <div className="bg-surface-container-low p-5 rounded-2xl border border-outline/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed flex-shrink-0 shadow-sm mt-0.5">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-0.5 max-w-2xl">
                <h3 className="font-bold text-on-surface text-sm sm:text-base">
                  Zero-Risk Kirana Assurance: Real Gemini Vision OCR
                </h3>
                <p className="text-body-sm text-on-surface-variant text-xs sm:text-sm leading-relaxed">
                  Our optical scanner reads the exact supplier name, GSTIN, item rates, and quantities printed on your uploaded bill.
                  You inspect and confirm every line item in the next 5-second check screen before anything touches your shop ledger.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-on-surface-variant text-label-xs bg-surface-container px-3 py-1.5 rounded-lg self-end md:self-auto border border-outline/40">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span>End-to-End Encrypted</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: LIVE CAMERA CAPTURE                                               */}
      {/* ========================================================================= */}
      {viewMode === 'camera' && (
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline shadow-card space-y-6 max-w-2xl mx-auto animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              <h2 className="font-headline-sm text-lg font-bold text-on-surface">Shop Counter Camera</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setViewMode('methods');
              }}
              className="p-1.5 hover:bg-surface-container rounded-lg text-on-surface-variant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {cameraError ? (
            <div className="p-8 text-center bg-surface-container-low rounded-xl border border-outline space-y-4">
              <AlertCircle className="w-10 h-10 text-error mx-auto" />
              <p className="text-body-sm text-on-surface font-semibold">{cameraError}</p>
              <p className="text-label-xs text-on-surface-variant">
                Click below to open your device camera or select a bill photo directly.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  variant="primary"
                  leftIcon={<Camera className="w-4 h-4" />}
                  onClick={() => cameraCaptureInputRef.current?.click()}
                >
                  Use Device Camera / Take Photo
                </Button>
                <Button
                  variant="secondary"
                  leftIcon={<Upload className="w-4 h-4" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse Files
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Viewfinder Frame with Target Alignment Guides */}
              <div className="relative aspect-4/3 bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={() => setIsVideoReady(true)}
                  className="w-full h-full object-cover"
                />

                {!isVideoReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white gap-3 p-4 text-center">
                    <RefreshCw className="w-7 h-7 animate-spin text-primary" />
                    <span className="text-xs sm:text-sm font-medium">
                      Starting camera stream… Please allow camera access if prompted by your browser.
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => cameraCaptureInputRef.current?.click()}
                    >
                      Or Pick / Snap Photo Directly
                    </Button>
                  </div>
                )}

                {/* Corner Target Alignment Guides */}
                <div className="absolute inset-8 border-2 border-white/60 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                  <div className="flex justify-between">
                    <span className="w-4 h-4 border-t-4 border-l-4 border-primary"></span>
                    <span className="w-4 h-4 border-t-4 border-r-4 border-primary"></span>
                  </div>
                  <div className="text-center">
                    <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                      Align receipt borders within the frame
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="w-4 h-4 border-b-4 border-l-4 border-primary"></span>
                    <span className="w-4 h-4 border-b-4 border-r-4 border-primary"></span>
                  </div>
                </div>
              </div>

              {/* Camera Shutter Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={toggleCameraFacing}
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                >
                  Switch Camera
                </Button>

                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-16 h-16 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-lg hover:bg-primary hover:scale-105 active:scale-95 transition-all ring-4 ring-primary/20"
                  aria-label="Capture Receipt Photo"
                  title="Snap Photo"
                >
                  <div className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center">
                    <Camera className="w-6 h-6" />
                  </div>
                </button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => cameraCaptureInputRef.current?.click()}
                  leftIcon={<Upload className="w-4 h-4" />}
                >
                  Device Camera / Gallery
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: MANUAL BILL CREATION FORM                                         */}
      {/* ========================================================================= */}
      {viewMode === 'manual' && (
        <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border border-outline shadow-card space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                <FileEdit className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-headline-sm text-lg font-bold text-on-surface">
                  Manual Purchase Bill Form (Kachha / Pakka Khata)
                </h2>
                <p className="text-xs text-on-surface-variant">
                  Enter supplier details and line items below. Totals and GST are calculated automatically.
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setViewMode('methods')}>
              Back to Methods
            </Button>
          </div>

          {/* Supplier & Invoice Header Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Supplier / Wholesale Party Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Shree Balaji Traders, Local Mandi Vendor"
                value={manualSupplierName}
                onChange={(e) => setManualSupplierName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline bg-surface-container-lowest text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Bill / Invoice No.
              </label>
              <input
                type="text"
                placeholder="Auto-generated if blank"
                value={manualInvoiceNumber}
                onChange={(e) => setManualInvoiceNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline bg-surface-container-lowest text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Bill Date *
              </label>
              <input
                type="date"
                required
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline bg-surface-container-lowest text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Supplier Phone (Optional)
              </label>
              <input
                type="tel"
                placeholder="+91 98XXX XXXXX"
                value={manualSupplierPhone}
                onChange={(e) => setManualSupplierPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline bg-surface-container-lowest text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Supplier GSTIN (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., 07AAAAA0000A1Z5"
                value={manualSupplierGstin}
                onChange={(e) => setManualSupplierGstin(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline bg-surface-container-lowest text-sm font-mono uppercase text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Payment Mode
              </label>
              <select
                value={manualPaymentMethod}
                onChange={(e) => setManualPaymentMethod(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline bg-surface-container-lowest text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                <option value="cash">Cash (Galla)</option>
                <option value="credit">Udhar / Credit</option>
                <option value="bank_transfer">NEFT / Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Payment Status
              </label>
              <select
                value={manualPaymentStatus}
                onChange={(e) => setManualPaymentStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline bg-surface-container-lowest text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="paid">Paid in Full</option>
                <option value="pending">Unpaid (Udhar)</option>
                <option value="partial">Partially Paid</option>
              </select>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
                Purchased Line Items ({manualItems.length})
              </h3>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddManualItem}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Item Row
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-outline/50">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container text-[11px] font-bold uppercase tracking-wider text-on-surface-variant border-b border-outline/40">
                    <th className="py-2.5 px-3 w-8">#</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Item Name *</th>
                    <th className="py-2.5 px-3 min-w-[150px]">Category</th>
                    <th className="py-2.5 px-3 w-24">Qty *</th>
                    <th className="py-2.5 px-3 w-28">Unit</th>
                    <th className="py-2.5 px-3 w-32">Unit Rate (₹) *</th>
                    <th className="py-2.5 px-3 w-24">GST %</th>
                    <th className="py-2.5 px-3 w-32 text-right">Line Total</th>
                    <th className="py-2.5 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline/30 text-sm">
                  {manualItems.map((item, idx) => {
                    const qty = Math.max(0, parseFloat(item.quantity) || 0);
                    const rate = Math.max(0, parseFloat(item.unitPriceRupees) || 0);
                    const base = qty * rate;
                    const lineTotal = base + (base * (item.taxRatePercent || 0)) / 100;

                    return (
                      <tr key={item.id} className="hover:bg-surface-container-low/50">
                        <td className="py-2.5 px-3 font-mono text-xs text-on-surface-variant">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder="e.g., Fortune Mustard Oil 1L"
                            value={item.rawName}
                            onChange={(e) => handleUpdateManualItem(item.id, 'rawName', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-outline/60 bg-surface-container-lowest text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={item.category}
                            onChange={(e) => handleUpdateManualItem(item.id, 'category', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-outline/60 bg-surface-container-lowest text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {CATEGORY_OPTIONS.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleUpdateManualItem(item.id, 'quantity', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-outline/60 bg-surface-container-lowest text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={item.unit}
                            onChange={(e) => handleUpdateManualItem(item.id, 'unit', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-outline/60 bg-surface-container-lowest text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {UNIT_OPTIONS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0.00"
                            value={item.unitPriceRupees}
                            onChange={(e) => handleUpdateManualItem(item.id, 'unitPriceRupees', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-outline/60 bg-surface-container-lowest text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={item.taxRatePercent}
                            onChange={(e) =>
                              handleUpdateManualItem(item.id, 'taxRatePercent', Number(e.target.value))
                            }
                            className="w-full px-2 py-1.5 rounded-lg border border-outline/60 bg-surface-container-lowest text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-on-surface">
                          ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            disabled={manualItems.length <= 1}
                            onClick={() => handleRemoveManualItem(item.id)}
                            className="p-1.5 text-on-surface-variant hover:text-error disabled:opacity-30 rounded-lg"
                            title="Remove row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals & Submit Bar */}
          <div className="bg-surface-container-low p-5 rounded-xl border border-outline/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="text-xs text-on-surface-variant block">Taxable Subtotal</span>
                <span className="font-mono font-bold text-base text-on-surface">
                  ₹{manualTotals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-xs text-on-surface-variant block">Total GST</span>
                <span className="font-mono font-bold text-base text-on-surface">
                  ₹{manualTotals.tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pl-4 border-l border-outline/40">
                <span className="text-xs font-bold uppercase tracking-wider text-primary block">Grand Total</span>
                <span className="font-mono font-extrabold text-xl text-primary">
                  ₹{manualTotals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              <Button
                type="button"
                variant="secondary"
                isLoading={isSubmittingManual}
                onClick={() => handleSubmitManualReceipt('needs_review')}
                leftIcon={<FileEdit className="w-4 h-4" />}
              >
                Save & Open in Review
              </Button>
              <Button
                type="button"
                variant="primary"
                isLoading={isSubmittingManual}
                onClick={() => handleSubmitManualReceipt('verified')}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                className="font-bold shadow-card"
              >
                Confirm & Record to Ledger
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: REVIEW SNAP / STAGED FILE VIEW                                    */}
      {/* ========================================================================= */}
      {viewMode === 'preview' && (
        <div className="max-w-2xl mx-auto bg-surface-container-lowest p-6 rounded-2xl border border-outline shadow-card space-y-6 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-sm text-lg font-bold text-on-surface">Review Staged Photo</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStagedFile(null);
                setViewMode('methods');
              }}
            >
              Cancel
            </Button>
          </div>

          {stagedFile ? (
            <div className="space-y-4">
              <div className="relative aspect-4/3 bg-surface-container rounded-xl overflow-hidden border border-outline/40 flex items-center justify-center">
                {stagedFile.previewUrl ? (
                  <img src={stagedFile.previewUrl} alt="Captured receipt" className="w-full h-full object-contain" />
                ) : (
                  <FileText className="w-16 h-16 text-on-surface-variant" />
                )}
              </div>

              <div className="bg-surface-container-low p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <label className="text-label-xs text-on-surface-variant font-semibold block mb-1">
                    Receipt / Supplier Name (Editable):
                  </label>
                  <input
                    type="text"
                    value={customReceiptName}
                    onChange={(e) => setCustomReceiptName(e.target.value)}
                    placeholder="Enter supplier or receipt name..."
                    className="w-full px-3 py-1.5 rounded-lg border border-outline bg-surface-container-lowest text-on-surface font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-xs text-on-surface-variant mt-1 block">
                    {stagedFile.name} ({stagedFile.sizeFormatted}) • Ready for Gemini Vision scan
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setStagedFile(null);
                    startCamera();
                  }}
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                >
                  Retake Photo
                </Button>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="secondary"
                  className="flex-1 justify-center"
                  onClick={() => setViewMode('methods')}
                >
                  Choose Different Bill
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 justify-center font-bold shadow-card"
                  onClick={startExtraction}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Start OCR Scan
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <p className="text-on-surface-variant text-body-sm">No receipt image is staged yet.</p>
              <Button variant="primary" onClick={() => setViewMode('methods')}>
                Select a Voucher
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 5: LIVE EXTRACTION PROGRESS TRACKER (ACTUAL IMAGE & ACTUAL DATA)     */}
      {/* ========================================================================= */}
      {viewMode === 'processing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-300">
          {/* LEFT COLUMN: Actual Uploaded Image & Live Extracted Overlay (7 Cols) */}
          <section className="lg:col-span-7 space-y-3">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline shadow-card overflow-hidden flex flex-col">
              {/* Top Inspector Bar */}
              <div className="px-4 py-3 bg-surface-container flex items-center justify-between text-on-surface border-b border-outline/30">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-xs sm:text-sm text-primary">
                    Scanning Uploaded Image ({stagedFile?.name || 'Document'})
                  </span>
                  <span className="text-label-xs px-2 py-0.5 rounded bg-surface-container-highest text-on-surface-variant">
                    Gemini 3.8 Flash Vision
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                  <Sliders className="w-4 h-4 text-primary" />
                  <span>{isExtracting ? 'Analyzing Pixels…' : 'Scan Complete'}</span>
                </div>
              </div>

              {/* Viewport Canvas with Actual Image & Laser Ray */}
              <div className="relative w-full h-[340px] sm:h-[500px] bg-neutral-900 flex items-center justify-center overflow-hidden select-none p-4">
                {isExtracting && (
                  <div className="absolute left-0 right-0 top-1/3 h-1 bg-gradient-to-r from-transparent via-primary to-transparent z-20 pointer-events-none opacity-95 animate-bounce">
                    <div className="absolute -top-3 left-0 right-0 h-6 bg-primary/30 blur-[4px]"></div>
                  </div>
                )}

                {stagedFile?.previewUrl ? (
                  <img
                    src={stagedFile.previewUrl}
                    alt={stagedFile.name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg border border-white/10"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-white/80 gap-3">
                    <FileText className="w-16 h-16 text-primary" />
                    <span className="font-bold text-sm">{stagedFile?.name || 'Uploaded PDF Document'}</span>
                  </div>
                )}

                {/* Live Extracted Overlay Badge at Bottom of Image */}
                {extractedReceipt && (
                  <div className="absolute bottom-4 inset-x-4 bg-black/85 backdrop-blur-md text-white p-4 rounded-xl border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold block">
                        Extracted Source Data (Click to Edit Supplier / Receipt Name)
                      </span>
                      {isEditingReceiptName ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            value={customReceiptName}
                            onChange={(e) => setCustomReceiptName(e.target.value)}
                            className="px-2.5 py-1 rounded-lg bg-white/15 border border-emerald-400 text-white font-bold text-sm focus:outline-none w-full max-w-xs"
                            placeholder="Supplier / Receipt Name"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (customReceiptName.trim()) {
                                const updated = await receiptService.updateReceiptName(
                                  extractedReceipt.id,
                                  customReceiptName.trim()
                                );
                                if (updated) setExtractedReceipt(updated);
                                else {
                                  setExtractedReceipt({
                                    ...extractedReceipt,
                                    supplierName: customReceiptName.trim(),
                                  });
                                }
                                showToast({
                                  type: 'success',
                                  title: 'Receipt Name Updated',
                                  message: `Renamed to "${customReceiptName.trim()}"`,
                                });
                              }
                              setIsEditingReceiptName(false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setCustomReceiptName(extractedReceipt.supplierName);
                            setIsEditingReceiptName(true);
                          }}
                          className="flex items-center gap-2 cursor-pointer group mt-0.5"
                          title="Click to edit receipt / supplier name"
                        >
                          <span className="font-bold text-sm sm:text-base group-hover:text-emerald-300 transition-colors">
                            {extractedReceipt.supplierName}
                          </span>
                          <FileEdit className="w-3.5 h-3.5 text-emerald-400 opacity-90" />
                        </div>
                      )}
                      <span className="text-xs text-neutral-300 block mt-0.5">
                        Bill #{extractedReceipt.invoiceNo} • Date: {extractedReceipt.billDate}
                      </span>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-xs text-neutral-300 block">
                        {extractedReceipt.items.length} item(s) detected
                      </span>
                      <span className="font-mono font-bold text-lg text-emerald-400">
                        ₹{extractedReceipt.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* RIGHT COLUMN: Sequential 5 Steps & Real Live Findings (5 Cols) */}
          <section className="lg:col-span-5 space-y-4">
            {/* Step Card */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline shadow-card space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="font-headline-sm text-base font-bold text-on-surface">Live Extraction Progress</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold flex items-center gap-1.5">
                  <span className={cn('w-1.5 h-1.5 rounded-full bg-primary', isExtracting && 'animate-pulse')}></span>
                  {ocrProgressPercent}% Done
                </span>
              </div>

              {/* Sequential 5 Steps Tracker */}
              <div className="space-y-4 relative pl-3">
                <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-surface-container-highest"></div>

                {/* Step 1 */}
                <div className="relative flex items-start gap-3">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-xs font-bold shadow-sm',
                      ocrStep >= 1 ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container text-on-surface-variant'
                    )}
                  >
                    {ocrStep > 1 ? <Check className="w-4 h-4 text-primary" /> : '1'}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-on-surface block">1. Reading uploaded image</span>
                    <span className="text-xs text-on-surface-variant">
                      {stagedFile?.name} ({stagedFile?.sizeFormatted})
                    </span>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative flex items-start gap-3">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-xs font-bold shadow-sm',
                      ocrStep >= 2 ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container text-on-surface-variant'
                    )}
                  >
                    {ocrStep > 2 ? <Check className="w-4 h-4 text-primary" /> : '2'}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-on-surface block">2. Finding supplier & date</span>
                    <span className="text-xs text-on-surface-variant">
                      {extractedReceipt
                        ? `${extractedReceipt.supplierName} • ${extractedReceipt.billDate}`
                        : 'Scanning header text with Gemini Vision…'}
                    </span>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative flex items-start gap-3">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-xs font-bold shadow-sm',
                      ocrStep >= 3 ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container text-on-surface-variant'
                    )}
                  >
                    {ocrStep > 3 ? <Check className="w-4 h-4 text-primary" /> : '3'}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-on-surface block">3. Identifying items & prices</span>
                    <span className="text-xs text-on-surface-variant">
                      {extractedReceipt
                        ? `${extractedReceipt.items.length} line item(s) extracted`
                        : 'Extracting rows, quantities, and unit rates…'}
                    </span>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative flex items-start gap-3">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-xs font-bold shadow-sm',
                      ocrStep >= 4 ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container text-on-surface-variant'
                    )}
                  >
                    {ocrStep > 4 ? <Check className="w-4 h-4 text-primary" /> : '4'}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-on-surface block">4. Categorizing items</span>
                    <span className="text-xs text-on-surface-variant">{detectedCategories}</span>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="relative flex items-start gap-3">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-xs font-bold shadow-sm',
                      ocrStep >= 5
                        ? 'bg-primary text-on-primary ring-4 ring-primary/20'
                        : 'bg-surface-container text-on-surface-variant'
                    )}
                  >
                    {ocrProgressPercent === 100 ? <Check className="w-4 h-4" /> : '5'}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-primary block">5. Checking totals & unclear details</span>
                    <span className="text-xs text-on-surface-variant">
                      {extractedReceipt
                        ? 'Ready for your 5-second verification'
                        : 'Cross-verifying tax breakdown & total…'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Extraction Findings Bento Grid */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-on-surface">Key Findings Detected</h3>
                <span className="text-xs text-on-surface-variant">
                  {isExtracting ? 'Scanning…' : 'Ready for Review'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="bg-surface-container-low p-3 rounded-xl border border-outline/30">
                  <span className="text-xs text-on-surface-variant block">Line Items</span>
                  <span className="font-bold text-lg text-on-surface mt-0.5 block">
                    {extractedReceipt ? extractedReceipt.items.length : '…'}
                  </span>
                  <span className="text-[0.65rem] text-primary font-semibold flex items-center justify-center gap-0.5 mt-0.5">
                    <Check className="w-3 h-3" />{' '}
                    {extractedReceipt
                      ? `${Math.max(0, extractedReceipt.items.length - flaggedItems.length)} clear`
                      : 'Reading'}
                  </span>
                </div>

                <div className="bg-surface-container-low p-3 rounded-xl border border-outline/30">
                  <span className="text-xs text-on-surface-variant block">Total Detected</span>
                  <span className="font-bold text-lg text-primary mt-0.5 block">
                    {extractedReceipt
                      ? formatPaise(Math.round(extractedReceipt.grandTotal * 100), { decimals: 0 })
                      : '…'}
                  </span>
                  <span className="text-[0.65rem] text-on-surface-variant mt-0.5 block">Includes GST</span>
                </div>

                <div className="bg-tertiary-fixed/30 p-3 rounded-xl border border-tertiary/30">
                  <span className="text-xs text-on-tertiary-fixed font-bold block">Needs Check</span>
                  <span className="font-bold text-lg text-tertiary mt-0.5 block">
                    {extractedReceipt ? `${flaggedItems.length} details` : '…'}
                  </span>
                  <span className="text-[0.65rem] text-tertiary font-medium mt-0.5 block">Flagged for you</span>
                </div>
              </div>

              {/* Dynamic Extracted Items Preview List */}
              {extractedReceipt && extractedReceipt.items.length > 0 && (
                <div className="bg-surface-container-low p-3 rounded-xl border border-outline/30 space-y-1.5 max-h-40 overflow-y-auto">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
                    Extracted Items from Image
                  </span>
                  {extractedReceipt.items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between text-xs py-1 border-b border-outline/20 last:border-0">
                      <span className="font-semibold text-on-surface truncate max-w-[180px]">{it.name}</span>
                      <span className="font-mono text-on-surface-variant">
                        {Math.abs(it.quantity * it.unitRate - it.lineTotal) < 0.05
                          ? `${it.quantity} ${it.unit} × ₹${it.unitRate} = `
                          : `Qty: ${it.quantity} • `}
                        <strong className="text-on-surface">₹{it.lineTotal.toLocaleString('en-IN')}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {extractedReceipt && extractedReceipt.items.length === 0 && (
                <div className="p-3.5 rounded-xl bg-tertiary-fixed/20 border border-tertiary/30 flex items-start gap-3 text-xs text-on-surface">
                  <AlertCircle className="w-4 h-4 text-tertiary flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-tertiary block font-bold mb-0.5">
                      No structured price table found in this image.
                    </strong>
                    Click <strong>Re-Scan Image</strong> below to retry OCR or add items in the Review Workspace.
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <Button
                  variant="primary"
                  size="lg"
                  disabled={isExtracting || !extractedReceipt}
                  isLoading={isExtracting}
                  className="w-full justify-center font-bold shadow-card"
                  onClick={() => extractedReceipt && navigate(`/receipts/${extractedReceipt.id}/review`)}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {isExtracting ? 'Extracting Data from Image…' : 'Review & Confirm (5-Second Check)'}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isExtracting}
                    className="flex-1 justify-center text-xs"
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                    onClick={startExtraction}
                  >
                    Re-Scan Image
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-center text-on-surface-variant text-xs"
                    onClick={() => setViewMode('manual')}
                  >
                    Enter Manually Instead
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 6: HELP & RECOVERY GUIDE                                             */}
      {/* ========================================================================= */}
      {viewMode === 'errors' && (
        <div className="max-w-2xl mx-auto bg-surface-container-lowest p-6 rounded-2xl border border-outline shadow-card space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-sm text-lg font-bold text-on-surface flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Scanning Tips & Error Troubleshooting
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setViewMode('methods')}>
              Back
            </Button>
          </div>

          <div className="space-y-3 text-body-sm text-on-surface-variant text-sm">
            <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline/30">
              <strong className="text-on-surface block mb-1">1. Faded Thermal Cash Slips:</strong>
              Flatten the rolled paper on a dark counter before taking the photo. Ensure overhead shop lighting is not casting a harsh glare.
            </div>

            <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline/30">
              <strong className="text-on-surface block mb-1">2. Handwritten Mandi Commission Slips:</strong>
              Make sure the red ink stamp, vendor mobile number, and handwritten grand total are inside the frame.
            </div>

            <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline/30">
              <strong className="text-on-surface block mb-1">3. WhatsApp Forwarded Invoices:</strong>
              You can upload PDF invoices directly without taking screenshots.
            </div>

            <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline/30">
              <strong className="text-on-surface block mb-1">4. Manual Kachha Parchi Entry:</strong>
              If you don't have a paper receipt, use the <strong>Manual Form</strong> tab to type items directly.
            </div>
          </div>

          <Button
            variant="primary"
            className="w-full justify-center font-bold"
            onClick={() => setViewMode('methods')}
          >
            Got it, Let's Add a Receipt
          </Button>
        </div>
      )}
    </div>
  );
};
