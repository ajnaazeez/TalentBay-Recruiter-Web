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
const regions = ['us-central1', 'asia-south1', 'asia-east1', 'asia-northeast1', 'europe-west1', 'us-east1'];

async function test() {
  for (const reg of regions) {
    console.log(`\n=== Testing region: ${reg} ===`);
    const fnService = getFunctions(app, reg);
    for (const fnName of ['createRazorpayOrder', 'verifyRazorpayPayment', 'generateJobDescription', 'deleteUserAccount', 'razorpayWebhook']) {
      try {
        const fn = httpsCallable(fnService, fnName);
        const res = await fn({ planId: 'monthly_1499', amount: 149900, currency: 'INR', paymentId: 'pay_test' });
        console.log(`[${reg}] ${fnName}: SUCCESS`, res.data);
      } catch (err: any) {
        console.log(`[${reg}] ${fnName}: code=${err.code}, message=${err.message}`);
      }
    }
  }
}
test();
