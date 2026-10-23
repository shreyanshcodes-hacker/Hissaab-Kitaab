import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Receipt,
  Store,
  PlusCircle,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { MetricCard } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Dropdown } from '../components/common/Dropdown';
import { DataTable, type Column } from '../components/common/DataTable';
import { receiptService } from '../api/receiptService';
import { analyticsService, type AnalyticsSummary } from '../api/analyticsService';
import type { Receipt as ReceiptType } from '../types';
import { useToast } from '../context/ToastContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [receipts, setReceipts] = useState<ReceiptType[]>([]);
  const [metrics, setMetrics] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState('Main Bazar Branch');
  const [selectedPeriod, setSelectedPeriod] = useState<'this_month' | 'last_30_days' | 'all_time'>('this_month');
  const [selectedPeriodLabel, setSelectedPeriodLabel] = useState('This Month (Current)');

  // Evening checklist state for shopkeepers
  const [nightChecklist, setNightChecklist] = useState({
    allSlipsEntered: true,
    cashTallyDone: false,
    udharLedgerNoted: true,
  });

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const [rData, mData] = await Promise.all([
        receiptService.getReceipts({ limit: 5 }),
        analyticsService.getSummary({ period: selectedPeriod }),
      ]);
      setReceipts(rData.slice(0, 5));
      setMetrics(mData);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error loading dashboard',
        message: err.message || 'Unable to connect to live store records',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [selectedPeriod]);

  const columns: Column<ReceiptType>[] = [
    {
      key: 'invoiceNo',
      title: 'Bill / Voucher ID',
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-bold text-on-surface">{item.invoiceNo}</span>
          <span className="text-label-xs text-on-surface-variant font-mono">{item.id}</span>
        </div>
      ),
    },
    {
      key: 'supplierName',
      title: 'Supplier & Mandi',
      render: (item) => (
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="font-semibold text-on-surface">{item.supplierName}</span>
        </div>
      ),
    },
    {
      key: 'billDate',
      title: 'Date',
    },
    {
      key: 'grandTotal',
      title: 'Amount (₹)',
      align: 'right',
      tabular: true,
      render: (item) => (
        <span className="font-bold text-on-surface">
          ₹{item.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Verification',
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
    {
      key: 'actions',
      title: 'Action',
      align: 'right',
      render: (item) => (
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
          {item.status === 'needs_review' ? 'Review & Verify' : 'View Scan'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* ===================== DASHBOARD HEADER ===================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
              Namaste Ramesh ji 👋
            </h1>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            Store purchase summary for{' '}
            <span className="font-semibold text-on-surface">{metrics?.period?.label || selectedPeriodLabel}</span> • Sharma Kirana
            Store ({selectedBranch})
          </p>
        </div>

        {/* Branch & Month Selectors + Upload CTA */}
        <div className="flex flex-wrap items-center gap-3">
          <Dropdown
            trigger={
              <button className="h-10 px-3.5 bg-surface-container rounded-lg border border-outline text-on-surface font-label-md text-label-xs flex items-center gap-2 hover:bg-surface-container-high transition-colors">
                <Store className="w-4 h-4 text-primary" />
                <span>{selectedBranch}</span>
                <span className="text-on-surface-variant text-xs">▼</span>
              </button>
            }
            items={[
              { id: 'main', label: 'Main Bazar Branch', onClick: () => setSelectedBranch('Main Bazar Branch') },
              { id: 'godown', label: 'Godown #2 (Mandi Yard)', onClick: () => setSelectedBranch('Godown #2 (Mandi Yard)') },
            ]}
          />

          <Dropdown
            trigger={
              <button className="h-10 px-3.5 bg-surface-container rounded-lg border border-outline text-on-surface font-label-md text-label-xs flex items-center gap-2 hover:bg-surface-container-high transition-colors">
                <Calendar className="w-4 h-4 text-on-surface-variant" />
                <span>{selectedPeriodLabel}</span>
                <span className="text-on-surface-variant text-xs">▼</span>
              </button>
            }
            items={[
              {
                id: 'this_month',
                label: 'This Month (Current)',
                onClick: () => {
                  setSelectedPeriod('this_month');
                  setSelectedPeriodLabel('This Month (Current)');
                },
              },
              {
                id: 'last_30_days',
                label: 'Last 30 Days',
                onClick: () => {
                  setSelectedPeriod('last_30_days');
                  setSelectedPeriodLabel('Last 30 Days');
                },
              },
              {
                id: 'all_time',
                label: 'All Time History',
                onClick: () => {
                  setSelectedPeriod('all_time');
                  setSelectedPeriodLabel('All Time History');
                },
              },
            ]}
          />

          <Button
            variant="outline"
            size="md"
            onClick={loadDashboard}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
            className="shadow-sm"
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            onClick={() => navigate('/receipts/upload')}
            leftIcon={<PlusCircle className="w-5 h-5" />}
            className="shadow-card font-bold"
          >
            + Upload Bill
          </Button>
        </div>
      </div>

      {/* ===================== UNCLAIMED / NEEDS CHECKING ALERT RIBBON ===================== */}
      {metrics && metrics.needsCheckingCount > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-tertiary-fixed/40 border border-tertiary-fixed-dim text-tertiary-on-fixed shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-tertiary/10 rounded-lg text-tertiary flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-label-xs font-bold text-tertiary uppercase tracking-wide">
                Action Required Before Night Tally:
              </span>
              <p className="font-semibold text-body-sm text-on-surface mt-0.5">
                {metrics.needsReviewReceipts[0]?.supplierName || 'Wholesale Supplier'} ({metrics.needsReviewReceipts[0]?.invoiceNumber || 'Voucher'}) • {metrics.needsCheckingCount} bills have low rate confidence or handwritten mandi chits
              </p>
            </div>
          </div>
          <Button
            variant="amber"
            size="sm"
            onClick={() => {
              if (metrics.needsReviewReceipts[0]?.id) {
                navigate(`/receipts/${metrics.needsReviewReceipts[0].id}/review`);
              } else {
                navigate('/receipts?status=needs_review');
              }
            }}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full sm:w-auto font-bold flex-shrink-0"
          >
            Review Flagged Bills ({metrics.needsCheckingCount})
          </Button>
        </div>
      )}

      {/* ===================== 4 KEY FINANCIAL METRICS ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <MetricCard
          label="Money Spent This Period"
          value={metrics ? metrics.totalSpentRupees : 0}
          isCurrency={true}
          trend={{ value: 'Confirmed Only', isPositive: true }}
          subtitle="Drafts and unverified slips isolated"
          icon={<TrendingUp className="w-5 h-5 text-primary" />}
        />
        <MetricCard
          label="Confirmed Invoices"
          value={`${metrics?.confirmedReceiptsCount || 0} Bills`}
          trend={{ value: `${metrics?.totalConfirmedStoreCount || 0} cleared total`, isPositive: true }}
          subtitle={`Across ${metrics?.topSuppliers.length || 0} active suppliers`}
          icon={<Receipt className="w-5 h-5 text-secondary" />}
        />
        <MetricCard
          label="Needs Checking"
          value={`${metrics?.needsCheckingCount || 0} Bills`}
          badge={
            <Badge variant="needs_checking" size="xs" icon={true}>
              Attention
            </Badge>
          }
          subtitle="Low OCR confidence or discrepancies"
          onClick={() => navigate('/receipts?status=needs_review')}
        />
        <MetricCard
          label="Verified in Ledger"
          value={`${metrics?.confirmedReceiptsCount || 0} Bills`}
          badge={
            <Badge variant="verified" size="xs" icon={true}>
              Cleared
            </Badge>
          }
          subtitle="Committed to Bahi Khata"
          onClick={() => navigate('/receipts?status=verified')}
        />
      </div>

      {/* ===================== 5-COLUMN CATEGORY SPEND BREAKDOWN ===================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-headline-sm text-lg font-bold text-on-surface">
              Where Did Your Money Go?
            </h3>
            <p className="text-label-xs text-on-surface-variant">
              Actual category distribution from verified invoice items
            </p>
          </div>
          <button
            onClick={() => navigate('/analysis')}
            className="text-label-xs text-primary hover:underline font-semibold flex items-center gap-1"
          >
            Full Spending Analysis <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {metrics?.categoryBreakdown && metrics.categoryBreakdown.length > 0 ? (
            metrics.categoryBreakdown.slice(0, 5).map((cat) => (
              <div
                key={cat.category}
                onClick={() => navigate(`/receipts?category=${encodeURIComponent(cat.category)}`)}
                className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline hover:border-outline-variant hover:shadow-card transition-all cursor-pointer flex flex-col justify-between"
              >
                <span className="text-label-xs font-semibold text-on-surface-variant truncate">
                  {cat.category}
                </span>
                <div className="my-2">
                  <span className="text-body-lg font-bold text-on-surface tabular-nums">
                    ₹{cat.spendRupees.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[0.6875rem] text-on-surface-variant">
                  <span className="font-semibold text-primary">{cat.percentage}%</span>
                  <span>{cat.billsCount} bills</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full p-6 text-center text-on-surface-variant bg-surface-container-low rounded-xl">
              No category spend recorded in this date period yet.
            </div>
          )}
        </div>
      </div>

      {/* ===================== 12-COLUMN MAIN CONTENT SPLIT ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Left (8 Columns): Recent Purchase Receipts Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline-sm text-xl font-bold text-on-surface">
                Recent Purchase Receipts
              </h2>
              <p className="text-label-xs text-on-surface-variant">
                Digitized supplier invoices and physical vouchers
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/receipts')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View All Receipts
            </Button>
          </div>

          <DataTable<ReceiptType>
            columns={columns}
            data={receipts}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
            onRowClick={(item) =>
              navigate(
                item.status === 'needs_review'
                  ? `/receipts/${item.id}/review`
                  : `/receipts/${item.id}`
              )
            }
          />
        </div>

        {/* Right (4 Columns): Night Recon Helper & Top Suppliers */}
        <div className="lg:col-span-4 space-y-6">
          {/* Daily Night Reconciliation Helper Card */}
          <div className="p-space-md rounded-2xl bg-surface-container-lowest border border-outline shadow-card flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-fixed text-primary flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">
                  Daily Night Tally
                </h3>
              </div>
              <Badge variant="category" size="xs">
                Evening Recon
              </Badge>
            </div>

            <p className="text-body-sm text-xs text-on-surface-variant leading-relaxed mb-4">
              Tally today's physical chits before shuttering shop to ensure cash in rokad drawer matches supplier outflows.
            </p>

            <div className="space-y-2.5 text-body-sm">
              <label className="flex items-center gap-2.5 p-2 rounded-lg bg-surface-container-low cursor-pointer hover:bg-surface-container">
                <input
                  type="checkbox"
                  checked={nightChecklist.allSlipsEntered}
                  onChange={(e) =>
                    setNightChecklist((prev) => ({ ...prev, allSlipsEntered: e.target.checked }))
                  }
                  className="w-4 h-4 text-primary rounded border-outline cursor-pointer"
                />
                <span className="text-xs font-semibold text-on-surface">
                  All wholesale mandi slips scanned
                </span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-lg bg-surface-container-low cursor-pointer hover:bg-surface-container">
                <input
                  type="checkbox"
                  checked={nightChecklist.cashTallyDone}
                  onChange={(e) =>
                    setNightChecklist((prev) => ({ ...prev, cashTallyDone: e.target.checked }))
                  }
                  className="w-4 h-4 text-primary rounded border-outline cursor-pointer"
                />
                <span className="text-xs font-semibold text-on-surface">
                  Cash outflow matched with counter rokad
                </span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-lg bg-surface-container-low cursor-pointer hover:bg-surface-container">
                <input
                  type="checkbox"
                  checked={nightChecklist.udharLedgerNoted}
                  onChange={(e) =>
                    setNightChecklist((prev) => ({ ...prev, udharLedgerNoted: e.target.checked }))
                  }
                  className="w-4 h-4 text-primary rounded border-outline cursor-pointer"
                />
                <span className="text-xs font-semibold text-on-surface">
                  Supplier credit recorded in bahi khata
                </span>
              </label>
            </div>

            <Button
              variant={nightChecklist.cashTallyDone ? 'primary' : 'secondary'}
              size="sm"
              onClick={() =>
                showToast({
                  type: 'success',
                  title: 'Day Tally Closed',
                  message: 'Today\'s purchase slips successfully reconciled.',
                })
              }
              className="mt-4 w-full justify-center font-bold"
            >
              Close Today's Ledger
            </Button>
          </div>

          {/* Top 10 Vendors This Period */}
          <div className="p-space-md rounded-2xl bg-surface-container-lowest border border-outline shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">
                  Top Vendors by Spend
                </h3>
                <p className="text-[0.6875rem] text-on-surface-variant">
                  Ranked by confirmed order volume
                </p>
              </div>
              <span className="text-label-xs font-semibold text-primary">
                {metrics?.topSuppliers.length || 0} Vendors
              </span>
            </div>

            <div className="divide-y divide-outline/60">
              {metrics?.topSuppliers && metrics.topSuppliers.length > 0 ? (
                metrics.topSuppliers.slice(0, 10).map((vendor, idx) => (
                  <div
                    key={vendor.id}
                    onClick={() => navigate(`/suppliers/${vendor.id}`)}
                    className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-surface-container-low px-1 rounded transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-label-xs font-bold text-on-surface-variant w-4">
                        {idx + 1}.
                      </span>
                      <div className="min-w-0">
                        <p className="text-body-sm font-semibold text-on-surface truncate">
                          {vendor.name}
                        </p>
                        <p className="text-[0.6875rem] text-on-surface-variant">
                          {vendor.billsCount} bills • {vendor.sharePercentage}% share
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-body-sm font-bold text-on-surface tabular-nums">
                        ₹{vendor.spendRupees.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-on-surface-variant">
                  No confirmed vendor spend in this period.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
