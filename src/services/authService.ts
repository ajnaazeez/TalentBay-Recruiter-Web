import {
  User,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithEmailAndPassword as firebaseSignIn,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordReset,
  updateProfile,
  Unsubscribe,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  serverTimestamp,
  UpdateData,
  DocumentData,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { COLLECTIONS, STORAGE_PATHS } from '@/utils/constants';
import { Recruiter, Company } from '@/types';
import { normalizePhoneNumber, getPhoneSearchVariants } from '@/utils/phone';
import { isValidEmail, isValidPhone } from '@/utils/validators';
import { functionsService } from './functionsService';

export interface SignUpRecruiterParams {
  email: string;
  password: string;
  displayName: string;
  companyName: string;
  designation?: string;
  phoneNumber?: string;
}

export const authService = {
  /**
   * RecaptchaVerifier setup for Phone OTP authentication.
   * Container must exist in DOM.
   */
  setUpRecaptcha(containerId: string): RecaptchaVerifier {
    return new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved - allow signInWithPhoneNumber
      },
      'expired-callback': () => {
        console.warn('[authService] reCAPTCHA expired. User may need to re-verify.');
      },
    });
  },

  /**
   * Subscribes to Firebase Auth state changes.
   */
  onAuthStateChanged(callback: (user: User | null) => void): Unsubscribe {
    return firebaseOnAuthStateChanged(auth, callback);
  },

  /**
   * Signs in recruiter using email and password and validates recruiter role.
   * Fails closed if the account does not exist or is not authorized as a recruiter.
   */
  async signIn(email: string, password: string): Promise<User> {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      const err = new Error('Please enter a valid email address.');
      (err as { code?: string }).code = 'auth/invalid-email';
      throw err;
    }

    let userCredential;
    try {
      userCredential = await firebaseSignIn(auth, cleanEmail, password);
    } catch (authErr: unknown) {
      const code = (authErr as { code?: string })?.code;
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        const err = new Error('No recruiter account found with this email. Please create an account first.');
        (err as { code?: string }).code = 'auth/user-not-found';
        throw err;
      }
      throw authErr;
    }

    const user = userCredential.user;

    // Verify recruiter authorization in /users/{uid}, /recruiters/{uid}, and /candidates/{uid}
    const [userDocSnap, recDocSnap, candDocSnap] = await Promise.all([
      getDoc(doc(db, COLLECTIONS.USERS, user.uid)).catch(() => null),
      getDoc(doc(db, COLLECTIONS.RECRUITERS, user.uid)).catch(() => null),
      getDoc(doc(db, COLLECTIONS.CANDIDATES, user.uid)).catch(() => null),
    ]);

    if (candDocSnap && candDocSnap.exists()) {
      await firebaseSignOut(auth);
      const err = new Error('This account is registered as a candidate. User is invalid in this application.');
      (err as { code?: string }).code = 'auth/not-authorized-candidate';
      throw err;
    }

    const hasUserDoc = userDocSnap && userDocSnap.exists();
    const hasRecDoc = recDocSnap && recDocSnap.exists();

    if (hasUserDoc) {
      const userData = userDocSnap.data();
      const userType = userData.role || userData.userType;
      if (userType && userType !== 'recruiter' && userType !== 'admin') {
        await firebaseSignOut(auth);
        const err = new Error('This account is not authorized as a recruiter. User is invalid in this application.');
        (err as { code?: string }).code = 'auth/not-authorized-recruiter';
        throw err;
      }
    } else if (!hasRecDoc) {
      // Neither /users/{uid} nor /recruiters/{uid} exists as an active recruiter
      await firebaseSignOut(auth);
      const err = new Error('No recruiter account found with this email. Please create an account first.');
      (err as { code?: string }).code = 'auth/user-not-found';
      throw err;
    }

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('tb_is_new_registration');
      } catch {
        // ignore
      }
    }

    return user;
  },

  /**
   * Checks if an official email already exists in Firestore across users, recruiters, and candidates.
   */
  async checkEmailExists(email: string, excludeUid?: string): Promise<boolean> {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) return false;

    // Authoritative server-side check via Admin SDK (Fail-closed)
    const val = await functionsService.validateRecruiterRegistration({ email: cleanEmail, excludeUid });
    return Boolean(val?.emailExists);
  },

  /**
   * Checks if a phone number already exists in Firestore across active users, recruiters, and candidates.
   * Tests all representation variants (E.164, raw, 10-digit, 0-prefixed, spaced) to ensure legacy records are matched.
   */
  async checkPhoneExists(phoneNumber: string, excludeUid?: string): Promise<boolean> {
    const raw = String(phoneNumber || '').trim();
    if (!raw) return false;

    // Authoritative server-side check via Admin SDK (Fail-closed)
    const val = await functionsService.validateRecruiterRegistration({ phoneNumber: raw, excludeUid });
    return Boolean(val?.phoneExists);
  },

  /**
   * Finds an existing recruiter document in Firestore by phone number across all formatting variants.
   * Validates company existence to pick the active authoritative recruiter profile.
   */
  async findRecruiterByPhone(phoneNumber: string): Promise<{ data: DocumentData; id: string } | null> {
    const raw = String(phoneNumber || '').trim();
    if (!raw) return null;

    const searchVariants = getPhoneSearchVariants(raw);
    if (searchVariants.length === 0) return null;

    try {
      const candidateMap = new Map<string, { data: DocumentData; id: string; hasValidCompany: boolean; timestamp: number }>();

      for (const variant of searchVariants) {
        // 1. Check /recruiters by phoneNumber
        try {
          const qRecPhone = query(
            collection(db, COLLECTIONS.RECRUITERS),
            where('phoneNumber', '==', variant)
          );
          const snapRecPhone = await getDocs(qRecPhone);
          for (const d of snapRecPhone.docs) {
            if (!candidateMap.has(d.id)) {
              const data = d.data();
              const rawCompanyId = data.companyId || data.company_id || data.company || '';
              const companyId = String(rawCompanyId).trim();
              let hasValidCompany = false;
              if (companyId) {
                try {
                  const compSnap = await getDoc(doc(db, COLLECTIONS.COMPANIES, companyId));
                  hasValidCompany = compSnap.exists();
                } catch {
                  hasValidCompany = false;
                }
              }
              const ts = data.updatedAt?.toMillis?.() || data.createdAt?.toMillis?.() || 0;
              candidateMap.set(d.id, { data, id: d.id, hasValidCompany, timestamp: ts });
            }
          }
        } catch {
          // ignore collection query permission restrictions
        }

        // 2. Check /recruiters by phone
        try {
          const qRecP = query(
            collection(db, COLLECTIONS.RECRUITERS),
            where('phone', '==', variant)
          );
          const snapRecP = await getDocs(qRecP);
          for (const d of snapRecP.docs) {
            if (!candidateMap.has(d.id)) {
              const data = d.data();
              const rawCompanyId = data.companyId || data.company_id || data.company || '';
              const companyId = String(rawCompanyId).trim();
              let hasValidCompany = false;
              if (companyId) {
                try {
                  const compSnap = await getDoc(doc(db, COLLECTIONS.COMPANIES, companyId));
                  hasValidCompany = compSnap.exists();
                } catch {
                  hasValidCompany = false;
                }
              }
              const ts = data.updatedAt?.toMillis?.() || data.createdAt?.toMillis?.() || 0;
              candidateMap.set(d.id, { data, id: d.id, hasValidCompany, timestamp: ts });
            }
          }
        } catch {
          // ignore collection query permission restrictions
        }

        // 3. Check /users by phoneNumber with role == 'recruiter'
        try {
          const qUsersPhone = query(
            collection(db, COLLECTIONS.USERS),
            where('phoneNumber', '==', variant)
          );
          const snapUsersPhone = await getDocs(qUsersPhone);
          for (const d of snapUsersPhone.docs) {
            const uData = d.data();
            if (uData.role === 'recruiter' || uData.userType === 'recruiter') {
              if (!candidateMap.has(d.id)) {
                let rData = uData;
                try {
                  const rSnap = await getDoc(doc(db, COLLECTIONS.RECRUITERS, d.id));
                  if (rSnap.exists()) {
                    rData = rSnap.data();
                  }
                } catch {
                  // ignore
                }
                const rawCompanyId = rData.companyId || rData.company_id || uData.companyId || '';
                const companyId = String(rawCompanyId).trim();
                let hasValidCompany = false;
                if (companyId) {
                  try {
                    const compSnap = await getDoc(doc(db, COLLECTIONS.COMPANIES, companyId));
                    hasValidCompany = compSnap.exists();
                  } catch {
                    hasValidCompany = false;
                  }
                }
                const ts = rData.updatedAt?.toMillis?.() || rData.createdAt?.toMillis?.() || 0;
                candidateMap.set(d.id, { data: rData, id: d.id, hasValidCompany, timestamp: ts });
              }
            }
          }
        } catch {
          // ignore collection query permission restrictions
        }

        // 4. Check /users by phone with role == 'recruiter'
        try {
          const qUsersP = query(
            collection(db, COLLECTIONS.USERS),
            where('phone', '==', variant)
          );
          const snapUsersP = await getDocs(qUsersP);
          for (const d of snapUsersP.docs) {
            const uData = d.data();
            if (uData.role === 'recruiter' || uData.userType === 'recruiter') {
              if (!candidateMap.has(d.id)) {
                let rData = uData;
                try {
                  const rSnap = await getDoc(doc(db, COLLECTIONS.RECRUITERS, d.id));
                  if (rSnap.exists()) {
                    rData = rSnap.data();
                  }
                } catch {
                  // ignore
                }
                const rawCompanyId = rData.companyId || rData.company_id || uData.companyId || '';
                const companyId = String(rawCompanyId).trim();
                let hasValidCompany = false;
                if (companyId) {
                  try {
                    const compSnap = await getDoc(doc(db, COLLECTIONS.COMPANIES, companyId));
                    hasValidCompany = compSnap.exists();
                  } catch {
                    hasValidCompany = false;
                  }
                }
                const ts = rData.updatedAt?.toMillis?.() || rData.createdAt?.toMillis?.() || 0;
                candidateMap.set(d.id, { data: rData, id: d.id, hasValidCompany, timestamp: ts });
              }
            }
          }
        } catch {
          // ignore collection query permission restrictions
        }
      }

      if (candidateMap.size === 0) return null;

      const candidates = Array.from(candidateMap.values());
      // Sort: valid company first, then newest timestamp
      candidates.sort((a, b) => {
        if (a.hasValidCompany && !b.hasValidCompany) return -1;
        if (!a.hasValidCompany && b.hasValidCompany) return 1;
        return b.timestamp - a.timestamp;
      });

      const bestMatch = candidates[0];
      return { data: bestMatch.data, id: bestMatch.id };
    } catch (err) {
      console.warn('[authService.findRecruiterByPhone] Error finding recruiter by phone:', err);
      return null;
    }
  },

  /**
   * Recruiter Registration matching Flutter Recruiter App backend schema:
   * 1. Validates strict email and phone format
   * 2. Authoritatively verifies uniqueness via Cloud Function (fails closed)
   * 3. Creates Firebase Auth user
   * 4. Post-auth rollback verification
   * 5. Creates `/users/{uid}`, `/companies/{companyId}`, `/recruiters/{uid}` docs
   */
  async signUpRecruiter(params: SignUpRecruiterParams): Promise<User> {
    const { email, password, displayName, companyName, designation, phoneNumber } = params;
    const cleanEmail = email.trim().toLowerCase();
    const normalizedPhone = phoneNumber && phoneNumber.trim() ? normalizePhoneNumber(phoneNumber) : '';

    // 1. Strict Input Validation before contacting any service
    if (!isValidEmail(cleanEmail)) {
      const err = new Error('Please enter a valid email address.');
      (err as { code?: string }).code = 'auth/invalid-email';
      throw err;
    }

    if (!normalizedPhone || !isValidPhone(normalizedPhone)) {
      const err = new Error('Please enter a valid 10-digit mobile number.');
      (err as { code?: string }).code = 'auth/invalid-phone-number';
      throw err;
    }

    if (!password || password.length < 6) {
      const err = new Error('Your password is too weak. Please use a stronger password (at least 6 characters).');
      (err as { code?: string }).code = 'auth/weak-password';
      throw err;
    }

    // 2. Authoritative Server-Side Uniqueness Check (Fail-Closed)
    // If Cloud Function is unreachable or errors, registration is BLOCKED.
    const val = await functionsService.validateRecruiterRegistration({
      email: cleanEmail,
      phoneNumber: normalizedPhone,
    });

    if (val.emailExists && val.phoneExists) {
      const err = new Error('An account already exists with this email address or phone number. Please sign in instead.');
      (err as { code?: string }).code = 'auth/email-and-phone-already-in-use';
      throw err;
    }

    if (val.emailExists) {
      const err = new Error('An account already exists with this email address. Please sign in instead.');
      (err as { code?: string }).code = 'auth/email-already-in-use';
      throw err;
    }

    if (val.phoneExists) {
      const err = new Error('This phone number is already registered. Please sign in instead.');
      (err as { code?: string }).code = 'auth/phone-number-already-exists';
      throw err;
    }

    // 3. Create Auth User
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    } catch (authErr: unknown) {
      if ((authErr as { code?: string })?.code === 'auth/email-already-in-use') {
        const phoneAlsoExists = normalizedPhone ? await this.checkPhoneExists(normalizedPhone) : false;
        if (phoneAlsoExists) {
          const err = new Error('An account already exists with this email address or phone number. Please sign in instead.');
          (err as { code?: string }).code = 'auth/email-and-phone-already-in-use';
          throw err;
        }
        const err = new Error('An account already exists with this email address. Please sign in instead.');
        (err as { code?: string }).code = 'auth/email-already-in-use';
        throw err;
      }
      throw authErr;
    }

    const user = userCredential.user;
    const uid = user.uid;

    // 4. Post-Auth Verification: Check if phone exists in Firestore under another UID
    if (normalizedPhone) {
      const phoneAlreadyInUse = await this.checkPhoneExists(normalizedPhone, uid);
      if (phoneAlreadyInUse) {
        try {
          await user.delete();
        } catch {
          await firebaseSignOut(auth);
        }
        const err = new Error('This phone number is already registered. Please sign in instead.');
        (err as { code?: string }).code = 'auth/phone-number-already-exists';
        throw err;
      }
    }

    // 5. Verify /recruiters/{uid} does not already exist
    const existingRecDoc = await getDoc(doc(db, COLLECTIONS.RECRUITERS, uid));
    if (existingRecDoc.exists()) {
      await firebaseSignOut(auth);
      const err = new Error('An account already exists with this email address. Please sign in instead.');
      (err as { code?: string }).code = 'auth/email-already-in-use';
      throw err;
    }

    // Update Auth display name
    await updateProfile(user, { displayName: displayName.trim() });

    const companyId = `${Date.now()}`;

    // 6. Write to /users/{uid}
    await setDoc(doc(db, COLLECTIONS.USERS, uid), {
      uid,
      email: cleanEmail,
      phoneNumber: normalizedPhone || null,
      phone: normalizedPhone || null,
      role: 'recruiter',
      userType: 'recruiter',
      isPhoneVerified: Boolean(normalizedPhone),
      isEmailVerified: user.emailVerified,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 7. Write to /companies/{companyId} with verified nested structure
    const initialCompany: Company = {
      id: companyId,
      companyId,
      profile: {
        companyName: companyName.trim(),
        name: companyName.trim(),
        tagline: '',
        about: '',
        description: '',
        logoUrl: '',
        coverImageUrl: '',
        bannerUrl: '',
        industry: '',
        companyType: 'Private',
        companySize: '',
        website: '',
      },
      contact: {
        email: cleanEmail,
        phone: normalizedPhone || '',
        website: '',
        city: '',
        state: '',
        country: 'India',
        locations: [],
      },
      business: {
        industry: '',
        size: '',
        companySize: '',
        type: 'Private',
      },
      verification: {
        isVerified: false,
        status: 'pending',
        documents: [],
      },
      social: {
        linkedin: '',
        twitter: '',
        github: '',
        website: '',
      },
      stats: {
        openJobsCount: 0,
        totalHiresCount: 0,
      },
      settings: {
        notifications: true,
      },
      meta: {
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        isBlocked: false,
      },
      name: companyName.trim(),
      companyName: companyName.trim(),
      industry: '',
      companySize: '',
      isVerified: false,
    };

    await setDoc(doc(db, COLLECTIONS.COMPANIES, companyId), initialCompany);

    // 8. Write to /recruiters/{uid} matching Flutter RecruiterModel
    await setDoc(doc(db, COLLECTIONS.RECRUITERS, uid), {
      uid,
      companyId,
      fullName: displayName.trim(),
      officialEmail: cleanEmail,
      email: cleanEmail,
      phoneNumber: normalizedPhone,
      phone: normalizedPhone,
      designation: designation?.trim() || 'Recruiter Lead',
      emailVerified: false,
      phoneVerified: Boolean(normalizedPhone),
      isSubscribed: false,
      isSubscriptionCancelled: false,
      subscriptionPlanId: null,
      subscriptionExpiry: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('tb_is_new_registration', 'true');
      } catch {
        // ignore
      }
    }

    return user;
  },


  /**
   * Sends Phone OTP for phone verification or login.
   */
  async sendPhoneOtp(
    phoneNumber: string,
    verifier: RecaptchaVerifier
  ): Promise<ConfirmationResult> {
    return signInWithPhoneNumber(auth, phoneNumber, verifier);
  },

  /**
   * Completes Phone OTP Sign-In and validates recruiter role.
   * Resolves existing recruiter records created under any UID (or phone format variant)
   * to guarantee seamless recruiter session initialization without accidental logouts.
   */
  async signInWithPhoneOtp(
    confirmationResult: ConfirmationResult,
    otp: string
  ): Promise<User> {
    console.log('[authService] Confirming Phone OTP with Firebase Auth...');
    const userCredential = await confirmationResult.confirm(otp);
    const user = userCredential.user;
    const phone = user.phoneNumber || '';
    console.log('[authService] Firebase Auth confirmation succeeded. User UID:', user.uid);

    // 1. Authoritative Server-Side Resolution via Cloud Function (Admin SDK)
    // Synchronizes Phone UID to active recruiter account and sets role: 'recruiter'
    try {
      console.log('[authService] Synchronizing recruiter phone auth via Cloud Function...');
      const syncResult = await functionsService.syncRecruiterPhoneAuth({ phoneNumber: phone });
      console.log('[authService] syncRecruiterPhoneAuth result:', syncResult);
    } catch (syncErr) {
      console.warn('[authService] Non-fatal notice from syncRecruiterPhoneAuth:', syncErr);
    }

    // 2. Client-side validation & local sync
    let matchedRec: { data: DocumentData; id: string } | null = null;
    try {
      matchedRec = await this.findRecruiterByPhone(phone);
    } catch (findErr) {
      console.warn('[authService] Error in findRecruiterByPhone during login:', findErr);
    }

    if (matchedRec) {
      // Sync /recruiters/{user.uid} and /users/{user.uid} with authoritative recruiter data
      const rData = matchedRec.data;
      const companyId = String(rData.companyId || rData.company_id || rData.company || '').trim();
      const fullName = String(rData.fullName || rData.displayName || user.displayName || 'Recruiter').trim();
      const officialEmail = String(rData.officialEmail || rData.email || user.email || '').trim();

      const syncedRecruiterData: Record<string, unknown> = {
        uid: user.uid,
        companyId,
        fullName,
        officialEmail,
        email: officialEmail,
        phoneNumber: phone || String(rData.phoneNumber || rData.phone || ''),
        phone: phone || String(rData.phoneNumber || rData.phone || ''),
        designation: String(rData.designation || 'Hiring Lead'),
        emailVerified: Boolean(rData.emailVerified || user.emailVerified),
        phoneVerified: true,
        isSubscribed: Boolean(rData.isSubscribed),
        subscriptionPlanId: rData.subscriptionPlanId ? String(rData.subscriptionPlanId) : null,
        subscriptionTier: rData.subscriptionTier ? String(rData.subscriptionTier) : (rData.subscriptionPlanId ? String(rData.subscriptionPlanId) : null),
        subscriptionExpiry: rData.subscriptionExpiry || null,
        isSubscriptionCancelled: Boolean(rData.isSubscriptionCancelled),
        razorpaySubscriptionId: rData.razorpaySubscriptionId || null,
        appleSubscriptionId: rData.appleSubscriptionId || null,
        createdAt: rData.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, COLLECTIONS.RECRUITERS, user.uid), syncedRecruiterData, { merge: true });
        await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
          uid: user.uid,
          email: officialEmail || null,
          phoneNumber: phone || String(rData.phoneNumber || rData.phone || ''),
          phone: phone || String(rData.phoneNumber || rData.phone || ''),
          role: 'recruiter',
          userType: 'recruiter',
          companyId,
          isPhoneVerified: true,
          isEmailVerified: Boolean(user.emailVerified),
          createdAt: rData.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
        console.log('[authService] Synced existing recruiter data to current UID:', user.uid);
      } catch (localSetErr) {
        console.warn('[authService] Non-fatal notice writing recruiter doc:', localSetErr);
      }
    } else {
      // 3. If no matched recruiter by phone, check direct /recruiters/{user.uid} or /users/{user.uid}
      const [recDocSnap, userDocSnap, candDocSnap] = await Promise.all([
        getDoc(doc(db, COLLECTIONS.RECRUITERS, user.uid)).catch(() => null),
        getDoc(doc(db, COLLECTIONS.USERS, user.uid)).catch(() => null),
        getDoc(doc(db, COLLECTIONS.CANDIDATES, user.uid)).catch(() => null),
      ]);

      if (candDocSnap && candDocSnap.exists()) {
        try {
          await user.delete();
        } catch {
          // ignore
        }
        await firebaseSignOut(auth).catch(() => {});
        const err = new Error('This account is registered as a candidate. User is invalid in this application.');
        (err as { code?: string }).code = 'auth/not-authorized-candidate';
        throw err;
      }

      const hasActiveRecruiter = recDocSnap && recDocSnap.exists();
      const hasRecruiterUser = userDocSnap && userDocSnap.exists() && (userDocSnap.data()?.role === 'recruiter' || userDocSnap.data()?.userType === 'recruiter');

      if (!hasActiveRecruiter && !hasRecruiterUser) {
        // Unregistered phone number on Sign In -> MUST NOT create an account!
        console.warn('[authService] Unregistered phone number attempting Sign In:', phone);
        try {
          await user.delete();
        } catch {
          // ignore
        }
        await firebaseSignOut(auth).catch(() => {});
        const err = new Error('No recruiter account found with this mobile number. Please create an account first.');
        (err as { code?: string }).code = 'auth/recruiter-not-found';
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('tb_is_new_registration');
      } catch {
        // ignore
      }
    }

    return user;
  },

  /**
   * Completes Phone OTP Registration:
   * 1. Confirms OTP
   * 2. Verifies that the phone number / UID does NOT belong to an already registered user
   * 3. If already registered, logs out and throws existing-account error
   * 4. If new, provisions recruiter, company, and user records
   */
  async signUpWithPhoneOtp(params: {
    confirmationResult: ConfirmationResult;
    otp: string;
    displayName: string;
    companyName: string;
    email: string;
    phoneNumber: string;
    designation?: string;
  }): Promise<User> {
    const { confirmationResult, otp, displayName, companyName, email, phoneNumber, designation } = params;
    const cleanEmail = email.trim().toLowerCase();
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // 1. Confirm OTP
    const userCredential = await confirmationResult.confirm(otp);
    const user = userCredential.user;
    const uid = user.uid;

    // 2. Check if this UID already exists in Firestore (/users or /recruiters)
    const userDocRef = doc(db, COLLECTIONS.USERS, uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      await firebaseSignOut(auth);
      const err = new Error('This phone number is already registered. Please sign in instead.');
      (err as { code?: string }).code = 'auth/phone-number-already-exists';
      throw err;
    }

    const recDocRef = doc(db, COLLECTIONS.RECRUITERS, uid);
    const recDocSnap = await getDoc(recDocRef);
    if (recDocSnap.exists()) {
      await firebaseSignOut(auth);
      const err = new Error('This phone number is already registered. Please sign in instead.');
      (err as { code?: string }).code = 'auth/phone-number-already-exists';
      throw err;
    }

    // 3. Check if phone number already belongs to another account in Firestore
    if (normalizedPhone) {
      const phoneExists = await this.checkPhoneExists(normalizedPhone, uid);
      if (phoneExists) {
        await firebaseSignOut(auth);
        const err = new Error('This phone number is already registered. Please sign in instead.');
        (err as { code?: string }).code = 'auth/phone-number-already-exists';
        throw err;
      }
    }

    // 4. Check if email already belongs to another account in Firestore
    if (cleanEmail) {
      const emailExists = await this.checkEmailExists(cleanEmail, uid);
      if (emailExists) {
        await firebaseSignOut(auth);
        const err = new Error('An account with this email address already exists. Please sign in instead.');
        (err as { code?: string }).code = 'auth/email-already-in-use';
        throw err;
      }
    }

    // 5. Update display name
    await updateProfile(user, { displayName: displayName.trim() });

    const companyId = `${Date.now()}`;

    // 6. Create /users/{uid}
    await setDoc(doc(db, COLLECTIONS.USERS, uid), {
      uid,
      email: cleanEmail || user.email?.toLowerCase() || null,
      phoneNumber: normalizedPhone || user.phoneNumber || null,
      phone: normalizedPhone || user.phoneNumber || null,
      role: 'recruiter',
      userType: 'recruiter',
      isPhoneVerified: true,
      isEmailVerified: Boolean(user.emailVerified),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 7. Create /companies/{companyId}
    const initialCompany: Company = {
      id: companyId,
      companyId,
      profile: {
        companyName: companyName.trim(),
        name: companyName.trim(),
        tagline: '',
        about: '',
        description: '',
        logoUrl: '',
        coverImageUrl: '',
        bannerUrl: '',
        industry: '',
        companyType: 'Private',
        companySize: '',
        website: '',
      },
      contact: {
        email: cleanEmail,
        phone: normalizedPhone,
        website: '',
        city: '',
        state: '',
        country: 'India',
        locations: [],
      },
      business: {
        industry: '',
        size: '',
        companySize: '',
        type: 'Private',
      },
      verification: {
        isVerified: false,
        status: 'pending',
        documents: [],
      },
      social: {
        linkedin: '',
        twitter: '',
        github: '',
        website: '',
      },
      stats: {
        openJobsCount: 0,
        totalHiresCount: 0,
      },
      settings: {
        notifications: true,
      },
      meta: {
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        isBlocked: false,
      },
      name: companyName.trim(),
      companyName: companyName.trim(),
      industry: '',
      companySize: '',
      isVerified: false,
    };

    await setDoc(doc(db, COLLECTIONS.COMPANIES, companyId), initialCompany);

    // 8. Create /recruiters/{uid}
    await setDoc(doc(db, COLLECTIONS.RECRUITERS, uid), {
      uid,
      companyId,
      fullName: displayName.trim(),
      officialEmail: cleanEmail,
      email: cleanEmail,
      phoneNumber: normalizedPhone,
      phone: normalizedPhone,
      designation: designation?.trim() || 'Recruiter Lead',
      emailVerified: false,
      phoneVerified: true,
      isSubscribed: false,
      isSubscriptionCancelled: false,
      subscriptionPlanId: null,
      subscriptionExpiry: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('tb_is_new_registration', 'true');
      } catch {
        // ignore
      }
    }

    return user;
  },

  /**
   * Sends password reset email.
   */
  async sendPasswordReset(email: string): Promise<void> {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      const err = new Error('Please enter a valid email address.');
      (err as { code?: string }).code = 'auth/invalid-email';
      throw err;
    }
    await firebaseSendPasswordReset(auth, cleanEmail);
  },

  /**
   * Retrieves recruiter profile document from /recruiters/{uid}.
   * Falls back to /users/{uid} and phone search lookup if direct UID document is not found or has stale company.
   */
  async getRecruiterProfile(uid: string): Promise<Recruiter | null> {
    try {
      const docRef = doc(db, COLLECTIONS.RECRUITERS, uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const fullName = String(data.fullName || data.displayName || 'Recruiter');
        const email = String(data.officialEmail || data.email || '');
        let rawCompanyId = data.companyId || data.company_id || data.company || '';
        let companyId = String(rawCompanyId).trim();
        const phone = String(data.phoneNumber || data.phone || '');

        // Check if company exists; if stale or deleted, try self-healing from phone search
        if (companyId) {
          try {
            const compSnap = await getDoc(doc(db, COLLECTIONS.COMPANIES, companyId));
            if (!compSnap.exists() && phone) {
              const matched = await this.findRecruiterByPhone(phone);
              if (matched && matched.id !== uid) {
                const rData = matched.data;
                const newCompId = String(rData.companyId || rData.company_id || '').trim();
                if (newCompId) {
                  companyId = newCompId;
                  await setDoc(docRef, { companyId: newCompId, updatedAt: serverTimestamp() }, { merge: true });
                }
              }
            }
          } catch {
            // ignore
          }
        } else if (phone) {
          try {
            const matched = await this.findRecruiterByPhone(phone);
            if (matched && matched.id !== uid) {
              const rData = matched.data;
              const newCompId = String(rData.companyId || rData.company_id || '').trim();
              if (newCompId) {
                companyId = newCompId;
                await setDoc(docRef, { companyId: newCompId, updatedAt: serverTimestamp() }, { merge: true });
              }
            }
          } catch {
            // ignore
          }
        }

        return {
          uid,
          companyId,
          fullName,
          designation: String(data.designation || 'Hiring Lead'),
          officialEmail: email,
          phoneNumber: phone,
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
          // Compatibility aliases
          id: uid,
          email,
          name: fullName,
          phone,
        };
      }

      // Fallback 1: Check /users/{uid} document strictly for recruiter role
      const userDocRef = doc(db, COLLECTIONS.USERS, uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const uData = userDocSnap.data();
        const role = uData.role || uData.userType;
        if (role === 'recruiter') {
          const rawCompanyId = uData.companyId || uData.company_id || '';
          const companyId = String(rawCompanyId).trim();
          const fullName = String(uData.fullName || uData.displayName || '');
          const email = String(uData.officialEmail || uData.email || '');
          const phone = String(uData.phoneNumber || uData.phone || '');

          return {
            uid,
            companyId,
            fullName: fullName || 'Recruiter',
            designation: String(uData.designation || 'Hiring Lead'),
            officialEmail: email,
            phoneNumber: phone,
            emailVerified: Boolean(uData.isEmailVerified),
            phoneVerified: Boolean(uData.isPhoneVerified),
            isSubscribed: false,
            subscriptionPlanId: null,
            subscriptionExpiry: null,
            isSubscriptionCancelled: false,
            createdAt: uData.createdAt,
            // Compatibility aliases
            id: uid,
            email,
            name: fullName || 'Recruiter',
            phone,
          };
        }
      }

      return null;
    } catch (error) {
      console.warn('[authService.getRecruiterProfile] Error fetching recruiter profile:', error);
      return null;
    }
  },

  /**
   * Updates recruiter profile in /recruiters/{uid}.
   */
  async updateRecruiterProfile(
    uid: string,
    updates: Partial<Recruiter>
  ): Promise<void> {
    const docRef = doc(db, COLLECTIONS.RECRUITERS, uid);
    const payload: Record<string, unknown> = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    if (updates.fullName) {
      payload.fullName = updates.fullName;
    }
    if (updates.email) {
      payload.officialEmail = updates.email;
    }
    await updateDoc(docRef, payload as unknown as UpdateData<Record<string, unknown>>);
  },

  /**
   * Uploads recruiter profile photo to verified storage path: recruiters/{recruiterId}/profile.jpg
   */
  async uploadProfilePhoto(recruiterId: string, file: File): Promise<string> {
    const storagePath = STORAGE_PATHS.recruiterAvatar(recruiterId);
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file, { contentType: file.type });
    const downloadUrl = await getDownloadURL(storageRef);

    await updateDoc(doc(db, COLLECTIONS.RECRUITERS, recruiterId), {
      avatarUrl: downloadUrl,
      updatedAt: serverTimestamp(),
    });

    return downloadUrl;
  },

  /**
   * Deletes recruiter account authoritatively via verified deleteUserAccount Cloud Function (Admin SDK).
   * Ensures fail-closed error handling and complete client session/cache purging.
   */
  async deleteAccount(): Promise<void> {
    console.log('[authService] Requesting authoritative backend account deletion...');
    const res = await functionsService.deleteUserAccount();
    if (!res || !res.success) {
      throw new Error(res?.message || 'Failed to delete account on server.');
    }
    console.log('[authService] Backend account deletion confirmed by Cloud Function.');

    // Clear all storage and auth cache
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('firebase:') || key.startsWith('tb_') || key.includes('auth'))) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        // ignore
      }
    }

    await firebaseSignOut(auth).catch(() => {});
  },

  /**
   * Signs out the current user.
   */
  async signOut(): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('tb_is_new_registration');
      } catch {
        // ignore
      }
    }
    await firebaseSignOut(auth);
  },

  /**
   * Gets currently authenticated Firebase user.
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  },
};
