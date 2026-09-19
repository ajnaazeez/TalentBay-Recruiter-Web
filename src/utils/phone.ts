/**
 * Canonical Phone Normalization & Search Variant Utility
 * Normalizes phone numbers to standard E.164 format and generates variant permutations
 * for reliable uniqueness querying across Firestore collections (handling legacy un-normalized data).
 */

export function normalizePhoneNumber(
  rawPhone: string | null | undefined,
  defaultCountryCode = '+91'
): string {
  if (!rawPhone) return '';

  const trimmed = String(rawPhone).trim();
  if (!trimmed) return '';

  const cleanCC = defaultCountryCode.startsWith('+')
    ? defaultCountryCode
    : `+${defaultCountryCode}`;

  const hasPlus = trimmed.startsWith('+');
  let digitsOnly = trimmed.replace(/\D/g, '');

  if (!digitsOnly) return '';

  // If input had a country code with a leading 0 before the 10-digit number (e.g. +91 0 7306420827 or 9107306420827)
  if (digitsOnly.length === 13 && digitsOnly.startsWith('910')) {
    digitsOnly = `91${digitsOnly.slice(3)}`;
  }

  // If already had leading +
  if (hasPlus) {
    if (digitsOnly.length === 10) {
      return `${cleanCC}${digitsOnly}`;
    }
    return `+${digitsOnly}`;
  }

  // If 10 digits (standard Indian mobile number)
  if (digitsOnly.length === 10) {
    return `${cleanCC}${digitsOnly}`;
  }

  // If 11 digits starting with 0 (e.g. 07306420827)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    const last10 = digitsOnly.slice(1);
    return `${cleanCC}${last10}`;
  }

  // If 12 digits starting with 91 (e.g. 917306420827)
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return `+${digitsOnly}`;
  }

  // Default fallback for international numbers without +
  if (digitsOnly.length > 10) {
    return `+${digitsOnly}`;
  }

  return `${cleanCC}${digitsOnly}`;
}

/**
 * Generates all search variants of a phone number to match against legacy and formatted records in Firestore.
 */
export function getPhoneSearchVariants(
  rawPhone: string | null | undefined,
  defaultCountryCode = '+91'
): string[] {
  if (!rawPhone) return [];

  const raw = String(rawPhone).trim();
  if (!raw) return [];

  const normalized = normalizePhoneNumber(raw, defaultCountryCode);
  const digitsOnly = raw.replace(/\D/g, '');
  const last10 = digitsOnly.slice(-10);

  const variants = new Set<string>();

  // 1. Normalized E.164 (e.g. +917306420827)
  if (normalized) variants.add(normalized);

  // 2. Raw input trimmed
  variants.add(raw);

  // 3. Digits only (e.g. 917306420827 or 7306420827)
  if (digitsOnly) variants.add(digitsOnly);

  // 4. Last 10 digits (e.g. 7306420827)
  if (last10) {
    variants.add(last10);
    // 5. With 0 prefix (e.g. 07306420827)
    variants.add(`0${last10}`);
    // 6. With 91 prefix without + (e.g. 917306420827)
    variants.add(`91${last10}`);
    // 7. Standard E.164 with +91
    variants.add(`+91${last10}`);
    // 8. With space (e.g. +91 7306420827)
    variants.add(`+91 ${last10}`);
    // 9. Standard 5-5 split (e.g. +91 73064 20827)
    variants.add(`+91 ${last10.slice(0, 5)} ${last10.slice(5)}`);
    // 10. Hyphenated (e.g. +91-7306420827)
    variants.add(`+91-${last10}`);
  }

  return Array.from(variants).filter(Boolean);
}

/**
 * Validates if the phone number string represents a valid mobile number (at least 10 digits).
 */
export function isValidPhoneNumber(rawPhone: string | null | undefined): boolean {
  if (!rawPhone) return false;
  const digits = String(rawPhone).replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}
