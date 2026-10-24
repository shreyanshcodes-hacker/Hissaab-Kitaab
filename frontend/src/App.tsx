import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthenticatedLayout } from './components/layout/AuthenticatedLayout';

// Primary Eager Pages (Fast Initial Paint)
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReceiptsPage } from './pages/ReceiptsPage';
import { UploadReceiptPage } from './pages/UploadReceiptPage';

// Lazy-Loaded Secondary Route Chunks
const GuestDashboardPage = lazy(() =>
  import('./pages/GuestDashboardPage').then((m) => ({ default: m.GuestDashboardPage }))
);
const ReceiptDetailPage = lazy(() =>
  import('./pages/ReceiptDetailPage').then((m) => ({ default: m.ReceiptDetailPage }))
);
const ReviewReceiptPage = lazy(() =>
  import('./pages/ReviewReceiptPage').then((m) => ({ default: m.ReviewReceiptPage }))
);
const SpendingAnalysisPage = lazy(() =>
  import('./pages/SpendingAnalysisPage').then((m) => ({ default: m.SpendingAnalysisPage }))
);
const AskShopLedgerPage = lazy(() =>
  import('./pages/AskShopLedgerPage').then((m) => ({ default: m.AskShopLedgerPage }))
);
const SuppliersPage = lazy(() =>
  import('./pages/SuppliersPage').then((m) => ({ default: m.SuppliersPage }))
);
const SupplierDetailPage = lazy(() =>
  import('./pages/SupplierDetailPage').then((m) => ({ default: m.SupplierDetailPage }))
);
const CatalogPage = lazy(() =>
  import('./pages/CatalogPage').then((m) => ({ default: m.CatalogPage }))
);
const ItemDetailPage = lazy(() =>
  import('./pages/ItemDetailPage').then((m) => ({ default: m.ItemDetailPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const HelpPage = lazy(() =>
  import('./pages/HelpPage').then((m) => ({ default: m.HelpPage }))
);
const DesignSystemShowcasePage = lazy(() =>
  import('./pages/DesignSystemShowcasePage').then((m) => ({ default: m.DesignSystemShowcasePage }))
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Suspense
                fallback={
                  <div className="min-h-[60vh] flex items-center justify-center text-sm text-[var(--color-text-secondary)]">
                    Loading Hissaab Kitaab workspace…
                  </div>
                }
              >
                <Routes>
                  {/* ================= PUBLIC ROUTES ================= */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<AuthPage />} />
                  <Route path="/signup" element={<AuthPage />} />
                  <Route path="/explore" element={<GuestDashboardPage />} />

                  {/* ================= AUTHENTICATED APP SHELL ================= */}
                  <Route element={<AuthenticatedLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/receipts" element={<ReceiptsPage />} />
                    <Route path="/receipts/new" element={<UploadReceiptPage />} />
                    <Route path="/receipts/upload" element={<UploadReceiptPage />} />
                    <Route path="/receipts/:receiptId" element={<ReceiptDetailPage />} />
                    <Route path="/receipts/:receiptId/review" element={<ReviewReceiptPage />} />
                    <Route path="/analysis" element={<SpendingAnalysisPage />} />
                    <Route path="/ask-shopledger" element={<AskShopLedgerPage />} />
                    <Route path="/ask" element={<Navigate to="/ask-shopledger" replace />} />
                    <Route path="/suppliers" element={<SuppliersPage />} />
                    <Route path="/suppliers/:supplierId" element={<SupplierDetailPage />} />
                    <Route path="/catalog" element={<CatalogPage />} />
                    <Route path="/items" element={<Navigate to="/catalog" replace />} />
                    <Route path="/items/:itemId" element={<ItemDetailPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/help" element={<HelpPage />} />
                    <Route path="/design-system" element={<DesignSystemShowcasePage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
