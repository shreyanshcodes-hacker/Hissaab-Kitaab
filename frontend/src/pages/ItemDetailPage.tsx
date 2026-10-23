import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { itemService } from '../api/itemService';
import type { CatalogItem } from '../types';
import { useToast } from '../context/ToastContext';

export const ItemDetailPage: React.FC = () => {
  const { itemId = 'item-fortune-mustard-1l' } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [item, setItem] = useState<CatalogItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await itemService.getItemById(itemId);
        if (data) setItem(data);
      } catch (err: any) {
        showToast({
          type: 'error',
          title: 'Error loading catalog item',
          message: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [itemId, showToast]);

  if (isLoading || !item) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-body-sm text-on-surface-variant animate-pulse">
          Loading catalog item details…
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
            onClick={() => navigate('/catalog')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Item Catalog
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-lg text-2xl font-bold text-on-surface">{item.name}</h1>
              <Badge variant="category">{item.category}</Badge>
            </div>
            <p className="text-label-xs text-on-surface-variant mt-0.5">
              HSN: {item.hsnCode || '1514'} • Default Unit: {item.defaultUnit} • Primary Supplier:{' '}
              {item.primarySupplierName}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowEditModal(true)}
          leftIcon={<Edit className="w-4 h-4" />}
        >
          Edit Catalog Item
        </Button>
      </div>

      {/* Top Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline shadow-card">
          <span className="text-label-xs font-semibold text-on-surface-variant uppercase">
            Latest Purchase Rate
          </span>
          <p className="font-currency-stat text-2xl font-bold text-on-surface tabular-nums mt-1">
            ₹{item.latestPurchaseRate.toFixed(2)}
            <span className="text-xs font-normal text-on-surface-variant ml-1">/ {item.defaultUnit}</span>
          </p>
          <span className="text-label-xs text-tertiary font-bold">
            +₹6.00 (+4.2%) vs 16 Oct invoice
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline shadow-card">
          <span className="text-label-xs font-semibold text-on-surface-variant uppercase">
            30-Day Rate Range
          </span>
          <p className="font-currency-stat text-2xl font-bold text-on-surface tabular-nums mt-1">
            ₹{item.lowestRate30Days.toFixed(2)} - ₹{item.highestRate30Days.toFixed(2)}
          </p>
          <span className="text-label-xs text-on-surface-variant">
            Best rate from Shree Balaji Traders
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline shadow-card">
          <span className="text-label-xs font-semibold text-on-surface-variant uppercase">
            Current Floor Stock
          </span>
          <p className="font-currency-stat text-2xl font-bold text-on-surface tabular-nums mt-1">
            {item.stockQuantity} Pouches
          </p>
          <span className="text-label-xs text-verified font-bold">In stock</span>
        </div>
      </div>

      {/* Price Divergence Across Suppliers Table */}
      <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline shadow-card space-y-4">
        <div>
          <h3 className="font-headline-sm text-lg font-bold text-on-surface">
            Wholesale Purchase Price History Across Invoices
          </h3>
          <p className="text-label-xs text-on-surface-variant mt-0.5">
            Every entry corresponds to a verified supplier voucher.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-outline bg-surface-container-low text-label-xs font-semibold text-on-surface-variant">
                <th className="p-3">Bill Date</th>
                <th className="p-3">Supplier Name</th>
                <th className="p-3">Invoice Ref</th>
                <th className="p-3 text-center">Quantity</th>
                <th className="p-3 text-right">Unit Rate (₹)</th>
                <th className="p-3 text-right">Line Total (₹)</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/60">
              {item.priceHistory.map((ph, idx) => (
                <tr key={idx} className="hover:bg-surface-container-low/60">
                  <td className="p-3 font-semibold text-on-surface tabular-nums">{ph.date}</td>
                  <td className="p-3 text-on-surface">{ph.supplierName}</td>
                  <td className="p-3 font-mono text-xs text-primary">{ph.receiptId}</td>
                  <td className="p-3 text-center tabular-nums">
                    {ph.quantity} {ph.unit}
                  </td>
                  <td className="p-3 text-right font-bold tabular-nums text-on-surface">
                    ₹{ph.unitRate.toFixed(2)}
                  </td>
                  <td className="p-3 text-right tabular-nums text-on-surface">
                    ₹{(ph.quantity * ph.unitRate).toFixed(2)}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => navigate(`/receipts/${ph.receiptId}`)}
                      className="text-label-xs text-primary font-bold hover:underline"
                    >
                      View Slip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Item Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Catalog Item"
        subtitle={item.name}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setShowEditModal(false);
                showToast({
                  type: 'success',
                  title: 'Item Updated',
                  message: 'Catalog details successfully updated.',
                });
              }}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <Input label="Item Name" defaultValue={item.name} />
          <Input label="HSN Code" defaultValue={item.hsnCode} />
          <Input label="Re-order Trigger Stock Quantity" type="number" defaultValue="20" />
        </div>
      </Modal>
    </div>
  );
};
