import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Save } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Card } from '../components/common/Card';
import { useToast } from '../context/ToastContext';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [shopName, setShopName] = useState('Sharma Kirana Store');
  const [branchName, setBranchName] = useState('Main Bazar Branch');
  const [gstin, setGstin] = useState('07AABCS1429B1Z8');
  const [confidenceThreshold, setConfidenceThreshold] = useState('85');
  const [nightTallyEnabled, setNightTallyEnabled] = useState(true);

  const handleSave = () => {
    showToast({
      type: 'success',
      title: 'Settings Saved',
      message: 'Store configuration and tax preferences updated.',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <PageHeader
        title="Store Settings & Configuration"
        subtitle="Manage store details, tax slabs, AI extraction confidence thresholds, and branches."
        breadcrumbs={[
          { label: 'ShopLedger', onClick: () => navigate('/dashboard') },
          { label: 'Settings' },
        ]}
        actions={
          <Button
            variant="primary"
            onClick={handleSave}
            leftIcon={<Save className="w-4 h-4" />}
            className="shadow-card font-bold"
          >
            Save Settings
          </Button>
        }
      />

      {/* Store Identity */}
      <Card className="p-6 space-y-4">
        <h3 className="font-headline-sm text-lg font-bold text-on-surface">Store Profile & GSTIN</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Shop / Business Name"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
          />
          <Input
            label="Active Branch"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
          />
          <Input
            label="Store GSTIN (Optional if exempt)"
            value={gstin}
            onChange={(e) => setGstin(e.target.value)}
            helperText="15-character Indian Goods & Services Tax ID"
          />
          <Select
            label="Primary Business Category"
            defaultValue="kirana"
            options={[
              { value: 'kirana', label: 'Kirana / Grocery Store' },
              { value: 'retail', label: 'Retail Merchant' },
              { value: 'mandi', label: 'Wholesale / Mandi Trader' },
              { value: 'warehouse', label: 'Godown / Warehouse' },
            ]}
          />
        </div>
      </Card>

      {/* OCR & AI Verification Sensitivity */}
      <Card className="p-6 space-y-4">
        <h3 className="font-headline-sm text-lg font-bold text-on-surface">
          AI Confidence & Review Thresholds
        </h3>
        <p className="text-body-sm text-on-surface-variant">
          Controls when the AI marks a line item as "Needs checking" (amber highlight).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Minimum Confidence Cutoff"
            value={confidenceThreshold}
            onChange={(e) => setConfidenceThreshold(e.target.value)}
            options={[
              { value: '90', label: '90% - Strict (Flags minor handwriting ambiguities)' },
              { value: '85', label: '85% - Recommended for Indian Mandi Slips' },
              { value: '75', label: '75% - Relaxed (Fewer review warnings)' },
            ]}
            helperText="Lines below this score require human verification"
          />
          <div className="flex flex-col justify-center">
            <label className="flex items-center gap-2 cursor-pointer mt-3">
              <input
                type="checkbox"
                checked={nightTallyEnabled}
                onChange={(e) => setNightTallyEnabled(e.target.checked)}
                className="w-4 h-4 text-primary rounded border-outline cursor-pointer"
              />
              <span className="text-body-sm font-semibold text-on-surface">
                Enable Daily Evening Reconciliation Helper
              </span>
            </label>
            <p className="text-label-xs text-on-surface-variant ml-6">
              Shows evening closing checklist on your dashboard before shuttering shop
            </p>
          </div>
        </div>
      </Card>

      {/* Data Privacy & Multi-Tenant Isolation */}
      <Card className="p-6 bg-surface-container-low border border-outline space-y-3">
        <div className="flex items-center gap-2 text-primary font-bold text-base">
          <ShieldCheck className="w-5 h-5" />
          <span>Tenant Data Isolation Guarantee</span>
        </div>
        <p className="text-body-sm text-on-surface-variant text-xs leading-relaxed">
          Your wholesale purchase prices, supplier records, and digital bahi khata vouchers are
          cryptographically isolated under your authenticated shop account. No other store or
          commission agent can query or inspect your margins.
        </p>
      </Card>
    </div>
  );
};
