import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, LogOut, Mail, Phone, Edit3, Check, X, Building2 } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useAuth, getInitials } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, updateUserProfile } = useAuth();
  const { showToast } = useToast();

  const resolvedDisplayName =
    user?.displayName || (user?.email ? user.email.split('@')[0] : 'Store Owner');
  const resolvedShopName = user?.shopName || `${resolvedDisplayName}'s Shop`;
  const resolvedEmail = user?.email || 'Not provided';
  const resolvedPhone = user?.phone || '';
  const resolvedBranch = user?.activeBranch || 'Main Branch';
  const initials = getInitials(resolvedDisplayName, 'SO');

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(resolvedDisplayName);
  const [editShopName, setEditShopName] = useState(resolvedShopName);
  const [editPhone, setEditPhone] = useState(resolvedPhone);
  const [editBranch, setEditBranch] = useState(resolvedBranch);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditName(resolvedDisplayName);
    setEditShopName(resolvedShopName);
    setEditPhone(resolvedPhone);
    setEditBranch(resolvedBranch);
  }, [resolvedDisplayName, resolvedShopName, resolvedPhone, resolvedBranch]);

  const currentMonthLabel = new Date().toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const memberSinceLabel = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      })
    : currentMonthLabel;

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateUserProfile({
        displayName: editName.trim() || resolvedDisplayName,
        shopName: editShopName.trim() || resolvedShopName,
        phone: editPhone.trim(),
        activeBranch: editBranch.trim() || 'Main Branch',
      });
      setIsEditing(false);
      showToast({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your merchant profile and store details have been saved.',
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: err?.message || 'Could not update profile.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
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
        actions={
          !isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              leftIcon={<Edit3 className="w-4 h-4" />}
            >
              Edit Profile
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditing(false)}
                leftIcon={<X className="w-4 h-4" />}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isSaving}
                onClick={handleSaveProfile}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Save Changes
              </Button>
            </div>
          )
        }
      />

      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-outline">
          <div className="w-16 h-16 rounded-2xl bg-primary text-on-primary font-bold text-2xl flex items-center justify-center shadow-card">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-headline-sm text-xl font-bold text-on-surface">
                {resolvedDisplayName}
              </h2>
              <Badge variant="verified">
                {user?.isGuest ? 'Guest Demo' : user?.role === 'staff' ? 'Store Staff' : 'Store Owner'}
              </Badge>
            </div>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              {resolvedShopName} • Active since {memberSinceLabel}
            </p>
          </div>
        </div>

        {isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Owner / Merchant Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter your full name"
            />
            <Input
              label="Shop / Business Name"
              value={editShopName}
              onChange={(e) => setEditShopName(e.target.value)}
              placeholder="Enter your shop name"
            />
            <Input
              label="Phone Number"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
            <Input
              label="Active Branch"
              value={editBranch}
              onChange={(e) => setEditBranch(e.target.value)}
              placeholder="Main Branch"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-body-sm">
            <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline">
              <span className="text-label-xs text-on-surface-variant font-semibold flex items-center gap-1.5 mb-1">
                <Mail className="w-3.5 h-3.5" /> Registered Email
              </span>
              <span className="font-bold text-on-surface">{resolvedEmail}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline">
              <span className="text-label-xs text-on-surface-variant font-semibold flex items-center gap-1.5 mb-1">
                <Phone className="w-3.5 h-3.5" /> Phone Number
              </span>
              <span className="font-bold text-on-surface">
                {resolvedPhone || 'Not added yet (click Edit Profile)'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline">
              <span className="text-label-xs text-on-surface-variant font-semibold flex items-center gap-1.5 mb-1">
                <Store className="w-3.5 h-3.5" /> Active Store
              </span>
              <span className="font-bold text-on-surface">{resolvedShopName}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline">
              <span className="text-label-xs text-on-surface-variant font-semibold flex items-center gap-1.5 mb-1">
                <Building2 className="w-3.5 h-3.5" /> Branch & Billing Cycle
              </span>
              <span className="font-bold text-on-surface">
                {resolvedBranch} • {currentMonthLabel}
              </span>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-outline flex justify-between items-center">
          <span className="text-label-xs text-on-surface-variant">
            {user?.isGuest
              ? 'Exploring in Guest Demo Mode'
              : `Authenticated via Firebase (${resolvedEmail})`}
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
