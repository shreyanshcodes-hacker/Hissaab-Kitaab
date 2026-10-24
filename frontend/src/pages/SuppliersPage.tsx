import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Phone, MapPin, ArrowRight, PlusCircle, Filter, ArrowUpDown } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { FilterToolbar } from '../components/common/FilterToolbar';
import { Dropdown } from '../components/common/Dropdown';
import { supplierService } from '../api/supplierService';
import type { Supplier } from '../types';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

export const SuppliersPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isHindi } = useLanguage();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [selectedMarket, setSelectedMarket] = useState('');
  const [sortBy, setSortBy] = useState<'spend_desc' | 'spend_asc' | 'name_asc'>('spend_desc');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await supplierService.getSuppliers();
        setSuppliers(data);
      } catch (err: any) {
        showToast({
          type: 'error',
          title: 'Error loading suppliers',
          message: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [showToast]);

  const marketsList = Array.from(
    new Set(suppliers.map((s) => s.mandiMarket).filter((m): m is string => Boolean(m && m.trim())))
  );

  const filtered = suppliers
    .filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        s.mandiMarket?.toLowerCase().includes(searchValue.toLowerCase()) ||
        s.aliases.some((a) => a.toLowerCase().includes(searchValue.toLowerCase()));
      const matchesMarket = !selectedMarket || s.mandiMarket === selectedMarket;
      return matchesSearch && matchesMarket;
    })
    .sort((a, b) => {
      if (sortBy === 'spend_desc') {
        return b.metrics.totalSpendCurrentMonth - a.metrics.totalSpendCurrentMonth;
      }
      if (sortBy === 'spend_asc') {
        return a.metrics.totalSpendCurrentMonth - b.metrics.totalSpendCurrentMonth;
      }
      return a.name.localeCompare(b.name);
    });

  const activeFilterCount =
    (searchValue ? 1 : 0) + (selectedMarket ? 1 : 0) + (sortBy !== 'spend_desc' ? 1 : 0);

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title={isHindi ? 'दुकान सप्लायर डायरेक्टरी (Wholesale & Mandi)' : 'Supplier Directory (Wholesale & Mandi CRM)'}
        subtitle={
          isHindi
            ? 'थोक विक्रेताओं, मंडी आढ़तियों, संपर्कों और ऐतिहासिक खरीद दरों का प्रबंधन करें।'
            : 'Manage wholesale vendors, mandi commission agents, contacts, and historical rate trends.'
        }
        breadcrumbs={[
          { label: 'Hissaab Kitaab', onClick: () => navigate('/dashboard') },
          { label: isHindi ? 'सप्लायर' : 'Suppliers' },
        ]}
        actions={
          <Button
            variant="primary"
            onClick={() =>
              showToast({
                type: 'info',
                title: isHindi ? 'सप्लायर जोड़ें' : 'Add Supplier',
                message: isHindi
                  ? 'नए सप्लायर अपलोड किए गए बिलों से भी अपने-आप जुड़ जाते हैं।'
                  : 'New vendors are also automatically detected from uploaded receipts.',
              })
            }
            leftIcon={<PlusCircle className="w-5 h-5" />}
            className="shadow-card font-bold"
          >
            {isHindi ? '+ सप्लायर' : '+ Supplier'}
          </Button>
        }
      />

      <FilterToolbar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder={isHindi ? 'सप्लायर नाम, मंडी या उपनाम से खोजें...' : 'Search suppliers by name, market, or alias...'}
        activeFilterCount={activeFilterCount}
        onClearFilters={() => {
          setSearchValue('');
          setSelectedMarket('');
          setSortBy('spend_desc');
        }}
        filters={
          <div className="flex items-center gap-2 flex-wrap">
            <Dropdown
              trigger={
                <button className="h-9 px-3 bg-surface-container-low hover:bg-surface-container rounded-lg border border-outline/70 text-on-surface font-label-md text-label-xs flex items-center gap-1.5 transition-colors">
                  <Filter className="w-3.5 h-3.5 text-primary" />
                  <span>{selectedMarket || (isHindi ? 'सभी मंडी / बाज़ार' : 'All Mandi / Markets')}</span>
                  <span className="text-on-surface-variant text-[10px]">▼</span>
                </button>
              }
              items={[
                { id: 'all-markets', label: isHindi ? 'सभी मंडी / बाज़ार' : 'All Mandi / Markets', onClick: () => setSelectedMarket('') },
                ...marketsList.map((m) => ({
                  id: m,
                  label: m,
                  onClick: () => setSelectedMarket(m),
                })),
              ]}
            />

            <Dropdown
              trigger={
                <button className="h-9 px-3 bg-surface-container-low hover:bg-surface-container rounded-lg border border-outline/70 text-on-surface font-label-md text-label-xs flex items-center gap-1.5 transition-colors">
                  <ArrowUpDown className="w-3.5 h-3.5 text-secondary" />
                  <span>
                    {sortBy === 'spend_desc'
                      ? 'Sort: Highest Spend'
                      : sortBy === 'spend_asc'
                        ? 'Sort: Lowest Spend'
                        : 'Sort: Name (A-Z)'}
                  </span>
                  <span className="text-on-surface-variant text-[10px]">▼</span>
                </button>
              }
              items={[
                {
                  id: 'spend_desc',
                  label: 'Highest Monthly Spend First',
                  onClick: () => setSortBy('spend_desc'),
                },
                {
                  id: 'spend_asc',
                  label: 'Lowest Monthly Spend First',
                  onClick: () => setSortBy('spend_asc'),
                },
                {
                  id: 'name_asc',
                  label: 'Supplier Name (A - Z)',
                  onClick: () => setSortBy('name_asc'),
                },
              ]}
            />
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-surface-container animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
          {filtered.map((supp) => (
            <div
              key={supp.id}
              onClick={() => navigate(`/suppliers/${supp.id}`)}
              className="p-5 rounded-2xl bg-surface-container-lowest border border-outline hover:border-outline-variant hover:shadow-card transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-primary-fixed text-primary flex items-center justify-center font-bold text-sm">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-headline-sm text-base font-bold text-on-surface leading-tight">
                        {supp.name}
                      </h3>
                      <p className="text-label-xs text-on-surface-variant">{supp.contactPerson}</p>
                    </div>
                  </div>
                  <Badge variant="verified" size="xs">
                    Active
                  </Badge>
                </div>

                <div className="space-y-1.5 my-3 text-body-sm text-xs text-on-surface-variant">
                  <p className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{supp.mandiMarket}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{supp.phone}</span>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-outline/60 flex items-center justify-between text-body-sm">
                <div>
                  <span className="text-[0.6875rem] text-on-surface-variant block leading-tight">
                    Oct 2024 Spend
                  </span>
                  <span className="font-bold tabular-nums text-on-surface text-base">
                    ₹{supp.metrics.totalSpendCurrentMonth.toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-label-xs text-primary font-bold flex items-center gap-1">
                  View Ledger <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
