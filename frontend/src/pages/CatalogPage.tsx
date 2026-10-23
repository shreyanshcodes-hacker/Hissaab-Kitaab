import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight, Store } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { FilterToolbar } from '../components/common/FilterToolbar';
import { DataTable, type Column } from '../components/common/DataTable';
import { itemService } from '../api/itemService';
import type { CatalogItem } from '../types';
import { useToast } from '../context/ToastContext';

export const CatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await itemService.getCatalogItems();
        setItems(data);
      } catch (err: any) {
        showToast({
          type: 'error',
          title: 'Error loading catalog',
          message: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [showToast]);

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      i.category.toLowerCase().includes(searchValue.toLowerCase()) ||
      i.primarySupplierName.toLowerCase().includes(searchValue.toLowerCase())
  );

  const columns: Column<CatalogItem>[] = [
    {
      key: 'name',
      title: 'Item / Commodity Description',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center font-bold text-primary flex-shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-on-surface block">{item.name}</span>
            <span className="text-label-xs text-on-surface-variant">HSN: {item.hsnCode}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      title: 'Category',
      render: (item) => <Badge variant="category">{item.category}</Badge>,
    },
    {
      key: 'primarySupplierName',
      title: 'Primary Vendor',
      render: (item) => (
        <div className="flex items-center gap-1.5 text-on-surface-variant">
          <Store className="w-3.5 h-3.5" />
          <span>{item.primarySupplierName}</span>
        </div>
      ),
    },
    {
      key: 'latestPurchaseRate',
      title: 'Latest Rate (₹)',
      align: 'right',
      tabular: true,
      sortable: true,
      render: (item) => (
        <span className="font-bold text-on-surface text-base">
          ₹{item.latestPurchaseRate.toFixed(2)}
          <span className="text-xs font-normal text-on-surface-variant ml-1">/ {item.defaultUnit}</span>
        </span>
      ),
    },
    {
      key: 'priceRange',
      title: '30-Day Rate Range',
      align: 'center',
      tabular: true,
      render: (item) => (
        <span className="text-label-xs text-on-surface-variant font-semibold">
          ₹{item.lowestRate30Days.toFixed(2)} - ₹{item.highestRate30Days.toFixed(2)}
        </span>
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
          onClick={() => navigate(`/items/${item.id}`)}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          Rate History
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Master Item Catalog & Rates"
        subtitle="Normalized SKU inventory across invoices, price fluctuations, and re-order triggers."
        breadcrumbs={[
          { label: 'ShopLedger', onClick: () => navigate('/dashboard') },
          { label: 'Item Catalog' },
        ]}
      />

      <FilterToolbar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search commodities by brand, item name, or category..."
        activeFilterCount={searchValue ? 1 : 0}
        onClearFilters={() => setSearchValue('')}
      />

      <DataTable<CatalogItem>
        columns={columns}
        data={filtered}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        onRowClick={(item) => navigate(`/items/${item.id}`)}
      />
    </div>
  );
};
