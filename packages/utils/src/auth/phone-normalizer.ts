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

    // Convert Unicode / Fullwidth numerals to ASCII digits and trim
    const normalizedInput = input
      .trim()
      .normalize('NFKC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '');

    const hasPlus = normalizedInput.startsWith('+');
    // Extract only standard digits
    const digitsOnly = normalizedInput.replace(/[^0-9]/g, '');

    if (!digitsOnly) {
      return {
        isValid: false,
        raw: input,
        error: 'Phone number cannot be empty.',
      };
    }

    let coreTenDigits: string | null = null;

    // Case 1: Exactly 10 digits
    if (digitsOnly.length === 10) {
      coreTenDigits = digitsOnly;
    }
    // Case 2: 11 digits starting with '0' (e.g., 09876543210)
    else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
      coreTenDigits = digitsOnly.slice(1);
    }
    // Case 3: 12 digits starting with '91' (e.g., 919876543210 or +919876543210)
    else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      coreTenDigits = digitsOnly.slice(2);
    }
    // Case 4: 13 digits starting with '091'
    else if (digitsOnly.length === 13 && digitsOnly.startsWith('091')) {
      coreTenDigits = digitsOnly.slice(3);
    }
    // Case 5: 14 digits with double country code e.g. 91919876543210
    else if (digitsOnly.length === 14 && digitsOnly.startsWith('9191')) {
      coreTenDigits = digitsOnly.slice(4);
    }

    // Validate standard Indian mobile format: ^[6-9][0-9]{9}$
    if (coreTenDigits && /^[6-9]\d{9}$/.test(coreTenDigits)) {
      return {
        isValid: true,
        raw: input,
        normalized: `${this.DEFAULT_COUNTRY_CODE}${coreTenDigits}`,
        displayNumber: `+91 ${coreTenDigits.slice(0, 5)} ${coreTenDigits.slice(5)}`,
      };
    }

    // If international format with explicit '+' and 10-15 digits (non-Indian or special)
    if (hasPlus && digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      // If it starts with 91, validate Indian rules
      if (digitsOnly.startsWith('91')) {
        const potentialIndian = digitsOnly.slice(2);
        if (potentialIndian.length === 10 && /^[6-9]\d{9}$/.test(potentialIndian)) {
          return {
            isValid: true,
            raw: input,
            normalized: `+${digitsOnly}`,
            displayNumber: `+91 ${potentialIndian.slice(0, 5)} ${potentialIndian.slice(5)}`,
          };
        }
        return {
          isValid: false,
          raw: input,
          error: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
        };
      }

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
      error: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
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
