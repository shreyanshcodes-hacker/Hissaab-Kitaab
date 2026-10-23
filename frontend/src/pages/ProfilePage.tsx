import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, LogOut, Mail, Phone, Calendar } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const handleLogout = () => {
    logout();
    showToast({
      type: 'info',
      title: 'Logged Out',
      message: 'You have been safely signed out.',
    });
    navigate('/login');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <PageHeader
        title="Merchant Profile"
        subtitle="Manage your storekeeper identity and authorized branch credentials."
        breadcrumbs={[
          { label: 'ShopLedger', onClick: () => navigate('/dashboard') },
          { label: 'Profile' },
        ]}
      />

      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-outline">
          <div className="w-16 h-16 rounded-2xl bg-primary text-on-primary font-bold text-2xl flex items-center justify-center shadow-card">
            RS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-headline-sm text-xl font-bold text-on-surface">
                {user?.displayName || 'Ramesh Sharma'}
              </h2>
              <Badge variant="verified">Store Owner</Badge>
            </div>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              {user?.shopName || 'Sharma Kirana Store'} • Active since April 2024
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-body-sm">
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline">
            <span className="text-label-xs text-on-surface-variant font-semibold flex items-center gap-1.5 mb-1">
              <Mail className="w-3.5 h-3.5" /> Registered Email
            </span>
            <span className="font-bold text-on-surface">{user?.email || 'sharma.kirana@gmail.com'}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline">
            <span className="text-label-xs text-on-surface-variant font-semibold flex items-center gap-1.5 mb-1">
              <Phone className="w-3.5 h-3.5" /> Phone Number
            </span>
            <span className="font-bold text-on-surface">{user?.phone || '+91 98112 34567'}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline">
            <span className="text-label-xs text-on-surface-variant font-semibold flex items-center gap-1.5 mb-1">
              <Store className="w-3.5 h-3.5" /> Active Store
            </span>
            <span className="font-bold text-on-surface">{user?.shopName}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline">
            <span className="text-label-xs text-on-surface-variant font-semibold flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5" /> Current Billing Month
            </span>
            <span className="font-bold text-on-surface">October 2024</span>
          </div>
        </div>

        <div className="pt-4 border-t border-outline flex justify-between items-center">
          <span className="text-label-xs text-on-surface-variant">
            Signed in via Firebase Authentication
          </span>
          <Button
            variant="destructive"
            onClick={handleLogout}
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Log Out from Store
          </Button>
        </div>
      </Card>
    </div>
  );
};
