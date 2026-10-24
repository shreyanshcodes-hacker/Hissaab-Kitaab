import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt,
  ScanText,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { signInAsGuest } = useAuth();

  const handleExploreGuest = () => {
    signInAsGuest();
    navigate('/explore');
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col selection:bg-primary-container selection:text-on-primary">
      {/* ===================== TOP HEADER ===================== */}
      <header className="sticky top-0 z-40 w-full bg-surface/90 backdrop-blur-md border-b border-outline">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Hissaab Kitaab Logo"
              className="w-10 h-10 rounded-xl object-cover shadow-sm border border-primary/30"
            />
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight leading-none">
                Hissaab Kitaab
              </span>
              <span className="font-label-xs text-[0.6875rem] text-on-surface-variant leading-none mt-1">
                Bahi Khata & AI Bookkeeper
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-label-md text-on-surface-variant font-medium">
            <a href="#how-it-works" className="hover:text-on-surface transition-colors">
              How it Works
            </a>
            <a href="#features" className="hover:text-on-surface transition-colors">
              Features
            </a>
            <a href="#comparison" className="hover:text-on-surface transition-colors">
              Before & After
            </a>
            <a href="#assurance" className="hover:text-on-surface transition-colors">
              Kirana Privacy
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/login')}
              className="hidden sm:inline-flex"
            >
              Sign In
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/signup')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* ===================== HERO SECTION ===================== */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          <Badge variant="verified" icon={true} size="md" className="mb-6 shadow-sm">
            Calibrated for Indian Kirana, Retail & Mandi Traders
          </Badge>

          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-on-surface max-w-4xl leading-tight">
            Your shop's purchase records,{' '}
            <span className="text-primary-container underline decoration-primary-container/30 underline-offset-8">
              finally in order.
            </span>
          </h1>

          <p className="mt-6 text-body-lg sm:text-xl text-on-surface-variant max-w-2xl leading-relaxed">
            Turn crumpled thermal paper, faded mandi slips, and wholesale invoices into a clean,
            searchable bahi khata. Keep your store procurement records accurate and reconciled.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/signup')}
              rightIcon={<ArrowRight className="w-5 h-5" />}
              className="w-full sm:w-auto px-8 font-bold shadow-elevated"
            >
              Create Free Shop Account
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={handleExploreGuest}
              leftIcon={<Sparkles className="w-5 h-5 text-amber-600" />}
              className="w-full sm:w-auto px-6 font-semibold"
            >
              Explore Live Demo (No sign up)
            </Button>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-label-xs text-on-surface-variant font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-verified" /> Zero blind ledger writes
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-verified" /> Full manual control on every cell
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-verified" /> Strictly private to your store
            </span>
          </div>
        </div>
      </section>

      {/* ===================== CORE PILLARS ===================== */}
      <section id="features" className="py-16 bg-surface-container-low/60 border-y border-outline">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface">
              Built specifically for Indian shopkeepers
            </h2>
            <p className="text-body-sm text-on-surface-variant mt-2">
              No complicated enterprise jargon. Pure utility designed for fast daily tallying.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline shadow-card flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-primary-fixed text-primary flex items-center justify-center mb-4">
                <ScanText className="w-6 h-6" />
              </div>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-2">
                Receipt scanning with AI
              </h3>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                Snap photos of thermal paper, printed invoices, or handwritten mandi chits. Gemini AI
                extracts line items, rates, and tax slabs in seconds.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline shadow-card flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-secondary-container text-on-secondary-fixed flex items-center justify-center mb-4">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-2">
                Organized purchase records
              </h3>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                Every bill is archived with its original scan. Search instantly by supplier, item
                name, or date range during night reconciliation.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline shadow-card flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-2">
                Spending & vendor insights
              </h3>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                Track rate divergence across vendors. Spot when mustard oil, sugar, or pulses spike
                in price before ordering your next batch.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline shadow-card flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-verified-container text-verified flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-2">
                Ask Hissaab Kitaab in plain words
              </h3>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                Ask "Who gave me the best rate for mustard oil this month?" and get clear, cited
                answers backed directly by your verified bills.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== BEFORE & AFTER COMPARISON ===================== */}
      <section id="comparison" className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface">
              The daily difference for your store
            </h2>
            <p className="text-body-sm text-on-surface-variant mt-2">
              Why kiranas are replacing paper clipboards with Hissaab Kitaab
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Before Card */}
            <div className="p-6 sm:p-8 rounded-2xl border border-error/30 bg-error-container/20 flex flex-col">
              <div className="flex items-center gap-2 text-error font-bold text-headline-sm mb-4">
                <XCircle className="w-6 h-6" />
                <span>Before Hissaab Kitaab</span>
              </div>
              <ul className="space-y-4 text-body-sm text-on-surface-variant">
                <li className="flex items-start gap-3">
                  <span className="text-error font-bold mt-0.5">•</span>
                  <span>Faded thermal receipts lose printed text after 3 weeks in the drawer.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-error font-bold mt-0.5">•</span>
                  <span>Wholesale suppliers quietly raise rates by ₹2-₹5 per unit unnoticed.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-error font-bold mt-0.5">•</span>
                  <span>Nightly reconciliation takes 45 minutes of manual calculator tallying.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-error font-bold mt-0.5">•</span>
                  <span>No easy way to check what you paid a vendor 2 months ago.</span>
                </li>
              </ul>
            </div>

            {/* After Card */}
            <div className="p-6 sm:p-8 rounded-2xl border border-verified-border bg-verified-container/20 flex flex-col shadow-card">
              <div className="flex items-center gap-2 text-verified font-bold text-headline-sm mb-4">
                <CheckCircle2 className="w-6 h-6" />
                <span>After Hissaab Kitaab</span>
              </div>
              <ul className="space-y-4 text-body-sm text-on-surface">
                <li className="flex items-start gap-3">
                  <span className="text-verified font-bold mt-0.5">✓</span>
                  <span>Every voucher scan is permanently saved and backed up to the cloud.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-verified font-bold mt-0.5">✓</span>
                  <span>Automatic price spike alerts flag rate increases before you pay.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-verified font-bold mt-0.5">✓</span>
                  <span>Split-screen OCR reviewer lets you verify and tally slips in 10 seconds.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-verified font-bold mt-0.5">✓</span>
                  <span>Instant natural language answers to any purchase or supplier question.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== KIRANA TRUST & ZERO-RISK ASSURANCE ===================== */}
      <section id="assurance" className="py-16 bg-surface-container border-t border-outline">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex p-3 rounded-2xl bg-primary-container text-on-primary mb-4 shadow-sm">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface">
            Zero-Risk Kirana Assurance
          </h2>
          <p className="mt-3 text-body-sm sm:text-base text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
            AI is your helper, not your accountant. Hissaab Kitaab never writes anything to your bahi
            khata automatically. You always inspect, edit, and confirm extracted values with a clear
            split-screen comparison.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/signup')}
              className="w-full sm:w-auto px-8 font-bold"
            >
              Start Free Today
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={handleExploreGuest}
              className="w-full sm:w-auto"
            >
              Test with Demo Data
            </Button>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="mt-auto py-10 bg-surface-container-low border-t border-outline text-label-xs text-on-surface-variant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Hissaab Kitaab" className="w-6 h-6 rounded-md object-cover" />
            <span className="font-bold text-on-surface">Hissaab Kitaab</span>
            <span>• Smart Bahi Khata for Indian Retailers</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/login')} className="hover:text-on-surface">
              Sign In
            </button>
            <button onClick={handleExploreGuest} className="hover:text-on-surface">
              Demo Mode
            </button>
            <button onClick={() => navigate('/settings')} className="hover:text-on-surface">
              Privacy & GST
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
