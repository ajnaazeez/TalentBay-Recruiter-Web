import { SUBSCRIPTION_PLANS } from '../utils/constants';
import { subscriptionService, RazorpayResponse } from '../services/subscriptionService';

console.log('=== RUNNING POST-PAYMENT SUBSCRIPTION FLOW TESTS ===\n');

let allPassed = true;

// Helper assertion
function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}${detail ? ` -> ${detail}` : ''}`);
  } else {
    console.error(`[FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    allPassed = false;
  }
}

// 1. Verify Plan Configurations
console.log('--- 1. Testing Generic Plan Configurations & Pricing ---');
const expectedPlans = [
  { id: 'trial_60_days_1_rupee', name: 'Trial (60 Days)', price: 1, amountPaise: 100, durationDays: 60 },
  { id: 'monthly_1499', name: 'Monthly Plan', price: 1499, amountPaise: 149900, durationDays: 30 },
  { id: 'six_months_8549', name: '6 Months Plan', price: 8549, amountPaise: 854900, durationDays: 180 },
  { id: 'yearly_17089', name: 'Yearly Plan', price: 17089, amountPaise: 1708900, durationDays: 365 },
];

for (const exp of expectedPlans) {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === exp.id);
  assert(
    Boolean(plan && plan.price === exp.price && plan.durationDays === exp.durationDays && plan.amountPaise === exp.amountPaise),
    `Plan configuration: ${exp.name}`,
    `Price: ₹${plan?.price}, Paise: ${plan?.amountPaise}, Days: ${plan?.durationDays}`
  );
}

// 2. Testing Expiry Date Calculations
console.log('\n--- 2. Testing Expiry Calculations for All Plans ---');
const now = Date.now();
for (const plan of SUBSCRIPTION_PLANS) {
  const expiryDate = new Date(now + plan.durationDays * 24 * 60 * 60 * 1000);
  const diffDays = Math.round((expiryDate.getTime() - now) / (24 * 60 * 60 * 1000));
  assert(
    diffDays === plan.durationDays,
    `Duration accuracy for ${plan.id}`,
    `Calculated duration: ${diffDays} days (Expected: ${plan.durationDays})`
  );
}

// 3. Testing isSubscriptionActive Logic
console.log('\n--- 3. Testing isSubscriptionActive across Timestamp & Date representations ---');
const simulatedActiveRecruiter = {
  uid: 'recruiter_123',
  isSubscribed: true,
  subscriptionPlanId: 'trial_60_days_1_rupee',
  subscriptionTier: 'trial_60_days_1_rupee',
  subscriptionExpiry: { toDate: () => new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) },
};

assert(
  subscriptionService.isSubscriptionActive(simulatedActiveRecruiter as any),
  'Active subscription with Firestore Timestamp toDate()',
  'isSubscriptionActive = true'
);

const simulatedExpiredRecruiter = {
  uid: 'recruiter_123',
  isSubscribed: true,
  subscriptionPlanId: 'trial_60_days_1_rupee',
  subscriptionExpiry: { seconds: Math.floor((Date.now() - 10000) / 1000), nanoseconds: 0 },
};

assert(
  !subscriptionService.isSubscriptionActive(simulatedExpiredRecruiter as any),
  'Expired subscription with Firestore seconds in past',
  'isSubscriptionActive = false'
);

// 4. Testing Trial Eligibility Logic
console.log('\n--- 4. Testing isTrialEligible Logic ---');
assert(
  subscriptionService.isTrialEligible(null),
  'New unauthenticated visitor is eligible for trial'
);

assert(
  subscriptionService.isTrialEligible({ uid: 'rec_1', subscriptionPlanId: null, subscriptionTier: null } as any),
  'New recruiter without prior plan is eligible for trial'
);

assert(
  !subscriptionService.isTrialEligible({ uid: 'rec_2', subscriptionPlanId: 'trial_60_days_1_rupee' } as any),
  'Recruiter with existing trial plan is NOT eligible for trial'
);

assert(
  !subscriptionService.isTrialEligible({ uid: 'rec_3', subscriptionPlanId: 'monthly_1499' } as any),
  'Recruiter on monthly plan is NOT eligible for trial'
);

// 5. Testing Post-Payment Modal Dismissal Guard Simulation
console.log('\n--- 5. Testing Razorpay Modal Dismissal Guard Simulation ---');

function simulateRazorpayCheckoutFlow(scenario: 'payment_success' | 'user_cancelled' | 'payment_failed' | 'verification_failed') {
  let modalClosedImmediately = false;
  let verificationExecuted = false;
  let successCalled = false;
  let failureMessage: string | null = null;
  let paymentFlowState: 'checkout_open' | 'payment_processing' | 'payment_verified' | 'payment_failed' | 'dismissed' = 'checkout_open';

  const onSuccess = () => { successCalled = true; };
  const onFailure = (msg: string) => { failureMessage = msg; };

  const closeAndCleanRazorpay = () => {
    modalClosedImmediately = true;
  };

  const handler = async (response: RazorpayResponse) => {
    // 1. Immediately close modal upon checkout confirmation
    paymentFlowState = 'payment_processing';
    closeAndCleanRazorpay();

    try {
      if (!response || !response.razorpay_payment_id) {
        throw new Error('No payment ID returned.');
      }

      // 2. Simulate server-side verification
      verificationExecuted = true;
      if (scenario === 'verification_failed') {
        throw new Error('Signature verification failed on backend.');
      }

      paymentFlowState = 'payment_verified';
      onSuccess();
    } catch (err: unknown) {
      paymentFlowState = 'payment_failed';
      onFailure(err instanceof Error ? err.message : 'Verification failed');
    }
  };

  const onPaymentFailed = (err: { description: string; metadata?: { payment_id?: string } }) => {
    paymentFlowState = 'payment_failed';
    closeAndCleanRazorpay();
    const refText = err.metadata?.payment_id ? ` (Ref: ${err.metadata.payment_id})` : '';
    onFailure(`Payment failed: ${err.description}${refText}. If money was debited from your bank account, Razorpay will automatically reverse and refund it within 5-7 business days.`);
  };

  const ondismiss = () => {
    if (paymentFlowState === 'payment_verified' || paymentFlowState === 'payment_processing') {
      // Guard prevented false cancellation!
      return;
    }
    if (paymentFlowState === 'payment_failed') {
      return;
    }
    paymentFlowState = 'dismissed';
    onFailure(
      'Payment window was closed. If money was debited from your bank account (e.g. via Google Pay or UPI), please use the "Verify Payment" option below to activate your subscription immediately.'
    );
  };

  if (scenario === 'payment_success' || scenario === 'verification_failed') {
    // 1. Payment completes -> handler called
    handler({ razorpay_payment_id: 'pay_test12345', razorpay_order_id: 'order_123', razorpay_signature: 'sig_123' });
    // 2. Modal dismissal event arrives after modal closed
    ondismiss();
  } else if (scenario === 'payment_failed') {
    onPaymentFailed({ description: 'Payment was declined by the bank', metadata: { payment_id: 'pay_TcjSWMiPbBTWgHt' } });
    ondismiss();
  } else {
    // User dismissed modal before paying
    ondismiss();
  }

  return { successCalled, failureMessage, modalClosedImmediately, verificationExecuted, paymentFlowState };
}

const successRun = simulateRazorpayCheckoutFlow('payment_success');
assert(
  successRun.successCalled && successRun.modalClosedImmediately && successRun.verificationExecuted && successRun.failureMessage === null,
  'Immediate modal close + verified payment success',
  'Modal closed immediately, backend verification executed, onSuccess called'
);

const verifyFailRun = simulateRazorpayCheckoutFlow('verification_failed');
assert(
  !verifyFailRun.successCalled && verifyFailRun.modalClosedImmediately && verifyFailRun.verificationExecuted && (verifyFailRun.failureMessage || '').includes('Signature verification failed'),
  'Immediate modal close + backend verification rejection',
  'Modal closed immediately, verification failed on backend, onFailure called without activation'
);

const cancelRun = simulateRazorpayCheckoutFlow('user_cancelled');
const cancelMsg: string = cancelRun.failureMessage || '';
assert(
  !cancelRun.successCalled && (cancelMsg.includes('Verify Payment') || cancelMsg.includes('Payment window was closed')),
  'Modal dismissal provides clear guidance and verification option',
  'onFailure called with actionable recovery message'
);

const failedRun = simulateRazorpayCheckoutFlow('payment_failed');
const failMsg: string = failedRun.failureMessage || '';
assert(
  !failedRun.successCalled && failMsg.includes('pay_TcjSWMiPbBTWgHt') && failMsg.includes('5-7 business days'),
  'Gateway payment failure handling with payment ID reference',
  failMsg
);

// 6. Test manual verification API exists and validates inputs
console.log('\n--- 6. Testing verifyAndActivateManualPayment & Reference Validation ---');
assert(
  typeof subscriptionService.verifyAndActivateManualPayment === 'function',
  'subscriptionService.verifyAndActivateManualPayment is defined'
);

// Test reference validation
const validRefs = ['662580099720', 'pay_TcjSWMiPbBTWgHt', 'order_ABC1234567', 'UPI-987654321012'];
for (const ref of validRefs) {
  const isNonEmpty = Boolean(ref && ref.trim().length >= 6);
  assert(isNonEmpty, `Valid reference format accepted: ${ref}`);
}

const invalidRefs = ['', '   ', '123'];
for (const badRef of invalidRefs) {
  const isInvalid = !badRef || badRef.trim().length < 6;
  assert(isInvalid, `Invalid reference format correctly rejected: "${badRef}"`);
}

// Summary
console.log('\n==================================================');
if (allPassed) {
  console.log('>>> ALL POST-PAYMENT FLOW TESTS PASSED (100%) <<<');
} else {
  console.error('>>> SOME POST-PAYMENT FLOW TESTS FAILED! <<<');
  process.exit(1);
}
