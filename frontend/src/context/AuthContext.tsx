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
  signupWithEmail: (shopName: string, email: string, password: string, businessType?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInAsGuest: () => void;
  exitGuestMode: () => void;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
        try {
          // Attempt to retrieve profile from Firestore /users/{uid}
          const userDocRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userDocRef);

          if (snap.exists()) {
            const data = snap.data();
            setUser({
              uid: currentUser.uid,
              displayName: currentUser.displayName || data.displayName || 'Storekeeper',
              email: currentUser.email || '',
              phone: currentUser.phoneNumber || data.phone || '',
              shopName: data.shopName || `${currentUser.displayName || 'My Shop'} Store`,
              businessType: data.businessType || 'kirana',
              role: data.role || 'owner',
              activeBranch: data.activeBranch || 'Main Branch',
              isGuest: false,
            });
          } else {
            // Profile fallback if Firestore document is still provisioning
            setUser({
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'Storekeeper',
              email: currentUser.email || '',
              phone: currentUser.phoneNumber || '',
              shopName: `${currentUser.displayName || 'Kirana'} Store`,
              businessType: 'kirana',
              role: 'owner',
              activeBranch: 'Main Branch',
              isGuest: false,
            });
          }
        } catch (err) {
          console.warn('[AuthContext] Firestore profile fetch error:', err);
          setUser({
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'Storekeeper',
            email: currentUser.email || '',
            shopName: 'Sharma Kirana Store',
            businessType: 'kirana',
            role: 'owner',
            activeBranch: 'Main Branch',
            isGuest: false,
          });
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
    businessType: string = 'kirana'
  ) => {
    setLoading(true);
    setAuthError(null);

    if (!isConfigured && import.meta.env.VITE_USE_FIREBASE_EMULATORS !== 'true') {
      setUser({
        ...DEMO_USER_PROFILE,
        shopName,
        email,
        businessType,
      });
      setLoading(false);
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      // Update display name
      await updateProfile(user, { displayName: shopName });

      // Initialize user and shop records in Firestore
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          shopName,
          email,
          businessType,
          role: 'owner',
          createdAt: serverTimestamp(),
        });

        // Send email verification
        await sendEmailVerification(user);
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
      const user = cred.user;

      // Ensure Firestore document exists
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) {
          await setDoc(userDocRef, {
            uid: user.uid,
            displayName: user.displayName || 'Google Merchant',
            email: user.email,
            shopName: `${user.displayName || 'Kirana'} Store`,
            businessType: 'kirana',
            role: 'owner',
            createdAt: serverTimestamp(),
          });
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
  };

  const exitGuestMode = () => {
    setIsGuest(false);
    setUser(null);
  };

  const logout = async () => {
    setLoading(true);
    setIsGuest(false);
    setUser(null);
    setFirebaseUser(null);

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
