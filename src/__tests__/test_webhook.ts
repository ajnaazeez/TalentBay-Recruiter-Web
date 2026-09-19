async function testWebhook() {
  console.log('--- Testing razorpayWebhook HTTP endpoint ---');
  try {
    const res = await fetch('https://us-central1-talent-bay-d0b92.cloudfunctions.net/razorpayWebhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_webhook_' + Date.now(),
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
      }),
    });

    const data = await res.json();
    console.log('[SUCCESS] Webhook response:', data);
  } catch (err: any) {
    console.error('[ERROR] Webhook call failed:', err);
  }
}

testWebhook();
