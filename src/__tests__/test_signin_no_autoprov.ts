import { normalizePhoneNumber, getPhoneSearchVariants } from '../utils/phone';
import { isValidEmail, isValidPhone } from '../utils/validators';

console.log('================================================================');
console.log('TALENTBAY RECRUITER: SIGN-IN NO AUTO-PROVISIONING TEST SUITE (1-7)');
console.log('================================================================\n');

let allPassed = true;

interface MockUserDoc {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  phone: string | null;
  role: string;
  userType: string;
  companyId?: string;
}

interface MockRecruiterDoc {
  uid: string;
  officialEmail: string;
  email: string;
  phoneNumber: string;
  phone: string;
  companyId: string;
  fullName: string;
  designation: string;
}

interface MockCompanyDoc {
  id: string;
  name: string;
  createdBy: string;
}

interface MockAuthUser {
  uid: string;
  email?: string;
  phoneNumber?: string;
  displayName: string;
  password?: string;
}

class MockSignInSecurityBackend {
  authUsers: Map<string, MockAuthUser> = new Map();
  usersCollection: Map<string, MockUserDoc> = new Map();
  recruitersCollection: Map<string, MockRecruiterDoc> = new Map();
  companiesCollection: Map<string, MockCompanyDoc> = new Map();

  reset() {
    this.authUsers.clear();
    this.usersCollection.clear();
    this.recruitersCollection.clear();
    this.companiesCollection.clear();
  }

  // Pre-seed an active recruiter
  seedRecruiter(params: {
    uid: string;
    email: string;
    phone: string;
    displayName: string;
    companyName: string;
    password?: string;
  }) {
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanPhone = normalizePhoneNumber(params.phone);
    const companyId = `comp_${params.uid}`;

    this.authUsers.set(params.uid, {
      uid: params.uid,
      email: cleanEmail,
      phoneNumber: cleanPhone,
      displayName: params.displayName,
      password: params.password || 'ValidPassword123',
    });

    this.usersCollection.set(params.uid, {
      uid: params.uid,
      email: cleanEmail,
      phoneNumber: cleanPhone,
      phone: cleanPhone,
      role: 'recruiter',
      userType: 'recruiter',
      companyId,
    });

    this.recruitersCollection.set(params.uid, {
      uid: params.uid,
      officialEmail: cleanEmail,
      email: cleanEmail,
      phoneNumber: cleanPhone,
      phone: cleanPhone,
      companyId,
      fullName: params.displayName,
      designation: 'Senior Hiring Lead',
    });

    this.companiesCollection.set(companyId, {
      id: companyId,
      name: params.companyName,
      createdBy: params.uid,
    });
  }

  // Authoritative Sign Up Flow
  signUp(params: {
    email: string;
    phone: string;
    displayName: string;
    companyName: string;
    password?: string;
  }): { uid: string } {
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanPhone = normalizePhoneNumber(params.phone);

    if (!isValidEmail(cleanEmail)) throw new Error('Please enter a valid email address.');
    if (!isValidPhone(cleanPhone)) throw new Error('Please enter a valid 10-digit mobile number.');

    // Uniqueness check
    for (const u of this.authUsers.values()) {
      if (u.email === cleanEmail) throw new Error('An account already exists with this email address. Please sign in instead.');
      if (u.phoneNumber === cleanPhone) throw new Error('This phone number is already registered. Please sign in instead.');
    }

    const uid = `uid_reg_${Date.now()}`;
    const companyId = `comp_${Date.now()}`;

    this.authUsers.set(uid, {
      uid,
      email: cleanEmail,
      phoneNumber: cleanPhone,
      displayName: params.displayName,
      password: params.password || 'Secret123',
    });

    this.usersCollection.set(uid, {
      uid,
      email: cleanEmail,
      phoneNumber: cleanPhone,
      phone: cleanPhone,
      role: 'recruiter',
      userType: 'recruiter',
      companyId,
    });

    this.companiesCollection.set(companyId, {
      id: companyId,
      name: params.companyName,
      createdBy: uid,
    });

    this.recruitersCollection.set(uid, {
      uid,
      officialEmail: cleanEmail,
      email: cleanEmail,
      phoneNumber: cleanPhone,
      phone: cleanPhone,
      companyId,
      fullName: params.displayName,
      designation: 'Recruiter Lead',
    });

    return { uid };
  }

  // Authoritative Phone OTP Sign In Flow (Fixed to strictly forbid auto-provisioning)
  signInPhoneOtp(phone: string, mockOtp: string): { user: MockAuthUser } {
    if (mockOtp !== '123456') {
      throw new Error('The OTP is incorrect. Please check the code and try again.');
    }

    const cleanPhone = normalizePhoneNumber(phone);
    const variants = getPhoneSearchVariants(cleanPhone);

    // 1. Check if an active recruiter exists in Firestore matching this phone
    let existingRecruiter: MockRecruiterDoc | null = null;
    let existingRecruiterUid: string | null = null;

    for (const v of variants) {
      for (const [id, r] of this.recruitersCollection.entries()) {
        if (r.phoneNumber === v || r.phone === v) {
          existingRecruiter = r;
          existingRecruiterUid = id;
          break;
        }
      }
      if (existingRecruiter) break;

      for (const [id, u] of this.usersCollection.entries()) {
        if ((u.phoneNumber === v || u.phone === v) && (u.role === 'recruiter' || u.userType === 'recruiter')) {
          existingRecruiterUid = id;
          existingRecruiter = this.recruitersCollection.get(id) || null;
          break;
        }
      }
      if (existingRecruiterUid) break;
    }

    // 2. If NO existing recruiter exists in Firestore:
    if (!existingRecruiterUid) {
      // Must NOT create an Auth user or Firestore records
      const err = new Error('No recruiter account found with this mobile number. Please create an account first.');
      (err as { code?: string }).code = 'auth/recruiter-not-found';
      throw err;
    }

    // 3. Existing recruiter exists -> return authorized user
    const authUser = this.authUsers.get(existingRecruiterUid) || {
      uid: existingRecruiterUid,
      phoneNumber: cleanPhone,
      displayName: existingRecruiter?.fullName || 'Recruiter',
    };

    return { user: authUser };
  }

  // Authoritative Email Sign In Flow
  signInEmail(email: string, password?: string): { user: MockAuthUser } {
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    // 1. Find user in auth
    let matchedAuthUser: MockAuthUser | null = null;
    for (const u of this.authUsers.values()) {
      if (u.email === cleanEmail) {
        matchedAuthUser = u;
        break;
      }
    }

    if (!matchedAuthUser) {
      const err = new Error('No recruiter account found with this email. Please create an account first.');
      (err as { code?: string }).code = 'auth/user-not-found';
      throw err;
    }

    if (password && matchedAuthUser.password && matchedAuthUser.password !== password) {
      throw new Error('Incorrect password. Please verify your credentials and try again.');
    }

    // 2. Verify existence of recruiter role in Firestore
    const userDoc = this.usersCollection.get(matchedAuthUser.uid);
    const recDoc = this.recruitersCollection.get(matchedAuthUser.uid);

    if (!userDoc && !recDoc) {
      const err = new Error('No recruiter account found with this email. Please create an account first.');
      (err as { code?: string }).code = 'auth/user-not-found';
      throw err;
    }

    if (userDoc && userDoc.role !== 'recruiter' && userDoc.userType !== 'recruiter' && userDoc.role !== 'admin') {
      throw new Error('This account is not authorized as a recruiter. User is invalid in this application.');
    }

    return { user: matchedAuthUser };
  }
}

async function runTestSuite() {
  const backend = new MockSignInSecurityBackend();

  const EXISTING_EMAIL = 'recruiter.existing@company.com';
  const EXISTING_PHONE = '+919876543210';
  const EXISTING_UID = 'uid_existing_recruiter_1';

  const UNREGISTERED_EMAIL = 'brandnew.recruiter@gmail.com';
  const UNREGISTERED_PHONE = '+917306420827';

  backend.reset();
  backend.seedRecruiter({
    uid: EXISTING_UID,
    email: EXISTING_EMAIL,
    phone: EXISTING_PHONE,
    displayName: 'Aarav Sharma',
    companyName: 'Sharma Tech Solutions',
  });

  console.log('----------------------------------------------------------------');
  console.log('TEST 1: Existing recruiter phone number -> OTP -> login succeeds');
  console.log('----------------------------------------------------------------');
  try {
    const res1 = backend.signInPhoneOtp(EXISTING_PHONE, '123456');
    const pass1 = res1.user.uid === EXISTING_UID;
    console.log(`- Result: Success (UID: ${res1.user.uid}, Name: ${res1.user.displayName})`);
    console.log(`[TEST 1 RESULT]: ${pass1 ? 'PASS' : 'FAIL'}`);
    if (!pass1) allPassed = false;
  } catch (err) {
    console.error(`[TEST 1 RESULT]: FAIL - Unexpected error:`, err);
    allPassed = false;
  }

  console.log('\n----------------------------------------------------------------');
  console.log('TEST 2: Completely new/unregistered phone number -> OTP -> NO account created -> "Please create an account first"');
  console.log('----------------------------------------------------------------');
  const authCountBefore2 = backend.authUsers.size;
  const usersCountBefore2 = backend.usersCollection.size;
  const recCountBefore2 = backend.recruitersCollection.size;
  const compCountBefore2 = backend.companiesCollection.size;

  let test2Blocked = false;
  let test2ErrorMsg = '';

  try {
    backend.signInPhoneOtp(UNREGISTERED_PHONE, '123456');
  } catch (err: any) {
    test2Blocked = true;
    test2ErrorMsg = err?.message || '';
  }

  const authCountAfter2 = backend.authUsers.size;
  const usersCountAfter2 = backend.usersCollection.size;
  const recCountAfter2 = backend.recruitersCollection.size;
  const compCountAfter2 = backend.companiesCollection.size;

  const noNewDocsCreated2 =
    authCountAfter2 === authCountBefore2 &&
    usersCountAfter2 === usersCountBefore2 &&
    recCountAfter2 === recCountBefore2 &&
    compCountAfter2 === compCountBefore2;

  const expectedMsg2 = test2ErrorMsg.includes('No recruiter account found with this mobile number. Please create an account first.');

  console.log(`- Blocked from automatic sign-in: ${test2Blocked}`);
  console.log(`- Error message returned: "${test2ErrorMsg}"`);
  console.log(`- Zero new Auth / Firestore records created: ${noNewDocsCreated2}`);
  const pass2 = test2Blocked && expectedMsg2 && noNewDocsCreated2;
  console.log(`[TEST 2 RESULT]: ${pass2 ? 'PASS' : 'FAIL'}`);
  if (!pass2) allPassed = false;

  console.log('\n----------------------------------------------------------------');
  console.log('TEST 3: Existing recruiter email -> login succeeds');
  console.log('----------------------------------------------------------------');
  try {
    const res3 = backend.signInEmail(EXISTING_EMAIL, 'ValidPassword123');
    const pass3 = res3.user.uid === EXISTING_UID;
    console.log(`- Result: Success (UID: ${res3.user.uid}, Email: ${res3.user.email})`);
    console.log(`[TEST 3 RESULT]: ${pass3 ? 'PASS' : 'FAIL'}`);
    if (!pass3) allPassed = false;
  } catch (err) {
    console.error(`[TEST 3 RESULT]: FAIL - Unexpected error:`, err);
    allPassed = false;
  }

  console.log('\n----------------------------------------------------------------');
  console.log('TEST 4: Unregistered email -> login does not create an account -> "Please create an account first"');
  console.log('----------------------------------------------------------------');
  const authCountBefore4 = backend.authUsers.size;
  const usersCountBefore4 = backend.usersCollection.size;
  let test4Blocked = false;
  let test4ErrorMsg = '';

  try {
    backend.signInEmail(UNREGISTERED_EMAIL, 'AnyPassword123');
  } catch (err: any) {
    test4Blocked = true;
    test4ErrorMsg = err?.message || '';
  }

  const authCountAfter4 = backend.authUsers.size;
  const usersCountAfter4 = backend.usersCollection.size;
  const noNewDocsCreated4 = authCountAfter4 === authCountBefore4 && usersCountAfter4 === usersCountBefore4;
  const expectedMsg4 = test4ErrorMsg.includes('No recruiter account found with this email. Please create an account first.');

  console.log(`- Blocked from login: ${test4Blocked}`);
  console.log(`- Error message returned: "${test4ErrorMsg}"`);
  console.log(`- Zero new documents created: ${noNewDocsCreated4}`);
  const pass4 = test4Blocked && expectedMsg4 && noNewDocsCreated4;
  console.log(`[TEST 4 RESULT]: ${pass4 ? 'PASS' : 'FAIL'}`);
  if (!pass4) allPassed = false;

  console.log('\n----------------------------------------------------------------');
  console.log('TEST 5: Explicit Create Account flow -> still creates a new recruiter account correctly');
  console.log('----------------------------------------------------------------');
  try {
    const regRes = backend.signUp({
      email: UNREGISTERED_EMAIL,
      phone: UNREGISTERED_PHONE,
      displayName: 'Brand New Recruiter',
      companyName: 'New Frontier Ventures',
      password: 'StrongPassword123',
    });
    const regUid = regRes.uid;
    const hasAuth5 = backend.authUsers.has(regUid);
    const hasUser5 = backend.usersCollection.has(regUid);
    const hasRec5 = backend.recruitersCollection.has(regUid);
    const compId = backend.recruitersCollection.get(regUid)?.companyId;
    const hasComp5 = compId ? backend.companiesCollection.has(compId) : false;

    const pass5 = Boolean(regUid && hasAuth5 && hasUser5 && hasRec5 && hasComp5);
    console.log(`- New account created via Sign Up: UID ${regUid}`);
    console.log(`- Auth + /users + /recruiters + /companies verified: ${pass5}`);
    console.log(`[TEST 5 RESULT]: ${pass5 ? 'PASS' : 'FAIL'}`);
    if (!pass5) allPassed = false;

    // Verify newly registered user can now sign in via Phone OTP & Email
    const phoneLoginAfterReg = backend.signInPhoneOtp(UNREGISTERED_PHONE, '123456');
    const emailLoginAfterReg = backend.signInEmail(UNREGISTERED_EMAIL, 'StrongPassword123');
    const postRegLoginsPass = phoneLoginAfterReg.user.uid === regUid && emailLoginAfterReg.user.uid === regUid;
    console.log(`- Newly registered account can now sign in via Phone OTP & Email: ${postRegLoginsPass}`);
    if (!postRegLoginsPass) allPassed = false;
  } catch (err) {
    console.error(`[TEST 5 RESULT]: FAIL - Sign Up error:`, err);
    allPassed = false;
  }

  console.log('\n----------------------------------------------------------------');
  console.log('TEST 6: Existing recruiter account data -> /users role and /recruiters data remain unchanged');
  console.log('----------------------------------------------------------------');
  const existingUserDoc = backend.usersCollection.get(EXISTING_UID);
  const existingRecDoc = backend.recruitersCollection.get(EXISTING_UID);

  const roleUnchanged = existingUserDoc?.role === 'recruiter' && existingUserDoc?.userType === 'recruiter';
  const designationUnchanged = existingRecDoc?.designation === 'Senior Hiring Lead';
  const companyUnchanged = existingRecDoc?.companyId === `comp_${EXISTING_UID}`;
  const pass6 = Boolean(roleUnchanged && designationUnchanged && companyUnchanged);

  console.log(`- Role unchanged ('recruiter'): ${roleUnchanged}`);
  console.log(`- Designation unchanged ('Senior Hiring Lead'): ${designationUnchanged}`);
  console.log(`- Company link unchanged ('comp_${EXISTING_UID}'): ${companyUnchanged}`);
  console.log(`[TEST 6 RESULT]: ${pass6 ? 'PASS' : 'FAIL'}`);
  if (!pass6) allPassed = false;

  console.log('\n----------------------------------------------------------------');
  console.log('TEST 7: No duplicate /users, /recruiters, company, or subscription records created during Sign In');
  console.log('----------------------------------------------------------------');
  const authCount7 = backend.authUsers.size;
  const usersCount7 = backend.usersCollection.size;
  const recCount7 = backend.recruitersCollection.size;
  const compCount7 = backend.companiesCollection.size;

  // Execute multiple phone & email logins for existing accounts
  backend.signInPhoneOtp(EXISTING_PHONE, '123456');
  backend.signInEmail(EXISTING_EMAIL, 'ValidPassword123');
  backend.signInPhoneOtp(UNREGISTERED_PHONE, '123456');
  backend.signInEmail(UNREGISTERED_EMAIL, 'StrongPassword123');

  const authCountAfter7 = backend.authUsers.size;
  const usersCountAfter7 = backend.usersCollection.size;
  const recCountAfter7 = backend.recruitersCollection.size;
  const compCountAfter7 = backend.companiesCollection.size;

  const noDuplicates =
    authCountAfter7 === authCount7 &&
    usersCountAfter7 === usersCount7 &&
    recCountAfter7 === recCount7 &&
    compCountAfter7 === compCount7;

  console.log(`- Document counts before sign-ins: Auth=${authCount7}, Users=${usersCount7}, Recruiters=${recCount7}, Companies=${compCount7}`);
  console.log(`- Document counts after sign-ins:  Auth=${authCountAfter7}, Users=${usersCountAfter7}, Recruiters=${recCountAfter7}, Companies=${compCountAfter7}`);
  console.log(`- Zero duplicates created during sign-in attempts: ${noDuplicates}`);
  const pass7 = noDuplicates;
  console.log(`[TEST 7 RESULT]: ${pass7 ? 'PASS' : 'FAIL'}`);
  if (!pass7) allPassed = false;

  console.log('\n================================================================');
  if (allPassed) {
    console.log('>>> ALL 7 SIGN-IN VALIDATION TESTS (TEST 1 - 7) PASSED 100% <<<');
  } else {
    console.error('>>> SOME SIGN-IN VALIDATION TESTS FAILED <<<');
    process.exit(1);
  }
  console.log('================================================================\n');
}

runTestSuite();
