import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Receipt,
  Store,
  Sparkles,
  Download,
  AlertTriangle,
  TrendingUp,
  Info,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Dropdown } from '../components/common/Dropdown';
import { Card, CardHeader, MetricCard, ReviewAlertCard } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { Tabs } from '../components/common/Tabs';
import { Tooltip } from '../components/common/Tooltip';
import { Skeleton, TableSkeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import {
  LoadingSpinner,
  OCRAssistantProgress,
  ErrorBanner,
  type OCRStage,
} from '../components/common/LoadingIndicator';
import { PageHeader } from '../components/common/PageHeader';
import { FilterToolbar } from '../components/common/FilterToolbar';
import { DataTable, type Column } from '../components/common/DataTable';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

interface SampleReceipt {
  id: string;
  invoiceNo: string;
  supplier: string;
  date: string;
  category: string;
  amount: number;
  status: 'verified' | 'needs_checking';
}

export const DesignSystemShowcasePage: React.FC = () => {
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();

  // State for interactive testing
  const [activeTab, setActiveTab] = useState('all');
  const [segmentedTab, setSegmentedTab] = useState('preview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [showTableSkeleton, setShowTableSkeleton] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [currencyValue, setCurrencyValue] = useState('14200');
  const [searchValue, setSearchValue] = useState('');
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>(['REC-1089']);
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Sample data
  const sampleReceipts: SampleReceipt[] = [
    {
      id: 'REC-1089',
      invoiceNo: 'GW-8941',
      supplier: 'Gupta Wholesale Mart',
      date: '24 Oct 2024',
      category: 'Edible Oils & Ghee',
      amount: 18450,
      status: 'needs_checking',
    },
    {
      id: 'REC-1088',
      invoiceNo: 'SB-3301',
      supplier: 'Shree Balaji Traders',
      date: '23 Oct 2024',
      category: 'Groceries & Grains',
      amount: 42300,
      status: 'verified',
    },
    {
      id: 'REC-1087',
      invoiceNo: 'VP-9102',
      supplier: 'Vardhman Provisions',
      date: '22 Oct 2024',
      category: 'Spices & Masalas',
      amount: 8750,
      status: 'verified',
    },
    {
      id: 'REC-1086',
      invoiceNo: 'KA-1140',
      supplier: 'Kisan Agro Mandi Slips',
      date: '20 Oct 2024',
      category: 'Pulses & Dal',
      amount: 14200,
      status: 'needs_checking',
    },
  ];

  const columns: Column<SampleReceipt>[] = [
    {
      key: 'invoiceNo',
      title: 'Invoice / Bill ID',
      sortable: true,
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-bold text-on-surface">{item.invoiceNo}</span>
          <span className="text-label-xs text-on-surface-variant font-mono">{item.id}</span>
        </div>
      ),
    },
    {
      key: 'supplier',
      title: 'Supplier & Mandi',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="font-semibold text-on-surface">{item.supplier}</span>
        </div>
      ),
    },
    {
      key: 'date',
      title: 'Bill Date',
      sortable: true,
    },
    {
      key: 'category',
      title: 'Category',
      render: (item) => <Badge variant="category">{item.category}</Badge>,
    },
    {
      key: 'amount',
      title: 'Total Amount',
      align: 'right',
      tabular: true,
      sortable: true,
      render: (item) => (
        <span className="font-bold text-on-surface text-base">
          ₹{item.amount.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      align: 'center',
      render: (item) => (
        <Badge
          variant={item.status === 'verified' ? 'verified' : 'needs_checking'}
          icon={true}
        >
          {item.status === 'verified' ? 'Verified' : 'Needs checking'}
        </Badge>
      ),
    },
  ];

  const mockStages: OCRStage[] = [
    {
      id: 'upload',
      label: 'Voucher Uploaded',
      description: 'Image enhancement & edge contrast verified',
      status: 'completed',
    },
    {
      id: 'vision',
      label: 'Gemini Multimodal Analysis',
      description: 'Layout detection & thermal typography extraction',
      status: 'completed',
    },
    {
      id: 'items',
      label: 'Tax Slabs & Line Items',
      description: 'Parsed 5 line items • GST 5% & 12% mapped',
      status: 'active',
    },
    {
      id: 'math',
      label: 'Bahi Khata Math Verification',
      description: 'Subtotal cross-check against OCR grand total',
      status: 'pending',
    },
  ];

  const handleSelectAll = () => {
    if (selectedReceiptIds.length === sampleReceipts.length) {
      setSelectedReceiptIds([]);
    } else {
      setSelectedReceiptIds(sampleReceipts.map((r) => r.id));
    }
  };

  const handleSelectId = (id: string) => {
    setSelectedReceiptIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Page Header */}
      <PageHeader
        title="ShopLedger Stitch Design System"
        subtitle="Stitch-accurate token hierarchy, reusable UI primitives, and responsive patterns verified against the designs/ reference library."
        breadcrumbs={[
          { label: 'ShopLedger', href: '#' },
          { label: 'Design System', href: '#' },
          { label: 'Component Gallery' },
        ]}
        badge={
          <Badge variant="verified" icon={true}>
            Stitch Verified
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Tooltip content="Toggle between Warm Ivory & Deep Basalt palettes">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
              >
                Mode: {theme === 'dark' ? 'Dark Basalt' : 'Light Ivory'}
              </Button>
            </Tooltip>
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                showToast({
                  type: 'success',
                  title: 'Design System Synchronized',
                  message: 'All tokens, typography, and contrast standards are active.',
                })
              }
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Test Toast
            </Button>
          </div>
        }
      />

      {/* Review Alert Banner Component */}
      <ReviewAlertCard
        title="Action Required: 2 Bills Need Verification"
        description="Gemini AI extracted thermal slip GW-8941 with lower rate confidence on edible oil lines. Verify rates before night tally."
        count={2}
        actionText="Review Bills Now"
        onAction={() => setIsModalOpen(true)}
      />

      {/* ===================== 1. METRIC & KPI CARDS ===================== */}
      <section className="space-y-4">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold border-b border-outline pb-2">
          1. Metric & KPI Cards (Stitch Tabular Figures)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          <MetricCard
            label="Money Spent this Month"
            value={148650}
            isCurrency={true}
            trend={{ value: '+12.4% vs Sept', isPositive: false }}
            subtitle="Sharma Kirana Store"
            icon={<TrendingUp className="w-5 h-5 text-primary" />}
          />
          <MetricCard
            label="Invoices Recorded"
            value="34 Bills"
            trend={{ value: '100% digitized', isPositive: true }}
            subtitle="October 2024"
            icon={<Receipt className="w-5 h-5 text-secondary" />}
          />
          <MetricCard
            label="Needs Checking"
            value="2 Bills"
            subtitle="Flagged for low rate confidence"
            badge={
              <Badge variant="needs_checking" size="xs" icon={true}>
                Review
              </Badge>
            }
          />
          <MetricCard
            label="Verified & Cleared"
            value="32 Bills"
            subtitle="Committed to Bahi Khata"
            badge={
              <Badge variant="verified" size="xs" icon={true}>
                Cleared
              </Badge>
            }
          />
        </div>
      </section>

      {/* ===================== 2. BUTTONS & ACTIONS ===================== */}
      <section className="space-y-4">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold border-b border-outline pb-2">
          2. Buttons & Interaction States
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            + Upload Receipt (Primary)
          </Button>
          <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />}>
            Export Bahi Khata (Secondary)
          </Button>
          <Button
            variant="amber"
            leftIcon={<AlertTriangle className="w-4 h-4" />}
            onClick={() => setIsConfirmOpen(true)}
          >
            Needs Checking Action
          </Button>
          <Button
            variant="destructive"
            leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={() => setIsConfirmOpen(true)}
          >
            Delete Bill
          </Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="primary" isLoading={true}>
            Processing OCR
          </Button>
          <Button variant="primary" disabled={true}>
            Disabled
          </Button>
        </div>
      </section>

      {/* ===================== 3. BADGES & STATUS PILLS ===================== */}
      <section className="space-y-4">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold border-b border-outline pb-2">
          3. Badges & Kirana Status Chips
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="verified" icon={true}>
            Verified / Cleared
          </Badge>
          <Badge variant="needs_checking" icon={true}>
            Needs checking (2 items)
          </Badge>
          <Badge variant="error" icon={true}>
            Math Mismatch (-₹24.00)
          </Badge>
          <Badge variant="draft" icon={true}>
            Draft Voucher
          </Badge>
          <Badge variant="category">Edible Oils & Ghee</Badge>
          <Badge variant="category">Groceries & Grains</Badge>
          <Badge variant="category">Spices & Masalas</Badge>
          <Badge variant="neutral">Khari Baoli Mandi</Badge>
          <Badge variant="primary">GST Ready (5%)</Badge>
        </div>
      </section>

      {/* ===================== 4. FORM INPUTS & SELECTS ===================== */}
      <section className="space-y-4">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold border-b border-outline pb-2">
          4. Form Inputs, Selects & Currency Primitives
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          <Input
            label="Bought From (Supplier Name)"
            placeholder="e.g. Gupta Wholesale Mart"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            helperText="Matches supplier records automatically"
            required={true}
          />
          <Input
            label="Grand Total Amount"
            isCurrency={true}
            value={currencyValue}
            onChange={(e) => setCurrencyValue(e.target.value)}
            helperText="Tabular numbers with ₹ prefix"
          />
          <Input
            label="Security Pin / Password"
            type="password"
            defaultValue="KiranaPass123"
            helperText="Click eye icon to reveal"
          />
          <Input
            label="Flagged Line Rate (Error State)"
            isCurrency={true}
            defaultValue="148.00"
            error="Rate variance exceeds 10% of last invoice"
          />
          <Select
            label="Payment Mode"
            options={[
              { value: 'cash', label: 'Cash (Rokad)' },
              { value: 'upi', label: 'UPI / PhonePe / GPay' },
              { value: 'udhar', label: 'Credit (Udhar Ledger)' },
              { value: 'bank', label: 'Bank Transfer (NEFT/RTGS)' },
            ]}
            defaultValue="cash"
            helperText="Recorded in night cashbook tally"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-label-xs font-semibold text-on-surface-variant flex items-center gap-1">
              <span>Quick Branch Dropdown</span>
              <Tooltip content="Switch active billing location">
                <Info className="w-3.5 h-3.5 text-on-surface-variant cursor-pointer" />
              </Tooltip>
            </label>
            <Dropdown
              trigger={
                <button className="w-full h-10 px-3.5 bg-surface-container-lowest rounded-lg border border-outline text-on-surface text-body-sm flex items-center justify-between">
                  <span>Selected: Main Bazar Store</span>
                  <span className="text-on-surface-variant text-label-xs">▼</span>
                </button>
              }
              items={[
                { id: 'main', label: 'Main Bazar Store', description: 'Counter #1', onClick: () => {} },
                { id: 'godown', label: 'Godown #2 Mandi Yard', description: 'Bulk storage', onClick: () => {} },
              ]}
              menuWidth="w-full"
            />
          </div>
        </div>
      </section>

      {/* ===================== 5. TABS & SEGMENTED CONTROLS ===================== */}
      <section className="space-y-4">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold border-b border-outline pb-2">
          5. Tabs & Segmented Navigation
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-label-xs text-on-surface-variant font-semibold mb-2">
              Segmented Tab Bar (Filter Pills):
            </p>
            <Tabs
              variant="segmented"
              activeTab={segmentedTab}
              onChange={setSegmentedTab}
              tabs={[
                { id: 'preview', label: 'All Receipts', count: 34 },
                { id: 'needs_check', label: 'Needs Checking', count: 2 },
                { id: 'verified', label: 'Verified', count: 32 },
                { id: 'drafts', label: 'Drafts', count: 0 },
              ]}
            />
          </div>
          <div>
            <p className="text-label-xs text-on-surface-variant font-semibold mb-2">
              Underline Tab Bar (Ledger View):
            </p>
            <Tabs
              variant="underline"
              activeTab={activeTab}
              onChange={setActiveTab}
              tabs={[
                { id: 'all', label: 'All Bills (34)' },
                { id: 'cash', label: 'Cash Outflow' },
                { id: 'credit', label: 'Udhar Ledger' },
                { id: 'tax', label: 'GST Tax Summary' },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ===================== 6. FILTER TOOLBAR & DATA TABLE ===================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-outline pb-2">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
            6. Filter Toolbar & Data Table Primitive
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTableSkeleton((prev) => !prev)}
          >
            {showTableSkeleton ? 'Show Data' : 'Test Skeleton Loading'}
          </Button>
        </div>

        <FilterToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search by vendor, invoice no, or product name..."
          dateRangeLabel="October 2024"
          dateRangeOptions={[
            { id: 'this_month', label: 'October 2024 (Current)', onClick: () => {} },
            { id: 'last_month', label: 'September 2024', onClick: () => {} },
            { id: 'last_30', label: 'Last 30 Days', onClick: () => {} },
          ]}
          activeFilterCount={selectedReceiptIds.length > 0 ? 1 : 0}
          onClearFilters={() => setSelectedReceiptIds([])}
        />

        {showTableSkeleton ? (
          <TableSkeleton rows={4} cols={6} />
        ) : (
          <DataTable<SampleReceipt>
            columns={columns}
            data={sampleReceipts}
            keyExtractor={(item) => item.id}
            selectedIds={selectedReceiptIds}
            onSelectId={handleSelectId}
            onSelectAll={handleSelectAll}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={(col) => {
              setSortColumn(col);
              setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            }}
            onRowClick={(item) => {
              showToast({
                type: 'info',
                title: `Inspecting ${item.invoiceNo}`,
                message: `Opened receipt details for ${item.supplier}`,
              });
            }}
          />
        )}
      </section>

      {/* ===================== 7. LIVE OCR PIPELINE & FEEDBACK ===================== */}
      <section className="space-y-4">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold border-b border-outline pb-2">
          7. OCR Extraction Feedback & Loading States
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg items-start">
          <OCRAssistantProgress stages={mockStages} />

          <div className="space-y-4">
            <Card>
              <CardHeader
                title="Loading & Error Primitives"
                subtitle="Reusable spinners, skeletons, and error retry blocks"
              />
              <div className="space-y-4">
                <LoadingSpinner size="md" label="Tallying evening cashbook..." />
                <ErrorBanner
                  title="Network Packet Dropped"
                  message="Could not reach the server from the Mandi Yard godown. Upload queued in local cache."
                  onRetry={() =>
                    showToast({
                      type: 'success',
                      title: 'Retrying upload',
                      message: 'Reconnected to Cloud Storage.',
                    })
                  }
                />
                <div className="p-4 bg-surface-container-low rounded-xl">
                  <p className="text-label-xs font-semibold text-on-surface-variant mb-2">
                    Skeleton Placeholder:
                  </p>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-1.5" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ===================== 8. EMPTY STATES ===================== */}
      <section className="space-y-4">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold border-b border-outline pb-2">
          8. Empty State View
        </h2>
        <EmptyState
          title="No purchase receipts match these filters"
          description="Try selecting a different date range or clear the search query to view all 34 recorded bills."
          icon="receipt"
          actionText="+ Upload a Bill"
          onAction={() => setIsModalOpen(true)}
          secondaryActionText="Reset Filters"
          onSecondaryAction={() => setSearchValue('')}
        />
      </section>

      {/* ===================== INTERACTIVE DIALOG MODALS ===================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Review Flagged Voucher #REC-1089"
        subtitle="Gupta Wholesale Mart • Bill Date: 24 Oct 2024"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Discard
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsModalOpen(false);
                showToast({
                  type: 'success',
                  title: 'Receipt Verified',
                  message: 'Successfully committed to Bahi Khata.',
                });
              }}
            >
              Confirm & Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-body-sm text-on-surface">
            Gemini AI detected an edible oil price spike on this invoice (₹148/L vs last week's
            ₹142/L). Please inspect the extracted values before tallying.
          </p>
          <div className="p-3 bg-surface-container rounded-lg border border-outline">
            <span className="text-label-xs font-bold text-tertiary uppercase">Low Confidence Item:</span>
            <p className="text-body-sm font-semibold text-on-surface mt-1">
              Fortune Kachi Ghani Mustard Oil 1L Pouch
            </p>
            <p className="text-label-xs text-on-surface-variant">Qty: 15 Pouch • Rate: ₹148.00 • Total: ₹2,220.00</p>
          </div>
        </div>
      </Modal>

      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false);
          showToast({
            type: 'error',
            title: 'Bill Deleted',
            message: 'Purchase bill #REC-1089 has been discarded.',
          });
        }}
        title="Discard Purchase Receipt?"
        message="Are you sure you want to discard this bill? Extracted line items and scanned image will be permanently removed from your shop ledger."
        confirmText="Discard Bill"
        variant="danger"
      />
    </div>
  );
};
