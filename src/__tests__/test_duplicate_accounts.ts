import { normalizePhoneNumber, getPhoneSearchVariants } from '../utils/phone';
import { isValidEmail, isValidPhone } from '../utils/validators';
import { formatAuthErrorMessage } from '../utils/errors';

console.log('================================================================');
console.log('TALENTBAY RECRUITER: STRICT REGISTRATION VALIDATION & AUDIT SUITE');
console.log('================================================================\n');

let allPassed = true;

// Mock database simulating Firestore
interface MockUserDoc {
  uid: string;
  email: string;
  phoneNumber: string | null;
  phone: string | null;
  role: string;
}

interface MockRecruiterDoc {
  uid: string;
  officialEmail: string;
  email: string;
  phoneNumber: string;
  phone: string;
  companyId: string;
}

interface MockCompanyDoc {
  id: string;
  name: string;
}

interface MockAuthUser {
  uid: string;
  email: string;
  phoneNumber?: string;
  displayName: string;
  password?: string;
}

class MockBackend {
  authUsers: Map<string, MockAuthUser> = new Map();
  usersCollection: Map<string, MockUserDoc> = new Map();
  recruitersCollection: Map<string, MockRecruiterDoc> = new Map();
  companiesCollection: Map<string, MockCompanyDoc> = new Map();
  currentBrowserAuthUser: MockAuthUser | null = null;
  cloudFunctionHealthy = true;

  reset() {
    this.authUsers.clear();
    this.usersCollection.clear();
    this.recruitersCollection.clear();
    this.companiesCollection.clear();
    this.currentBrowserAuthUser = null;
    this.cloudFunctionHealthy = true;
  }

  // Pre-seed an existing account
  seedAccount(uid: string, email: string, phone: string, displayName = 'Existing Recruiter', password = 'Password123') {
    const authUser: MockAuthUser = { uid, email: email.toLowerCase(), displayName, phoneNumber: phone, password };
    this.authUsers.set(uid, authUser);

    this.usersCollection.set(uid, {
      uid,
      email: email.toLowerCase(),
      phoneNumber: phone,
      phone,
      role: 'recruiter',
    });

    this.recruitersCollection.set(uid, {
      uid,
      officialEmail: email.toLowerCase(),
      email: email.toLowerCase(),
      phoneNumber: phone,
      phone,
      companyId: `company_${uid}`,
    });

    this.companiesCollection.set(`company_${uid}`, {
      id: `company_${uid}`,
      name: `${displayName} Company`,
    });
  }

  // Simulates authoritative Cloud Function validateRecruiterRegistration
  async mockValidateRecruiterRegistration(params: {
    email?: string;
    phoneNumber?: string;
    excludeUid?: string;
  }): Promise<{ phoneExists: boolean; emailExists: boolean; valid: boolean; message?: string }> {
    if (!this.cloudFunctionHealthy) {
      throw new Error('Verification service is currently unavailable. Please try again.');
    }

    let emailExists = false;
    let phoneExists = false;

    if (params.email) {
      const clean = params.email.trim().toLowerCase();
      for (const [id, u] of this.usersCollection.entries()) {
        if ((!params.excludeUid || id !== params.excludeUid) && u.email.toLowerCase() === clean) emailExists = true;
      }
      for (const [id, r] of this.recruitersCollection.entries()) {
        if ((!params.excludeUid || id !== params.excludeUid) && (r.officialEmail.toLowerCase() === clean || r.email.toLowerCase() === clean)) emailExists = true;
      }
      for (const [id, a] of this.authUsers.entries()) {
        if ((!params.excludeUid || id !== params.excludeUid) && a.email.toLowerCase() === clean) emailExists = true;
      }
    }

    if (params.phoneNumber) {
      const searchVariants = getPhoneSearchVariants(params.phoneNumber);
      for (const variant of searchVariants) {
        for (const [id, u] of this.usersCollection.entries()) {
          if ((!params.excludeUid || id !== params.excludeUid) && (u.phoneNumber === variant || u.phone === variant)) phoneExists = true;
        }
        for (const [id, r] of this.recruitersCollection.entries()) {
          if ((!params.excludeUid || id !== params.excludeUid) && (r.phoneNumber === variant || r.phone === variant)) phoneExists = true;
        }
        for (const [id, a] of this.authUsers.entries()) {
          if ((!params.excludeUid || id !== params.excludeUid) && a.phoneNumber === variant) phoneExists = true;
        }
      }
    }

    let message = '';
    if (phoneExists && emailExists) {
      message = 'An account already exists with this email address or phone number. Please sign in instead.';
    } else if (phoneExists) {
      message = 'This phone number is already registered. Please sign in instead.';
    } else if (emailExists) {
      message = 'An account already exists with this email address. Please sign in instead.';
    }

    return {
      phoneExists,
      emailExists,
      valid: !phoneExists && !emailExists,
      message,
    };
  }

  // Simulates registration flow exactly as implemented in authService.signUpRecruiter
  async registerRecruiter(params: {
    email: string;
    phone: string;
    password?: string;
    displayName: string;
    companyName: string;
    currentRoute: string;
  }): Promise<{
    success: boolean;
    error?: string;
    createdAuthUid?: string;
    navigatedRoute: string;
    stayedOnRegister: boolean;
  }> {
    const cleanEmail = params.email.trim().toLowerCase();
    const normalizedPhone = params.phone.trim() ? normalizePhoneNumber(params.phone.trim()) : '';

    // Step 1: Strict Input Validation (Client & Auth Layer)
    if (!isValidEmail(cleanEmail)) {
      const err = new Error('Please enter a valid email address.');
      (err as { code?: string }).code = 'auth/invalid-email';
      return {
        success: false,
        error: formatAuthErrorMessage(err),
        navigatedRoute: params.currentRoute,
        stayedOnRegister: params.currentRoute === '/register',
      };
    }

    if (!normalizedPhone || !isValidPhone(normalizedPhone)) {
      const err = new Error('Please enter a valid 10-digit mobile number.');
      (err as { code?: string }).code = 'auth/invalid-phone-number';
      return {
        success: false,
        error: formatAuthErrorMessage(err),
        navigatedRoute: params.currentRoute,
        stayedOnRegister: params.currentRoute === '/register',
      };
    }

    // Step 2: Authoritative Server-Side Uniqueness Check (Fail-Closed)
    let val;
    try {
      val = await this.mockValidateRecruiterRegistration({
        email: cleanEmail,
        phoneNumber: normalizedPhone,
      });
    } catch (cfErr) {
      // Fail closed
      return {
        success: false,
        error: cfErr instanceof Error ? cfErr.message : 'Validation failed',
        navigatedRoute: params.currentRoute,
        stayedOnRegister: params.currentRoute === '/register',
      };
    }

    if (val.emailExists && val.phoneExists) {
      const err = new Error('An account already exists with this email address or phone number. Please sign in instead.');
      (err as { code?: string }).code = 'auth/email-and-phone-already-in-use';
      return {
        success: false,
        error: formatAuthErrorMessage(err),
        navigatedRoute: params.currentRoute,
        stayedOnRegister: params.currentRoute === '/register',
      };
    }

    if (val.emailExists) {
      const err = new Error('An account already exists with this email address. Please sign in instead.');
      (err as { code?: string }).code = 'auth/email-already-in-use';
      return {
        success: false,
        error: formatAuthErrorMessage(err),
        navigatedRoute: params.currentRoute,
        stayedOnRegister: params.currentRoute === '/register',
      };
    }

    if (val.phoneExists) {
      const err = new Error('This phone number is already registered. Please sign in instead.');
      (err as { code?: string }).code = 'auth/phone-number-already-exists';
      return {
        success: false,
        error: formatAuthErrorMessage(err),
        navigatedRoute: params.currentRoute,
        stayedOnRegister: params.currentRoute === '/register',
      };
    }

    // Step 3: Create Firebase Auth user
    const newUid = `auth_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newAuthUser: MockAuthUser = {
      uid: newUid,
      email: cleanEmail,
      phoneNumber: normalizedPhone,
      displayName: params.displayName,
      password: params.password || 'password123',
    };
    this.authUsers.set(newUid, newAuthUser);

    // Step 4: Write documents
    this.usersCollection.set(newUid, {
      uid: newUid,
      email: cleanEmail,
      phoneNumber: normalizedPhone || null,
      phone: normalizedPhone || null,
      role: 'recruiter',
    });

    const companyId = `company_${newUid}`;
    this.companiesCollection.set(companyId, {
      id: companyId,
      name: params.companyName,
    });

    this.recruitersCollection.set(newUid, {
      uid: newUid,
      officialEmail: cleanEmail,
      email: cleanEmail,
      phoneNumber: normalizedPhone,
      phone: normalizedPhone,
      companyId,
    });

    this.currentBrowserAuthUser = newAuthUser;

    return {
      success: true,
      createdAuthUid: newUid,
      navigatedRoute: '/dashboard',
      stayedOnRegister: false,
    };
  }

  // Deletes account completely (purges auth and firestore)
  deleteAccount(uid: string) {
    const user = this.authUsers.get(uid);
    const phone = user?.phoneNumber;
    this.authUsers.delete(uid);
    this.usersCollection.delete(uid);
    this.recruitersCollection.delete(uid);
    this.companiesCollection.delete(`company_${uid}`);

    if (phone) {
      const variants = getPhoneSearchVariants(phone);
      for (const v of variants) {
        for (const [id, r] of this.recruitersCollection.entries()) {
          if (r.phoneNumber === v || r.phone === v) this.recruitersCollection.delete(id);
        }
        for (const [id, u] of this.usersCollection.entries()) {
          if (u.phoneNumber === v || u.phone === v) this.usersCollection.delete(id);
        }
      }
    }

    if (this.currentBrowserAuthUser?.uid === uid) {
      this.currentBrowserAuthUser = null;
    }
  }

  // Email/Password Login
  loginWithEmail(email: string, pass: string): { success: boolean; user?: MockAuthUser; error?: string } {
    const clean = email.trim().toLowerCase();
    for (const [, authUser] of this.authUsers.entries()) {
      if (authUser.email.toLowerCase() === clean) {
        if (authUser.password === pass) {
          const userDoc = this.usersCollection.get(authUser.uid);
          if (!userDoc || (userDoc.role !== 'recruiter' && userDoc.role !== 'admin')) {
            return { success: false, error: 'This account is not authorized as a recruiter. User is invalid in this application.' };
          }
          this.currentBrowserAuthUser = authUser;
          return { success: true, user: authUser };
        }
        return { success: false, error: 'Invalid credentials. Please verify your login details and try again.' };
      }
    }
    return { success: false, error: 'Invalid credentials. Please verify your login details and try again.' };
  }

  // Phone OTP Login
  loginWithPhoneOtp(phoneNumber: string): { success: boolean; user?: MockAuthUser; error?: string } {
    const normalized = normalizePhoneNumber(phoneNumber);
    const searchVariants = getPhoneSearchVariants(phoneNumber);

    // Find active recruiter record matching phone
    let activeRecruiter: MockRecruiterDoc | null = null;
    for (const v of searchVariants) {
      for (const [, r] of this.recruitersCollection.entries()) {
        if (r.phoneNumber === v || r.phone === v) {
          activeRecruiter = r;
          break;
        }
      }
      if (activeRecruiter) break;
    }

    if (!activeRecruiter) {
      return { success: false, error: 'No active recruiter account found for this phone number.' };
    }

    const authUser: MockAuthUser = {
      uid: `phone_auth_${Date.now()}`,
      email: activeRecruiter.officialEmail,
      phoneNumber: normalized,
      displayName: 'Phone Recruiter',
    };
    this.currentBrowserAuthUser = authUser;
    return { success: true, user: authUser };
  }
}

async function runAllTests() {
  const backend = new MockBackend();

  // ==========================================
  // CASE A: Clearly invalid email + new phone -> Blocked, 0 Auth, 0 Docs
  // ==========================================
  console.log('CASE A: Clearly invalid email + new phone');
  backend.reset();
  const invalidEmails = ['abc', 'abc@', 'abc@domain', '@gmail.com', 'user@.com', 'user@domain.'];
  let caseAPassed = true;

  for (const invEmail of invalidEmails) {
    const resA = await backend.registerRecruiter({
      email: invEmail,
      phone: '9876543210',
      displayName: 'Invalid Email User',
      companyName: 'Acme',
      currentRoute: '/register',
    });

    const isBlocked =
      resA.success === false &&
      resA.stayedOnRegister === true &&
      resA.error === 'Please enter a valid email address.' &&
      backend.authUsers.size === 0 &&
      backend.usersCollection.size === 0 &&
      backend.recruitersCollection.size === 0;

    console.log(`  * Input email "${invEmail}" -> Blocked: ${isBlocked} (Error: "${resA.error}")`);
    if (!isBlocked) caseAPassed = false;
  }

  console.log(`[CASE A RESULT]: ${caseAPassed ? 'PASS' : 'FAIL'}\n`);
  if (!caseAPassed) allPassed = false;

  // ==========================================
  // CASE B: Valid new email + existing active phone -> Blocked, 0 new Auth, 0 new Docs
  // ==========================================
  console.log('CASE B: Valid new email + existing active phone');
  backend.reset();
  backend.seedAccount('uid_active_1', 'existing_recruiter@company.com', '+919876543210');
  const initAuthB = backend.authUsers.size;
  const initUsersB = backend.usersCollection.size;

  const resB = await backend.registerRecruiter({
    email: 'new_unique_person@company.com',
    phone: '+919876543210',
    displayName: 'New Person',
    companyName: 'Company 2',
    currentRoute: '/register',
  });

  const caseBPass =
    resB.success === false &&
    resB.stayedOnRegister === true &&
    resB.error === 'This phone number is already registered. Please sign in instead.' &&
    backend.authUsers.size === initAuthB &&
    backend.usersCollection.size === initUsersB;

  console.log(`- Blocked: ${!resB.success}`);
  console.log(`- Error message: "${resB.error}"`);
  console.log(`- Zero new auth users: ${backend.authUsers.size === initAuthB}`);
  console.log(`- Zero new Firestore docs: ${backend.usersCollection.size === initUsersB}`);
  console.log(`[CASE B RESULT]: ${caseBPass ? 'PASS' : 'FAIL'}\n`);
  if (!caseBPass) allPassed = false;

  // ==========================================
  // CASE C: Valid new email + existing active phone in another formatting -> Blocked
  // ==========================================
  console.log('CASE C: Valid new email + existing active phone in another formatting');
  backend.reset();
  backend.seedAccount('uid_stored_c', 'stored_recruiter@company.com', '+919876543210');
  const formats = ['9876543210', '09876543210', '919876543210', '+91 9876543210', '+91 98765 43210', '+91-9876543210'];
  let caseCPass = true;

  for (const fmt of formats) {
    const resC = await backend.registerRecruiter({
      email: `diff_fmt_${Math.random().toString(36).substring(7)}@company.com`,
      phone: fmt,
      displayName: 'Fmt Test',
      companyName: 'Fmt Co',
      currentRoute: '/register',
    });
    const blocked = resC.success === false && resC.error === 'This phone number is already registered. Please sign in instead.';
    console.log(`  * Format "${fmt}" -> Blocked: ${blocked}`);
    if (!blocked) caseCPass = false;
  }

  console.log(`[CASE C RESULT]: ${caseCPass ? 'PASS' : 'FAIL'}\n`);
  if (!caseCPass) allPassed = false;

  // ==========================================
  // CASE D: Existing email + new phone -> Blocked with existing-email message
  // ==========================================
  console.log('CASE D: Existing email + new phone');
  backend.reset();
  backend.seedAccount('uid_d', 'existing_email@acme.com', '+919999988888');

  const resD = await backend.registerRecruiter({
    email: 'existing_email@acme.com',
    phone: '9876543210',
    displayName: 'Duplicate Email Test',
    companyName: 'Acme',
    currentRoute: '/register',
  });

  const caseDPass =
    resD.success === false &&
    resD.stayedOnRegister === true &&
    resD.error === 'An account already exists with this email address. Please sign in instead.';

  console.log(`- Blocked: ${!resD.success}`);
  console.log(`- Error message: "${resD.error}"`);
  console.log(`[CASE D RESULT]: ${caseDPass ? 'PASS' : 'FAIL'}\n`);
  if (!caseDPass) allPassed = false;

  // ==========================================
  // CASE E: Valid new email + valid new phone -> Registration succeeds
  // ==========================================
  console.log('CASE E: Valid new email + valid new phone -> Registration succeeds');
  backend.reset();
  const resE = await backend.registerRecruiter({
    email: 'sarah.fresh@moderntech.io',
    phone: '9876543210',
    displayName: 'Sarah Fresh',
    companyName: 'Modern Tech Labs',
    currentRoute: '/register',
  });

  const caseEPass =
    resE.success === true &&
    resE.navigatedRoute === '/dashboard' &&
    backend.authUsers.size === 1 &&
    backend.usersCollection.size === 1 &&
    backend.recruitersCollection.size === 1;

  console.log(`- Registration success: ${resE.success}`);
  console.log(`- Navigated to Dashboard: ${resE.navigatedRoute === '/dashboard'}`);
  console.log(`- Auth & Docs created: Auth=${backend.authUsers.size}, Users=${backend.usersCollection.size}, Recruiters=${backend.recruitersCollection.size}`);
  console.log(`[CASE E RESULT]: ${caseEPass ? 'PASS' : 'FAIL'}\n`);
  if (!caseEPass) allPassed = false;

  // ==========================================
  // CASE F: Delete account completely -> Same email + phone can register again
  // ==========================================
  console.log('CASE F: Delete account completely -> Same email + phone can register again');
  backend.reset();
  backend.seedAccount('uid_f', 'john.doe@company.com', '+919876543210');
  console.log('- Account created. Deleting account completely...');
  backend.deleteAccount('uid_f');
  console.log(`- After deletion: Auth users=${backend.authUsers.size}, Users=${backend.usersCollection.size}`);

  const resF = await backend.registerRecruiter({
    email: 'john.doe@company.com',
    phone: '9876543210',
    displayName: 'John Doe Re-register',
    companyName: 'Fresh Co',
    currentRoute: '/register',
  });

  const caseFPass = resF.success === true && resF.navigatedRoute === '/dashboard';
  console.log(`- Re-registration success: ${resF.success}`);
  console.log(`[CASE F RESULT]: ${caseFPass ? 'PASS' : 'FAIL'}\n`);
  if (!caseFPass) allPassed = false;

  // ==========================================
  // CASE G: Delete → re-register -> email/pass login & phone OTP login work
  // ==========================================
  console.log('CASE G: Delete -> re-register -> email/pass & phone OTP login work');
  backend.reset();
  backend.seedAccount('uid_g_orig', 'alex@tech.co', '+919876543210', 'Alex Tech', 'MyPassword123');
  console.log('1. Account created. Deleting account...');
  backend.deleteAccount('uid_g_orig');

  console.log('2. Re-registering with SAME email and SAME phone...');
  const resG_reg = await backend.registerRecruiter({
    email: 'alex@tech.co',
    phone: '9876543210',
    password: 'MyPassword123',
    displayName: 'Alex Re-registered',
    companyName: 'Tech Co 2.0',
    currentRoute: '/register',
  });

  const emailLogin = backend.loginWithEmail('alex@tech.co', 'MyPassword123');
  const phoneOtpLogin = backend.loginWithPhoneOtp('9876543210');

  const caseGPass = resG_reg.success && emailLogin.success && phoneOtpLogin.success && phoneOtpLogin.user?.email === 'alex@tech.co';
  console.log(`- Re-registration success: ${resG_reg.success}`);
  console.log(`- Email/Password login success: ${emailLogin.success}`);
  console.log(`- Phone OTP login success: ${phoneOtpLogin.success}`);
  console.log(`[CASE G RESULT]: ${caseGPass ? 'PASS' : 'FAIL'}\n`);
  if (!caseGPass) allPassed = false;

  // ==========================================
  // CASE H: Validation Cloud Function unavailable/fails -> Fail Closed
  // ==========================================
  console.log('CASE H: Validation Cloud Function unavailable/fails -> Fail Closed');
  backend.reset();
  backend.cloudFunctionHealthy = false; // Simulate CF downtime or 500 error

  const resH = await backend.registerRecruiter({
    email: 'valid.user@company.com',
    phone: '9876543210',
    displayName: 'User During Downtime',
    companyName: 'Company',
    currentRoute: '/register',
  });

  const caseHPass =
    resH.success === false &&
    resH.stayedOnRegister === true &&
    backend.authUsers.size === 0 &&
    backend.usersCollection.size === 0 &&
    backend.recruitersCollection.size === 0;

  console.log(`- Registration blocked (Fail Closed): ${!resH.success}`);
  console.log(`- Error returned: "${resH.error}"`);
  console.log(`- Zero Firebase Auth users created: ${backend.authUsers.size === 0}`);
  console.log(`- Zero Firestore docs created: ${backend.usersCollection.size === 0}`);
  console.log(`[CASE H RESULT]: ${caseHPass ? 'PASS' : 'FAIL'}\n`);
  if (!caseHPass) allPassed = false;

  console.log('================================================================');
  if (allPassed) {
    console.log('>>> ALL 8 TEST CASES (A through H) PASSED (100%) <<<');
  } else {
    console.error('>>> AT LEAST ONE TEST FAILED <<<');
    process.exit(1);
  }
  console.log('================================================================\n');
}

runAllTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
