import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  ArrowRight,
  ShieldAlert,
  ScanText,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { MetricCard } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { DataTable, type Column } from '../components/common/DataTable';
import { DEMO_RECEIPTS, DEMO_ANALYTICS } from '../data/demoData';
import type { Receipt as ReceiptType } from '../types';

export const GuestDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [showGateModal, setShowGateModal] = useState(false);
  const [gateAction, setGateAction] = useState('Upload a Real Bill');

  const triggerGate = (actionName: string) => {
    setGateAction(actionName);
    setShowGateModal(true);
  };

  const columns: Column<ReceiptType>[] = [
    {
      key: 'invoiceNo',
      title: 'Invoice ID (Demo)',
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
          <Store className="w-4 h-4 text-primary" />
          <span className="font-semibold text-on-surface">{item.supplierName}</span>
        </div>
      ),
    },
    {
      key: 'billDate',
      title: 'Bill Date',
    },
    {
      key: 'itemCount',
      title: 'Items',
      align: 'center',
      render: (item) => (
        <span className="font-semibold text-on-surface-variant">{item.itemCount} items</span>
      ),
    },
    {
      key: 'grandTotal',
      title: 'Total (₹)',
      align: 'right',
      tabular: true,
      render: (item) => (
        <span className="font-bold text-on-surface">
          ₹{item.grandTotal.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'OCR Status',
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
          variant="outline"
          size="sm"
          onClick={() => navigate(`/receipts/${item.id}/review`)}
        >
          Inspect
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-surface flex flex-col antialiased">
      {/* ===================== CONSPICUOUS DEMO WARNING BANNER ===================== */}
      <div className="sticky top-0 z-50 bg-tertiary text-white px-4 py-2.5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <div className="flex items-center gap-2 text-body-sm font-semibold">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 animate-pulse text-amber-200" />
          <span>
            DEMO EXPLORATION MODE: You are viewing sample data for "Aggarwal General Store".
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => triggerGate('Save your real bills')}
            className="bg-white text-tertiary-on-fixed font-bold border-none hover:bg-amber-100"
          >
            Create Free Shop Account
          </Button>
          <button
            onClick={() => navigate('/login')}
            className="text-xs text-white/90 hover:text-white underline ml-2"
          >
            Sign In
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 flex-1">
        {/* Header Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-label-xs font-bold bg-tertiary-fixed text-tertiary-on-fixed border border-tertiary-fixed-dim">
                SYNTHETIC DEMO DATA
              </span>
              <span className="text-body-sm text-on-surface-variant">• Karol Bagh, New Delhi</span>
            </div>
            <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface mt-1">
              Aggarwal General Store (Demo View)
            </h1>
          </div>

          <Button
            variant="primary"
            onClick={() => triggerGate('Upload Receipt')}
            leftIcon={<ScanText className="w-5 h-5" />}
            className="shadow-card font-bold"
          >
            + Try Uploading a Bill
          </Button>
        </div>

        {/* 4 Guided Tour Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-surface-container-lowest border-2 border-primary-container shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-label-xs font-bold text-primary-container uppercase tracking-wider">
                1. Store Dashboard
              </span>
              <h3 className="font-headline-sm text-body-lg font-bold text-on-surface mt-1">
                Tally Daily Slips
              </h3>
              <p className="text-body-sm text-on-surface-variant text-xs mt-1">
                See cash outflow, verified bills, and pending verifications in one glance.
              </p>
            </div>
            <span className="text-label-xs text-primary font-bold mt-4 flex items-center gap-1">
              Active view below ↓
            </span>
          </div>

          <div
            onClick={() => navigate('/receipts/REC-2024-1089/review')}
            className="p-4 rounded-xl bg-surface-container-lowest border border-outline hover:border-outline-variant hover:shadow-elevated transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <span className="text-label-xs font-bold text-tertiary uppercase tracking-wider">
                2. OCR Bill Inspector
              </span>
              <h3 className="font-headline-sm text-body-lg font-bold text-on-surface mt-1">
                Split-Screen Review
              </h3>
              <p className="text-body-sm text-on-surface-variant text-xs mt-1">
                Inspect how Gemini Vision extracts rates and flags low-confidence cells.
              </p>
            </div>
            <span className="text-label-xs text-primary font-bold mt-4 flex items-center gap-1">
              Test Reviewer <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div
            onClick={() => navigate('/analysis')}
            className="p-4 rounded-xl bg-surface-container-lowest border border-outline hover:border-outline-variant hover:shadow-elevated transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <span className="text-label-xs font-bold text-secondary uppercase tracking-wider">
                3. Margin & Price Spikes
              </span>
              <h3 className="font-headline-sm text-body-lg font-bold text-on-surface mt-1">
                Rate Intelligence
              </h3>
              <p className="text-body-sm text-on-surface-variant text-xs mt-1">
                Detect when suppliers hike wholesale rates on oil, sugar, or pulses.
              </p>
            </div>
            <span className="text-label-xs text-primary font-bold mt-4 flex items-center gap-1">
              View Trends <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div
            onClick={() => navigate('/ask-shopledger')}
            className="p-4 rounded-xl bg-surface-container-lowest border border-outline hover:border-outline-variant hover:shadow-elevated transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <span className="text-label-xs font-bold text-amber-600 uppercase tracking-wider">
                4. Ask Hissaab Kitaab
              </span>
              <h3 className="font-headline-sm text-body-lg font-bold text-on-surface mt-1">
                Natural Language AI
              </h3>
              <p className="text-body-sm text-on-surface-variant text-xs mt-1">
                Ask questions in everyday Hinglish or English with cited receipt proofs.
              </p>
            </div>
            <span className="text-label-xs text-primary font-bold mt-4 flex items-center gap-1">
              Try AI Query <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Demo KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Money Spent (October Demo)"
            value={DEMO_ANALYTICS.totalSpend}
            isCurrency={true}
            trend={{ value: '+12.4% vs Sept', isPositive: false }}
            subtitle="Demo Store Ledger"
          />
          <MetricCard
            label="Invoices Recorded"
            value={`${DEMO_ANALYTICS.billsCount} Bills`}
            subtitle="100% digitized"
          />
          <MetricCard
            label="Needs Checking (Demo)"
            value={`${DEMO_ANALYTICS.billsToCheck} Bills`}
            badge={
              <Badge variant="needs_checking" size="xs" icon={true}>
                Flagged
              </Badge>
            }
            subtitle="Low confidence rates"
          />
          <MetricCard
            label="Verified & Cleared"
            value={`${DEMO_ANALYTICS.verifiedBills} Bills`}
            badge={
              <Badge variant="verified" size="xs" icon={true}>
                Cleared
              </Badge>
            }
            subtitle="Committed to ledger"
          />
        </div>

        {/* Recent Purchase Receipts Table with Demo Data */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-sm text-xl font-bold text-on-surface">
              Recent Purchase Receipts (Demo Feed)
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/receipts')}
            >
              View Full Receipts Ledger
            </Button>
          </div>

          <DataTable<ReceiptType>
            columns={columns}
            data={DEMO_RECEIPTS}
            keyExtractor={(item) => item.id}
            onRowClick={(item) => navigate(`/receipts/${item.id}`)}
          />
        </div>
      </div>

      {/* Guest Gate Conversion Modal */}
      <Modal
        isOpen={showGateModal}
        onClose={() => setShowGateModal(false)}
        title="Ready to digitize your real shop bills?"
        subtitle="Create your free Hissaab Kitaab account to save real vouchers"
        size="md"
      >
        <div className="space-y-4 py-2">
          <div className="p-4 rounded-xl bg-primary-fixed/20 border border-primary/20 text-on-surface text-body-sm">
            <p className="font-bold text-primary mb-1">Action: {gateAction}</p>
            <p className="text-on-surface-variant">
              You are currently in guest exploration mode. To upload, edit, or archive your real
              physical invoices, create a free shop account in under 30 seconds.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/signup')}
              className="w-full justify-center font-bold shadow-card"
            >
              Create Free Shop Account
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/login')}
              className="w-full justify-center font-semibold"
            >
              Sign In with Existing Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
