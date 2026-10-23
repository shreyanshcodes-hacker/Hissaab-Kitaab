import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Phone, MapPin, ArrowRight, PlusCircle } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { FilterToolbar } from '../components/common/FilterToolbar';
import { supplierService } from '../api/supplierService';
import type { Supplier } from '../types';
import { useToast } from '../context/ToastContext';

export const SuppliersPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchValue, setSearchValue] = useState('');
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

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      s.mandiMarket?.toLowerCase().includes(searchValue.toLowerCase()) ||
      s.aliases.some((a) => a.toLowerCase().includes(searchValue.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Supplier Directory (Wholesale & Mandi CRM)"
        subtitle="Manage wholesale vendors, mandi commission agents, contacts, and historical rate trends."
        breadcrumbs={[
          { label: 'ShopLedger', onClick: () => navigate('/dashboard') },
          { label: 'Suppliers' },
        ]}
        actions={
          <Button
            variant="primary"
            onClick={() =>
              showToast({
                type: 'info',
                title: 'Add Supplier',
                message: 'New vendors are also automatically detected from uploaded receipts.',
              })
            }
            leftIcon={<PlusCircle className="w-5 h-5" />}
            className="shadow-card font-bold"
          >
            + Add New Supplier
          </Button>
        }
      />

      <FilterToolbar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search suppliers by name, market, or alias..."
        activeFilterCount={searchValue ? 1 : 0}
        onClearFilters={() => setSearchValue('')}
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
