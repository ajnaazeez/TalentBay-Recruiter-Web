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

async function testCases() {
  const fn = httpsCallable<any, any>(functions, 'validateRecruiterRegistration');

  console.log('\n--- TEST CASE: User with deleted candidate account (fathimaajna33@gmail.com, +917306420827) ---');
  const res1 = await fn({
    email: 'fathimaajna33@gmail.com',
    phoneNumber: '+917306420827',
  });
  console.log('Result 1 (Target user):', res1.data);
  if (res1.data.valid === true && res1.data.isCandidate === false) {
    console.log('PASS: User is allowed to register as a new recruiter!');
  } else {
    console.error('FAIL: User was blocked incorrectly:', res1.data);
  }

  console.log('\n--- TEST CASE: Completely fresh dummy email & phone ---');
  const freshRes = await fn({
    email: `recruiter_fresh_${Date.now()}@testcompany.org`,
    phoneNumber: '+919999988888',
  });
  console.log('Result fresh:', freshRes.data);
  if (freshRes.data.valid === true) {
    console.log('PASS: Completely fresh user allowed!');
  } else {
    console.error('FAIL: Fresh user blocked:', freshRes.data);
  }

  console.log('\n--- TEST CASE: checkRecruiterPhoneForSignIn with target phone ---');
  const checkPhoneFn = httpsCallable<any, any>(functions, 'checkRecruiterPhoneForSignIn');
  const phoneRes = await checkPhoneFn({ phoneNumber: '+917306420827' });
  console.log('Result checkRecruiterPhoneForSignIn:', phoneRes.data);
  if (phoneRes.data.exists === false) {
    console.log('PASS: Phone is not recognized as existing recruiter for sign in before registration!');
  } else {
    console.log('Notice phone sign in status:', phoneRes.data);
  }
}

testCases().catch(console.error);
