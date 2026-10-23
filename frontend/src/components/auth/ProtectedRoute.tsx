import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingIndicator';
import { Button } from '../common/Button';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowGuest?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowGuest = false,
}) => {
  const { isAuthenticated, isGuest, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <LoadingSpinner size="lg" label="Verifying shop authorization…" />
      </div>
    );
  }

  // Not authenticated at all -> redirect to login preserving destination
  if (!isAuthenticated && !isGuest) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // In guest demo mode attempting to access restricted private routes (e.g. upload slip, review, settings)
  if (isGuest && !allowGuest) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface-container-lowest rounded-2xl border border-outline shadow-card p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-tertiary-fixed text-tertiary flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-7 h-7" />
          </div>

          <h2 className="font-headline-sm text-xl font-bold text-on-surface">
            Sign In to Access Real Store Data
          </h2>

          <p className="text-body-sm text-on-surface-variant leading-relaxed">
            You are currently exploring ShopLedger in <strong>Guest Demo Mode</strong>. To upload,
            verify, and save real physical purchase vouchers, please sign in or create your free
            shop account.
          </p>

          <div className="space-y-2.5 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/signup', { state: { from: location } })}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full justify-center font-bold shadow-card"
            >
              Create Free Shop Account
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/login', { state: { from: location } })}
              className="w-full justify-center"
            >
              Sign In with Existing Shop
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/explore')}
              className="w-full text-on-surface-variant text-label-xs"
            >
              Return to Demo Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
