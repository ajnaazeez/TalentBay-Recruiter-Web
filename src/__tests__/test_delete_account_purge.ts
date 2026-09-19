import { normalizePhoneNumber, getPhoneSearchVariants } from '../utils/phone';
import { isValidEmail, isValidPhone } from '../utils/validators';

console.log('================================================================');
console.log('TALENTBAY RECRUITER: COMPLETE ACCOUNT PURGE & AUDIT SUITE (A-N)');
console.log('================================================================\n');

let allPassed = true;

interface MockUserDoc {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  phone: string | null;
  role: string;
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
}

interface MockCompanyDoc {
  id: string;
  name: string;
  createdBy: string;
}

interface MockJobDoc {
  id: string;
  recruiterId: string;
  title: string;
}

interface MockApplicationDoc {
  id: string;
  jobId: string;
  recruiterId: string;
  candidateId: string;
}

interface MockChatDoc {
  id: string;
  recruiterId: string;
  participants: string[];
}

interface MockNotificationDoc {
  id: string;
  userId: string;
  recruiterId: string;
}

interface MockAuthUser {
  uid: string;
  email: string;
  phoneNumber?: string;
  displayName: string;
  password?: string;
}

class MockFullBackend {
  authUsers: Map<string, MockAuthUser> = new Map();
  usersCollection: Map<string, MockUserDoc> = new Map();
  recruitersCollection: Map<string, MockRecruiterDoc> = new Map();
  companiesCollection: Map<string, MockCompanyDoc> = new Map();
  jobsCollection: Map<string, MockJobDoc> = new Map();
  applicationsCollection: Map<string, MockApplicationDoc> = new Map();
  chatsCollection: Map<string, MockChatDoc> = new Map();
  notificationsCollection: Map<string, MockNotificationDoc> = new Map();

  reset() {
    this.authUsers.clear();
    this.usersCollection.clear();
    this.recruitersCollection.clear();
    this.companiesCollection.clear();
    this.jobsCollection.clear();
    this.applicationsCollection.clear();
    this.chatsCollection.clear();
    this.notificationsCollection.clear();
  }

  // Authoritative Registration
  registerRecruiter(params: {
    email: string;
    phone: string;
    displayName: string;
    companyName: string;
    password?: string;
  }): { uid: string } {
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanPhone = normalizePhoneNumber(params.phone);

    // Validate inputs
    if (!isValidEmail(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }
    if (!isValidPhone(cleanPhone)) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    // Uniqueness validation
    const val = this.validateRegistration({ email: cleanEmail, phoneNumber: cleanPhone });
    if (!val.valid) {
      throw new Error(val.message);
    }

    const uid = `uid_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const companyId = `comp_${Date.now()}`;

    // 1. Auth User
    this.authUsers.set(uid, {
      uid,
      email: cleanEmail,
      phoneNumber: cleanPhone,
      displayName: params.displayName,
      password: params.password || 'Secret123',
    });

    // 2. /users/{uid}
    this.usersCollection.set(uid, {
      uid,
      email: cleanEmail,
      phoneNumber: cleanPhone,
      phone: cleanPhone,
      role: 'recruiter',
      companyId,
    });

    // 3. /companies/{companyId}
    this.companiesCollection.set(companyId, {
      id: companyId,
      name: params.companyName,
      createdBy: uid,
    });

    // 4. /recruiters/{uid}
    this.recruitersCollection.set(uid, {
      uid,
      officialEmail: cleanEmail,
      email: cleanEmail,
      phoneNumber: cleanPhone,
      phone: cleanPhone,
      companyId,
      fullName: params.displayName,
    });

    // 5. Seed related recruiter data (Jobs, Applications, Chats, Notifications)
    const jobId = `job_${uid}`;
    this.jobsCollection.set(jobId, { id: jobId, recruiterId: uid, title: 'Senior Software Engineer' });
    this.applicationsCollection.set(`app_${uid}`, { id: `app_${uid}`, jobId, recruiterId: uid, candidateId: 'cand_1' });
    this.chatsCollection.set(`chat_${uid}`, { id: `chat_${uid}`, recruiterId: uid, participants: [uid, 'cand_1'] });
    this.notificationsCollection.set(`notif_${uid}`, { id: `notif_${uid}`, userId: uid, recruiterId: uid });

    return { uid };
  }

  // Authoritative Validation Cloud Function logic
  validateRegistration(params: {
    email?: string;
    phoneNumber?: string;
    excludeUid?: string;
  }): { phoneExists: boolean; emailExists: boolean; valid: boolean; message: string } {
    let emailExists = false;
    let phoneExists = false;

    if (params.email) {
      const cleanEmail = params.email.trim().toLowerCase();
      // Auth check
      for (const [uid, u] of this.authUsers.entries()) {
        if (params.excludeUid && uid === params.excludeUid) continue;
        if (u.email === cleanEmail) emailExists = true;
      }
      // Recruiters check
      for (const [uid, r] of this.recruitersCollection.entries()) {
        if (params.excludeUid && uid === params.excludeUid) continue;
        if (r.officialEmail === cleanEmail || r.email === cleanEmail) emailExists = true;
      }
      // Users check
      for (const [uid, u] of this.usersCollection.entries()) {
        if (params.excludeUid && uid === params.excludeUid) continue;
        if (u.email === cleanEmail) emailExists = true;
      }
    }

    if (params.phoneNumber) {
      const variants = getPhoneSearchVariants(params.phoneNumber);
      for (const v of variants) {
        // Auth check
        for (const [uid, u] of this.authUsers.entries()) {
          if (params.excludeUid && uid === params.excludeUid) continue;
          if (u.phoneNumber === v) phoneExists = true;
        }
        // Recruiters check
        for (const [uid, r] of this.recruitersCollection.entries()) {
          if (params.excludeUid && uid === params.excludeUid) continue;
          if (r.phoneNumber === v || r.phone === v) phoneExists = true;
        }
        // Users check
        for (const [uid, u] of this.usersCollection.entries()) {
          if (params.excludeUid && uid === params.excludeUid) continue;
          if (u.phoneNumber === v || u.phone === v) phoneExists = true;
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

  // Authoritative Backend deleteUserAccount Cloud Function implementation
  async deleteUserAccount(uid: string): Promise<{ success: boolean; message: string }> {
    if (!uid) {
      throw new Error('unauthenticated: You must be authenticated with Firebase Auth to delete your account.');
    }

    // 1. Snapshot complete recruiter/account info BEFORE deleting anything
    const authUser = this.authUsers.get(uid);
    const userDoc = this.usersCollection.get(uid);
    const recDoc = this.recruitersCollection.get(uid);

    const emailsToPurge = new Set<string>();
    const phonesToPurge = new Set<string>();
    let companyId: string | null = null;

    if (authUser) {
      if (authUser.email) emailsToPurge.add(authUser.email.toLowerCase().trim());
      if (authUser.phoneNumber) phonesToPurge.add(authUser.phoneNumber.trim());
    }

    if (userDoc) {
      if (userDoc.email) emailsToPurge.add(userDoc.email.toLowerCase().trim());
      if (userDoc.phoneNumber) phonesToPurge.add(userDoc.phoneNumber.trim());
      if (userDoc.phone) phonesToPurge.add(userDoc.phone.trim());
      if (userDoc.companyId) companyId = userDoc.companyId;
    }

    if (recDoc) {
      if (recDoc.officialEmail) emailsToPurge.add(recDoc.officialEmail.toLowerCase().trim());
      if (recDoc.email) emailsToPurge.add(recDoc.email.toLowerCase().trim());
      if (recDoc.phoneNumber) phonesToPurge.add(recDoc.phoneNumber.trim());
      if (recDoc.phone) phonesToPurge.add(recDoc.phone.trim());
      if (!companyId && recDoc.companyId) companyId = recDoc.companyId;
    }

    // 2. Delete Firebase Auth user
    this.authUsers.delete(uid);

    // 3. Delete Primary Firestore Documents
    this.usersCollection.delete(uid);
    this.recruitersCollection.delete(uid);

    // 4. Handle Linked Company Record Carefully
    if (companyId) {
      const remainingRecruiters = Array.from(this.recruitersCollection.values()).filter((r) => r.companyId === companyId);
      if (remainingRecruiters.length === 0) {
        const comp = this.companiesCollection.get(companyId);
        if (comp && (comp.createdBy === uid || remainingRecruiters.length === 0)) {
          this.companiesCollection.delete(companyId);
        }
      }
    }

    // 5. Clean Up Recruiter-Owned Data
    // Jobs & applications
    for (const [jId, job] of Array.from(this.jobsCollection.entries())) {
      if (job.recruiterId === uid) {
        for (const [aId, app] of Array.from(this.applicationsCollection.entries())) {
          if (app.jobId === jId || app.recruiterId === uid) {
            this.applicationsCollection.delete(aId);
          }
        }
        this.jobsCollection.delete(jId);
      }
    }

    // Chats
    for (const [cId, chat] of Array.from(this.chatsCollection.entries())) {
      if (chat.recruiterId === uid || chat.participants.includes(uid)) {
        this.chatsCollection.delete(cId);
      }
    }

    // Notifications
    for (const [nId, notif] of Array.from(this.notificationsCollection.entries())) {
      if (notif.userId === uid || notif.recruiterId === uid) {
        this.notificationsCollection.delete(nId);
      }
    }

    // 6. Comprehensive Phone Cleanup
    for (const phone of phonesToPurge) {
      const variants = getPhoneSearchVariants(phone);
      for (const variant of variants) {
        for (const [id, r] of Array.from(this.recruitersCollection.entries())) {
          if (r.phoneNumber === variant || r.phone === variant) {
            if (id === uid || emailsToPurge.has(r.officialEmail) || r.companyId === companyId) {
              this.recruitersCollection.delete(id);
            }
          }
        }
        for (const [id, u] of Array.from(this.usersCollection.entries())) {
          if (u.phoneNumber === variant || u.phone === variant) {
            if (id === uid || (u.email && emailsToPurge.has(u.email)) || u.companyId === companyId) {
              this.usersCollection.delete(id);
            }
          }
        }
      }
    }

    // 7. Comprehensive Email Cleanup
    for (const email of emailsToPurge) {
      for (const [id, r] of Array.from(this.recruitersCollection.entries())) {
        if (r.officialEmail === email || r.email === email) {
          this.recruitersCollection.delete(id);
        }
      }
      for (const [id, u] of Array.from(this.usersCollection.entries())) {
        if (u.email === email) {
          this.usersCollection.delete(id);
        }
      }
    }

    return {
      success: true,
      message: 'Account and associated data deleted completely.',
    };
  }

  // Simulates Email Sign-In
  signInEmail(email: string, password?: string): MockAuthUser {
    const cleanEmail = email.trim().toLowerCase();
    for (const u of this.authUsers.values()) {
      if (u.email === cleanEmail) {
        if (password && u.password && u.password !== password) {
          throw new Error('Invalid email or password.');
        }
        const userDoc = this.usersCollection.get(u.uid);
        if (!userDoc || userDoc.role !== 'recruiter') {
          throw new Error('This account is not authorized as a recruiter.');
        }
        return u;
      }
    }
    throw new Error('Invalid email or password.');
  }

  // Simulates Phone OTP Sign-In with syncRecruiterPhoneAuth
  signInPhoneOtp(phone: string): MockAuthUser {
    const cleanPhone = normalizePhoneNumber(phone);
    const variants = getPhoneSearchVariants(cleanPhone);

    // Find active recruiter profile
    let matchedUid: string | null = null;
    for (const v of variants) {
      for (const [id, r] of this.recruitersCollection.entries()) {
        if (r.phoneNumber === v || r.phone === v) {
          matchedUid = id;
          break;
        }
      }
      if (matchedUid) break;
    }

    if (!matchedUid) {
      throw new Error('No active recruiter account found for this phone number.');
    }

    const authUser = this.authUsers.get(matchedUid);
    if (!authUser) {
      throw new Error('Firebase Auth user not found for this recruiter.');
    }

    return authUser;
  }
}

// Instantiate test suite
const backend = new MockFullBackend();

const TEST_EMAIL = 'fathimaajna33@gmail.com';
const TEST_PHONE = '+917306420827';
const TEST_NAME = 'Fathima Ajna';
const TEST_COMPANY = 'Ajna Tech Global';

async function runTests() {
  backend.reset();

  console.log('TEST STAGE 1: ACCOUNT CREATION (A & B)');
  // A. Create account with email + phone
  const created = backend.registerRecruiter({
    email: TEST_EMAIL,
    phone: TEST_PHONE,
    displayName: TEST_NAME,
    companyName: TEST_COMPANY,
  });
  const originalUid = created.uid;
  console.log(`- Created account with UID: ${originalUid}`);

  // B. Confirm Auth + /users + /recruiters + company records exist
  const hasAuth = backend.authUsers.has(originalUid);
  const hasUser = backend.usersCollection.has(originalUid);
  const hasRec = backend.recruitersCollection.has(originalUid);
  const userCompId = backend.recruitersCollection.get(originalUid)?.companyId;
  const hasComp = userCompId ? backend.companiesCollection.has(userCompId) : false;
  const hasJob = backend.jobsCollection.has(`job_${originalUid}`);
  const hasApp = backend.applicationsCollection.has(`app_${originalUid}`);
  const hasChat = backend.chatsCollection.has(`chat_${originalUid}`);
  const hasNotif = backend.notificationsCollection.has(`notif_${originalUid}`);

  const stepB_Pass = hasAuth && hasUser && hasRec && hasComp && hasJob && hasApp && hasChat && hasNotif;
  console.log(`- Step B verification (All records exist): ${stepB_Pass}`);
  if (!stepB_Pass) allPassed = false;

  console.log('\nTEST STAGE 2: DELETE ACCOUNT (C, D, E, F, G, H, I)');
  // C. Click Delete Account
  const deleteResult = await backend.deleteUserAccount(originalUid);
  console.log(`- Step C (Delete account call result): ${deleteResult.success}`);

  // D. Verify Firebase Auth user is completely gone
  const authDeleted = !backend.authUsers.has(originalUid);
  console.log(`- Step D (Auth user deleted completely): ${authDeleted}`);
  if (!authDeleted) allPassed = false;

  // E. Verify /users/{uid} is gone
  const userDocDeleted = !backend.usersCollection.has(originalUid);
  console.log(`- Step E (/users/{uid} deleted completely): ${userDocDeleted}`);
  if (!userDocDeleted) allPassed = false;

  // F. Verify /recruiters/{uid} is gone
  const recDocDeleted = !backend.recruitersCollection.has(originalUid);
  console.log(`- Step F (/recruiters/{uid} deleted completely): ${recDocDeleted}`);
  if (!recDocDeleted) allPassed = false;

  // G. Verify linked company is handled correctly
  const compDeleted = userCompId ? !backend.companiesCollection.has(userCompId) : true;
  console.log(`- Step G (Exclusive company deleted): ${compDeleted}`);
  if (!compDeleted) allPassed = false;

  // Check related data cleanup
  const jobsDeleted = !backend.jobsCollection.has(`job_${originalUid}`);
  const appsDeleted = !backend.applicationsCollection.has(`app_${originalUid}`);
  const chatsDeleted = !backend.chatsCollection.has(`chat_${originalUid}`);
  const notifsDeleted = !backend.notificationsCollection.has(`notif_${originalUid}`);
  console.log(`- Related data purged (jobs, apps, chats, notifs): ${jobsDeleted && appsDeleted && chatsDeleted && notifsDeleted}`);
  if (!jobsDeleted || !appsDeleted || !chatsDeleted || !notifsDeleted) allPassed = false;

  // H. Verify stale email records are gone
  let staleEmailFound = false;
  for (const r of backend.recruitersCollection.values()) {
    if (r.officialEmail === TEST_EMAIL || r.email === TEST_EMAIL) staleEmailFound = true;
  }
  for (const u of backend.usersCollection.values()) {
    if (u.email === TEST_EMAIL) staleEmailFound = true;
  }
  console.log(`- Step H (Stale email records gone): ${!staleEmailFound}`);
  if (staleEmailFound) allPassed = false;

  // I. Verify stale phone records are gone across variants
  const phoneVariantsToTest = [
    TEST_PHONE,
    '7306420827',
    '+917306420827',
    '917306420827',
    '07306420827',
    '+91 7306420827',
  ];
  let stalePhoneFound = false;
  for (const v of phoneVariantsToTest) {
    for (const r of backend.recruitersCollection.values()) {
      if (r.phoneNumber === v || r.phone === v) stalePhoneFound = true;
    }
    for (const u of backend.usersCollection.values()) {
      if (u.phoneNumber === v || u.phone === v) stalePhoneFound = true;
    }
  }
  console.log(`- Step I (Stale phone records gone across all variants): ${!stalePhoneFound}`);
  if (stalePhoneFound) allPassed = false;

  console.log('\nTEST STAGE 3: RE-REGISTRATION WITH SAME EMAIL & PHONE (J, K)');
  // J & K. Register again using SAME email + SAME phone
  let newUid = '';
  try {
    const reRegistered = backend.registerRecruiter({
      email: TEST_EMAIL,
      phone: TEST_PHONE,
      displayName: 'Fathima Ajna New',
      companyName: 'Ajna Global Ventures',
    });
    newUid = reRegistered.uid;
    console.log(`- Step J & K (Re-registration succeeded with new UID): ${newUid}`);
    console.log(`- Verified new UID is DIFFERENT from deleted UID: ${newUid !== originalUid}`);
    if (newUid === originalUid) allPassed = false;
  } catch (reRegErr) {
    console.error(`- Re-registration FAILED:`, reRegErr);
    allPassed = false;
  }

  console.log('\nTEST STAGE 4: AUTHENTICATION RESOLUTION (L, M, N)');
  // L. Verify Phone OTP login resolves to the NEW UID, not the deleted UID
  try {
    const phoneAuthUser = backend.signInPhoneOtp(TEST_PHONE);
    const stepL_Pass = phoneAuthUser.uid === newUid && phoneAuthUser.uid !== originalUid;
    console.log(`- Step L (Phone OTP login resolves to NEW UID ${phoneAuthUser.uid}): ${stepL_Pass}`);
    if (!stepL_Pass) allPassed = false;
  } catch (phoneLoginErr) {
    console.error(`- Step L Phone OTP login failed:`, phoneLoginErr);
    allPassed = false;
  }

  // M. Verify Email/Password login resolves to the NEW UID
  try {
    const emailAuthUser = backend.signInEmail(TEST_EMAIL);
    const stepM_Pass = emailAuthUser.uid === newUid && emailAuthUser.uid !== originalUid;
    console.log(`- Step M (Email login resolves to NEW UID ${emailAuthUser.uid}): ${stepM_Pass}`);
    if (!stepM_Pass) allPassed = false;
  } catch (emailLoginErr) {
    console.error(`- Step M Email login failed:`, emailLoginErr);
    allPassed = false;
  }

  // N. Verify old deleted account cannot be restored/resolved through any stale Firestore record
  const oldDocCheck = !backend.recruitersCollection.has(originalUid) && !backend.usersCollection.has(originalUid);
  console.log(`- Step N (Old deleted account cannot be restored or resolved): ${oldDocCheck}`);
  if (!oldDocCheck) allPassed = false;

  console.log('\n================================================================');
  if (allPassed) {
    console.log('>>> ALL TEST CASES (A through N) PASSED 100% <<<');
  } else {
    console.error('>>> SOME TEST CASES FAILED <<<');
    process.exit(1);
  }
  console.log('================================================================\n');
}

runTests();
