import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  Store,
  Package,
  Sparkles,
  HelpCircle,
  Settings,
  Upload,
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  ChevronsUpDown,
  LogOut,
  User,
  ShieldCheck,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle2,
  Languages,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth, getInitials } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Dropdown } from '../common/Dropdown';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';

export interface AppShellProps {
  children: React.ReactNode;
  onUploadReceiptClick?: () => void;
  needsCheckingCount?: number;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  onUploadReceiptClick,
  needsCheckingCount = 2,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, updateUserProfile } = useAuth();
  const {
    language,
    isHindi,
    setLanguage,
    t,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    triggerTestNotification,
  } = useLanguage();
  const { showToast } = useToast();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [currentBranch, setCurrentBranch] = useState(user?.activeBranch || 'Main Branch');
  const [globalSearch, setGlobalSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const notifPanelRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = globalSearch.trim();
    if (trimmed) {
      navigate(`/receipts?search=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/receipts');
    }
  };

  const resolvedOwnerName =
    user?.displayName || (user?.email ? user.email.split('@')[0] : 'Store Owner');
  const resolvedShopName = user?.shopName || `${resolvedOwnerName}'s Shop`;
  const resolvedBranch = user?.activeBranch || currentBranch || 'Main Branch';
  const ownerInitials = getInitials(resolvedOwnerName, 'SO');
  const shopInitials = getInitials(resolvedShopName, 'HK');

  const navItems = [
    {
      to: '/dashboard',
      label: t('nav.dashboard', 'Dashboard'),
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      to: '/receipts',
      label: t('nav.receipts', 'Receipts'),
      icon: <Receipt className="w-5 h-5" />,
      badge:
        needsCheckingCount > 0
          ? `${needsCheckingCount} ${t('nav.needsCheck', 'needs check')}`
          : undefined,
      badgeVariant: 'amber' as const,
    },
    {
      to: '/analysis',
      label: t('nav.analysis', 'Spending Analysis'),
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      to: '/suppliers',
      label: t('nav.suppliers', 'Suppliers'),
      icon: <Store className="w-5 h-5" />,
    },
    {
      to: '/catalog',
      label: t('nav.catalog', 'Item Catalog'),
      icon: <Package className="w-5 h-5" />,
    },
    {
      to: '/ask-shopledger',
      label: t('nav.askAi', 'Ask Hissaab Kitaab AI'),
      icon: <Sparkles className="w-5 h-5 text-amber-500" />,
      highlight: true,
    },
  ];

  const bottomNavItems = [
    {
      to: '/help',
      label: t('nav.help', 'Help & FAQs'),
      icon: <HelpCircle className="w-5 h-5" />,
    },
    {
      to: '/settings',
      label: t('nav.settings', 'Settings'),
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const branchOptions = [
    {
      id: 'main',
      label: 'Main Branch',
      description: 'Primary retail counter',
      onClick: () => {
        setCurrentBranch('Main Branch');
        updateUserProfile({ activeBranch: 'Main Branch' });
      },
    },
    {
      id: 'godown',
      label: 'Godown #2 (Mandi Yard)',
      description: 'Bulk wholesale storage',
      onClick: () => {
        setCurrentBranch('Godown #2 (Mandi Yard)');
        updateUserProfile({ activeBranch: 'Godown #2 (Mandi Yard)' });
      },
    },
  ];

  const userMenuItems = [
    {
      id: 'profile',
      label: `${resolvedOwnerName} (${user?.isGuest ? (isHindi ? 'अतिथि डेमो' : 'Guest Demo') : (isHindi ? 'दुकानदार' : 'Owner')})`,
      description: user?.email || resolvedShopName,
      icon: <User className="w-4 h-4" />,
      onClick: () => navigate('/profile'),
    },
    {
      id: 'privacy',
      label: isHindi ? 'दुकान सेटिंग्स और भाषा' : 'Store Settings & Language',
      icon: <ShieldCheck className="w-4 h-4" />,
      onClick: () => navigate('/settings'),
    },
    {
      id: 'logout',
      label: isHindi ? 'दुकान से लॉग आउट करें' : 'Log out from store',
      destructive: true,
      icon: <LogOut className="w-4 h-4" />,
      onClick: async () => {
        await logout();
        navigate('/login');
      },
    },
  ];

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-surface flex flex-col antialiased">
      {/* ===================== SIDEBAR (Desktop) ===================== */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-72 bg-surface-container-low border-r border-outline flex flex-col justify-between transition-transform duration-200 ease-in-out',
          'lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Logo / Brand Header */}
          <div className="p-space-lg flex items-center justify-between border-b border-outline/50">
            <div
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-space-sm cursor-pointer group"
            >
              <img
                src="/logo.png"
                alt="Hissaab Kitaab Logo"
                className="w-10 h-10 rounded-xl object-cover shadow-sm border border-primary/30 flex-shrink-0"
              />
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-bold leading-none group-hover:text-primary transition-colors">
                  Hissaab Kitaab
                </span>
                <span className="font-label-xs text-label-xs text-on-surface-variant mt-1 leading-none">
                  {t('app.tagline', 'Smart Kirana Bahi Khata')}
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action: Upload Bill */}
          <div className="p-space-md">
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                if (onUploadReceiptClick) onUploadReceiptClick();
                else navigate('/receipts/new');
                setMobileMenuOpen(false);
              }}
              leftIcon={<Upload className="w-5 h-5" />}
              className="w-full justify-center shadow-card font-bold"
            >
              {t('nav.uploadReceipt', 'Upload Receipt')}
            </Button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-space-md py-space-xs space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-xl font-label-md text-label-md transition-all duration-150',
                    isActive
                      ? 'bg-secondary-container text-on-secondary-fixed font-bold shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-bold bg-tertiary-fixed text-[#261900] border border-tertiary-fixed-dim flex-shrink-0 ml-1">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Secondary Links & Store Switcher Footer */}
          <div className="p-space-md border-t border-outline/60 mt-auto bg-surface-container-low/80">
            <div className="space-y-1 mb-3">
              {bottomNavItems.map((item) => {
                const isActive = location.pathname.startsWith(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-body-sm transition-colors',
                      isActive
                        ? 'bg-surface-container-high text-on-surface font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60'
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>

            {/* Store Profile Strip */}
            <Dropdown
              trigger={
                <div className="w-full flex items-center justify-between p-2 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer border border-outline/50">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary-fixed text-[#002111] font-bold flex items-center justify-center flex-shrink-0 text-label-xs">
                      {shopInitials}
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <span className="font-label-md text-label-xs text-on-surface font-bold truncate">
                        {resolvedShopName}
                      </span>
                      <span className="font-body-sm text-[0.6875rem] text-on-surface-variant truncate">
                        {resolvedBranch}
                      </span>
                    </div>
                  </div>
                  <ChevronsUpDown className="w-4 h-4 text-on-surface-variant flex-shrink-0 ml-1" />
                </div>
              }
              items={branchOptions}
              menuWidth="w-64"
            />
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile sidebar */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ===================== TOP BAR ===================== */}
      <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-surface/90 backdrop-blur-md border-b border-outline z-30 flex items-center justify-between px-4 lg:px-8 transition-all">
        {/* Left: Mobile hamburger & Store Branch Pill */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container"
            aria-label="Open navigation menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-xs hidden sm:flex">
            <Store className="w-4 h-4 text-primary" />
            <span className="font-bold text-on-surface">{resolvedShopName}</span>
            <span className="text-outline-variant">•</span>
            <span>{resolvedBranch}</span>
          </div>
        </div>

        {/* Center: Quick Search Bar */}
        <form
          onSubmit={handleGlobalSearchSubmit}
          className="flex-1 max-w-md mx-4 hidden md:block"
        >
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-on-surface-variant absolute left-3.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder={t(
                'header.searchPlaceholder',
                'Search receipts, items, bahi khata... (Ctrl + K)'
              )}
              className="w-full h-9 pl-9 pr-4 rounded-full bg-surface-container text-body-sm text-on-surface placeholder:text-on-surface-variant/70 border border-transparent focus:border-outline focus:bg-surface-container-lowest outline-none transition-all"
            />
          </div>
        </form>

        {/* Right Controls: Language Pill, Theme Toggle, Notifications, User Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Language Switcher Pill */}
          <button
            onClick={() => {
              const nextLang = language === 'en' ? 'hi' : 'en';
              setLanguage(nextLang);
              showToast({
                type: 'info',
                title: nextLang === 'hi' ? 'भाषा बदली गई: हिन्दी' : 'Language set to English',
                message:
                  nextLang === 'hi'
                    ? 'Hissaab Kitaab अब हिन्दी में प्रदर्शित हो रहा है।'
                    : 'Hissaab Kitaab is now displayed in English.',
              });
            }}
            title="Switch Language (English / हिन्दी)"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-label-xs font-bold bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline/60 transition-colors"
          >
            <Languages className="w-3.5 h-3.5 text-primary" />
            <span>{language === 'hi' ? 'हिन्दी' : 'EN'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {/* Notifications Bell & Interactive Popover */}
          <div className="relative" ref={notifPanelRef}>
            <button
              onClick={() => setNotifOpen((prev) => !prev)}
              className={cn(
                'relative p-2 rounded-full transition-colors',
                notifOpen
                  ? 'bg-primary/15 text-primary'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              )}
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-[0.65rem] font-bold flex items-center justify-center ring-2 ring-surface">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-12 w-[calc(100vw-1rem)] sm:w-96 max-w-md bg-surface-container-lowest border border-outline rounded-2xl shadow-elevated z-50 overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="px-4 py-3 bg-surface-container-low border-b border-outline/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <span className="font-bold text-body-md text-on-surface">
                      {t('header.notifications', 'Notifications')}
                    </span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-bold bg-primary/15 text-primary">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        onClick={() => {
                          markAllAsRead();
                          showToast({
                            type: 'success',
                            title:
                              language === 'hi'
                                ? 'सभी सूचनाएं पढ़ी गईं'
                                : 'All notifications marked as read',
                          });
                        }}
                        className="text-label-xs font-semibold text-primary hover:underline px-1.5 py-1 rounded flex items-center gap-1"
                        title="Mark all as read"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>{t('header.markAllRead', 'Mark all read')}</span>
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={() => {
                          clearNotifications();
                          showToast({
                            type: 'info',
                            title:
                              language === 'hi' ? 'सूचनाएं साफ़ की गईं' : 'Notifications cleared',
                          });
                        }}
                        className="p-1 text-on-surface-variant hover:text-error rounded"
                        title={t('header.clearAll', 'Clear all')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Notification List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-outline/40">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-on-surface-variant text-body-sm">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                      <p>{t('header.noNotifications', 'All caught up! No pending store alerts.')}</p>
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          markAsRead(item.id);
                          setNotifOpen(false);
                          if (item.link) navigate(item.link);
                        }}
                        className={cn(
                          'p-3.5 flex items-start gap-3 cursor-pointer transition-colors hover:bg-surface-container',
                          !item.read ? 'bg-primary/[0.06]' : 'bg-transparent'
                        )}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {item.type === 'warning' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          ) : item.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Info className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={cn(
                                'text-body-sm truncate',
                                !item.read
                                  ? 'font-bold text-on-surface'
                                  : 'font-medium text-on-surface-variant'
                              )}
                            >
                              {language === 'hi' ? item.titleHi : item.title}
                            </p>
                            {!item.read && (
                              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-label-xs text-on-surface-variant mt-0.5 line-clamp-2">
                            {language === 'hi' ? item.messageHi : item.message}
                          </p>
                          <span className="text-[0.6875rem] text-on-surface-variant/80 mt-1 block">
                            {language === 'hi' ? item.timeHi : item.time}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-2.5 bg-surface-container-low border-t border-outline/60 flex items-center justify-between gap-2">
                  <button
                    onClick={async () => {
                      await triggerTestNotification();
                      showToast({
                        type: 'success',
                        title:
                          language === 'hi'
                            ? 'टेस्ट नोटिफिकेशन भेजा गया!'
                            : 'Live notification sent!',
                      });
                    }}
                    className="text-label-xs font-bold text-primary hover:underline px-2 py-1"
                  >
                    + {t('header.testNotif', 'Send Test Alert')}
                  </button>
                  <button
                    onClick={() => {
                      setNotifOpen(false);
                      navigate('/settings');
                    }}
                    className="text-label-xs font-semibold text-on-surface-variant hover:text-on-surface px-2 py-1"
                  >
                    {t('nav.settings', 'Settings')} →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <Dropdown
            trigger={
              <div
                title={`${resolvedOwnerName} (${resolvedShopName})`}
                className="w-9 h-9 rounded-full bg-[#1B5E3A] text-white font-bold flex items-center justify-center text-label-xs cursor-pointer ring-2 ring-outline/60 hover:ring-primary transition-all"
              >
                {ownerInitials}
              </div>
            }
            items={userMenuItems}
            align="right"
          />
        </div>
      </header>

      {/* ===================== MAIN CONTENT WRAPPER ===================== */}
      <main className="flex-1 pt-16 pb-20 lg:pb-0 lg:pl-72 flex flex-col min-w-0 max-w-full overflow-x-hidden">
        <div className="flex-1 max-w-[1360px] w-full min-w-0 mx-auto p-3.5 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* ===================== MOBILE BOTTOM NAV (Thumb-friendly) ===================== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-md border-t border-outline z-30 flex items-center justify-around px-2">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 p-1 text-label-xs font-semibold',
              isActive ? 'text-primary dark:text-emerald-400' : 'text-on-surface-variant'
            )
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>{t('nav.home', 'Home')}</span>
        </NavLink>

        <NavLink
          to="/receipts"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 p-1 text-label-xs font-semibold relative',
              isActive ? 'text-primary dark:text-emerald-400' : 'text-on-surface-variant'
            )
          }
        >
          <Receipt className="w-5 h-5" />
          <span>{language === 'hi' ? 'बिल' : 'Receipts'}</span>
          {needsCheckingCount > 0 && (
            <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-tertiary" />
          )}
        </NavLink>

        {/* Center Prominent Upload Button */}
        <button
          onClick={() => {
            if (onUploadReceiptClick) onUploadReceiptClick();
            else navigate('/receipts/new');
          }}
          className="-mt-5 w-12 h-12 rounded-full bg-[#1B5E3A] text-white flex items-center justify-center shadow-elevated border-2 border-surface active:scale-95 transition-transform"
          aria-label="Upload Receipt"
        >
          <Upload className="w-6 h-6 text-white" />
        </button>

        <NavLink
          to="/analysis"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 p-1 text-label-xs font-semibold',
              isActive ? 'text-primary dark:text-emerald-400' : 'text-on-surface-variant'
            )
          }
        >
          <TrendingUp className="w-5 h-5" />
          <span>{t('nav.analysisShort', 'Analysis')}</span>
        </NavLink>

        <NavLink
          to="/ask-shopledger"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 p-1 text-label-xs font-semibold',
              isActive ? 'text-primary dark:text-emerald-400' : 'text-on-surface-variant'
            )
          }
        >
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span>{t('nav.askShort', 'Ask AI')}</span>
        </NavLink>
      </nav>
    </div>
  );
};
