/**
 * Centralized Firebase Auth and API Error Mapping Utility
 * Translates technical error codes and Firebase errors into clear, user-friendly messages.
 */

export function formatAuthErrorMessage(err: unknown): string {
  if (!err) return 'An unexpected error occurred. Please try again.';

  if (typeof err === 'string') {
    return mapCodeOrMessage('', err);
  }

  if (typeof err === 'object' && err !== null) {
    const errorObj = err as { code?: string; message?: string };
    const code = String(errorObj.code || '');
    const msg = String(errorObj.message || '');
    return mapCodeOrMessage(code, msg);
  }

  return "We couldn't create your account right now. Please try again.";
}

function mapCodeOrMessage(code: string, msg: string): string {
  const combined = `${code} ${msg}`.toLowerCase();

  // 1. Existing Account / Credential Collisions (Both Email and Phone)
  if (
    combined.includes('email-and-phone-already-in-use') ||
    (combined.includes('email') && combined.includes('phone') && (combined.includes('already exists') || combined.includes('already in use')))
  ) {
    return 'An account already exists with this email address or phone number. Please sign in instead.';
  }

  // 2. Existing Account / Credential Collisions (Email)
  if (
    combined.includes('auth/email-already-in-use') ||
    combined.includes('auth/email-already-exists') ||
    combined.includes('email-already-in-use') ||
    combined.includes('email-already-exists')
  ) {
    return 'An account already exists with this email address. Please sign in instead.';
  }

  // 2. Existing Account / Credential Collisions (Phone)
  if (
    combined.includes('auth/phone-number-already-exists') ||
    combined.includes('auth/phone-number-already-in-use') ||
    combined.includes('phone-number-already-exists') ||
    combined.includes('phone-number-already-in-use') ||
    combined.includes('auth/credential-already-in-use') ||
    combined.includes('credential-already-in-use') ||
    combined.includes('phone number is already registered') ||
    combined.includes('already exists with this phone number')
  ) {
    return 'An account already exists with this phone number. Please sign in instead.';
  }

  // Firebase Storage Errors
  if (
    combined.includes('storage/unauthorized') ||
    combined.includes('user does not have permission to access')
  ) {
    return 'Permission denied when accessing Firebase Storage. Please check storage rules or permissions.';
  }

  if (combined.includes('storage/quota-exceeded')) {
    return 'Firebase Storage quota exceeded. Please contact support.';
  }

  if (combined.includes('storage/canceled')) {
    return 'Upload was canceled.';
  }

  if (combined.includes('storage/object-not-found')) {
    return 'File does not exist in storage.';
  }

  if (
    combined.includes('auth/account-exists-with-different-credential') ||
    combined.includes('account-exists-with-different-credential')
  ) {
    return 'An account already exists with this email using a different sign-in method. Please sign in with your original method.';
  }

  // 3. Invalid Email Format
  if (
    combined.includes('auth/invalid-email') ||
    combined.includes('invalid-email') ||
    combined.includes('invalid_email') ||
    combined.includes('missing-email')
  ) {
    return 'Please enter a valid email address.';
  }

  // 4. Weak Password
  if (
    combined.includes('auth/weak-password') ||
    combined.includes('weak-password') ||
    combined.includes('password-should-be-at-least-6-characters')
  ) {
    return 'Your password is too weak. Please use a stronger password (at least 6 characters).';
  }

  // 5. Authentication / Recruiter Account Existence Failures (Login specific)
  if (
    combined.includes('no recruiter account found with this mobile number') ||
    combined.includes('auth/recruiter-not-found') ||
    combined.includes('recruiter-not-found')
  ) {
    return 'No recruiter account found with this mobile number. Please create an account first.';
  }

  if (
    combined.includes('no recruiter account found with this email') ||
    combined.includes('auth/user-not-found') ||
    combined.includes('user-not-found')
  ) {
    return 'No recruiter account found with this email. Invalid email or password.';
  }

  if (
    combined.includes('auth/wrong-password') ||
    combined.includes('wrong-password')
  ) {
    return 'Incorrect password. Invalid email or password.';
  }

  if (
    combined.includes('auth/invalid-credential') ||
    combined.includes('invalid-credential')
  ) {
    return 'Invalid credentials. Please verify your login details and try again.';
  }

  if (
    combined.includes('auth/user-disabled') ||
    combined.includes('user-disabled')
  ) {
    return 'This account has been disabled. Please contact support.';
  }

  // 6. Phone Number Validation
  if (
    combined.includes('auth/invalid-phone-number') ||
    combined.includes('invalid-phone-number') ||
    combined.includes('missing-phone-number')
  ) {
    return 'Please enter a valid 10-digit mobile number.';
  }

  // 7. Invalid OTP
  if (
    combined.includes('auth/invalid-verification-code') ||
    combined.includes('invalid-verification-code') ||
    combined.includes('auth/invalid-verification-id') ||
    combined.includes('invalid-verification-id') ||
    combined.includes('auth/invalid-otp') ||
    combined.includes('invalid-otp')
  ) {
    return 'The OTP is incorrect. Please check the code and try again.';
  }

  // 8. Expired OTP
  if (
    combined.includes('auth/code-expired') ||
    combined.includes('code-expired') ||
    combined.includes('auth/session-expired') ||
    combined.includes('session-expired')
  ) {
    return 'This OTP has expired. Please request a new OTP.';
  }

  // 9. Too Many Requests / Quota Exceeded
  if (
    combined.includes('auth/too-many-requests') ||
    combined.includes('too-many-requests') ||
    combined.includes('auth/quota-exceeded') ||
    combined.includes('quota-exceeded')
  ) {
    return 'Too many attempts. Please wait a while and try again.';
  }

  // 10. Network Errors
  if (
    combined.includes('auth/network-request-failed') ||
    combined.includes('network-request-failed') ||
    combined.includes('auth/unavailable') ||
    combined.includes('unavailable') ||
    combined.includes('failed to fetch') ||
    combined.includes('network error') ||
    combined.includes('networkrequestfailed')
  ) {
    return 'Unable to create your account. Please check your internet connection and try again.';
  }

  // 11. Operation not allowed
  if (
    combined.includes('auth/operation-not-allowed') ||
    combined.includes('operation-not-allowed')
  ) {
    return 'This sign-in method is currently not enabled. Please contact support.';
  }

  // 12. Internal / Unknown Server Errors
  if (
    combined.includes('auth/internal-error') ||
    combined.includes('internal-error') ||
    combined.includes('auth/unknown')
  ) {
    return "We couldn't create your account right now. Please try again.";
  }

  // 13. If code is empty and msg is already a clean human-readable sentence (not technical Firebase wrapper)
  if (
    !code &&
    msg &&
    !msg.startsWith('Firebase:') &&
    !msg.startsWith('auth/') &&
    !msg.includes('Error (auth/') &&
    !msg.includes('internal') &&
    !msg.includes('exception')
  ) {
    return msg.replace(/^Error:\s*/i, '');
  }

  // 14. Fallback for Internal / Unknown Server Errors
  return "We couldn't create your account right now. Please try again.";
}
