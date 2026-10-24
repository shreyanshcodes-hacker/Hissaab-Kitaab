import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Receipt,
  Store,
  Upload,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Clock,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { MetricCard } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Dropdown } from '../components/common/Dropdown';
import { DataTable, type Column } from '../components/common/DataTable';
import { receiptService } from '../api/receiptService';
import { analyticsService, type AnalyticsSummary } from '../api/analyticsService';
import type { Receipt as ReceiptType } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isHindi } = useLanguage();

  const resolvedOwnerName =
    user?.displayName || (user?.email ? user.email.split('@')[0] : 'Store Owner');
  const resolvedShopName = user?.shopName || `${resolvedOwnerName}'s Shop`;

  const [receipts, setReceipts] = useState<ReceiptType[]>([]);
  const [metrics, setMetrics] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState(user?.activeBranch || 'Main Branch');
  const [selectedPeriod, setSelectedPeriod] = useState<'this_month' | 'last_30_days' | 'all_time'>('this_month');
  const [selectedPeriodLabel, setSelectedPeriodLabel] = useState('This Month (Current)');
  const [recentStatusFilter, setRecentStatusFilter] = useState<'all' | 'needs_review' | 'verified'>('all');
  const [recentSearch, setRecentSearch] = useState('');

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
        receiptService.getReceipts({ limit: 15 }),
        analyticsService.getSummary({ period: selectedPeriod }),
      ]);
      setReceipts(rData);
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
      title: isHindi ? 'बिल / वाउचर ID' : 'Bill / Voucher ID',
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-bold text-on-surface">{item.invoiceNo}</span>
          <span className="text-label-xs text-on-surface-variant font-mono">{item.id}</span>
        </div>
      ),
    },
    {
      key: 'supplierName',
      title: isHindi ? 'सप्लायर और मंडी' : 'Supplier & Mandi',
      render: (item) => (
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="font-semibold text-on-surface">{item.supplierName}</span>
        </div>
      ),
    },
    {
      key: 'billDate',
      title: isHindi ? 'तारीख' : 'Date',
    },
    {
      key: 'grandTotal',
      title: isHindi ? 'रकम (₹)' : 'Amount (₹)',
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
      title: isHindi ? 'सत्यापन' : 'Verification',
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
      key: 'actions',
      title: isHindi ? 'कार्रवाई' : 'Action',
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
          {isHindi
            ? item.status === 'needs_review'
              ? 'जांचें और सत्यापित करें'
              : 'बिल देखें'
            : item.status === 'needs_review'
            ? 'Review & Verify'
            : 'View Scan'}
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
              {isHindi ? `नमस्ते ${resolvedOwnerName} जी 👋` : `Namaste ${resolvedOwnerName} ji 👋`}
            </h1>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            {isHindi ? 'दुकान खरीद सारांश अवधि: ' : 'Store purchase summary for '}
            <span className="font-semibold text-on-surface">{metrics?.period?.label || selectedPeriodLabel}</span> •{' '}
            {resolvedShopName} ({user?.activeBranch || selectedBranch})
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
              { id: 'main', label: isHindi ? 'मुख्य बाज़ार शाखा' : 'Main Bazar Branch', onClick: () => setSelectedBranch(isHindi ? 'मुख्य बाज़ार शाखा' : 'Main Bazar Branch') },
              { id: 'godown', label: isHindi ? 'गोदाम #2 (मंडी यार्ड)' : 'Godown #2 (Mandi Yard)', onClick: () => setSelectedBranch(isHindi ? 'गोदाम #2 (मंडी यार्ड)' : 'Godown #2 (Mandi Yard)') },
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
                label: isHindi ? 'यह महीना (चालू)' : 'This Month (Current)',
                onClick: () => {
                  setSelectedPeriod('this_month');
                  setSelectedPeriodLabel(isHindi ? 'यह महीना (चालू)' : 'This Month (Current)');
                },
              },
              {
                id: 'last_30_days',
                label: isHindi ? 'पिछले 30 दिन' : 'Last 30 Days',
                onClick: () => {
                  setSelectedPeriod('last_30_days');
                  setSelectedPeriodLabel(isHindi ? 'पिछले 30 दिन' : 'Last 30 Days');
                },
              },
              {
                id: 'all_time',
                label: isHindi ? 'शुरू से अब तक' : 'All Time History',
                onClick: () => {
                  setSelectedPeriod('all_time');
                  setSelectedPeriodLabel(isHindi ? 'शुरू से अब तक' : 'All Time History');
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
            {isHindi ? 'रिफ्रेश' : 'Refresh'}
          </Button>

          <Button
            variant="primary"
            onClick={() => navigate('/receipts/upload')}
            leftIcon={<Upload className="w-5 h-5" />}
            className="shadow-card font-bold"
          >
            {isHindi ? 'बिल अपलोड करें' : 'Upload Bill'}
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
                {isHindi ? 'दुकान बंद करने से पहले आवश्यक जांच:' : 'Action Required Before Night Tally:'}
              </span>
              <p className="font-semibold text-body-sm text-on-surface mt-0.5">
                {metrics.needsReviewReceipts[0]?.supplierName || (isHindi ? 'थोक सप्लायर' : 'Wholesale Supplier')} ({metrics.needsReviewReceipts[0]?.invoiceNumber || (isHindi ? 'वाउचर' : 'Voucher')}) • {metrics.needsCheckingCount} {isHindi ? 'बिलों में अस्पष्ट लिखावट या जोड़ की जांच बाकी है' : 'bills have low rate confidence or handwritten mandi chits'}
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
            {isHindi ? `लंबित बिल जांचें (${metrics.needsCheckingCount})` : `Review Flagged Bills (${metrics.needsCheckingCount})`}
          </Button>
        </div>
      )}

      {/* ===================== 4 KEY FINANCIAL METRICS ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <MetricCard
          label={isHindi ? 'कुल खरीद खर्च' : 'Money Spent This Period'}
          value={metrics ? metrics.totalSpentRupees : 0}
          isCurrency={true}
          trend={{ value: isHindi ? 'केवल पक्के बिल' : 'Confirmed Only', isPositive: true }}
          subtitle={isHindi ? 'ड्राफ्ट और असत्यापित पर्चे अलग' : 'Drafts and unverified slips isolated'}
          icon={<TrendingUp className="w-5 h-5 text-primary" />}
        />
        <MetricCard
          label={isHindi ? 'पुष्टि किए गए बिल' : 'Confirmed Invoices'}
          value={`${metrics?.confirmedReceiptsCount || 0} ${isHindi ? 'बिल' : 'Bills'}`}
          trend={{ value: `${metrics?.totalConfirmedStoreCount || 0} ${isHindi ? 'कुल सत्यापित' : 'cleared total'}`, isPositive: true }}
          subtitle={isHindi ? `${metrics?.topSuppliers.length || 0} सक्रिय सप्लायरों से` : `Across ${metrics?.topSuppliers.length || 0} active suppliers`}
          icon={<Receipt className="w-5 h-5 text-secondary" />}
        />
        <MetricCard
          label={isHindi ? 'जांच बाकी (Review)' : 'Needs Checking'}
          value={`${metrics?.needsCheckingCount || 0} ${isHindi ? 'बिल' : 'Bills'}`}
          badge={
            <Badge variant="needs_checking" size="xs" icon={true}>
              {isHindi ? 'ध्यान दें' : 'Attention'}
            </Badge>
          }
          subtitle={isHindi ? 'कम OCR स्कोर या जोड़ में अंतर' : 'Low OCR confidence or discrepancies'}
          onClick={() => navigate('/receipts?status=needs_review')}
        />
        <MetricCard
          label={isHindi ? 'बही-खाता में दर्ज' : 'Verified in Ledger'}
          value={`${metrics?.confirmedReceiptsCount || 0} ${isHindi ? 'बिल' : 'Bills'}`}
          badge={
            <Badge variant="verified" size="xs" icon={true}>
              {isHindi ? 'सत्यापित' : 'Cleared'}
            </Badge>
          }
          subtitle={isHindi ? 'बही-खाते में पोस्ट किए गए' : 'Committed to Bahi Khata'}
          onClick={() => navigate('/receipts?status=verified')}
        />
      </div>

      {/* ===================== 5-COLUMN CATEGORY SPEND BREAKDOWN ===================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-headline-sm text-lg font-bold text-on-surface">
              {isHindi ? 'खर्च कहां हुआ? (श्रेणीवार)' : 'Where Did Your Money Go?'}
            </h3>
            <p className="text-label-xs text-on-surface-variant">
              {isHindi ? 'सत्यापित इनवॉइस से वास्तविक श्रेणी विभाजन' : 'Actual category distribution from verified invoice items'}
            </p>
          </div>
          <button
            onClick={() => navigate('/analysis')}
            className="text-label-xs text-primary hover:underline font-semibold flex items-center gap-1"
          >
            {isHindi ? 'पूरा खर्च विश्लेषण देखें' : 'Full Spending Analysis'} <ArrowRight className="w-3.5 h-3.5" />
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-headline-sm text-xl font-bold text-on-surface">
                {isHindi ? 'हाल के खरीद बिल (Recent Bills)' : 'Recent Purchase Receipts'}
              </h2>
              <p className="text-label-xs text-on-surface-variant">
                {isHindi ? 'मंडी सप्लायरों और डिस्ट्रीब्यूटरों के बिल' : 'Digitized supplier invoices and physical vouchers'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="search"
                value={recentSearch}
                onChange={(e) => setRecentSearch(e.target.value)}
                placeholder={isHindi ? 'सप्लायर या बिल नंबर से खोजें...' : 'Filter by vendor or bill #...'}
                className="h-8 px-3 rounded-lg bg-surface-container-lowest border border-outline/70 text-xs text-on-surface outline-none focus:border-primary w-44"
              />
              <Dropdown
                trigger={
                  <button className="h-8 px-2.5 bg-surface-container-low hover:bg-surface-container rounded-lg border border-outline/70 text-on-surface font-label-md text-label-xs flex items-center gap-1.5 transition-colors">
                    <Filter className="w-3.5 h-3.5 text-primary" />
                    <span>
                      {recentStatusFilter === 'all'
                        ? isHindi ? 'सभी स्थिति' : 'All Status'
                        : recentStatusFilter === 'needs_review'
                          ? isHindi ? 'जांच बाकी' : 'Needs Checking'
                          : isHindi ? 'सत्यापित' : 'Verified'}
                    </span>
                    <span className="text-on-surface-variant text-[10px]">▼</span>
                  </button>
                }
                items={[
                  { id: 'all', label: isHindi ? 'सभी स्थिति' : 'All Status', onClick: () => setRecentStatusFilter('all') },
                  {
                    id: 'needs_review',
                    label: isHindi ? 'जांच बाकी' : 'Needs Checking',
                    onClick: () => setRecentStatusFilter('needs_review'),
                  },
                  { id: 'verified', label: isHindi ? 'केवल सत्यापित' : 'Verified Only', onClick: () => setRecentStatusFilter('verified') },
                ]}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/receipts')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                {isHindi ? 'सभी देखें' : 'View All'}
              </Button>
            </div>
          </div>

          <DataTable<ReceiptType>
            columns={columns}
            data={receipts
              .filter((r) => {
                if (recentStatusFilter !== 'all' && r.status !== recentStatusFilter) return false;
                if (recentSearch.trim()) {
                  const q = recentSearch.toLowerCase();
                  return (
                    r.supplierName.toLowerCase().includes(q) ||
                    r.invoiceNo.toLowerCase().includes(q)
                  );
                }
                return true;
              })
              .slice(0, 6)}
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
                  {isHindi ? 'दुकान शाम का हिसाब (Daily Night Tally)' : 'Daily Night Tally'}
                </h3>
              </div>
              <Badge variant="category" size="xs">
                {isHindi ? 'शाम की जांच' : 'Evening Recon'}
              </Badge>
            </div>

            <p className="text-body-sm text-xs text-on-surface-variant leading-relaxed mb-4">
              {isHindi
                ? 'दुकान का शटर गिराने से पहले कच्चे-पक्के पर्चों का मिलान करें ताकि गल्ले (कैश) और उधारी का हिसाब बिल्कुल सही रहे।'
                : "Tally today's physical chits before shuttering shop to ensure cash in rokad drawer matches supplier outflows."}
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
                  {isHindi ? 'आज के सभी थोक मंडी पर्चे स्कैन हो गए' : 'All wholesale mandi slips scanned'}
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
                  {isHindi ? 'गल्ला (कैश) और काउंटर बिक्री का हिसाब मिल गया' : 'Cash outflow matched with counter rokad'}
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
                  {isHindi ? 'सप्लायर और ग्राहक का उधार खाता अपडेट कर लिया' : 'Supplier credit recorded in bahi khata'}
                </span>
              </label>
            </div>

            <Button
              variant={nightChecklist.cashTallyDone ? 'primary' : 'secondary'}
              size="sm"
              onClick={() =>
                showToast({
                  type: 'success',
                  title: isHindi ? 'आज का हिसाब बंद' : 'Day Tally Closed',
                  message: isHindi
                    ? 'आज के सभी खरीद पर्चों का सफल मिलान हो चुका है।'
                    : "Today's purchase slips successfully reconciled.",
                })
              }
              className="mt-4 w-full justify-center font-bold"
            >
              {isHindi ? "आज का हिसाब दर्ज करें" : "Close Today's Ledger"}
            </Button>
          </div>

          {/* Top 10 Vendors This Period */}
          <div className="p-space-md rounded-2xl bg-surface-container-lowest border border-outline shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">
                  {isHindi ? 'सबसे बड़े सप्लायर (खर्च अनुसार)' : 'Top Vendors by Spend'}
                </h3>
                <p className="text-[0.6875rem] text-on-surface-variant">
                  {isHindi ? 'ऑर्डर वॉल्यूम के आधार पर रैंकिंग' : 'Ranked by confirmed order volume'}
                </p>
              </div>
              <span className="text-label-xs font-semibold text-primary">
                {metrics?.topSuppliers.length || 0} {isHindi ? 'पार्टियां' : 'Vendors'}
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
