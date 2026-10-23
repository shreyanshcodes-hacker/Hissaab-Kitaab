import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from '../config/firebase';
import type { UserProfile } from '../types';
import { DEMO_USER_PROFILE, DEMO_GUEST_PROFILE } from '../data/demoData';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  loading: boolean;
  authError: string | null;
  isConfigured: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (
    shopName: string,
    email: string,
    password: string,
    businessType?: string,
    ownerName?: string,
    phone?: string
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInAsGuest: () => void;
  exitGuestMode: () => void;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function getInitials(name?: string, fallback: string = 'SL'): string {
  if (!name || !name.trim()) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

function getCachedProfile(uid: string): Partial<UserProfile> | null {
  try {
    const raw = localStorage.getItem(`shopledger_profile_${uid}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCachedProfile(uid: string, profile: UserProfile): void {
  try {
    localStorage.setItem(`shopledger_profile_${uid}`, JSON.stringify(profile));
    if (profile.activeBusinessId) {
      localStorage.setItem('shopledger_active_business_id', profile.activeBusinessId);
    }
  } catch {
    // Ignore storage quota errors
  }
}

function resolveUserBusinessId(uid: string, storedBusinessId?: string): string {
  if (storedBusinessId && storedBusinessId !== 'biz_sharma_kirana') {
    return storedBusinessId;
  }
  return `biz_${uid}`;
}

async function ensureBusinessTenantInFirestore(profile: UserProfile): Promise<void> {
  const businessId = resolveUserBusinessId(profile.uid, profile.activeBusinessId);
  try {
    localStorage.setItem('shopledger_active_business_id', businessId);
  } catch {
    // Ignore storage errors
  }

  try {
    const bizRef = doc(db, 'businesses', businessId);
    const bizSnap = await getDoc(bizRef);
    const nowIso = new Date().toISOString();

    if (!bizSnap.exists()) {
      await setDoc(bizRef, {
        id: businessId,
        name: profile.shopName,
        legalName: profile.shopName,
        businessType: profile.businessType || 'kirana',
        gstin: profile.gstin || '',
        ownerUid: profile.uid,
        memberUids: [profile.uid],
        members: {
          [profile.uid]: {
            uid: profile.uid,
            role: 'owner',
            displayName: profile.displayName,
            email: profile.email,
            addedAt: nowIso,
            addedBy: profile.uid,
          },
        },
        currency: 'INR',
        currencySymbol: '₹',
        phone: profile.phone || '',
        email: profile.email || '',
        settings: {
          defaultTaxSlabs: [0, 5, 12, 18, 28],
          confidenceThreshold: 0.85,
          requireReviewForUncertain: true,
          dailyReconciliationReminder: true,
          language: 'en',
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn('[AuthContext] Business tenant provisioning warning:', err);
  }
}

// Helper to translate Firebase Auth error codes into Kirana-friendly copy
export function formatAuthError(errorCode: string): string {
  switch (errorCode) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email, phone, or password. Please verify your shop credentials.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long for store security.';
    case 'auth/invalid-email':
      return 'Please enter a valid store email address (e.g. sharma.kirana@gmail.com).';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing. Please try again.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in window was cancelled. Please click Google Sign In again.';
    case 'auth/network-request-failed':
      return 'Internet connection dropped. Please check your shop Wi-Fi or mobile data.';
    case 'auth/too-many-requests':
      return 'Access temporarily blocked due to multiple failed login attempts. Please reset password or try again later.';
    default:
      return 'Authentication could not be completed. Please try again.';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const isConfigured = isFirebaseConfigured();

  // Listen to Firebase Authentication State changes
  useEffect(() => {
    if (!isConfigured && import.meta.env.VITE_USE_FIREBASE_EMULATORS !== 'true') {
      // In development mode with dummy placeholder keys, allow controlled development session
      setUser(DEMO_USER_PROFILE);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setFirebaseUser(currentUser);
      setAuthError(null);

      if (currentUser) {
        setIsGuest(false);
        const cached = getCachedProfile(currentUser.uid);
        const emailPrefix = currentUser.email ? currentUser.email.split('@')[0] : 'Store Owner';

        try {
          // Attempt to retrieve profile from Firestore /users/{uid}
          const userDocRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userDocRef);

          if (snap.exists()) {
            const data = snap.data();
            const businessId = resolveUserBusinessId(
              currentUser.uid,
              data.activeBusinessId || cached?.activeBusinessId
            );
            const resolvedProfile: UserProfile = {
              uid: currentUser.uid,
              displayName:
                data.displayName ||
                cached?.displayName ||
                currentUser.displayName ||
                emailPrefix,
              email: currentUser.email || data.email || cached?.email || '',
              phone: data.phone || cached?.phone || currentUser.phoneNumber || '',
              shopName:
                data.shopName ||
                cached?.shopName ||
                (currentUser.displayName ? `${currentUser.displayName}'s Shop` : `${emailPrefix} Store`),
              businessType: data.businessType || cached?.businessType || 'kirana',
              role: data.role || 'owner',
              activeBranch: data.activeBranch || cached?.activeBranch || 'Main Branch',
              activeBusinessId: businessId,
              gstin: data.gstin || cached?.gstin || '',
              createdAt:
                typeof data.createdAt?.toDate === 'function'
                  ? data.createdAt.toDate().toISOString()
                  : data.createdAt || cached?.createdAt || currentUser.metadata?.creationTime || new Date().toISOString(),
              isGuest: false,
            };
            setCachedProfile(currentUser.uid, resolvedProfile);
            setUser(resolvedProfile);
            await ensureBusinessTenantInFirestore(resolvedProfile);
          } else {
            // Profile fallback if Firestore document is still provisioning during signup
            const businessId = resolveUserBusinessId(currentUser.uid, cached?.activeBusinessId);
            const resolvedProfile: UserProfile = {
              uid: currentUser.uid,
              displayName:
                cached?.displayName ||
                currentUser.displayName ||
                emailPrefix,
              email: currentUser.email || cached?.email || '',
              phone: cached?.phone || currentUser.phoneNumber || '',
              shopName:
                cached?.shopName ||
                (currentUser.displayName ? `${currentUser.displayName}'s Shop` : `${emailPrefix} Store`),
              businessType: cached?.businessType || 'kirana',
              role: 'owner',
              activeBranch: cached?.activeBranch || 'Main Branch',
              activeBusinessId: businessId,
              gstin: cached?.gstin || '',
              createdAt: cached?.createdAt || currentUser.metadata?.creationTime || new Date().toISOString(),
              isGuest: false,
            };
            setCachedProfile(currentUser.uid, resolvedProfile);
            setUser(resolvedProfile);
            await ensureBusinessTenantInFirestore(resolvedProfile);
          }
        } catch (err) {
          console.warn('[AuthContext] Firestore profile fetch error:', err);
          const businessId = resolveUserBusinessId(currentUser.uid, cached?.activeBusinessId);
          const resolvedProfile: UserProfile = {
            uid: currentUser.uid,
            displayName: cached?.displayName || currentUser.displayName || emailPrefix,
            email: currentUser.email || cached?.email || '',
            phone: cached?.phone || currentUser.phoneNumber || '',
            shopName:
              cached?.shopName ||
              (currentUser.displayName ? `${currentUser.displayName}'s Shop` : `${emailPrefix} Store`),
            businessType: cached?.businessType || 'kirana',
            role: 'owner',
            activeBranch: cached?.activeBranch || 'Main Branch',
            activeBusinessId: businessId,
            gstin: cached?.gstin || '',
            createdAt: cached?.createdAt || currentUser.metadata?.creationTime || new Date().toISOString(),
            isGuest: false,
          };
          setCachedProfile(currentUser.uid, resolvedProfile);
          setUser(resolvedProfile);
        }
      } else {
        // If not in guest mode, user is unauthenticated
        if (!isGuest) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isConfigured, isGuest]);

  const loginWithEmail = async (email: string, password: string) => {
    setLoading(true);
    setAuthError(null);

    if (!isConfigured && import.meta.env.VITE_USE_FIREBASE_EMULATORS !== 'true') {
      setUser(DEMO_USER_PROFILE);
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      const msg = formatAuthError(err.code);
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const signupWithEmail = async (
    shopName: string,
    email: string,
    password: string,
    businessType: string = 'kirana',
    ownerName?: string,
    phone?: string
  ) => {
    setLoading(true);
    setAuthError(null);

    const resolvedOwnerName =
      ownerName && ownerName.trim()
        ? ownerName.trim()
        : email.includes('@')
          ? email.split('@')[0]
          : shopName.trim();
    const resolvedShopName = shopName.trim() || `${resolvedOwnerName}'s Shop`;
    const resolvedPhone = phone?.trim() || '';

    if (!isConfigured && import.meta.env.VITE_USE_FIREBASE_EMULATORS !== 'true') {
      setUser({
        ...DEMO_USER_PROFILE,
        displayName: resolvedOwnerName,
        shopName: resolvedShopName,
        email,
        phone: resolvedPhone,
        businessType,
      });
      setLoading(false);
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const createdUser = cred.user;
      const nowIso = new Date().toISOString();
      const businessId = `biz_${createdUser.uid}`;

      const newProfile: UserProfile = {
        uid: createdUser.uid,
        displayName: resolvedOwnerName,
        email: createdUser.email || email,
        phone: resolvedPhone,
        shopName: resolvedShopName,
        businessType,
        role: 'owner',
        activeBranch: 'Main Branch',
        activeBusinessId: businessId,
        gstin: '',
        createdAt: nowIso,
        isGuest: false,
      };

      // Cache & set state immediately so onAuthStateChanged never shows a dummy fallback
      setCachedProfile(createdUser.uid, newProfile);
      setUser(newProfile);

      // Update Firebase Auth display name to the actual user's name
      await updateProfile(createdUser, { displayName: resolvedOwnerName });

      // Initialize user and isolated business tenant records in Firestore
      try {
        await setDoc(
          doc(db, 'users', createdUser.uid),
          {
            uid: createdUser.uid,
            displayName: resolvedOwnerName,
            shopName: resolvedShopName,
            email: createdUser.email || email,
            phone: resolvedPhone,
            businessType,
            role: 'owner',
            activeBranch: 'Main Branch',
            activeBusinessId: businessId,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );

        await ensureBusinessTenantInFirestore(newProfile);

        // Send email verification
        await sendEmailVerification(createdUser);
      } catch (firestoreErr) {
        console.warn('[AuthContext] Firestore initialization error:', firestoreErr);
      }
    } catch (err: any) {
      const msg = formatAuthError(err.code);
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setAuthError(null);

    if (!isConfigured && import.meta.env.VITE_USE_FIREBASE_EMULATORS !== 'true') {
      setUser({
        ...DEMO_USER_PROFILE,
        displayName: 'Google Merchant',
        email: 'merchant@gmail.com',
      });
      setLoading(false);
      return;
    }

    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const gUser = cred.user;
      const emailPrefix = gUser.email ? gUser.email.split('@')[0] : 'Store Owner';
      const displayName = gUser.displayName || emailPrefix;
      const defaultShopName = `${displayName}'s Store`;
      const businessId = `biz_${gUser.uid}`;

      // Ensure Firestore document exists
      try {
        const userDocRef = doc(db, 'users', gUser.uid);
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) {
          const newProfile: UserProfile = {
            uid: gUser.uid,
            displayName,
            email: gUser.email || '',
            phone: gUser.phoneNumber || '',
            shopName: defaultShopName,
            businessType: 'kirana',
            role: 'owner',
            activeBranch: 'Main Branch',
            activeBusinessId: businessId,
            createdAt: new Date().toISOString(),
            isGuest: false,
          };
          setCachedProfile(gUser.uid, newProfile);
          setUser(newProfile);

          await setDoc(userDocRef, {
            uid: gUser.uid,
            displayName,
            email: gUser.email,
            phone: gUser.phoneNumber || '',
            shopName: defaultShopName,
            businessType: 'kirana',
            role: 'owner',
            activeBranch: 'Main Branch',
            activeBusinessId: businessId,
            createdAt: serverTimestamp(),
          });

          await ensureBusinessTenantInFirestore(newProfile);
        } else {
          const data = snap.data();
          const resolvedBusinessId = resolveUserBusinessId(gUser.uid, data.activeBusinessId);
          const existingProfile: UserProfile = {
            uid: gUser.uid,
            displayName: data.displayName || displayName,
            email: gUser.email || data.email || '',
            phone: data.phone || gUser.phoneNumber || '',
            shopName: data.shopName || defaultShopName,
            businessType: data.businessType || 'kirana',
            role: data.role || 'owner',
            activeBranch: data.activeBranch || 'Main Branch',
            activeBusinessId: resolvedBusinessId,
            gstin: data.gstin || '',
            createdAt:
              typeof data.createdAt?.toDate === 'function'
                ? data.createdAt.toDate().toISOString()
                : data.createdAt || new Date().toISOString(),
            isGuest: false,
          };
          setCachedProfile(gUser.uid, existingProfile);
          setUser(existingProfile);
          await ensureBusinessTenantInFirestore(existingProfile);
        }
      } catch (firestoreErr) {
        console.warn('[AuthContext] Google sign-in firestore sync error:', firestoreErr);
      }
    } catch (err: any) {
      // Graceful handling of popup closure by user
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setAuthError('Google sign-in window was closed.');
      } else {
        const msg = formatAuthError(err.code);
        setAuthError(msg);
        throw new Error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const businessId = resolveUserBusinessId(user.uid, updates.activeBusinessId || user.activeBusinessId);
    const updated: UserProfile = {
      ...user,
      ...updates,
      activeBusinessId: businessId,
    };
    setUser(updated);
    setCachedProfile(user.uid, updated);

    if (firebaseUser && updates.displayName && updates.displayName !== firebaseUser.displayName) {
      try {
        await updateProfile(firebaseUser, { displayName: updates.displayName });
      } catch (err) {
        console.warn('[AuthContext] updateProfile error:', err);
      }
    }

    if (isConfigured && !isGuest) {
      try {
        await setDoc(
          doc(db, 'users', user.uid),
          {
            uid: user.uid,
            displayName: updated.displayName,
            shopName: updated.shopName,
            email: updated.email,
            phone: updated.phone || '',
            businessType: updated.businessType,
            activeBranch: updated.activeBranch || 'Main Branch',
            activeBusinessId: businessId,
            gstin: updated.gstin || '',
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        await ensureBusinessTenantInFirestore(updated);
        await setDoc(
          doc(db, 'businesses', businessId),
          {
            name: updated.shopName,
            legalName: updated.shopName,
            businessType: updated.businessType || 'kirana',
            gstin: updated.gstin || '',
            phone: updated.phone || '',
            email: updated.email || '',
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('[AuthContext] Failed to persist profile update to Firestore:', err);
      }
    }
  };

  const resetPassword = async (email: string) => {
    if (!email) throw new Error('Please enter your store email address.');
    setAuthError(null);

    if (!isConfigured && import.meta.env.VITE_USE_FIREBASE_EMULATORS !== 'true') {
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      const msg = formatAuthError(err.code);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const signInAsGuest = () => {
    setIsGuest(true);
    setUser(DEMO_GUEST_PROFILE);
    setAuthError(null);
    try {
      localStorage.setItem('shopledger_active_business_id', 'biz_guest_demo');
    } catch {
      // Ignore storage error
    }
  };

  const exitGuestMode = () => {
    setIsGuest(false);
    setUser(null);
    try {
      localStorage.removeItem('shopledger_active_business_id');
    } catch {
      // Ignore storage error
    }
  };

  const logout = async () => {
    setLoading(true);
    setIsGuest(false);
    setUser(null);
    setFirebaseUser(null);
    try {
      localStorage.removeItem('shopledger_active_business_id');
    } catch {
      // Ignore storage error
    }

    try {
      if (isConfigured || import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
        await signOut(auth);
      }
    } catch (err) {
      console.warn('[AuthContext] Sign out error:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isAuthenticated: (!!user && !isGuest) || !!firebaseUser,
        isGuest,
        loading,
        authError,
        isConfigured,
        loginWithEmail,
        signupWithEmail,
        signInWithGoogle,
        updateUserProfile,
        resetPassword,
        signInAsGuest,
        exitGuestMode,
        logout,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
