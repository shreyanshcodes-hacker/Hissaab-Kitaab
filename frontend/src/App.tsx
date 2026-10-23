import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { AuthenticatedLayout } from './components/layout/AuthenticatedLayout';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { GuestDashboardPage } from './pages/GuestDashboardPage';

// Authenticated Pages
import { DashboardPage } from './pages/DashboardPage';
import { ReceiptsPage } from './pages/ReceiptsPage';
import { UploadReceiptPage } from './pages/UploadReceiptPage';
import { ReceiptDetailPage } from './pages/ReceiptDetailPage';
import { ReviewReceiptPage } from './pages/ReviewReceiptPage';
import { SpendingAnalysisPage } from './pages/SpendingAnalysisPage';
import { AskShopLedgerPage } from './pages/AskShopLedgerPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { SupplierDetailPage } from './pages/SupplierDetailPage';
import { CatalogPage } from './pages/CatalogPage';
import { ItemDetailPage } from './pages/ItemDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { HelpPage } from './pages/HelpPage';
import { DesignSystemShowcasePage } from './pages/DesignSystemShowcasePage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
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
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
