import { SUBSCRIPTION_PLANS } from '../utils/constants';
import { subscriptionService } from '../services/subscriptionService';

console.log('--- Testing Subscription Plans Configuration & Calculations ---');

const expectedPlans = [
  { id: 'trial_60_days_1_rupee', name: 'Trial (60 Days)', price: 1, durationDays: 60 },
  { id: 'monthly_1499', name: 'Monthly Plan', price: 1499, durationDays: 30 },
  { id: 'six_months_8549', name: '6 Months Plan', price: 8549, durationDays: 180 },
  { id: 'yearly_17089', name: 'Yearly Plan', price: 17089, durationDays: 365 },
];

let allPassed = true;

for (const exp of expectedPlans) {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === exp.id);
  const exists = Boolean(plan);
  const priceMatches = plan?.price === exp.price;
  const durationMatches = plan?.durationDays === exp.durationDays;
  const amountPaiseMatches = plan?.amountPaise === exp.price * 100;

  const passed = exists && priceMatches && durationMatches && amountPaiseMatches;
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Plan: ${exp.name} (ID: ${exp.id}) | Price: ₹${plan?.price} | Days: ${plan?.durationDays}`);
  if (!passed) allPassed = false;
}

console.log('\n--- Testing isSubscriptionActive across various dates & plans ---');

const activeScenarios = [
  // 1. Valid future date (native Date)
  {
    recruiter: {
      isSubscribed: true,
      subscriptionPlanId: 'trial_60_days_1_rupee',
      subscriptionExpiry: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
    expected: true,
    desc: 'Active Trial plan expiring in 10 days (Date object)',
  },
  // 2. Valid future date (Firestore Timestamp {seconds})
  {
    recruiter: {
      isSubscribed: true,
      subscriptionPlanId: 'monthly_1499',
      subscriptionExpiry: { seconds: Math.floor((Date.now() + 25 * 24 * 60 * 60 * 1000) / 1000), nanoseconds: 0 },
    },
    expected: true,
    desc: 'Active Monthly plan expiring in 25 days (Firestore Timestamp {seconds})',
  },
  // 3. Valid future date (6 Months)
  {
    recruiter: {
      isSubscribed: true,
      subscriptionPlanId: 'six_months_8549',
      subscriptionExpiry: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString(),
    },
    expected: true,
    desc: 'Active 6 Months plan expiring in 150 days (ISO string)',
  },
  // 4. Valid future date (Yearly)
  {
    recruiter: {
      isSubscribed: true,
      subscriptionPlanId: 'yearly_17089',
      subscriptionExpiry: { toDate: () => new Date(Date.now() + 300 * 24 * 60 * 60 * 1000) },
    },
    expected: true,
    desc: 'Active Yearly plan expiring in 300 days (Timestamp with toDate())',
  },
  // 5. Expired plan (past date)
  {
    recruiter: {
      isSubscribed: true,
      subscriptionPlanId: 'monthly_1499',
      subscriptionExpiry: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    expected: false,
    desc: 'Expired Monthly plan from 5 days ago',
  },
  // 6. isSubscribed = false
  {
    recruiter: {
      isSubscribed: false,
      subscriptionPlanId: null,
      subscriptionExpiry: null,
    },
    expected: false,
    desc: 'Unsubscribed recruiter',
  },
];

for (const sc of activeScenarios) {
  const result = subscriptionService.isSubscriptionActive(sc.recruiter as any);
  const passed = result === sc.expected;
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${sc.desc} -> Result: ${result} (Expected: ${sc.expected})`);
  if (!passed) allPassed = false;
}

console.log('\n--- Testing isTrialEligible ---');

const trialScenarios = [
  { recruiter: null, expected: true, desc: 'New visitor (null)' },
  { recruiter: { uid: '123', subscriptionPlanId: null, subscriptionTier: null }, expected: true, desc: 'Recruiter with no prior plan' },
  { recruiter: { uid: '123', subscriptionPlanId: 'trial_60_days_1_rupee' }, expected: false, desc: 'Recruiter already used Trial plan' },
  { recruiter: { uid: '123', subscriptionPlanId: 'monthly_1499' }, expected: false, desc: 'Recruiter on Monthly plan' },
];

for (const ts of trialScenarios) {
  const result = subscriptionService.isTrialEligible(ts.recruiter as any);
  const passed = result === ts.expected;
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${ts.desc} -> Result: ${result} (Expected: ${ts.expected})`);
  if (!passed) allPassed = false;
}

if (allPassed) {
  console.log('\n>>> ALL SUBSCRIPTION TEST CASES PASSED SUCCESSFULLY! <<<');
} else {
  console.error('\n>>> SOME SUBSCRIPTION TEST CASES FAILED! <<<');
  process.exit(1);
}
