import { bulkJobService, RawBulkJobRow } from '../services/bulkJobService';

console.log('--- Testing Bulk Job Upload Service Validation (17-Column Parity) ---');

const sampleRows: RawBulkJobRow[] = [
  // 1. Valid Row: Senior Flutter Developer (Experienced)
  {
    rowNumber: 2,
    title: 'Senior Flutter Developer',
    employmentType: 'Full-Time',
    workMode: 'Remote',
    country: 'India',
    state: 'Karnataka',
    city: 'Bengaluru',
    officeCount: 1,
    vacancies: 3,
    skillsRequired: 'Flutter, Dart, Firebase, Riverpod',
    experienceLevel: 'Experienced',
    minExperience: 3,
    maxExperience: 6,
    minSalary: 1200000,
    maxSalary: 1800000,
    salaryCurrency: 'INR / Per Annum',
    jobDescription: 'We are seeking a senior Flutter developer with deep knowledge of mobile apps.',
    educationalQualification: 'B.Tech / MCA',
  },
  // 2. Valid Row: Fresher with Optional Job Description omitted
  {
    rowNumber: 3,
    title: 'Junior Operations Executive',
    employmentType: 'Full-Time',
    workMode: 'Onsite',
    country: 'India',
    state: 'Kerala',
    city: 'Kochi',
    officeCount: 1,
    vacancies: 1,
    skillsRequired: 'MS Excel, Operations, English Communication',
    experienceLevel: 'Fresher',
    minExperience: 0,
    maxExperience: 0,
    minSalary: 300000,
    maxSalary: 450000,
    salaryCurrency: 'INR / Per Annum',
    jobDescription: '', // Optional per manual Section 6 & 7
    educationalQualification: 'BBA / B.Com / Any Graduate',
  },
  // 3. Invalid Row: Missing Job Title (Core Required Field 1)
  {
    rowNumber: 4,
    title: '',
    employmentType: 'Full-Time',
    workMode: 'Remote',
    country: 'India',
    state: 'Maharashtra',
    city: 'Mumbai',
    officeCount: 1,
    vacancies: 2,
    skillsRequired: 'Python, Django',
    experienceLevel: 'Experienced',
    minExperience: 2,
    maxExperience: 4,
  },
  // 4. Invalid Row: Invalid Employment Type (Allowed: Full-Time, Part-Time, Contract)
  {
    rowNumber: 5,
    title: 'UI/UX Designer',
    employmentType: 'Freelance', // Invalid enum
    workMode: 'Onsite',
    country: 'India',
    state: 'Delhi',
    city: 'New Delhi',
    officeCount: 1,
    vacancies: 1,
    skillsRequired: 'Figma, Adobe XD',
    experienceLevel: 'Experienced',
    minExperience: 3,
    maxExperience: 5,
  },
  // 5. Invalid Row: Min Exp > Max Exp
  {
    rowNumber: 6,
    title: 'DevOps Architect',
    employmentType: 'Full-Time',
    workMode: 'Remote',
    country: 'India',
    state: 'Telangana',
    city: 'Hyderabad',
    officeCount: 1,
    vacancies: 1,
    skillsRequired: 'AWS, Kubernetes, Terraform',
    experienceLevel: 'Experienced',
    minExperience: 10,
    maxExperience: 5,
  },
  // 6. Invalid Row: Missing Number of Offices
  {
    rowNumber: 7,
    title: 'Product Manager',
    employmentType: 'Full-Time',
    workMode: 'Hybrid',
    country: 'India',
    state: 'Karnataka',
    city: 'Bengaluru',
    officeCount: 0, // Invalid (must be >= 1)
    vacancies: 2,
    skillsRequired: 'Roadmapping, Agile, Analytics',
    experienceLevel: 'Experienced',
    minExperience: 4,
    maxExperience: 7,
  },
];

const validated = bulkJobService.validateJobRows(sampleRows);

console.log(`Validated ${validated.length} rows.`);

let allPassed = true;

// Test Row 1: Senior Flutter Developer
if (validated[0].isValid && validated[0].errors.length === 0) {
  console.log('[PASS] Row 1 (Senior Flutter Developer) is VALID');
} else {
  console.error('[FAIL] Row 1 should be valid but got errors:', validated[0].errors);
  allPassed = false;
}

// Test Row 2: Junior Operations Executive (Fresher with blank Job Description)
if (validated[1].isValid && validated[1].errors.length === 0) {
  console.log('[PASS] Row 2 (Fresher with blank JD) is VALID as Job Description is optional');
} else {
  console.error('[FAIL] Row 2 should be valid but got errors:', validated[1].errors);
  allPassed = false;
}

// Test Row 3: Missing Job Title
if (!validated[2].isValid && validated[2].errors.some((e) => e.includes('Job Title'))) {
  console.log('[PASS] Row 3 correctly caught missing Job Title');
} else {
  console.error('[FAIL] Row 3 should fail for missing Job Title');
  allPassed = false;
}

// Test Row 4: Invalid Employment Type
if (!validated[3].isValid && validated[3].errors.some((e) => e.includes('Employment Type'))) {
  console.log('[PASS] Row 4 correctly caught invalid Employment Type');
} else {
  console.error('[FAIL] Row 4 should fail for invalid Employment Type');
  allPassed = false;
}

// Test Row 5: Min Exp > Max Exp
if (!validated[4].isValid && validated[4].errors.some((e) => e.includes('cannot be less than Minimum Experience'))) {
  console.log('[PASS] Row 5 correctly caught minExp > maxExp');
} else {
  console.error('[FAIL] Row 5 should fail for minExp > maxExp');
  allPassed = false;
}

// Test Row 6: Invalid Office Count
if (!validated[5].isValid && validated[5].errors.some((e) => e.includes('Number of Offices'))) {
  console.log('[PASS] Row 6 correctly caught invalid Number of Offices');
} else {
  console.error('[FAIL] Row 6 should fail for invalid Number of Offices');
  allPassed = false;
}

// Test Duplicate Job Detection
console.log('\n--- Testing Duplicate Job Detection ---');
const activeCompanyJobTitles = ['Senior Flutter Developer', 'Lead QA Engineer'];
const withDuplicatesChecked = bulkJobService.checkDuplicates(validated, activeCompanyJobTitles);

if (withDuplicatesChecked[0].isDuplicate === true) {
  console.log('[PASS] Row 1 (Senior Flutter Developer) correctly flagged as Duplicate');
} else {
  console.error('[FAIL] Row 1 should be flagged as duplicate but was not.');
  allPassed = false;
}

if (withDuplicatesChecked[1].isDuplicate === false) {
  console.log('[PASS] Row 2 (Junior Operations Executive) correctly NOT flagged as Duplicate');
} else {
  console.error('[FAIL] Row 2 was wrongly flagged as duplicate.');
  allPassed = false;
}

if (allPassed) {
  console.log('\n>>> ALL BULK UPLOAD TEST CASES PASSED (8/8) <<<');
} else {
  console.error('\n>>> SOME BULK UPLOAD TEST CASES FAILED <<<');
  process.exit(1);
}
