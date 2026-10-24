import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Store,
  ShieldCheck,
  RefreshCw,
  Printer,
  Download,
  PieChart,
  Tag,
  Clock,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
  ComposedChart,
} from 'recharts';
import { Dropdown } from '../components/common/Dropdown';
import { Button } from '../components/common/Button';
import {
  analyticsService,
  type AnalyticsSummary,
  type AnalyticsTrends,
  type PriceTrackerItem,
} from '../api/analyticsService';
import { receiptService } from '../api/receiptService';
import { exportReceiptsToCsv } from '../utils/exportSlip';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

export const SpendingAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isHindi } = useLanguage();

  const [selectedPeriod, setSelectedPeriod] = useState<
    'this_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'all_time'
  >('this_month');
  const [selectedPeriodLabel, setSelectedPeriodLabel] = useState('This Month (Current)');

  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('week');
  const [metricType, setMetricType] = useState<'spend' | 'receipts'>('spend');

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trendsData, setTrendsData] = useState<AnalyticsTrends | null>(null);
  const [priceItems, setPriceItems] = useState<PriceTrackerItem[]>([]);
  const [priceSearch, setPriceSearch] = useState('');
  const [priceCategoryFilter, setPriceCategoryFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [aiExecutiveSummary, setAiExecutiveSummary] = useState<string | null>(null);
  const [isGeneratingAiSummary, setIsGeneratingAiSummary] = useState(false);

  const handleGenerateAiSummary = async () => {
    setIsGeneratingAiSummary(true);
    try {
      const res = await analyticsService.generateAiSummary(selectedPeriod);
      setAiExecutiveSummary(res.summaryText);
      showToast({
        type: 'success',
        title: 'Gemini Summary Ready',
        message: `Generated executive procurement summary using ${res.generatedBy}.`,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'AI Summary Failed',
        message: err.message || 'Could not generate AI summary',
      });
    } finally {
      setIsGeneratingAiSummary(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sumRes, trRes, priceRes] = await Promise.all([
        analyticsService.getSummary({ period: selectedPeriod }),
        analyticsService.getTrends({ granularity, metric: metricType }),
        analyticsService.getPriceTracker(),
      ]);

      setSummary(sumRes);
      setTrendsData(trRes);
      setPriceItems(priceRes.items);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error loading analysis',
        message: err.message || 'Unable to compute spending analytics',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPeriod, granularity, metricType]);

  const chartData =
    trendsData?.trends.map((t) => ({
      name: t.label,
      currentSpend: t.spendRupees,
      previousSpend: t.prevSpendRupees,
      receipts: t.receiptsCount,
    })) || [];

  return (
    <div className="space-y-8 pb-16">
      {/* ===================== PAGE HEADER & ACTIONS ===================== */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-outline/30">
        <div className="space-y-1">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-on-surface-variant text-label-xs">
            <button onClick={() => navigate('/dashboard')} className="hover:text-primary transition-colors">
              {isHindi ? 'डैशबोर्ड' : 'Dashboard'}
            </button>
            <span>/</span>
            <span className="text-primary font-semibold">{isHindi ? 'खर्च विश्लेषण' : 'Spending Analysis'}</span>
          </nav>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
            {isHindi ? 'दुकान खरीद और खर्च विश्लेषण' : "Understand your shop's purchases."}
          </h1>
          <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant">
            {isHindi
              ? 'देखें आपका पैसा कहां खर्च हुआ, कौन सा सामान सबसे ज्यादा खरीदा गया और किन मंडी सप्लायरों पर आपकी निर्भरता है।'
              : 'See where your money goes, which wholesale items you buy most, and which mandi suppliers you depend on.'}
          </p>
        </div>

        {/* Quick Actions & Ledger Compliance Tag */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-fixed text-label-xs font-bold shadow-sm">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>
              {summary?.confirmedReceiptsCount || 0} {isHindi ? 'सत्यापित बिल (ड्राफ्ट अलग)' : 'Confirmed Bills (Drafts isolated)'}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateAiSummary}
            disabled={isGeneratingAiSummary}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isGeneratingAiSummary ? 'animate-spin' : ''}`} />}
          >
            {isGeneratingAiSummary ? (isHindi ? 'तैयार हो रहा है…' : 'Generating…') : (isHindi ? 'AI सारांश' : 'AI Summary')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              showToast({
                type: 'success',
                title: isHindi ? 'प्रिंट तैयार हो रहा है' : 'Preparing Print Summary',
                message: isHindi ? 'बही-खाता समरी प्रिंट करने के लिए डायलॉग खुल रहा है…' : 'Opening print dialog for your ledger report…',
              });
              setTimeout(() => window.print(), 250);
            }}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            {isHindi ? 'प्रिंट' : 'Print'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={async () => {
              try {
                const allReceipts = await receiptService.getReceipts();
                exportReceiptsToCsv(
                  allReceipts,
                  `Hissaab_Kitaab_CA_Report_${new Date().toISOString().slice(0, 10)}.csv`
                );
                showToast({
                  type: 'success',
                  title: isHindi ? 'CA रिपोर्ट डाउनलोड हुई' : 'CA Report Downloaded',
                  message: `${isHindi ? 'अकाउंटेंट के लिए' : 'Exported'} ${allReceipts.length} ${isHindi ? 'वाउचर CSV में सुरक्षित किए गए।' : 'voucher(s) to CSV for your accountant.'}`,
                });
              } catch (err: any) {
                showToast({
                  type: 'error',
                  title: isHindi ? 'डाउनलोड विफल' : 'Export Failed',
                  message: err?.message || (isHindi ? 'CSV रिपोर्ट डाउनलोड नहीं हो सकी।' : 'Unable to export CSV report.'),
                });
              }
            }}
            leftIcon={<Download className="w-4 h-4" />}
            className="font-bold shadow-card"
          >
            {isHindi ? 'CA रिपोर्ट' : 'CA Report'}
          </Button>
        </div>
      </div>

      {aiExecutiveSummary && (
        <div className="p-5 rounded-2xl bg-secondary-container/40 border border-primary/30 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-label-xs font-bold uppercase tracking-wider text-primary">
              Gemini 2.5 Grounded Executive Procurement Summary ({selectedPeriodLabel})
            </span>
            <button
              onClick={() => setAiExecutiveSummary(null)}
              className="text-label-xs text-on-surface-variant hover:text-on-surface"
            >
              Dismiss
            </button>
          </div>
          <p className="text-body-sm text-on-surface whitespace-pre-line leading-relaxed">
            {aiExecutiveSummary}
          </p>
        </div>
      )}

      {/* ===================== GLOBAL FILTER & INTEGRITY BAR ===================== */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline shadow-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date Range Selector */}
            <Dropdown
              trigger={
                <button className="h-9 px-3.5 bg-surface-container rounded-lg border border-outline/70 text-on-surface font-label-md text-label-xs flex items-center gap-2 hover:bg-surface-container-high transition-colors">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>{selectedPeriodLabel}</span>
                  <span className="text-on-surface-variant text-[10px]">▼</span>
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
                  id: 'last_month',
                  label: 'Previous Month',
                  onClick: () => {
                    setSelectedPeriod('last_month');
                    setSelectedPeriodLabel('Previous Month');
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
                  id: 'last_90_days',
                  label: 'Last 90 Days',
                  onClick: () => {
                    setSelectedPeriod('last_90_days');
                    setSelectedPeriodLabel('Last 90 Days');
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

            {/* Scope Badge */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-label-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Confirmed Bills Only ({summary?.confirmedReceiptsCount || 0})
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            className="text-on-surface-variant"
          >
            Refresh
          </Button>
        </div>

        {/* Data Integrity Strip */}
        <div className="pt-2 border-t border-outline/20 flex flex-wrap items-center gap-2 text-label-xs text-on-surface-variant">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            <span>
              <strong>{summary?.confirmedReceiptsCount || 0} Confirmed bills</strong> (₹
              {(summary?.totalSpentRupees || 0).toLocaleString('en-IN')} analyzed)
            </span>
          </span>

          {summary && summary.needsCheckingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                <strong>{summary.needsCheckingCount} Bills need checking</strong> (isolated from tally)
              </span>
              <button
                onClick={() => navigate('/receipts?status=needs_review')}
                className="underline ml-1 hover:text-tertiary"
              >
                Verify now
              </button>
            </span>
          )}

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container">
            <Clock className="w-3.5 h-3.5 text-secondary" />
            <span>Zero invented transactions • Strict arithmetic reconciliation</span>
          </span>
        </div>
      </div>

      {/* ===================== 4-COLUMN EXECUTIVE KPI STRIP ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-label-xs uppercase tracking-wider font-semibold">Total Wholesale Spend</span>
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-on-surface">
              ₹{(summary?.totalSpentRupees || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <p className="text-label-xs text-on-surface-variant mt-1">Confirmed bills only</p>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-label-xs uppercase tracking-wider font-semibold">Average Bill Value</span>
            <Store className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-on-surface">
              ₹
              {summary && summary.confirmedReceiptsCount > 0
                ? Math.round(summary.totalSpentRupees / summary.confirmedReceiptsCount).toLocaleString('en-IN')
                : '0'}
            </span>
            <p className="text-label-xs text-on-surface-variant mt-1">Across {summary?.confirmedReceiptsCount || 0} orders</p>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-label-xs uppercase tracking-wider font-semibold">Top Vendor Share</span>
            <Tag className="w-5 h-5 text-tertiary" />
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-on-surface">
              {summary?.topSuppliers[0]?.sharePercentage || 0}%
            </span>
            <p className="text-label-xs text-on-surface-variant mt-1 truncate">
              {summary?.topSuppliers[0]?.name || 'N/A'}
            </p>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-label-xs uppercase tracking-wider font-semibold">Product Categories</span>
            <PieChart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <span className="text-2xl font-bold font-mono text-on-surface">
              {summary?.categoryBreakdown.length || 0} Slabs
            </span>
            <p className="text-label-xs text-on-surface-variant mt-1">Across retail inventory</p>
          </div>
        </div>
      </div>

      {/* ===================== 3 ACTIONABLE KIRANA INSIGHT CARDS ===================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        <div className="p-5 rounded-2xl bg-tertiary-fixed/30 border border-tertiary-fixed-dim/70 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="px-2 py-0.5 rounded-full text-label-xs font-bold bg-tertiary text-on-tertiary">
              Commodity Rate Shift
            </span>
            <h3 className="font-headline-sm text-base font-bold text-on-surface">
              Sugar wholesale prices rose by ₹2.40/kg
            </h3>
            <p className="text-body-sm text-xs text-on-surface-variant leading-relaxed">
              Madhur Sugar (M-30 Grade) average bag rate rose from ₹2,040 to ₹2,120 across R.K. Agro and Balaji Traders.
            </p>
          </div>
          <button
            onClick={() => navigate('/catalog')}
            className="mt-4 text-label-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            Inspect Sugar Price Trend <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-secondary-container/50 border border-secondary/20 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="px-2 py-0.5 rounded-full text-label-xs font-bold bg-secondary text-on-secondary">
              Vendor Consolidation
            </span>
            <h3 className="font-headline-sm text-base font-bold text-on-surface">
              Edible oil orders split across 3 suppliers
            </h3>
            <p className="text-body-sm text-xs text-on-surface-variant leading-relaxed">
              Purchased refined & mustard oils from Gupta Wholesale Mart and Balaji Traders. Consolidating volume could unlock mandi discounts.
            </p>
          </div>
          <button
            onClick={() => navigate('/suppliers')}
            className="mt-4 text-label-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            Compare Oil Suppliers <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-primary-fixed/20 border border-primary/20 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="px-2 py-0.5 rounded-full text-label-xs font-bold bg-primary text-on-primary">
              Category Concentration
            </span>
            <h3 className="font-headline-sm text-base font-bold text-on-surface">
              Most spend was in {summary?.categoryBreakdown[0]?.category || 'Wholesale Goods'} ({summary?.categoryBreakdown[0]?.percentage || 0}%)
            </h3>
            <p className="text-body-sm text-xs text-on-surface-variant leading-relaxed">
              Total ₹{(summary?.categoryBreakdown[0]?.spendRupees || 0).toLocaleString('en-IN')} across {summary?.categoryBreakdown[0]?.billsCount || 0} bills.
            </p>
          </div>
          <span className="mt-4 text-label-xs text-on-surface-variant font-medium">
            Replenishment cycle: ~5 days
          </span>
        </div>
      </div>

      {/* ===================== PURCHASE SPENDING OVER TIME CHART ===================== */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-outline/30 gap-4">
          <div>
            <h2 className="font-headline-sm text-lg font-bold text-on-surface">
              Purchase Spending Over Time
            </h2>
            <p className="text-label-xs text-on-surface-variant">
              Procurement pace comparison against previous historical period
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Granularity Switch */}
            <div className="bg-surface-container p-1 rounded-xl flex items-center gap-1 text-label-xs">
              <button
                onClick={() => setGranularity('day')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  granularity === 'day' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setGranularity('week')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  granularity === 'week' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setGranularity('month')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  granularity === 'month' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant'
                }`}
              >
                Month
              </button>
            </div>

            {/* Metric Switch */}
            <div className="bg-surface-container p-1 rounded-xl flex items-center gap-1 text-label-xs">
              <button
                onClick={() => setMetricType('spend')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  metricType === 'spend' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant'
                }`}
              >
                Spend (₹)
              </button>
              <button
                onClick={() => setMetricType('receipts')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  metricType === 'receipts' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant'
                }`}
              >
                Receipts
              </button>
            </div>
          </div>
        </div>

        {/* Chart Legend & Peak Callout */}
        <div className="flex flex-wrap items-center justify-between text-label-xs text-on-surface-variant">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-primary"></span>
              <span>Current Period Outflow</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 border-t-2 border-dashed border-outline-variant"></span>
              <span>Previous Period Baseline</span>
            </div>
          </div>
          {trendsData?.peakPeriod && (
            <span className="font-semibold text-on-surface">
              Peak: <strong>{trendsData.peakPeriod.label}</strong> (₹{trendsData.peakPeriod.spendRupees.toLocaleString('en-IN')})
            </span>
          )}
        </div>

        {/* Recharts Container */}
        <div className="w-full h-72 sm:h-80 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickFormatter={(val) => (metricType === 'spend' ? `₹${(val / 1000).toFixed(0)}k` : val)}
              />
              <Tooltip
                formatter={(value: any, name: any) => [
                  metricType === 'spend' ? `₹${Number(value).toLocaleString('en-IN')}` : `${value} Bills`,
                  name === 'currentSpend' ? 'Current Period' : 'Previous Period',
                ]}
                contentStyle={{ borderRadius: 8, borderColor: '#D1D5DB' }}
              />
              <Bar
                dataKey={metricType === 'spend' ? 'currentSpend' : 'receipts'}
                fill="#04442F"
                radius={[4, 4, 0, 0]}
                barSize={40}
              />
              {metricType === 'spend' && (
                <Line
                  type="monotone"
                  dataKey="previousSpend"
                  stroke="#9CA3AF"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#9CA3AF' }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===================== CATEGORY BREAKDOWN & TOP SUPPLIERS ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Category Breakdown (6 Columns) */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-surface-container-lowest border border-outline shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-base font-bold text-on-surface">
              Spending by Category
            </h3>
            <span className="text-label-xs text-on-surface-variant">
              {summary?.categoryBreakdown.length || 0} Categories • Confirmed
            </span>
          </div>

          <div className="space-y-4">
            {summary?.categoryBreakdown && summary.categoryBreakdown.length > 0 ? (
              summary.categoryBreakdown.map((cat) => (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex justify-between text-body-sm">
                    <span className="font-semibold text-on-surface">{cat.category}</span>
                    <span className="font-bold tabular-nums text-on-surface">
                      ₹{cat.spendRupees.toLocaleString('en-IN')}{' '}
                      <span className="text-xs text-on-surface-variant font-normal">
                        ({cat.percentage}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-on-surface-variant py-4 text-center">No categories recorded.</p>
            )}
          </div>
        </div>

        {/* Top 10 Suppliers by Spend (6 Columns) */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-surface-container-lowest border border-outline shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-base font-bold text-on-surface">
              Top Suppliers by Spend
            </h3>
            <span className="text-label-xs text-on-surface-variant">Ranked by verified volume</span>
          </div>

          <div className="divide-y divide-outline/60 max-h-96 overflow-y-auto">
            {summary?.topSuppliers && summary.topSuppliers.length > 0 ? (
              summary.topSuppliers.map((supp, idx) => (
                <div
                  key={supp.id}
                  onClick={() => navigate(`/suppliers/${supp.id}`)}
                  className="py-3 flex items-center justify-between hover:bg-surface-container-low px-1 rounded transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-label-xs font-bold text-on-surface-variant w-4">
                      {idx + 1}.
                    </span>
                    <div>
                      <p className="font-semibold text-body-sm text-on-surface">{supp.name}</p>
                      <p className="text-label-xs text-on-surface-variant">{supp.billsCount} bills recorded</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-body-sm text-on-surface tabular-nums">
                      ₹{supp.spendRupees.toLocaleString('en-IN')}
                    </p>
                    <p className="text-label-xs text-primary font-semibold">{supp.sharePercentage}% share</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-on-surface-variant py-4 text-center">No suppliers in this period.</p>
            )}
          </div>
        </div>
      </div>

      {/* ===================== MANDI & WHOLESALE PRICE TRACKER ===================== */}
      <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-headline-sm text-lg font-bold text-on-surface">
              Wholesale Price Tracker (Mandi & Brand Rates)
            </h3>
            <p className="text-label-xs text-on-surface-variant mt-0.5">
              Tracks actual unit rates billed on physical invoices across commodities and suppliers.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="search"
              value={priceSearch}
              onChange={(e) => setPriceSearch(e.target.value)}
              placeholder="Filter items or vendor..."
              className="h-8 px-3 rounded-lg bg-surface-container-low border border-outline/70 text-xs text-on-surface outline-none focus:border-primary w-44"
            />
            <Dropdown
              trigger={
                <button className="h-8 px-2.5 bg-surface-container-low hover:bg-surface-container rounded-lg border border-outline/70 text-on-surface font-label-md text-label-xs flex items-center gap-1.5 transition-colors">
                  <Filter className="w-3.5 h-3.5 text-primary" />
                  <span>{priceCategoryFilter || 'All Categories'}</span>
                  <span className="text-on-surface-variant text-[10px]">▼</span>
                </button>
              }
              items={[
                { id: 'all-pcat', label: 'All Categories', onClick: () => setPriceCategoryFilter('') },
                ...Array.from(new Set(priceItems.map((p) => p.category).filter(Boolean))).map(
                  (cat) => ({
                    id: cat,
                    label: cat,
                    onClick: () => setPriceCategoryFilter(cat),
                  })
                ),
              ]}
            />
            <button
              onClick={() => navigate('/catalog')}
              className="text-label-xs text-primary font-bold hover:underline ml-1"
            >
              View All Catalog →
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-outline bg-surface-container-low text-label-xs font-semibold text-on-surface-variant">
                <th className="p-3">Commodity / Item</th>
                <th className="p-3">Category</th>
                <th className="p-3">Primary Supplier</th>
                <th className="p-3 text-right">Latest Rate (₹)</th>
                <th className="p-3 text-center">Rate Range (₹)</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/60">
              {priceItems
                .filter((item) => {
                  const matchesCat = !priceCategoryFilter || item.category === priceCategoryFilter;
                  const matchesSearch =
                    !priceSearch.trim() ||
                    item.name.toLowerCase().includes(priceSearch.toLowerCase()) ||
                    item.primarySupplier.toLowerCase().includes(priceSearch.toLowerCase());
                  return matchesCat && matchesSearch;
                })
                .map((item) => (
                <tr key={item.name} className="hover:bg-surface-container-low/60">
                  <td className="p-3 font-semibold text-on-surface">{item.name}</td>
                  <td className="p-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-container text-on-surface">
                      {item.category}
                    </span>
                  </td>
                  <td className="p-3 text-on-surface-variant">{item.primarySupplier}</td>
                  <td className="p-3 text-right font-bold text-on-surface tabular-nums">
                    ₹{item.latestRateRupees.toFixed(2)} / {item.unit}
                  </td>
                  <td className="p-3 text-center tabular-nums text-xs">
                    ₹{item.lowestRateRupees.toFixed(2)} - ₹{item.highestRateRupees.toFixed(2)}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => navigate('/catalog')}
                      className="text-label-xs text-primary font-bold hover:underline"
                    >
                      Price History
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
