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
  PlusCircle,
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
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth, getInitials } from '../../context/AuthContext';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentBranch, setCurrentBranch] = useState(user?.activeBranch || 'Main Branch');
  const [globalSearch, setGlobalSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
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
  const shopInitials = getInitials(resolvedShopName, 'SL');

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      to: '/receipts',
      label: 'Receipts',
      icon: <Receipt className="w-5 h-5" />,
      badge: needsCheckingCount > 0 ? `${needsCheckingCount} needs check` : undefined,
      badgeVariant: 'amber' as const,
    },
    {
      to: '/analysis',
      label: 'Spending Analysis',
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      to: '/suppliers',
      label: 'Suppliers',
      icon: <Store className="w-5 h-5" />,
    },
    {
      to: '/catalog',
      label: 'Item Catalog',
      icon: <Package className="w-5 h-5" />,
    },
    {
      to: '/ask-shopledger',
      label: 'Ask ShopLedger AI',
      icon: <Sparkles className="w-5 h-5 text-amber-500" />,
      highlight: true,
    },
  ];

  const bottomNavItems = [
    {
      to: '/help',
      label: 'Help & FAQs',
      icon: <HelpCircle className="w-5 h-5" />,
    },
    {
      to: '/settings',
      label: 'Settings',
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
      label: `${resolvedOwnerName} (${user?.isGuest ? 'Guest Demo' : 'Owner'})`,
      description: user?.email || resolvedShopName,
      icon: <User className="w-4 h-4" />,
      onClick: () => navigate('/profile'),
    },
    {
      id: 'privacy',
      label: 'Store Settings & GST Slabs',
      icon: <ShieldCheck className="w-4 h-4" />,
      onClick: () => navigate('/settings'),
    },
    {
      id: 'logout',
      label: 'Log out from store',
      destructive: true,
      icon: <LogOut className="w-4 h-4" />,
      onClick: async () => {
        await logout();
        navigate('/login');
      },
    },
  ];

  return (
    <div className="min-h-screen bg-surface flex flex-col antialiased">
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
            <div className="flex items-center gap-space-sm">
              <div className="w-9 h-9 rounded-xl bg-primary-container text-on-primary flex items-center justify-center font-bold text-lg shadow-sm">
                ₹
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-bold leading-none">
                  ShopLedger
                </span>
                <span className="font-label-xs text-label-xs text-on-surface-variant mt-1 leading-none">
                  Smart Kirana Bahi Khata
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
              leftIcon={<PlusCircle className="w-5 h-5" />}
              className="w-full justify-center shadow-card font-bold"
            >
              + Upload Receipt
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
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-bold bg-tertiary-fixed text-tertiary-on-fixed border border-tertiary-fixed-dim">
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
                    <div className="w-8 h-8 rounded-lg bg-primary-fixed text-primary font-bold flex items-center justify-center flex-shrink-0 text-label-xs">
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
              placeholder="Search receipts, items, bahi khata... (Ctrl + K)"
              className="w-full h-9 pl-9 pr-4 rounded-full bg-surface-container text-body-sm text-on-surface placeholder:text-on-surface-variant/70 border border-transparent focus:border-outline focus:bg-surface-container-lowest outline-none transition-all"
            />
          </div>
        </form>

        {/* Right Controls: Theme Toggle, Notifications, User Menu */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Notifications Bell */}
          <button
            className="relative p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error ring-2 ring-surface" />
          </button>

          {/* User Profile Dropdown */}
          <Dropdown
            trigger={
              <div
                title={`${resolvedOwnerName} (${resolvedShopName})`}
                className="w-9 h-9 rounded-full bg-primary text-on-primary font-bold flex items-center justify-center text-label-xs cursor-pointer ring-2 ring-outline/60 hover:ring-primary transition-all"
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
      <main className="flex-1 pt-16 lg:pl-72 flex flex-col">
        <div className="flex-1 max-w-[1360px] w-full mx-auto p-4 sm:p-6 lg:p-8">
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
              isActive ? 'text-primary' : 'text-on-surface-variant'
            )
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/receipts"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 p-1 text-label-xs font-semibold relative',
              isActive ? 'text-primary' : 'text-on-surface-variant'
            )
          }
        >
          <Receipt className="w-5 h-5" />
          <span>Receipts</span>
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
          className="-mt-5 w-12 h-12 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-elevated border-2 border-surface active:scale-95 transition-transform"
          aria-label="Upload Receipt"
        >
          <PlusCircle className="w-7 h-7" />
        </button>

        <NavLink
          to="/analysis"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 p-1 text-label-xs font-semibold',
              isActive ? 'text-primary' : 'text-on-surface-variant'
            )
          }
        >
          <TrendingUp className="w-5 h-5" />
          <span>Analysis</span>
        </NavLink>

        <NavLink
          to="/ask-shopledger"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 p-1 text-label-xs font-semibold',
              isActive ? 'text-primary' : 'text-on-surface-variant'
            )
          }
        >
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span>Ask AI</span>
        </NavLink>
      </nav>
    </div>
  );
};
