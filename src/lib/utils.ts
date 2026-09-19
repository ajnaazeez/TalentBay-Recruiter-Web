import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names safely with Tailwind CSS precedence.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
