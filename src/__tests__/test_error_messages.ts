import { formatAuthErrorMessage } from '../utils/errors';
import { normalizePhoneNumber } from '../utils/phone';

console.log('================================================================');
console.log('TEST SUITE: Error Formatting & User-Friendly Messages');
console.log('================================================================\n');

let allPassed = true;

const errorTestCases = [
  {
    name: '1. Existing Email (auth/email-already-in-use)',
    input: { code: 'auth/email-already-in-use', message: 'The email address is already in use by another account.' },
    expected: 'An account already exists with this email address. Please sign in instead.',
  },
  {
    name: '2. Existing Email (auth/email-already-exists)',
    input: { code: 'auth/email-already-exists', message: 'The provided email is already in use.' },
    expected: 'An account already exists with this email address. Please sign in instead.',
  },
  {
    name: '3. Existing Phone (auth/phone-number-already-exists)',
    input: { code: 'auth/phone-number-already-exists', message: 'The provided phone number is already in use.' },
    expected: 'An account already exists with this phone number. Please sign in instead.',
  },
  {
    name: '4. Existing Phone (auth/credential-already-in-use)',
    input: { code: 'auth/credential-already-in-use', message: 'This credential is already associated with a different user account.' },
    expected: 'An account already exists with this phone number. Please sign in instead.',
  },
  {
    name: '5. Invalid Email (auth/invalid-email)',
    input: { code: 'auth/invalid-email', message: 'The email address is badly formatted.' },
    expected: 'Please enter a valid email address.',
  },
  {
    name: '6. Weak Password (auth/weak-password)',
    input: { code: 'auth/weak-password', message: 'Password should be at least 6 characters.' },
    expected: 'Your password is too weak. Please use a stronger password (at least 6 characters).',
  },
  {
    name: '7. Invalid OTP (auth/invalid-verification-code)',
    input: { code: 'auth/invalid-verification-code', message: 'The verification code of the credential is not valid.' },
    expected: 'The OTP is incorrect. Please check the code and try again.',
  },
  {
    name: '8. Expired OTP (auth/code-expired)',
    input: { code: 'auth/code-expired', message: 'The SMS code has expired. Please re-send the verification code.' },
    expected: 'This OTP has expired. Please request a new OTP.',
  },
  {
    name: '9. Too Many Requests (auth/too-many-requests)',
    input: { code: 'auth/too-many-requests', message: 'Access to this account has been temporarily disabled due to many failed login attempts.' },
    expected: 'Too many attempts. Please wait a while and try again.',
  },
  {
    name: '10. Network Error (auth/network-request-failed)',
    input: { code: 'auth/network-request-failed', message: 'A network error (such as timeout, interrupted connection or unreachable host) has occurred.' },
    expected: 'Network error occurred. Please check your internet connection and try again.',
  },
  {
    name: '11. Unknown / Internal Server Error (auth/internal-error)',
    input: { code: 'auth/internal-error', message: 'Internal error occurred.' },
    expected: 'An unexpected error occurred. Please try again.',
  },
  {
    name: '12. Unhandled Technical Exception string',
    input: 'Firebase: Error (auth/something-random-12345)',
    expected: 'An unexpected error occurred. Please try again.',
  },
  {
    name: '13. Pre-formatted custom error message pass-through',
    input: new Error('An account already exists with this email address. Please sign in instead.'),
    expected: 'An account already exists with this email address. Please sign in instead.',
  },
];

for (const tc of errorTestCases) {
  const result = formatAuthErrorMessage(tc.input);
  const passed = result === tc.expected;
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${tc.name}`);
  console.log(`       Result:   "${result}"`);
  if (!passed) {
    console.log(`       Expected: "${tc.expected}"`);
    allPassed = false;
  }
}

// Client-side validation checks
console.log('\n--- Client-side Form Validation Checks ---');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validEmails = ['test@acme.com', 'user.name+tag@sub.domain.co', 'hr@talentbay.org'];
const invalidEmails = ['invalid-email', 'noatsign.com', 'user@', '@domain.com', ''];

for (const e of validEmails) {
  const v = emailRegex.test(e);
  console.log(`[${v ? 'PASS' : 'FAIL'}] Valid email regex check: "${e}" -> ${v}`);
  if (!v) allPassed = false;
}

for (const e of invalidEmails) {
  const v = !emailRegex.test(e);
  console.log(`[${v ? 'PASS' : 'FAIL'}] Invalid email rejected: "${e}" -> ${v}`);
  if (!v) allPassed = false;
}

// Phone checks
const phoneChecks = [
  { raw: '7306420827', cc: '+91', expected: '+917306420827' },
  { raw: '+917306420827', cc: '+91', expected: '+917306420827' },
  { raw: '+91 73064 20827', cc: '+91', expected: '+917306420827' },
  { raw: '917306420827', cc: '+91', expected: '+917306420827' },
];

for (const pc of phoneChecks) {
  const normalized = normalizePhoneNumber(pc.raw, pc.cc);
  const passed = normalized === pc.expected;
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Phone normalizer: "${pc.raw}" -> "${normalized}"`);
  if (!passed) allPassed = false;
}

console.log('================================================================');
if (allPassed) {
  console.log('>>> ALL ERROR FORMATTING & VALIDATION TESTS PASSED (100%) <<<');
} else {
  console.error('>>> AT LEAST ONE TEST FAILED <<<');
  process.exit(1);
}
console.log('================================================================\n');
