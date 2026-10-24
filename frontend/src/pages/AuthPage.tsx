import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles,
  HelpCircle,
  Sun,
  Moon,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { cn } from '../utils/cn';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const {
    loginWithEmail,
    signupWithEmail,
    signInWithGoogle,
    resetPassword,
    signInAsGuest,
    authError,
    clearAuthError,
  } = useAuth();
  const { showToast } = useToast();

  const destination = (location.state as any)?.from?.pathname || '/dashboard';
  const isSignUpDefault = location.pathname === '/signup';

  const [isSignUp, setIsSignUp] = useState(isSignUpDefault);
  const [ownerName, setOwnerName] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState('kirana');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setIsLoading(true);

    try {
      if (isSignUp) {
        await signupWithEmail(shopName, email, password, businessType, ownerName, phone);
        showToast({
          type: 'success',
          title: 'Shop Account Provisioned',
          message: `Welcome to Hissaab Kitaab, ${ownerName || shopName}! Verification email dispatched.`,
        });
      } else {
        await loginWithEmail(email, password);
        showToast({
          type: 'success',
          title: 'Welcome Back',
          message: 'Signed in successfully via Firebase Authentication.',
        });
      }
      navigate(destination, { replace: true });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: isSignUp ? 'Registration Failed' : 'Sign In Failed',
        message: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    clearAuthError();
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      showToast({
        type: 'success',
        title: 'Google Sign In Successful',
        message: 'Authenticated securely with Google Identity Services.',
      });
      navigate(destination, { replace: true });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Google Sign In Failed',
        message: err.message,
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resetPassword(resetEmail || email);
      setShowResetModal(false);
      showToast({
        type: 'success',
        title: 'Password Reset Link Dispatched',
        message: `Check your inbox at ${resetEmail || email} for recovery instructions.`,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Reset Failed',
        message: err.message,
      });
    }
  };

  const handleGuestEntry = () => {
    signInAsGuest();
    showToast({
      type: 'info',
      title: 'Demo Mode Active',
      message: 'Exploring Aggarwal General Store with sample data.',
    });
    navigate('/explore');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between p-4 sm:p-6 lg:p-8 antialiased">
      {/* Top Bar with Brand & Theme Toggle */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between pb-4">
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <img
            src="/logo.png"
            alt="Hissaab Kitaab Logo"
            className="w-9 h-9 rounded-lg object-cover shadow-sm border border-primary/30"
          />
          <span className="font-headline-sm text-lg text-on-surface font-bold tracking-tight">
            Hissaab Kitaab
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            aria-label="Help & Guidance"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Authentication Card */}
      <div className="max-w-md w-full mx-auto bg-surface-container-lowest rounded-2xl border border-outline shadow-card p-6 sm:p-8 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Tab Switcher */}
        <div className="flex p-1 bg-surface-container rounded-xl border border-outline/60 mb-6">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              clearAuthError();
            }}
            className={cn(
              'flex-1 py-2 rounded-lg font-label-md text-label-xs sm:text-label-md font-semibold transition-all select-none',
              !isSignUp
                ? 'bg-surface-container-lowest text-on-surface shadow-card'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            Sign In to Store
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              clearAuthError();
            }}
            className={cn(
              'flex-1 py-2 rounded-lg font-label-md text-label-xs sm:text-label-md font-semibold transition-all select-none',
              isSignUp
                ? 'bg-surface-container-lowest text-on-surface shadow-card'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            Create New Shop
          </button>
        </div>

        {/* Heading */}
        <div className="mb-6">
          <h2 className="font-headline-sm text-xl font-bold text-on-surface">
            {isSignUp ? 'Set up your shop ledger' : 'Welcome back, Shopkeeper'}
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            {isSignUp
              ? 'Enter your business details to start digitizing slips.'
              : 'Sign in to access your bahi khata, bills, and price analytics.'}
          </p>
        </div>

        {/* Global Error Banner */}
        {authError && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl bg-error-container/80 border border-error/30 text-error-on-container text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">{authError}</div>
          </div>
        )}

        {/* Official Google Sign-In Button (Stitch Accurate) */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={isGoogleLoading || isLoading}
          className="w-full py-2.5 px-4 rounded-xl border border-outline hover:border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low text-on-surface text-body-sm font-semibold flex items-center justify-center gap-3 transition-colors shadow-sm disabled:opacity-50 select-none mb-4"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{isGoogleLoading ? 'Connecting Google...' : 'Continue with Google'}</span>
        </button>

        {/* Divider */}
        <div className="relative my-4 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-outline" />
          </div>
          <span className="relative px-3 bg-surface-container-lowest text-label-xs text-on-surface-variant uppercase font-semibold">
            Or with email / phone
          </span>
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <Input
                label="Your Full Name (Owner / Merchant)"
                placeholder="e.g. Shreyansh Jaiswal"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required={true}
              />
              <Input
                label="Your Shop / Business Name"
                placeholder="e.g. Jaiswal General Store, Laxmi Traders"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                required={true}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Business Type"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  options={[
                    { value: 'kirana', label: 'Kirana / Grocery Store' },
                    { value: 'retail', label: 'Retail Shop' },
                    { value: 'mandi', label: 'Wholesale / Mandi' },
                    { value: 'warehouse', label: 'Warehouse / Godown' },
                    { value: 'other', label: 'Other Business' },
                  ]}
                />
                <Input
                  label="Phone Number (Optional)"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </>
          )}

          <Input
            label="Store Email Address"
            type="email"
            placeholder="you@yourshop.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required={true}
          />

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-label-xs font-semibold text-on-surface-variant">
                Password
              </label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-label-xs text-primary hover:underline font-semibold"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={true}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full justify-center font-bold mt-2 shadow-card"
          >
            {isSignUp ? 'Create Free Shop Account' : 'Sign In to Shop'}
          </Button>
        </form>

        {/* Guest Exploration Card */}
        <div className="p-4 rounded-xl bg-tertiary-fixed/30 border border-tertiary-fixed-dim/70 flex flex-col gap-2 mt-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-tertiary flex-shrink-0" />
            <h4 className="font-label-md text-label-xs font-bold text-tertiary-on-fixed">
              Curious how it works first?
            </h4>
          </div>
          <p className="text-body-sm text-xs text-on-surface-variant leading-relaxed">
            Test ShopLedger in 1-click guest mode with pre-loaded Kirana demo receipts. No credit
            card or signup required.
          </p>
          <Button
            variant="amber"
            size="sm"
            onClick={handleGuestEntry}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full mt-1 font-semibold"
          >
            Explore Live Demo (1-Click)
          </Button>
        </div>
      </div>

      {/* Bottom Legal / Assurance */}
      <footer className="max-w-md w-full mx-auto text-center pt-4">
        <p className="text-label-xs text-on-surface-variant flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-verified" /> Strictly private • Indian GST ready •
          Zero blind ledger writes
        </p>
      </footer>

      {/* Password Reset Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset Store Password"
        subtitle="We will send a password reset link to your email"
      >
        <form onSubmit={handlePasswordReset} className="space-y-4 py-2">
          <Input
            label="Registered Store Email"
            type="email"
            placeholder="sharma.kirana@gmail.com"
            value={resetEmail || email}
            onChange={(e) => setResetEmail(e.target.value)}
            required={true}
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowResetModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" leftIcon={<KeyRound className="w-4 h-4" />}>
              Send Recovery Email
            </Button>
          </div>
        </form>
      </Modal>

      {/* Shopkeeper Guidance Modal */}
      <Modal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        title="Shopkeeper Help & Guidance"
        subtitle="Frequently asked questions about ShopLedger"
      >
        <div className="space-y-4 text-body-sm text-on-surface">
          <div>
            <h4 className="font-bold text-on-surface mb-1">Can I use ShopLedger without GST?</h4>
            <p className="text-on-surface-variant text-body-sm">
              Yes. If your store has turnover under ₹40 Lakh and is GST-exempt, or you operate under
              the composition scheme, you can still record all purchase bills and track supplier price
              hikes.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-on-surface mb-1">Is my purchase data private?</h4>
            <p className="text-on-surface-variant text-body-sm">
              Absolutely. Your wholesale purchase bills and negotiated rates are encrypted and
              strictly isolated to your shop. Other merchants cannot see your prices.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-on-surface mb-1">What kind of receipts can I scan?</h4>
            <p className="text-on-surface-variant text-body-sm">
              Thermal rolls from wholesalers, printed tax invoices, or handwritten Mandi vouchers in
              Hindi or English.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
