import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Upload, Store, FileText, ChevronLeft, ChevronRight, X, Plus, Trash2, Filter, Pencil, Check, CreditCard } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Tabs, type TabItem } from '../components/common/Tabs';
import { FilterToolbar } from '../components/common/FilterToolbar';
import { DataTable, type Column } from '../components/common/DataTable';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Dropdown } from '../components/common/Dropdown';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { receiptService } from '../api/receiptService';
import type { Receipt } from '../types';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

export const ReceiptsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const { isHindi } = useLanguage();

  // Read URL parameters
  const currentStatus = searchParams.get('status') || 'all';
  const currentSearch = searchParams.get('q') || searchParams.get('search') || '';
  const currentCategory = searchParams.get('category') || '';
  const currentPaymentMode = searchParams.get('payment') || '';
  const currentSupplierId = searchParams.get('supplierId') || '';
  const currentDateRange = searchParams.get('dateRange') || 'all';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [pagination, setPagination] = useState({
    page: currentPage,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [tabCounts, setTabCounts] = useState({
    all: 0,
    needs_review: 0,
    verified: 0,
    draft: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);
  const [editingNameVal, setEditingNameVal] = useState<string>('');
  const [deletingReceipt, setDeletingReceipt] = useState<Receipt | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Manual entry modal state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    supplierName: '',
    invoiceNumber: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'cash',
    items: [
      { rawName: '', category: 'General Grocery', quantity: 1, unit: 'piece', unitPriceRupees: 0 },
    ],
  });

  // Helper to update search params
  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all' || value === '') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    if (key !== 'page') {
      next.delete('page'); // Reset to page 1 on filter changes
    }
    setSearchParams(next);
  };

  useEffect(() => {
    async function loadReceipts() {
      setIsLoading(true);
      try {
        const res = await receiptService.getReceiptsWithPagination({
          page: currentPage,
          limit: 10,
          status: currentStatus !== 'all' ? currentStatus : undefined,
          search: currentSearch || undefined,
          category: currentCategory || undefined,
          supplierId: currentSupplierId || undefined,
        });

        let filteredItems = res.items;
        if (currentPaymentMode) {
          filteredItems = filteredItems.filter(
            (r) => r.paymentMode.toLowerCase() === currentPaymentMode.toLowerCase()
          );
        }
        if (currentDateRange !== 'all') {
          const now = new Date();
          filteredItems = filteredItems.filter((r) => {
            const d = new Date(r.billDate);
            if (isNaN(d.getTime())) return true;
            if (currentDateRange === 'this_month') {
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }
            if (currentDateRange === 'last_month') {
              const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
              return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
            }
            if (currentDateRange === 'last_30_days') {
              const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
              return diffDays <= 30;
            }
            return true;
          });
        }

        setReceipts(filteredItems);
        setPagination(res.pagination);

        // Fetch counts for tabs
        const allList = await receiptService.getReceipts();
        setTabCounts({
          all: allList.length,
          needs_review: allList.filter((r) => r.status === 'needs_review').length,
          verified: allList.filter((r) => r.status === 'verified').length,
          draft: allList.filter((r) => r.status === 'draft').length,
        });
      } catch (err: any) {
        showToast({
          type: 'error',
          title: 'Failed to load receipts',
          message: err.message || 'Could not connect to receipts database',
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadReceipts();
  }, [currentStatus, currentSearch, currentCategory, currentPaymentMode, currentDateRange, currentSupplierId, currentPage]);

  const tabs: TabItem[] = [
    { id: 'all', label: isHindi ? 'सभी रसीदें' : 'All Receipts', count: tabCounts.all },
    { id: 'needs_review', label: isHindi ? 'जांच बाकी' : 'Needs Checking', count: tabCounts.needs_review },
    { id: 'verified', label: isHindi ? 'सत्यापित बही खाता' : 'Verified Bahi Khata', count: tabCounts.verified },
    { id: 'draft', label: isHindi ? 'ड्राफ्ट्स' : 'Drafts', count: tabCounts.draft },
  ];

  const categoriesList = [
    'Cooking Oils',
    'Rice & Grains',
    'Atta & Flour',
    'Sugar & Jaggery',
    'Spices & Masala',
    'Dairy & Beverages',
    'Snacks & Biscuits',
    'Dals & Pulses',
  ];

  const columns: Column<Receipt>[] = [
    {
      key: 'invoiceNo',
      title: isHindi ? 'रसीद / बिल ID' : 'Receipt / Bill ID',
      sortable: true,
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-bold text-on-surface">{item.invoiceNo}</span>
          <span className="text-label-xs text-on-surface-variant font-mono">{item.id}</span>
        </div>
      ),
    },
    {
      key: 'supplierName',
      title: isHindi ? 'सप्लायर / बिल का नाम' : 'Supplier / Receipt Name',
      sortable: true,
      render: (item) => (
        <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
          {editingReceiptId === item.id ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={editingNameVal}
                onChange={(e) => setEditingNameVal(e.target.value)}
                className="px-2 py-1 rounded-lg border border-primary bg-surface-container-lowest text-on-surface font-bold text-xs focus:outline-none w-40"
                autoFocus
              />
              <button
                type="button"
                onClick={async () => {
                  const trimmed = editingNameVal.trim();
                  if (trimmed) {
                    await receiptService.updateReceiptName(item.id, trimmed);
                    setReceipts((prev) =>
                      prev.map((r) => (r.id === item.id ? { ...r, supplierName: trimmed } : r))
                    );
                    showToast({
                      type: 'success',
                      title: isHindi ? 'बिल का नाम बदला' : 'Receipt Renamed',
                      message: `${isHindi ? 'नया नाम' : 'Updated to'} "${trimmed}"`,
                    });
                  }
                  setEditingReceiptId(null);
                }}
                className="p-1 rounded bg-primary text-on-primary"
                title={isHindi ? 'सेव करें' : 'Save'}
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setEditingReceiptId(null)}
                className="p-1 rounded bg-surface-container text-on-surface-variant"
                title={isHindi ? 'रद्द करें' : 'Cancel'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group">
              <Store className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span
                onClick={() =>
                  navigate(
                    item.status === 'needs_review'
                      ? `/receipts/${item.id}/review`
                      : `/receipts/${item.id}`
                  )
                }
                className="font-semibold text-on-surface hover:text-primary cursor-pointer"
              >
                {item.supplierName}
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditingReceiptId(item.id);
                  setEditingNameVal(item.supplierName);
                }}
                className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors"
                title={isHindi ? 'बिल या सप्लायर का नाम बदलें' : 'Rename receipt / supplier'}
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
          {item.mandiMarket && (
            <span className="text-[0.6875rem] text-on-surface-variant truncate max-w-xs">
              {item.mandiMarket}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'billDate',
      title: isHindi ? 'बिल तारीख' : 'Bill Date',
      sortable: true,
      tabular: true,
    },
    {
      key: 'itemCount',
      title: isHindi ? 'सामान और टैक्स' : 'Items & Slabs',
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-on-surface">
            {item.itemCount || 1} {isHindi ? 'सामान' : 'items'}
          </span>
          <Badge variant="category" size="xs">
            {item.paymentMode.toUpperCase()}
          </Badge>
        </div>
      ),
    },
    {
      key: 'grandTotal',
      title: isHindi ? 'कुल रकम' : 'Total Amount',
      align: 'right',
      tabular: true,
      sortable: true,
      render: (item) => (
        <span className="font-bold text-on-surface text-base">
          ₹{item.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'status',
      title: isHindi ? 'सत्यापन स्थिति' : 'Verification Status',
      align: 'center',
      render: (item) => (
        <Badge
          variant={item.status === 'verified' ? 'verified' : 'needs_checking'}
          icon={true}
        >
          {isHindi
            ? item.status === 'verified'
              ? 'सत्यापित'
              : 'जांच बाकी'
            : item.status === 'verified'
            ? 'Verified'
            : 'Needs checking'}
        </Badge>
      ),
    },
    {
      key: 'scannedAt',
      title: isHindi ? 'स्कैन / अपडेट' : 'Scanned / Updated',
      tabular: true,
      render: (item) => (
        <span className="text-label-xs text-on-surface-variant">
          {item.scannedAt.slice(0, 10)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: isHindi ? 'कार्रवाई' : 'Actions',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant={item.status === 'needs_review' ? 'amber' : 'outline'}
            size="sm"
            onClick={() =>
              navigate(
                item.status === 'needs_review'
                  ? `/receipts/${item.id}/review`
                  : `/receipts/${item.id}`
              )
            }
          >
            {isHindi
              ? item.status === 'needs_review'
                ? 'जांचें और दर्ज करें'
                : 'पर्ची देखें'
              : item.status === 'needs_review'
              ? 'Review & Verify'
              : 'View Scan'}
          </Button>

          <button
            type="button"
            onClick={() => setDeletingReceipt(item)}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors"
            title={isHindi ? 'रसीद हटाएं' : 'Delete Receipt'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const handleDeleteReceipt = async () => {
    if (!deletingReceipt) return;
    setIsDeleting(true);
    try {
      await receiptService.deleteReceipt(deletingReceipt.id);
      setReceipts((prev) => prev.filter((r) => r.id !== deletingReceipt.id));
      setTabCounts((prev) => ({
        ...prev,
        all: Math.max(0, prev.all - 1),
        needs_review: deletingReceipt.status === 'needs_review' ? Math.max(0, prev.needs_review - 1) : prev.needs_review,
        verified: deletingReceipt.status === 'verified' ? Math.max(0, prev.verified - 1) : prev.verified,
        draft: deletingReceipt.status === 'draft' ? Math.max(0, prev.draft - 1) : prev.draft,
      }));
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));
      showToast({
        type: 'success',
        title: isHindi ? 'बिल हटा दिया गया' : 'Receipt Deleted',
        message: isHindi
          ? `वाउचर "${deletingReceipt.invoiceNo}" बही-खाते से हटा दिया गया है।`
          : `Receipt "${deletingReceipt.invoiceNo}" has been removed from your ledger.`,
      });
      setDeletingReceipt(null);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: isHindi ? 'हटाने में त्रुटि' : 'Failed to delete receipt',
        message: err?.message || (isHindi ? 'कृपया पुनः प्रयास करें।' : 'Please try again.'),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateManualReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.supplierName.trim()) {
      showToast({ type: 'error', title: 'Supplier Name Required', message: 'Please enter the vendor name.' });
      return;
    }

    setIsSubmittingManual(true);
    try {
      await receiptService.createReceipt({
        invoiceNumber: manualForm.invoiceNumber || undefined,
        receiptDate: manualForm.purchaseDate,
        purchaseDate: manualForm.purchaseDate,
        supplier: { name: manualForm.supplierName },
        payment: { method: manualForm.paymentMethod, status: 'paid' },
        reviewStatus: 'verified',
        items: manualForm.items.map((it) => ({
          rawName: it.rawName || 'Grocery Item',
          category: it.category,
          quantity: Number(it.quantity) || 1,
          unit: it.unit,
          unitPriceMinor: Math.round(Number(it.unitPriceRupees) * 100),
          taxRatePercent: 5,
        })),
      });

      showToast({
        type: 'success',
        title: 'Bill Recorded',
        message: `Successfully created manual purchase bill for ${manualForm.supplierName}.`,
      });
      setIsManualModalOpen(false);
      // Reload receipts and tab counts
      const res = await receiptService.getReceiptsWithPagination({ page: 1, limit: 10 });
      setReceipts(res.items);
      setPagination(res.pagination);
      const allList = await receiptService.getReceipts();
      setTabCounts({
        all: allList.length,
        needs_review: allList.filter((r) => r.status === 'needs_review').length,
        verified: allList.filter((r) => r.status === 'verified').length,
        draft: allList.filter((r) => r.status === 'draft').length,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Creation Failed',
        message: err.message || 'Unable to save bill',
      });
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const activeFilterCount =
    (currentSearch ? 1 : 0) +
    (currentCategory ? 1 : 0) +
    (currentPaymentMode ? 1 : 0) +
    (currentDateRange !== 'all' ? 1 : 0) +
    (currentSupplierId ? 1 : 0);

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={isHindi ? 'खरीद बिल और रसीदें' : 'Your Purchase Receipts'}
        subtitle={
          isHindi
            ? 'स्कैन किए गए बिल, पक्की रसीदें और मंडी पर्चों को खोजें, जांचें और बही-खाते में मिलाएं।'
            : 'Search, verify, and reconcile all supplier invoices, thermal receipts, and mandi chits.'
        }
        breadcrumbs={[
          { label: 'Hissaab Kitaab', onClick: () => navigate('/dashboard') },
          { label: isHindi ? 'रसीदें और बही खाता' : 'Receipts Ledger' },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setIsManualModalOpen(true)}
              leftIcon={<FileText className="w-4 h-4" />}
              className="shadow-sm font-semibold"
            >
              {isHindi ? '+ हाथ से बिल दर्ज करें' : '+ Manual Entry'}
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/receipts/upload')}
              leftIcon={<Upload className="w-5 h-5" />}
              className="shadow-card font-bold"
            >
              {isHindi ? 'नया बिल अपलोड करें' : 'Upload Bill'}
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <Tabs
        variant="segmented"
        tabs={tabs}
        activeTab={currentStatus}
        onChange={(tabId) => updateParam('status', tabId)}
      />

      {/* Filter Toolbar */}
      <FilterToolbar
        searchValue={currentSearch}
        onSearchChange={(val) => updateParam('q', val)}
        searchPlaceholder={
          isHindi
            ? 'बिल नंबर, सप्लायर नाम या सामान के नाम से खोजें...'
            : 'Search by invoice no, vendor name, or product description...'
        }
        dateRangeLabel={
          currentDateRange === 'this_month'
            ? isHindi ? 'यह महीना' : 'This Month'
            : currentDateRange === 'last_month'
              ? isHindi ? 'पिछला महीना' : 'Last Month'
              : currentDateRange === 'last_30_days'
                ? isHindi ? 'पिछले 30 दिन' : 'Last 30 Days'
                : isHindi ? 'सभी तारीखें' : 'All Dates'
        }
        dateRangeOptions={[
          { id: 'all', label: isHindi ? 'सभी तारीखें' : 'All Dates', onClick: () => updateParam('dateRange', 'all') },
          { id: 'this_month', label: isHindi ? 'यह महीना' : 'This Month', onClick: () => updateParam('dateRange', 'this_month') },
          { id: 'last_month', label: isHindi ? 'पिछला महीना' : 'Last Month', onClick: () => updateParam('dateRange', 'last_month') },
          { id: 'last_30_days', label: isHindi ? 'पिछले 30 दिन' : 'Last 30 Days', onClick: () => updateParam('dateRange', 'last_30_days') },
        ]}
        activeFilterCount={activeFilterCount}
        onClearFilters={clearAllFilters}
        filters={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Dropdown Filter */}
            <Dropdown
              trigger={
                <button className="h-9 px-3 bg-surface-container-low hover:bg-surface-container rounded-lg border border-outline/70 text-on-surface font-label-md text-label-xs flex items-center gap-1.5 transition-colors">
                  <Filter className="w-3.5 h-3.5 text-primary" />
                  <span>{currentCategory || 'All Categories'}</span>
                  <span className="text-on-surface-variant text-[10px]">▼</span>
                </button>
              }
              items={[
                { id: 'all-cat', label: 'All Categories', onClick: () => updateParam('category', null) },
                ...categoriesList.map((cat) => ({
                  id: cat,
                  label: cat,
                  onClick: () => updateParam('category', cat),
                })),
              ]}
            />

            {/* Payment Mode Dropdown Filter */}
            <Dropdown
              trigger={
                <button className="h-9 px-3 bg-surface-container-low hover:bg-surface-container rounded-lg border border-outline/70 text-on-surface font-label-md text-label-xs flex items-center gap-1.5 transition-colors">
                  <CreditCard className="w-3.5 h-3.5 text-secondary" />
                  <span>
                    {currentPaymentMode
                      ? `Payment: ${currentPaymentMode.toUpperCase()}`
                      : 'All Payment Modes'}
                  </span>
                  <span className="text-on-surface-variant text-[10px]">▼</span>
                </button>
              }
              items={[
                { id: 'all-pay', label: 'All Payment Modes', onClick: () => updateParam('payment', null) },
                { id: 'upi', label: 'UPI (GPay / PhonePe)', onClick: () => updateParam('payment', 'upi') },
                { id: 'cash', label: 'Cash (Rokad)', onClick: () => updateParam('payment', 'cash') },
                { id: 'credit', label: 'Credit (Udhar)', onClick: () => updateParam('payment', 'credit') },
                { id: 'bank_transfer', label: 'Bank Transfer / NEFT', onClick: () => updateParam('payment', 'bank_transfer') },
              ]}
            />

            {/* Clear All Pill */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-label-xs text-primary font-semibold hover:underline flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Reset filters
              </button>
            )}
          </div>
        }
      />

      {/* Data Table */}
      <DataTable<Receipt>
        columns={columns}
        data={receipts}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        emptyTitle="No receipts match these filters"
        emptyDescription="Try clearing your search query or switching to 'All Receipts' to see all recorded vouchers."
        onRowClick={(item) =>
          navigate(
            item.status === 'needs_review'
              ? `/receipts/${item.id}/review`
              : `/receipts/${item.id}`
          )
        }
      />

      {/* Pagination Bar */}
      {!isLoading && pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-2 border-t border-outline/40 text-body-sm text-on-surface-variant">
          <div>
            Showing <strong className="text-on-surface">{(pagination.page - 1) * pagination.limit + 1}</strong> to{' '}
            <strong className="text-on-surface">{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> of{' '}
            <strong className="text-on-surface">{pagination.total}</strong> recorded bills
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => updateParam('page', String(pagination.page - 1))}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Previous
            </Button>
            <span className="text-label-xs font-semibold px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => updateParam('page', String(pagination.page + 1))}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Manual Receipt Creation Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-xl w-full p-6 shadow-xl border border-outline space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline/30 pb-3">
              <div>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface">
                  Record Manual Purchase Bill
                </h3>
                <p className="text-label-xs text-on-surface-variant">
                  Add local cash or mandi purchases directly into your Bahi Khata
                </p>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualReceipt} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-label-xs text-on-surface-variant font-semibold">Vendor / Supplier Name *</label>
                  <input
                    type="text"
                    required
                    value={manualForm.supplierName}
                    onChange={(e) => setManualForm({ ...manualForm, supplierName: e.target.value })}
                    placeholder="e.g. Gupta Wholesale Mart"
                    className="w-full bg-surface-container-low text-on-surface text-sm px-3 py-2 rounded-xl border border-outline/40 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-label-xs text-on-surface-variant font-semibold">Bill / Voucher Number</label>
                  <input
                    type="text"
                    value={manualForm.invoiceNumber}
                    onChange={(e) => setManualForm({ ...manualForm, invoiceNumber: e.target.value })}
                    placeholder="e.g. GW-9102"
                    className="w-full bg-surface-container-low text-on-surface text-sm px-3 py-2 rounded-xl border border-outline/40 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-label-xs text-on-surface-variant font-semibold">Purchase Date</label>
                  <input
                    type="date"
                    required
                    value={manualForm.purchaseDate}
                    onChange={(e) => setManualForm({ ...manualForm, purchaseDate: e.target.value })}
                    className="w-full bg-surface-container-low text-on-surface text-sm px-3 py-2 rounded-xl border border-outline/40 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-label-xs text-on-surface-variant font-semibold">Payment Mode</label>
                  <select
                    value={manualForm.paymentMethod}
                    onChange={(e) => setManualForm({ ...manualForm, paymentMethod: e.target.value })}
                    className="w-full bg-surface-container-low text-on-surface text-sm px-3 py-2 rounded-xl border border-outline/40 outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="cash">Cash (Rokad)</option>
                    <option value="upi">UPI / GPay / PhonePe</option>
                    <option value="credit_udhar">Udhar (Credit)</option>
                    <option value="bank_transfer">NEFT / Bank</option>
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-label-xs font-bold text-on-surface uppercase tracking-wider">
                    Purchased Items
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setManualForm({
                        ...manualForm,
                        items: [
                          ...manualForm.items,
                          { rawName: '', category: 'General Grocery', quantity: 1, unit: 'piece', unitPriceRupees: 0 },
                        ],
                      })
                    }
                    className="text-label-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {manualForm.items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-surface-container-low p-2 rounded-xl">
                      <input
                        type="text"
                        placeholder="Item name (e.g. Fortune Oil 1L)"
                        value={it.rawName}
                        onChange={(e) => {
                          const next = [...manualForm.items];
                          next[idx].rawName = e.target.value;
                          setManualForm({ ...manualForm, items: next });
                        }}
                        className="flex-1 bg-surface-container-lowest text-xs px-2.5 py-1.5 rounded-lg border border-outline/30 outline-none"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) => {
                          const next = [...manualForm.items];
                          next[idx].quantity = Number(e.target.value);
                          setManualForm({ ...manualForm, items: next });
                        }}
                        className="w-16 bg-surface-container-lowest text-xs px-2 py-1.5 rounded-lg border border-outline/30 outline-none text-right font-mono"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Rate ₹"
                        value={it.unitPriceRupees}
                        onChange={(e) => {
                          const next = [...manualForm.items];
                          next[idx].unitPriceRupees = Number(e.target.value);
                          setManualForm({ ...manualForm, items: next });
                        }}
                        className="w-24 bg-surface-container-lowest text-xs px-2 py-1.5 rounded-lg border border-outline/30 outline-none text-right font-mono font-bold"
                      />
                      {manualForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = manualForm.items.filter((_, i) => i !== idx);
                            setManualForm({ ...manualForm, items: next });
                          }}
                          className="p-1 text-on-surface-variant hover:text-error"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline/30">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={isSubmittingManual}
                  className="font-bold"
                >
                  {isSubmittingManual ? 'Saving…' : 'Record into Ledger'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Receipt Confirmation Modal */}
      <ConfirmationDialog
        isOpen={!!deletingReceipt}
        onClose={() => setDeletingReceipt(null)}
        onConfirm={handleDeleteReceipt}
        title={isHindi ? 'क्या आप यह बिल हटाना चाहते हैं?' : 'Delete This Receipt?'}
        message={
          deletingReceipt ? (
            <div className="space-y-2 text-left">
              <p>
                {isHindi
                  ? 'क्या आप वाकई इस बिल को बही-खाते से हटाना चाहते हैं?'
                  : 'Are you sure you want to delete this purchase receipt from your store records?'}
              </p>
              <div className="p-3 rounded-lg bg-surface-container-low border border-outline text-xs space-y-1">
                <div>
                  <strong>{isHindi ? 'सप्लायर:' : 'Supplier:'}</strong> {deletingReceipt.supplierName}
                </div>
                <div>
                  <strong>{isHindi ? 'बिल नंबर:' : 'Bill / Invoice No:'}</strong> {deletingReceipt.invoiceNo}
                </div>
                <div>
                  <strong>{isHindi ? 'रकम:' : 'Amount:'}</strong> ₹{deletingReceipt.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
