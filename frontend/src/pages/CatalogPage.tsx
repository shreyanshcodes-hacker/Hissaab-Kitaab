import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight, Store, Filter, ArrowUpDown } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { FilterToolbar } from '../components/common/FilterToolbar';
import { Dropdown } from '../components/common/Dropdown';
import { DataTable, type Column } from '../components/common/DataTable';
import { itemService } from '../api/itemService';
import type { CatalogItem } from '../types';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

export const CatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isHindi } = useLanguage();

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [sortBy, setSortBy] = useState<'name_asc' | 'rate_desc' | 'rate_asc'>('name_asc');
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

  const categoriesList = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));
  const suppliersList = Array.from(new Set(items.map((i) => i.primarySupplierName).filter(Boolean)));

  const filtered = items
    .filter((i) => {
      const matchesSearch =
        i.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        i.category.toLowerCase().includes(searchValue.toLowerCase()) ||
        i.primarySupplierName.toLowerCase().includes(searchValue.toLowerCase());
      const matchesCategory = !selectedCategory || i.category === selectedCategory;
      const matchesSupplier = !selectedSupplier || i.primarySupplierName === selectedSupplier;
      return matchesSearch && matchesCategory && matchesSupplier;
    })
    .sort((a, b) => {
      if (sortBy === 'rate_desc') return b.latestPurchaseRate - a.latestPurchaseRate;
      if (sortBy === 'rate_asc') return a.latestPurchaseRate - b.latestPurchaseRate;
      return a.name.localeCompare(b.name);
    });

  const activeFilterCount =
    (searchValue ? 1 : 0) +
    (selectedCategory ? 1 : 0) +
    (selectedSupplier ? 1 : 0) +
    (sortBy !== 'name_asc' ? 1 : 0);

  const columns: Column<CatalogItem>[] = [
    {
      key: 'name',
      title: isHindi ? 'सामान और विवरण' : 'Item / Commodity Description',
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
      title: isHindi ? 'श्रेणी' : 'Category',
      render: (item) => <Badge variant="category">{item.category}</Badge>,
    },
    {
      key: 'primarySupplierName',
      title: isHindi ? 'मुख्य सप्लायर' : 'Primary Vendor',
      render: (item) => (
        <div className="flex items-center gap-1.5 text-on-surface-variant">
          <Store className="w-3.5 h-3.5" />
          <span>{item.primarySupplierName}</span>
        </div>
      ),
    },
    {
      key: 'latestPurchaseRate',
      title: isHindi ? 'ताज़ा भाव (₹)' : 'Latest Rate (₹)',
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
      title: isHindi ? '30 दिन का भाव दायरा' : '30-Day Rate Range',
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
      title: isHindi ? 'कार्रवाई' : 'Action',
      align: 'right',
      render: (item) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/items/${item.id}`)}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          {isHindi ? 'इतिहास' : 'History'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title={isHindi ? 'सामान सूची और थोक भाव' : 'Master Item Catalog & Rates'}
        subtitle={
          isHindi
            ? 'दुकान के सामान, थोक भाव और सप्लायर दरों का पूरा रिकॉर्ड।'
            : 'Normalized SKU inventory across invoices, price fluctuations, and re-order triggers.'
        }
        breadcrumbs={[
          { label: 'Hissaab Kitaab', onClick: () => navigate('/dashboard') },
          { label: isHindi ? 'सामान सूची' : 'Item Catalog' },
        ]}
      />

      <FilterToolbar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder={isHindi ? 'सामान या श्रेणी के नाम से खोजें...' : 'Search commodities by brand, item name, or category...'}
        activeFilterCount={activeFilterCount}
        onClearFilters={() => {
          setSearchValue('');
          setSelectedCategory('');
          setSelectedSupplier('');
          setSortBy('name_asc');
        }}
        filters={
          <div className="flex items-center gap-2 flex-wrap">
            <Dropdown
              trigger={
                <button className="h-9 px-3 bg-surface-container-low hover:bg-surface-container rounded-lg border border-outline/70 text-on-surface font-label-md text-label-xs flex items-center gap-1.5 transition-colors">
                  <Filter className="w-3.5 h-3.5 text-primary" />
                  <span>{selectedCategory || 'All Categories'}</span>
                  <span className="text-on-surface-variant text-[10px]">▼</span>
                </button>
              }
              items={[
                { id: 'all-cat', label: 'All Categories', onClick: () => setSelectedCategory('') },
                ...categoriesList.map((cat) => ({
                  id: cat,
                  label: cat,
                  onClick: () => setSelectedCategory(cat),
                })),
              ]}
            />

            <Dropdown
              trigger={
                <button className="h-9 px-3 bg-surface-container-low hover:bg-surface-container rounded-lg border border-outline/70 text-on-surface font-label-md text-label-xs flex items-center gap-1.5 transition-colors">
                  <Store className="w-3.5 h-3.5 text-secondary" />
                  <span>{selectedSupplier || 'All Suppliers'}</span>
                  <span className="text-on-surface-variant text-[10px]">▼</span>
                </button>
              }
              items={[
                { id: 'all-sup', label: 'All Suppliers', onClick: () => setSelectedSupplier('') },
                ...suppliersList.map((sup) => ({
                  id: sup,
                  label: sup,
                  onClick: () => setSelectedSupplier(sup),
                })),
              ]}
            />

            <Dropdown
              trigger={
                <button className="h-9 px-3 bg-surface-container-low hover:bg-surface-container rounded-lg border border-outline/70 text-on-surface font-label-md text-label-xs flex items-center gap-1.5 transition-colors">
                  <ArrowUpDown className="w-3.5 h-3.5 text-on-surface-variant" />
                  <span>
                    {sortBy === 'rate_desc'
                      ? 'Rate: High to Low'
                      : sortBy === 'rate_asc'
                        ? 'Rate: Low to High'
                        : 'Sort: Name (A-Z)'}
                  </span>
                  <span className="text-on-surface-variant text-[10px]">▼</span>
                </button>
              }
              items={[
                { id: 'name_asc', label: 'Item Name (A - Z)', onClick: () => setSortBy('name_asc') },
                { id: 'rate_desc', label: 'Highest Unit Rate First', onClick: () => setSortBy('rate_desc') },
                { id: 'rate_asc', label: 'Lowest Unit Rate First', onClick: () => setSortBy('rate_asc') },
              ]}
            />
          </div>
        }
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
