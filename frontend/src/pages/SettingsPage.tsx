import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Save, Languages, Bell, CheckCircle2, Sparkles } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Card } from '../components/common/Card';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage, type AppLanguage } from '../context/LanguageContext';
import { cn } from '../utils/cn';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUserProfile } = useAuth();
  const { showToast } = useToast();
  const {
    language,
    setLanguage,
    t,
    notificationPrefs,
    updateNotificationPrefs,
    triggerTestNotification,
  } = useLanguage();

  const [ownerName, setOwnerName] = useState(user?.displayName || '');
  const [shopName, setShopName] = useState(user?.shopName || '');
  const [branchName, setBranchName] = useState(user?.activeBranch || 'Main Branch');
  const [businessType, setBusinessType] = useState(user?.businessType || 'kirana');
  const [gstin, setGstin] = useState(user?.gstin || '');
  const [confidenceThreshold, setConfidenceThreshold] = useState('85');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setOwnerName(user.displayName || '');
      setShopName(user.shopName || '');
      setBranchName(user.activeBranch || 'Main Branch');
      setBusinessType(user.businessType || 'kirana');
      setGstin(user.gstin || '');
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateUserProfile({
        displayName: ownerName.trim() || user?.displayName || 'Store Owner',
        shopName: shopName.trim() || user?.shopName || 'My Shop',
        activeBranch: branchName.trim() || 'Main Branch',
        businessType,
        gstin: gstin.trim(),
      });
      showToast({
        type: 'success',
        title: language === 'hi' ? 'सेटिंग्स सेव हो गईं' : 'Settings Saved',
        message:
          language === 'hi'
            ? 'आपकी दुकान प्रोफ़ाइल, भाषा और नोटिफिकेशन सेटिंग्स अपडेट कर दी गई हैं।'
            : 'Store configuration, language, and notification preferences updated.',
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: err?.message || 'Unable to save store settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLanguageSelect = (lang: AppLanguage) => {
    setLanguage(lang);
    showToast({
      type: 'info',
      title: lang === 'hi' ? 'भाषा बदली गई: हिन्दी' : 'Language Changed: English',
      message:
        lang === 'hi'
          ? 'Hissaab Kitaab अब हिन्दी भाषा में प्रदर्शित हो रहा है।'
          : 'Hissaab Kitaab is now set to English (Default).',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <PageHeader
        title={t('settings.title', 'Store Settings & Configuration')}
        subtitle={t(
          'settings.subtitle',
          'Manage store details, language (English / Hindi), notifications, tax slabs, and AI thresholds.'
        )}
        breadcrumbs={[
          { label: 'Hissaab Kitaab', onClick: () => navigate('/dashboard') },
          { label: t('nav.settings', 'Settings') },
        ]}
        actions={
          <Button
            variant="primary"
            isLoading={isSaving}
            onClick={handleSave}
            leftIcon={<Save className="w-4 h-4" />}
            className="shadow-card font-bold"
          >
            {t('settings.saveAll', 'Save Settings')}
          </Button>
        }
      />

      {/* Language Selection Card (English Default / Hindi) */}
      <Card className="p-6 space-y-4 border-primary/30">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-[#002111]">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface">
                {t('settings.languageTitle', 'App Language / ऐप की भाषा')}
              </h3>
              <p className="text-body-sm text-on-surface-variant">
                {t(
                  'settings.languageSubtitle',
                  'Choose your preferred language for Hissaab Kitaab navigation and controls.'
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <button
            type="button"
            onClick={() => handleLanguageSelect('en')}
            className={cn(
              'p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between',
              language === 'en'
                ? 'border-primary bg-primary/[0.08] shadow-sm'
                : 'border-outline/60 bg-surface-container-low hover:bg-surface-container'
            )}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-on-surface">English (Default)</span>
                <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-surface-container-high text-on-surface-variant">
                  Default
                </span>
              </div>
              <p className="text-label-xs text-on-surface-variant mt-1">
                Standard English labels for bills, GST invoices, and analytics
              </p>
            </div>
            {language === 'en' && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
          </button>

          <button
            type="button"
            onClick={() => handleLanguageSelect('hi')}
            className={cn(
              'p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between',
              language === 'hi'
                ? 'border-primary bg-primary/[0.08] shadow-sm'
                : 'border-outline/60 bg-surface-container-low hover:bg-surface-container'
            )}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-on-surface">हिन्दी (Hindi)</span>
                <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-secondary-container text-[#072111]">
                  भारतीय बही खाता
                </span>
              </div>
              <p className="text-label-xs text-on-surface-variant mt-1">
                मेनू, रसीद, अलर्ट और हिसाब-किताब को सरल हिंदी में देखें
              </p>
            </div>
            {language === 'hi' && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
          </button>
        </div>
      </Card>

      {/* Notifications & Alerts Configuration */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-tertiary-fixed flex items-center justify-center text-[#261900]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface">
                {t('settings.notificationsTitle', 'Notifications & Store Alerts')}
              </h3>
              <p className="text-body-sm text-on-surface-variant">
                {t(
                  'settings.notificationsSubtitle',
                  'Configure bill scan alerts, price hike warnings, and daily bahi-khata reminders.'
                )}
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await triggerTestNotification();
              showToast({
                type: 'success',
                title: language === 'hi' ? 'टेस्ट अलर्ट भेजा गया!' : 'Test Notification Sent!',
                message:
                  language === 'hi'
                    ? 'ऊपर घंटी (Bell) आइकन में नया अलर्ट जोड़ा गया है।'
                    : 'Check the Notification Bell in the top bar to see your live alert.',
              });
            }}
            leftIcon={<Sparkles className="w-4 h-4 text-primary" />}
          >
            {language === 'hi' ? 'टेस्ट नोटिफिकेशन भेजें' : 'Send Test Notification'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <label className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low border border-outline/50 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPrefs.lowConfidenceAlerts}
              onChange={(e) => updateNotificationPrefs({ lowConfidenceAlerts: e.target.checked })}
              className="w-4 h-4 mt-1 text-primary rounded border-outline cursor-pointer"
            />
            <div>
              <span className="text-body-sm font-bold text-on-surface block">
                {language === 'hi'
                  ? 'कच्चे बिल जांच अलर्ट (OCR Review Alerts)'
                  : 'Low-Confidence OCR Review Alerts'}
              </span>
              <span className="text-label-xs text-on-surface-variant">
                {language === 'hi'
                  ? 'जब किसी बिल में हाथ से लिखे रेट या जोड़ में अंतर हो तो तुरंत सूचित करें।'
                  : 'Notify when a scanned bill has handwritten totals or unclear GST rows.'}
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low border border-outline/50 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPrefs.priceHikeAlerts}
              onChange={(e) => updateNotificationPrefs({ priceHikeAlerts: e.target.checked })}
              className="w-4 h-4 mt-1 text-primary rounded border-outline cursor-pointer"
            />
            <div>
              <span className="text-body-sm font-bold text-on-surface block">
                {language === 'hi'
                  ? 'थोक भाव बढ़ने की चेतावनी (Price Hike Alerts)'
                  : 'Wholesale Supplier Price Hike Alerts'}
              </span>
              <span className="text-label-xs text-on-surface-variant">
                {language === 'hi'
                  ? 'पिछली खरीद की तुलना में सप्लायर का रेट बढ़ने पर अलर्ट दिखाएं।'
                  : 'Alert when an item unit price increases compared to your previous bill.'}
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low border border-outline/50 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPrefs.eveningTallyReminder}
              onChange={(e) => updateNotificationPrefs({ eveningTallyReminder: e.target.checked })}
              className="w-4 h-4 mt-1 text-primary rounded border-outline cursor-pointer"
            />
            <div>
              <span className="text-body-sm font-bold text-on-surface block">
                {language === 'hi'
                  ? 'शाम का गल्ला / बही-खाता मिलान रिमाइंडर'
                  : 'Daily Evening Reconciliation Reminder'}
              </span>
              <span className="text-label-xs text-on-surface-variant">
                {language === 'hi'
                  ? 'दुकान बंद करने से पहले दिन भर के बिलों का मिलान करने की याद दिलाएं।'
                  : 'Shows evening closing checklist on your dashboard before shuttering shop.'}
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low border border-outline/50 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPrefs.browserPushEnabled}
              onChange={async (e) => {
                const checked = e.target.checked;
                updateNotificationPrefs({ browserPushEnabled: checked });
                if (checked && typeof window !== 'undefined' && 'Notification' in window) {
                  await Notification.requestPermission();
                }
              }}
              className="w-4 h-4 mt-1 text-primary rounded border-outline cursor-pointer"
            />
            <div>
              <span className="text-body-sm font-bold text-on-surface block">
                {language === 'hi' ? 'ब्राउज़र पॉप-अप नोटिफिकेशन' : 'Browser Desktop / Mobile Push'}
              </span>
              <span className="text-label-xs text-on-surface-variant">
                {language === 'hi'
                  ? 'स्कैन पूरा होने पर डिवाइस स्क्रीन पर नोटिफिकेशन प्राप्त करें।'
                  : 'Receive system notifications when Gemini finishes scanning a bill.'}
              </span>
            </div>
          </label>
        </div>
      </Card>

      {/* Store Identity */}
      <Card className="p-6 space-y-4">
        <h3 className="font-headline-sm text-lg font-bold text-on-surface">
          {language === 'hi' ? 'दुकान प्रोफ़ाइल और GSTIN' : 'Store Profile & GSTIN'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={language === 'hi' ? 'दुकानदार / मालिक का नाम' : 'Owner / Merchant Name'}
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Your full name"
          />
          <Input
            label={language === 'hi' ? 'दुकान / व्यापार का नाम' : 'Shop / Business Name'}
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder="Your store name"
          />
          <Input
            label={language === 'hi' ? 'शाखा (Active Branch)' : 'Active Branch'}
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
          />
          <Input
            label={language === 'hi' ? 'दुकान का GSTIN (वैकल्पिक)' : 'Store GSTIN (Optional if exempt)'}
            value={gstin}
            onChange={(e) => setGstin(e.target.value)}
            placeholder="e.g. 07AABCS1429B1Z8"
            helperText="15-character Indian Goods & Services Tax ID"
          />
          <Select
            label={language === 'hi' ? 'व्यापार की श्रेणी' : 'Primary Business Category'}
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
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
        </div>
      </Card>

      {/* Data Privacy & Multi-Tenant Isolation */}
      <Card className="p-6 bg-surface-container-low border border-outline space-y-3">
        <div className="flex items-center gap-2 text-primary font-bold text-base">
          <ShieldCheck className="w-5 h-5" />
          <span>Hissaab Kitaab Tenant Data Isolation Guarantee</span>
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
