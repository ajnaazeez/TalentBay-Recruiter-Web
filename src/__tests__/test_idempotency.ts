async function testIdempotency() {
  console.log('--- Testing Webhook Idempotency with fixed paymentId ---');
  const fixedPaymentId = 'pay_fixed_idempotency_12345';
  
  const payload = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: fixedPaymentId,
          amount: 149900,
          currency: 'INR',
          status: 'captured',
          notes: {
            uid: 'test_recruiter_dummy',
            planId: 'monthly_1499',
          },
        },
      },
    },
  };

  // 1st delivery
  const res1 = await fetch('https://us-central1-talent-bay-d0b92.cloudfunctions.net/razorpayWebhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data1 = await res1.json();
  console.log('First delivery response:', data1);

  // 2nd delivery (duplicate webhook)
  const res2 = await fetch('https://us-central1-talent-bay-d0b92.cloudfunctions.net/razorpayWebhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data2 = await res2.json();
  console.log('Second (duplicate) delivery response:', data2);

  if (data2.alreadyProcessed) {
    console.log('[PASS] Idempotency successfully verified! Duplicate webhook recognized.');
  } else {
    console.error('[FAIL] Duplicate webhook was not detected as alreadyProcessed.');
  }
}

testIdempotency();
