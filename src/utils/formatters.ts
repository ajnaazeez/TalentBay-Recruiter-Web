/**
 * Formats a currency amount into standard INR currency string.
 */
export function formatCurrencyINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Safely parses any date or Firestore Timestamp representation into a Date object.
 */
export function parseFirestoreDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  if (typeof val === 'object' && val !== null && 'seconds' in val && typeof (val as { seconds: number }).seconds === 'number') {
    return new Date((val as { seconds: number }).seconds * 1000);
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Formats date into readable string.
 */
export function formatDate(dateInput: unknown): string {
  const date = parseFirestoreDate(dateInput);
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Truncates text with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Capitalizes the first letter of each word in a string.
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Determines whether the recruiter is a newly registered / first-time user vs an existing returning user.
 */
export function isNewRecruiterUser(
  user?: { metadata?: { creationTime?: string; lastSignInTime?: string } } | null
): boolean {
  if (typeof window !== 'undefined') {
    try {
      const sessionFlag = sessionStorage.getItem('tb_is_new_registration');
      if (sessionFlag === 'true') return true;
    } catch {
      // ignore
    }
  }

  if (!user?.metadata) return false;

  const creationTime = user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : 0;
  const lastSignInTime = user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).getTime() : 0;

  if (creationTime > 0 && lastSignInTime > 0) {
    const isInitialSession = Math.abs(lastSignInTime - creationTime) < 10000;
    const isRecent = Date.now() - creationTime < 30 * 60 * 1000; // within last 30 minutes
    if (isInitialSession && isRecent) {
      return true;
    }
  }

  return false;
}
