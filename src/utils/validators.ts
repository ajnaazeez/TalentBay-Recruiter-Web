/**
 * Centralized Form & Authentication Input Validators
 */

/**
 * Validates whether an email address is strictly formatted.
 * Rejects inputs like: 'abc', 'abc@', 'abc@domain', '@gmail.com', 'user@.com', 'user@domain.'
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const trimmed = String(email).trim().toLowerCase();
  if (!trimmed || trimmed.length < 5 || trimmed.length > 254) return false;

  // Strict email regex requiring non-empty local part, valid domain, and a TLD with at least 2 alpha characters
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(trimmed)) return false;

  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;

  const [localPart, domainPart] = parts;
  if (!localPart || !domainPart) return false;
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) return false;

  if (!domainPart.includes('.')) return false;
  if (domainPart.startsWith('.') || domainPart.endsWith('.') || domainPart.includes('..')) return false;

  const domainSegments = domainPart.split('.');
  const tld = domainSegments[domainSegments.length - 1];
  if (!tld || tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) return false;

  return true;
}

/**
 * Validates if the phone number string contains a valid mobile number (10 to 15 digits).
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits || digits.length < 10 || digits.length > 15) return false;
  return true;
}
