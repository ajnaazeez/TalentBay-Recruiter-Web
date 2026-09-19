import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/utils/constants';
import { authService, SignUpRecruiterParams } from '@/services/authService';
import { companyService } from '@/services/companyService';
import { RecruiterProfile, Company } from '@/types';
import { parseFirestoreDate } from '@/utils/formatters';
import { AuthContext, AuthContextType } from './AuthContext';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [recruiterProfile, setRecruiterProfile] = useState<RecruiterProfile | null>(null);
  const [companyProfile, setCompanyProfile] = useState<Company | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async (uid: string) => {
    try {
      const profile = await authService.getRecruiterProfile(uid);
      setRecruiterProfile(profile);

      if (profile?.companyId) {
        const company = await companyService.getCompany(profile.companyId);
        setCompanyProfile(company);
      }
    } catch (err: unknown) {
      console.error('[AuthProvider] Error fetching recruiter profile:', err);
    }
  }, []);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = authService.onAuthStateChanged(async (firebaseUser) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (firebaseUser) {
        // Verify recruiter profile exists in Firestore before establishing authenticated session
        const profile = await authService.getRecruiterProfile(firebaseUser.uid);
        if (profile) {
          setUser(firebaseUser);
          setRecruiterProfile(profile);

          if (profile.companyId) {
            try {
              const company = await companyService.getCompany(profile.companyId);
              setCompanyProfile(company);
            } catch (cErr) {
              console.warn('[AuthProvider] Error fetching company profile:', cErr);
            }
          }

          // Real-time listener for recruiter profile & subscription updates
          const docRef = doc(db, COLLECTIONS.RECRUITERS, firebaseUser.uid);
          unsubscribeSnapshot = onSnapshot(
            docRef,
            async (snap) => {
              if (snap.exists()) {
                const data = snap.data();
                const fullName = String(data.fullName || data.displayName || firebaseUser.displayName || 'Recruiter');
                const email = String(data.officialEmail || data.email || firebaseUser.email || '');
                const rawCompanyId = data.companyId || data.company_id || data.company || '';
                const companyId = String(rawCompanyId).trim();

                const updatedProfile: RecruiterProfile = {
                  uid: firebaseUser.uid,
                  companyId,
                  fullName,
                  designation: String(data.designation || 'Hiring Lead'),
                  officialEmail: email,
                  phoneNumber: String(data.phoneNumber || ''),
                  emailVerified: Boolean(data.emailVerified),
                  phoneVerified: Boolean(data.phoneVerified),
                  isSubscribed: Boolean(data.isSubscribed),
                  subscriptionPlanId: data.subscriptionPlanId ? String(data.subscriptionPlanId) : null,
                  subscriptionTier: data.subscriptionTier ? String(data.subscriptionTier) : (data.subscriptionPlanId ? String(data.subscriptionPlanId) : null),
                  subscriptionExpiry: data.subscriptionExpiry || null,
                  isSubscriptionCancelled: Boolean(data.isSubscriptionCancelled),
                  razorpaySubscriptionId: data.razorpaySubscriptionId || null,
                  appleSubscriptionId: data.appleSubscriptionId || null,
                  createdAt: data.createdAt,
                  id: firebaseUser.uid,
                  email,
                  name: fullName,
                  phone: String(data.phoneNumber || ''),
                };

                setRecruiterProfile(updatedProfile);

                if (companyId) {
                  try {
                    const company = await companyService.getCompany(companyId);
                    setCompanyProfile(company);
                  } catch (cErr) {
                    console.warn('[AuthProvider] Error syncing company profile in onSnapshot:', cErr);
                  }
                }
              }
            },
            (snapErr) => {
              console.warn('[AuthProvider] onSnapshot subscription listener error:', snapErr);
            }
          );
        } else {
          // If no active recruiter profile exists in Firestore, user is not authorized as recruiter
          console.warn('[AuthProvider] Authenticated Firebase user has no active recruiter profile. Resetting session.');
          setUser(null);
          setRecruiterProfile(null);
          setCompanyProfile(null);
        }
      } else {
        setUser(null);
        setRecruiterProfile(null);
        setCompanyProfile(null);
      }
      setInitialLoading(false);
      setLoading(false);
    });

    return () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
      unsubscribeAuth();
    };
  }, [fetchProfiles]);

  const isSubscribed = useMemo(() => {
    if (!recruiterProfile?.isSubscribed) return false;
    if (recruiterProfile.subscriptionExpiry == null) return true;
    const expiryDate = parseFirestoreDate(recruiterProfile.subscriptionExpiry);
    if (!expiryDate) return false;
    return expiryDate.getTime() > Date.now();
  }, [recruiterProfile?.isSubscribed, recruiterProfile?.subscriptionExpiry]);

  const handleSignIn = useCallback(async (email: string, pass: string) => {
    setError(null);
    setLoading(true);
    try {
      console.log('[Auth Flow] Initiating email sign-in...');
      const signedInUser = await authService.signIn(email, pass);
      console.log('[Auth Flow] Email sign-in authenticated. User UID:', signedInUser.uid);
      setUser(signedInUser);
      console.log('[Auth Flow] Loading recruiter profile for UID:', signedInUser.uid);
      await fetchProfiles(signedInUser.uid);
      console.log('[Auth Flow] Profile loaded. Recruiter session established.');
    } catch (err: unknown) {
      console.error('[Auth Flow] Email sign-in failed:', err);
      const msg = err instanceof Error ? err.message : 'Failed to sign in';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchProfiles]);

  const handleSignInWithPhoneOtp = useCallback(
    async (confirmationResult: any, otp: string) => {
      setError(null);
      setLoading(true);
      try {
        console.log('[Auth Flow] Confirming Phone OTP with Firebase Auth...');
        const signedInUser = await authService.signInWithPhoneOtp(confirmationResult, otp);
        console.log('[Auth Flow] Phone OTP confirmed. User UID:', signedInUser.uid);
        setUser(signedInUser);
        console.log('[Auth Flow] Fetching recruiter profile for authenticated phone user...');
        await fetchProfiles(signedInUser.uid);
        console.log('[Auth Flow] Recruiter workspace initialized. Session ready.');
        return signedInUser;
      } catch (err: unknown) {
        console.error('[Auth Flow] Phone OTP sign-in error:', err);
        const msg = err instanceof Error ? err.message : 'Failed to sign in with phone OTP';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchProfiles]
  );

  const handleSignUp = useCallback(async (params: SignUpRecruiterParams) => {
    setError(null);
    setLoading(true);
    try {
      console.log('[Auth Flow] Registering new recruiter account...');
      const newUser = await authService.signUpRecruiter(params);
      console.log('[Auth Flow] Recruiter registered. UID:', newUser.uid);
      setUser(newUser);
      await fetchProfiles(newUser.uid);
      console.log('[Auth Flow] New recruiter profile established.');
    } catch (err: unknown) {
      console.error('[Auth Flow] Registration failed:', err);
      const msg = err instanceof Error ? err.message : 'Failed to sign up';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchProfiles]);

  const handleSignOut = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[Auth Flow] Signing out...');
      await authService.signOut();
      setUser(null);
      setRecruiterProfile(null);
      setCompanyProfile(null);
      console.log('[Auth Flow] Sign-out complete.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      console.log('[Auth Flow] Authoritatively purging account on backend...');
      await authService.deleteAccount();
      setUser(null);
      setRecruiterProfile(null);
      setCompanyProfile(null);
      console.log('[Auth Flow] Account successfully deleted and purged.');
    } catch (err: unknown) {
      console.error('[Auth Flow] Account deletion failed:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete account';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSendPasswordReset = useCallback(async (email: string) => {
    await authService.sendPasswordReset(email);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.uid) {
      await fetchProfiles(user.uid);
    }
  }, [user?.uid, fetchProfiles]);

  const updateRecruiter = useCallback(
    async (updates: Partial<RecruiterProfile>) => {
      if (!user?.uid) return;
      await authService.updateRecruiterProfile(user.uid, updates);
      setRecruiterProfile((prev: RecruiterProfile | null) => (prev ? { ...prev, ...updates } : null));
    },
    [user?.uid]
  );

  const updateCompany = useCallback(
    async (updates: Partial<Company>) => {
      if (!recruiterProfile?.companyId) return;
      await companyService.updateCompany(recruiterProfile.companyId, updates);
      setCompanyProfile((prev: Company | null) => (prev ? { ...prev, ...updates } : null));
    },
    [recruiterProfile?.companyId]
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      recruiterProfile,
      companyProfile,
      loading,
      initialLoading,
      error,
      isAuthenticated: Boolean(user),
      isSubscribed,
      signIn: handleSignIn,
      signInWithPhoneOtp: handleSignInWithPhoneOtp,
      signUp: handleSignUp,
      signOut: handleSignOut,
      deleteAccount: handleDeleteAccount,
      sendPasswordReset: handleSendPasswordReset,
      refreshProfile,
      updateRecruiter,
      updateCompany,
    }),
    [
      user,
      recruiterProfile,
      companyProfile,
      loading,
      initialLoading,
      error,
      isSubscribed,
      handleSignIn,
      handleSignInWithPhoneOtp,
      handleSignUp,
      handleSignOut,
      handleDeleteAccount,
      handleSendPasswordReset,
      refreshProfile,
      updateRecruiter,
      updateCompany,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
