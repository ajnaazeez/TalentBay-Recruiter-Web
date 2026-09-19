import { cryptoUtils } from '../utils/cryptoUtils';

console.log('================================================================');
console.log('TEST SUITE: Candidate Notification Decryption & Display');
console.log('================================================================\n');

let allPassed = true;

async function runTests() {
  // Test 1: The exact ciphertext from user's screenshot
  const targetCipher = 'PVsyHn8VhEvpLIPbprIDAQ==';
  const decryptedTarget = await cryptoUtils.decrypt(targetCipher);
  const t1_passed = decryptedTarget === 'hi';
  console.log(`[${t1_passed ? 'PASS' : 'FAIL'}] Decrypt target ciphertext: "${targetCipher}" -> "${decryptedTarget}" (Expected: "hi")`);
  if (!t1_passed) allPassed = false;

  // Test 2: Standard test vector
  const testVector = 'HVdQfB473SqVTDnQrbJICg==';
  const decryptedVector = await cryptoUtils.decrypt(testVector);
  const t2_passed = decryptedVector === 'Hello World';
  console.log(`[${t2_passed ? 'PASS' : 'FAIL'}] Decrypt test vector: "${testVector}" -> "${decryptedVector}" (Expected: "Hello World")`);
  if (!t2_passed) allPassed = false;

  // Test 3: Realistic candidate message
  const originalCandidateMsg = 'Hi, I am interested in this position. Can we schedule an interview?';
  const encryptedCandidateMsg = await cryptoUtils.encrypt(originalCandidateMsg);
  const decryptedCandidateMsg = await cryptoUtils.decrypt(encryptedCandidateMsg);
  const t3_passed = decryptedCandidateMsg === originalCandidateMsg;
  console.log(`[${t3_passed ? 'PASS' : 'FAIL'}] Encrypt/Decrypt candidate message: "${decryptedCandidateMsg}"`);
  if (!t3_passed) allPassed = false;

  // Test 4: Plain text notifications (e.g. Candidate Matched) should remain untouched
  const matchedNotificationText = 'Candidate has been matched for Senior Flutter Developer.';
  const decryptedMatchedText = await cryptoUtils.decrypt(matchedNotificationText);
  const t4_passed = decryptedMatchedText === matchedNotificationText;
  console.log(`[${t4_passed ? 'PASS' : 'FAIL'}] Plaintext notification passthrough: "${decryptedMatchedText}"`);
  if (!t4_passed) allPassed = false;

  console.log('\n================================================================');
  if (allPassed) {
    console.log('>>> ALL NOTIFICATION DECRYPTION & DISPLAY TESTS PASSED (100%) <<<');
  } else {
    console.error('>>> AT LEAST ONE TEST FAILED <<<');
    process.exit(1);
  }
  console.log('================================================================\n');
}

runTests();
