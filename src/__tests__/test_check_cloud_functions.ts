import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyAarMLucoV5VLTK-2_d1P7oBr3xldejylQ',
  authDomain: 'talent-bay-d0b92.firebaseapp.com',
  projectId: 'talent-bay-d0b92',
  storageBucket: 'talent-bay-d0b92.firebasestorage.app',
  messagingSenderId: '615421954739',
  appId: '1:615421954739:web:9c042c9634ddf543627ec6',
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, 'us-central1');

async function checkFunction(name: string, payload: any) {
  console.log(`Checking function: ${name}...`);
  try {
    const fn = httpsCallable(functions, name);
    const result = await fn(payload);
    console.log(`[SUCCESS] ${name}:`, result.data);
  } catch (err: any) {
    console.log(`[RESULT] ${name}: code=${err.code}, message=${err.message}`);
  }
}

async function run() {
  await checkFunction('createRazorpayOrder', { planId: 'trial_60_days_1_rupee', amount: 100, currency: 'INR' });
  await checkFunction('verifyRazorpayPayment', { paymentId: 'pay_test', planId: 'trial_60_days_1_rupee' });
  await checkFunction('generateJobDescription', { skills: ['React'] });
  await checkFunction('razorpayWebhook', {});
}

run();
