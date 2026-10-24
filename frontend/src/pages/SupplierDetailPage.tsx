import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Save,
  CheckCircle2,
  Upload,
  Filter,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Dropdown } from '../components/common/Dropdown';
import { DataTable, type Column } from '../components/common/DataTable';
import { supplierService } from '../api/supplierService';
import { receiptService } from '../api/receiptService';
import type { Supplier, Receipt as ReceiptType } from '../types';
import { useToast } from '../context/ToastContext';

export const SupplierDetailPage: React.FC = () => {
  const { supplierId = 'supp-gupta-wholesale' } = useParams<{ supplierId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [receipts, setReceipts] = useState<ReceiptType[]>([]);
  const [receiptSearch, setReceiptSearch] = useState('');
  const [receiptStatusFilter, setReceiptStatusFilter] = useState<'all' | 'verified' | 'needs_review'>('all');
  const [notes, setNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [sData, rData] = await Promise.all([
          supplierService.getSupplierById(supplierId),
          receiptService.getReceipts({ supplierId }),
        ]);
        if (sData) {
          setSupplier(sData);
          setNotes(sData.notes || '');
        }
        setReceipts(rData);
      } catch (err: any) {
        showToast({
          type: 'error',
          title: 'Error loading supplier',
          message: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [supplierId, showToast]);

  const handleSaveNotes = async () => {
    if (!supplier) return;
    try {
      await supplierService.updateSupplierNotes(supplier.id, notes);
      setIsEditingNotes(false);
      showToast({
        type: 'success',
        title: 'Notes Saved',
        message: 'Private shopkeeper notes updated.',
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Save failed',
        message: err.message,
      });
    }
  };

  const receiptColumns: Column<ReceiptType>[] = [
    {
      key: 'invoiceNo',
      title: 'Bill / Voucher No.',
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-bold text-on-surface">{item.invoiceNo}</span>
          <span className="text-label-xs text-on-surface-variant font-mono">{item.id}</span>
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
      render: (item) => <span>{item.itemCount} items</span>,
    },
    {
      key: 'grandTotal',
      title: 'Total Amount',
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
      title: 'Status',
      align: 'center',
      render: (item) => (
        <Badge
          variant={item.status === 'verified' ? 'verified' : 'needs_checking'}
          icon={true}
        >
          {item.status === 'verified' ? 'Verified' : 'Needs review'}
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
          onClick={() => navigate(`/receipts/${item.id}`)}
        >
          View Bill
        </Button>
      ),
    },
  ];

  if (isLoading || !supplier) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-body-sm text-on-surface-variant animate-pulse">
          Loading supplier CRM record…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/suppliers')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            All Suppliers
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-lg text-2xl font-bold text-on-surface">
                {supplier.name}
              </h1>
              <Badge variant="verified">Active Vendor</Badge>
            </div>
            <p className="text-label-xs text-on-surface-variant mt-0.5">
              Contact: {supplier.contactPerson} • {supplier.phone} • GSTIN: {supplier.gstin}
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={() => navigate('/receipts/new')}
          leftIcon={<Upload className="w-4 h-4" />}
          className="shadow-card font-bold"
        >
          Upload Bill from Vendor
        </Button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline shadow-card">
          <span className="text-label-xs font-semibold text-on-surface-variant uppercase">
            Spend This Month (Oct)
          </span>
          <p className="font-currency-stat text-2xl font-bold text-on-surface tabular-nums mt-1">
            ₹{supplier.metrics.totalSpendCurrentMonth.toLocaleString('en-IN')}
          </p>
          <span className="text-label-xs text-on-surface-variant">
            {supplier.metrics.billsCount} invoices recorded
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline shadow-card">
          <span className="text-label-xs font-semibold text-on-surface-variant uppercase">
            All-Time Wholesale Outflow
          </span>
          <p className="font-currency-stat text-2xl font-bold text-on-surface tabular-nums mt-1">
            ₹{supplier.metrics.totalSpendAllTime.toLocaleString('en-IN')}
          </p>
          <span className="text-label-xs text-on-surface-variant">Since April 2024</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline shadow-card">
          <span className="text-label-xs font-semibold text-on-surface-variant uppercase">
            Mandi / Market Location
          </span>
          <p className="font-bold text-body-lg text-on-surface mt-1 truncate">
            {supplier.mandiMarket}
          </p>
          <span className="text-label-xs text-verified flex items-center gap-1 mt-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> GST slab verified
          </span>
        </div>
      </div>

      {/* Grid: Left Notes & Aliases, Right Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left (4 Columns): Private Notes & Aliases */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-base font-bold text-on-surface">
                Shopkeeper Notes
              </h3>
              {isEditingNotes ? (
                <button
                  onClick={handleSaveNotes}
                  className="text-label-xs text-primary font-bold hover:underline flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
              ) : (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="text-label-xs text-primary font-bold hover:underline flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full p-2.5 rounded-lg bg-surface-container text-body-sm text-on-surface border border-outline outline-none focus:border-primary"
              />
            ) : (
              <p className="text-body-sm text-on-surface-variant italic leading-relaxed">
                "{notes || 'No private notes added yet.'}"
              </p>
            )}

            <div className="pt-2 border-t border-outline/60">
              <span className="text-label-xs font-bold text-on-surface-variant uppercase">
                Vendor Name Aliases:
              </span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {supplier.aliases.map((al) => (
                  <Badge key={al} variant="neutral" size="xs">
                    {al}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Right (8 Columns): Supplier's Invoices Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-headline-sm text-lg font-bold text-on-surface">
              Purchase Receipts from {supplier.name}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="search"
                value={receiptSearch}
                onChange={(e) => setReceiptSearch(e.target.value)}
                placeholder="Search invoice # or date..."
                className="h-8 px-3 rounded-lg bg-surface-container-lowest border border-outline/70 text-xs text-on-surface outline-none focus:border-primary w-44"
              />
              <Dropdown
                trigger={
                  <button className="h-8 px-2.5 bg-surface-container-low hover:bg-surface-container rounded-lg border border-outline/70 text-on-surface font-label-md text-label-xs flex items-center gap-1.5 transition-colors">
                    <Filter className="w-3.5 h-3.5 text-primary" />
                    <span>
                      {receiptStatusFilter === 'all'
                        ? 'All Status'
                        : receiptStatusFilter === 'verified'
                          ? 'Verified'
                          : 'Needs Review'}
                    </span>
                    <span className="text-on-surface-variant text-[10px]">▼</span>
                  </button>
                }
                items={[
                  { id: 'all', label: 'All Status', onClick: () => setReceiptStatusFilter('all') },
                  { id: 'verified', label: 'Verified Only', onClick: () => setReceiptStatusFilter('verified') },
                  { id: 'needs_review', label: 'Needs Review', onClick: () => setReceiptStatusFilter('needs_review') },
                ]}
              />
            </div>
          </div>

          <DataTable<ReceiptType>
            columns={receiptColumns}
            data={receipts.filter((r) => {
              if (receiptStatusFilter !== 'all' && r.status !== receiptStatusFilter) return false;
              if (receiptSearch.trim()) {
                const q = receiptSearch.toLowerCase();
                return r.invoiceNo.toLowerCase().includes(q) || r.billDate.toLowerCase().includes(q);
              }
              return true;
            })}
            keyExtractor={(item) => item.id}
            onRowClick={(item) => navigate(`/receipts/${item.id}`)}
          />
        </div>
      </div>
    </div>
  );
};
