/**
 * SERVENTICA — Canonical Phone Normalization Utility
 * Single Responsibility: Validates and normalizes phone numbers into E.164 format.
 */

export interface PhoneValidationResult {
  isValid: boolean;
  raw: string;
  normalized?: string;
  displayNumber?: string;
  error?: string;
}

export class PhoneNormalizer {
  private static readonly DEFAULT_COUNTRY_CODE = '+91';

  /**
   * Normalizes a phone number to canonical E.164 format (e.g. +919876543210).
   * Supports standard 10-digit Indian numbers and numbers already prefixed with country codes.
   */
  public static normalize(input: string): PhoneValidationResult {
    if (!input || typeof input !== 'string') {
      return {
        isValid: false,
        raw: input || '',
        error: 'Please enter a valid mobile number.',
      };
    }

    const trimmed = input.trim();
    // Remove all non-numeric characters except leading plus
    const hasPlus = trimmed.startsWith('+');
    const digitsOnly = trimmed.replace(/[^0-9]/g, '');

    if (!digitsOnly) {
      return {
        isValid: false,
        raw: input,
        error: 'Phone number cannot be empty.',
      };
    }

    // 1. Standard Indian 10-digit mobile number
    if (!hasPlus && digitsOnly.length === 10) {
      // Indian mobile numbers must start with 6, 7, 8, or 9
      if (!/^[6-9]\d{9}$/.test(digitsOnly)) {
        return {
          isValid: false,
          raw: input,
          error: 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.',
        };
      }
      return {
        isValid: true,
        raw: input,
        normalized: `${this.DEFAULT_COUNTRY_CODE}${digitsOnly}`,
        displayNumber: `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`,
      };
    }

    // 2. Indian number entered with 91 prefix without plus (12 digits)
    if (!hasPlus && digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      const actualDigits = digitsOnly.slice(2);
      if (!/^[6-9]\d{9}$/.test(actualDigits)) {
        return {
          isValid: false,
          raw: input,
          error: 'Please enter a valid Indian mobile number.',
        };
      }
      return {
        isValid: true,
        raw: input,
        normalized: `+${digitsOnly}`,
        displayNumber: `+91 ${actualDigits.slice(0, 5)} ${actualDigits.slice(5)}`,
      };
    }

    // 3. Indian number with leading 0 (11 digits: 09876543210)
    if (!hasPlus && digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
      const actualDigits = digitsOnly.slice(1);
      if (!/^[6-9]\d{9}$/.test(actualDigits)) {
        return {
          isValid: false,
          raw: input,
          error: 'Please enter a valid 10-digit mobile number.',
        };
      }
      return {
        isValid: true,
        raw: input,
        normalized: `${this.DEFAULT_COUNTRY_CODE}${actualDigits}`,
        displayNumber: `+91 ${actualDigits.slice(0, 5)} ${actualDigits.slice(5)}`,
      };
    }

    // 4. International number with explicit +
    if (hasPlus && digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      return {
        isValid: true,
        raw: input,
        normalized: `+${digitsOnly}`,
        displayNumber: `+${digitsOnly}`,
      };
    }

    return {
      isValid: false,
      raw: input,
      error: 'Please enter a valid 10-digit mobile number.',
    };
  }

  /**
   * Returns a masked phone number for privacy on OTP screens (e.g. +91 98*** **210)
   */
  public static mask(normalizedPhone: string): string {
    if (!normalizedPhone || normalizedPhone.length < 8) {
      return normalizedPhone;
    }
    const digits = normalizedPhone.replace(/[^0-9]/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      const main = digits.slice(2);
      return `+91 ${main.slice(0, 2)}*** ***${main.slice(-2)}`;
    }
    return `${normalizedPhone.slice(0, 4)}****${normalizedPhone.slice(-3)}`;
  }
}
