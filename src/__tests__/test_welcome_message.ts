import { isNewRecruiterUser } from '../utils/formatters';

console.log('====================================================');
console.log('TEST SUITE: Dashboard Welcome Message Logic');
console.log('====================================================\n');

let allPassed = true;

// Helper to format mock welcome message
function getWelcomeHeading(recruiterName: string, userMock: any): string {
  const isNew = isNewRecruiterUser(userMock);
  return isNew ? `Welcome, ${recruiterName}!` : `Welcome back, ${recruiterName}!`;
}

// Test Case 1: Fresh Registration (identical creationTime & lastSignInTime)
const nowIso = new Date().toISOString();
const freshUser = {
  metadata: {
    creationTime: nowIso,
    lastSignInTime: nowIso,
  }
};
const heading1 = getWelcomeHeading('Aina', freshUser);
const pass1 = heading1 === 'Welcome, Aina!';
console.log(`[${pass1 ? 'PASS' : 'FAIL'}] Fresh Registration -> "${heading1}" (Expected: "Welcome, Aina!")`);
if (!pass1) allPassed = false;

// Test Case 2: Returning User (Account created 10 days ago, last signed in today)
const tenDaysAgoIso = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
const returningUser = {
  metadata: {
    creationTime: tenDaysAgoIso,
    lastSignInTime: nowIso,
  }
};
const heading2 = getWelcomeHeading('Aina', returningUser);
const pass2 = heading2 === 'Welcome back, Aina!';
console.log(`[${pass2 ? 'PASS' : 'FAIL'}] Returning User Login -> "${heading2}" (Expected: "Welcome back, Aina!")`);
if (!pass2) allPassed = false;

// Test Case 3: Returning User (Account created 2 hours ago, signed in again 5 minutes ago)
const twoHoursAgoIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
const fiveMinsAgoIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
const reLoginUser = {
  metadata: {
    creationTime: twoHoursAgoIso,
    lastSignInTime: fiveMinsAgoIso,
  }
};
const heading3 = getWelcomeHeading('Sarah Jenkins', reLoginUser);
const pass3 = heading3 === 'Welcome back, Sarah Jenkins!';
console.log(`[${pass3 ? 'PASS' : 'FAIL'}] Subsequent Re-login -> "${heading3}" (Expected: "Welcome back, Sarah Jenkins!")`);
if (!pass3) allPassed = false;

// Test Case 4: Null / undefined user fallback
const heading4 = getWelcomeHeading('Recruiter', null);
const pass4 = heading4 === 'Welcome back, Recruiter!';
console.log(`[${pass4 ? 'PASS' : 'FAIL'}] Null User fallback -> "${heading4}" (Expected: "Welcome back, Recruiter!")`);
if (!pass4) allPassed = false;

if (allPassed) {
  console.log('\n>>> ALL WELCOME MESSAGE TESTS PASSED (4/4) <<<');
} else {
  console.error('\n>>> SOME WELCOME MESSAGE TESTS FAILED <<<');
  process.exit(1);
}
