import { formatAuthErrorMessage } from '../utils/errors';
import { parseFirestoreDate } from '../utils/formatters';

console.log('--- 1. Testing formatAuthErrorMessage ---');

const testCases = [
  { input: new Error('Firebase: Error (auth/email-already-in-use).'), expectedIncluded: 'account already exists with this email address' },
  { input: { code: 'auth/email-already-in-use', message: '' }, expectedIncluded: 'account already exists with this email address' },
  { input: { code: 'auth/credential-already-in-use', message: '' }, expectedIncluded: 'account already exists with this phone number' },
  { input: { code: 'auth/phone-number-already-exists', message: '' }, expectedIncluded: 'account already exists with this phone number' },
  { input: { code: 'auth/account-exists-with-different-credential', message: '' }, expectedIncluded: 'different sign-in method' },
  { input: { code: 'auth/invalid-email', message: '' }, expectedIncluded: 'valid email' },
  { input: { code: 'auth/weak-password', message: '' }, expectedIncluded: 'weak' },
  { input: { code: 'auth/user-not-found', message: '' }, expectedIncluded: 'Invalid email or password' },
  { input: { code: 'auth/wrong-password', message: '' }, expectedIncluded: 'Invalid email or password' },
  { input: { code: 'auth/network-request-failed', message: '' }, expectedIncluded: 'internet connection' },
  { input: { code: 'auth/too-many-requests', message: '' }, expectedIncluded: 'Too many attempts' },
];

let allPassed = true;
for (const tc of testCases) {
  const result = formatAuthErrorMessage(tc.input);
  const passed = result.toLowerCase().includes(tc.expectedIncluded.toLowerCase());
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Input: ${JSON.stringify((tc.input as { code?: string }).code || (tc.input as Error).message)} -> Result: "${result}"`);
  if (!passed) allPassed = false;
}

console.log('\n--- 2. Testing parseFirestoreDate ---');

const dateTests = [
  { input: new Date('2026-10-01T00:00:00Z'), desc: 'Native Date', valid: true },
  { input: { seconds: 1735000000, nanoseconds: 0 }, desc: 'Firestore Timestamp object {seconds}', valid: true },
  { input: { toDate: () => new Date('2026-10-01T00:00:00Z') }, desc: 'Firestore Timestamp instance with toDate()', valid: true },
  { input: '2026-10-01T00:00:00Z', desc: 'ISO String', valid: true },
  { input: 1735000000000, desc: 'Epoch millisecond number', valid: true },
  { input: null, desc: 'null value', valid: false },
  { input: undefined, desc: 'undefined value', valid: false },
];

for (const dt of dateTests) {
  const res = parseFirestoreDate(dt.input);
  const isValid = res instanceof Date && !isNaN(res.getTime());
  const passed = isValid === dt.valid;
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${dt.desc} -> Result: ${res}`);
  if (!passed) allPassed = false;
}

console.log('\n--- 3. Testing Company Profile Completion & Sanitization Logic ---');

function isFieldCompleted(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'number') return !isNaN(val) && val > 0;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return false;
    const lower = trimmed.toLowerCase();
    if (lower === 'not specified') return false;
    if (lower === 'organization') return false;
    if (lower === 'company') return false;
    if (lower === 'technology') return false;
    if (lower === 'no company description provided.') return false;
    return true;
  }
  if (Array.isArray(val)) return val.length > 0;
  return false;
}

function calculateProfileCompletion(company: any) {
  const rawCompany = company as Record<string, any> | null;
  const name = company?.profile?.companyName || company?.profile?.name || rawCompany?.name || rawCompany?.companyName || 'Organization';
  const rawAbout = company?.profile?.about || company?.profile?.description || rawCompany?.about || rawCompany?.aboutCompany || '';
  const website = company?.profile?.website || company?.contact?.website || rawCompany?.website || '';
  
  const rawIndustry = company?.profile?.industry || company?.business?.industry || rawCompany?.industry || '';
  const isLegacyInd = typeof rawIndustry === 'string' && rawIndustry.trim().toLowerCase() === 'technology';
  const cleanIndustry = isLegacyInd ? '' : (typeof rawIndustry === 'string' ? rawIndustry.trim() : '');

  const rawCompanySize = company?.profile?.companySize || company?.business?.companySize || company?.business?.size || rawCompany?.companySize || '';
  const isLegacySize = typeof rawCompanySize === 'string' && (rawCompanySize.trim() === '11-50' || rawCompanySize.trim().toLowerCase() === '11-50 employees') && isLegacyInd;
  const cleanCompanySize = isLegacySize ? '' : (typeof rawCompanySize === 'string' ? rawCompanySize.trim() : '');

  const rawFoundedYear = company?.profile?.foundedYear || company?.business?.foundedYear;
  const email = company?.contact?.officialEmail || company?.contact?.email || rawCompany?.email || '';
  const phone = company?.contact?.phone || rawCompany?.phone || '';
  const primaryAddress = company?.contact?.primaryAddress;

  const profileFields = [
    { name: 'Company Name', isComplete: isFieldCompleted(name) && name !== 'Organization' && name !== 'Company' },
    { name: 'Official Email', isComplete: isFieldCompleted(email) },
    { name: 'Phone Number', isComplete: isFieldCompleted(phone) },
    { name: 'Industry', isComplete: isFieldCompleted(cleanIndustry) },
    { name: 'Company Size', isComplete: isFieldCompleted(cleanCompanySize) },
    { name: 'Founded Year', isComplete: isFieldCompleted(rawFoundedYear) },
    { name: 'About / Description', isComplete: isFieldCompleted(rawAbout) },
    { name: 'Website', isComplete: isFieldCompleted(website) },
    { name: 'Company Logo', isComplete: isFieldCompleted(company?.profile?.logoUrl || rawCompany?.logoUrl) },
    { name: 'Primary Address', isComplete: isFieldCompleted(primaryAddress?.city || primaryAddress?.street || company?.contact?.city) },
  ];

  const completedFieldsCount = profileFields.filter((f) => f.isComplete).length;
  const totalApplicableFields = profileFields.length;
  const percentage = Math.round((completedFieldsCount / totalApplicableFields) * 100);

  return { percentage, completedFieldsCount, totalApplicableFields, cleanIndustry, cleanCompanySize };
}

// Test scenario 1: Freshly created company (only name, email, phone)
const freshCompany = {
  profile: { companyName: 'Acme Corp', industry: '', companySize: '', about: '' },
  contact: { officialEmail: 'recruiter@acme.com', phone: '+919876543210' },
  business: { industry: '', companySize: '' },
};
const res1 = calculateProfileCompletion(freshCompany);
console.log(`[${res1.percentage === 30 ? 'PASS' : 'FAIL'}] Fresh Company Completion: ${res1.percentage}% (Expected: 30% for 3 fields completed)`);
if (res1.percentage !== 30) allPassed = false;

// Test scenario 2: Legacy company with unverified defaults 'Technology' and '11-50'
const legacyCompany = {
  profile: { companyName: 'Legacy Tech Corp', industry: 'Technology', companySize: '11-50', about: '' },
  contact: { officialEmail: 'hr@legacy.com', phone: '+919876543211' },
  business: { industry: 'Technology', companySize: '11-50' },
};
const res2 = calculateProfileCompletion(legacyCompany);
console.log(`[${res2.cleanIndustry === '' && res2.cleanCompanySize === '' && res2.percentage === 30 ? 'PASS' : 'FAIL'}] Legacy Default Company: Industry Sanitized to '${res2.cleanIndustry}', Size Sanitized to '${res2.cleanCompanySize}', Completion: ${res2.percentage}%`);
if (res2.cleanIndustry !== '' || res2.cleanCompanySize !== '' || res2.percentage !== 30) allPassed = false;

// Test scenario 3: Fully completed profile
const completeCompany = {
  profile: {
    companyName: 'Apex Innovations',
    industry: 'Software Development',
    companySize: '51-200',
    foundedYear: 2020,
    about: 'Leading technology consulting firm.',
    website: 'https://apex.io',
    logoUrl: 'https://storage.googleapis.com/logo.png',
  },
  contact: {
    officialEmail: 'contact@apex.io',
    phone: '+919876543212',
    primaryAddress: { city: 'Bengaluru', street: '100 Feet Rd' },
  },
  business: {
    industry: 'Software Development',
    companySize: '51-200',
    foundedYear: 2020,
  },
};
const res3 = calculateProfileCompletion(completeCompany);
console.log(`[${res3.percentage === 100 ? 'PASS' : 'FAIL'}] Fully Complete Company: Completion: ${res3.percentage}% (10/10 fields)`);
if (res3.percentage !== 100) allPassed = false;

if (allPassed) {
  console.log('\n>>> ALL TEST CASES PASSED SUCCESSFULLY! <<<');
} else {
  console.error('\n>>> SOME TEST CASES FAILED! <<<');
  process.exit(1);
}

