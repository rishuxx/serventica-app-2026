/**
 * Currency, date formatting and mobile error utilities for Serventica India launch.
 */

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export * from './mobile-error';
export * from './storage/safe-storage';
export * from './auth/phone-normalizer';
export * from './auth/auth-error-mapper';
