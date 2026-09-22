import { PhoneNormalizer } from '../packages/utils/src/auth/phone-normalizer';
import { AuthErrorMapper } from '../packages/utils/src/auth/auth-error-mapper';

describe('PhoneNormalizer — Indian Mobile Format & Edge Cases', () => {
  it('should normalize standard 10-digit Indian mobile numbers starting with 6, 7, 8, 9', () => {
    const validNumbers = ['9876543210', '8876543210', '7876543210', '6876543210'];
    validNumbers.forEach((num) => {
      const res = PhoneNormalizer.normalize(num);
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe(`+91${num}`);
      expect(res.displayNumber).toBe(`+91 ${num.slice(0, 5)} ${num.slice(5)}`);
    });
  });

  it('should reject numbers starting with 0, 1, 2, 3, 4, 5', () => {
    const invalidNumbers = ['5876543210', '4876543210', '3876543210', '2876543210', '1876543210'];
    invalidNumbers.forEach((num) => {
      const res = PhoneNormalizer.normalize(num);
      expect(res.isValid).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  it('should normalize phone numbers with +91 prefix, spaces, dashes, and brackets', () => {
    const variations = [
      '+91 98765 43210',
      '+91-98765-43210',
      '+91 (987) 654-3210',
      ' +91 9876543210 ',
    ];
    variations.forEach((num) => {
      const res = PhoneNormalizer.normalize(num);
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('+919876543210');
    });
  });

  it('should normalize phone numbers with leading 0 or 091 prefix', () => {
    expect(PhoneNormalizer.normalize('09876543210').normalized).toBe('+919876543210');
    expect(PhoneNormalizer.normalize('0919876543210').normalized).toBe('+919876543210');
  });

  it('should handle duplicate country codes e.g. 91919876543210', () => {
    const res = PhoneNormalizer.normalize('91919876543210');
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe('+919876543210');
  });

  it('should handle fullwidth Unicode numerals', () => {
    // ９８７６５４３２１０ in fullwidth Unicode
    const fullwidth = '\uFF19\uFF18\uFF17\uFF16\uFF15\uFF14\uFF13\uFF12\uFF11\uFF10';
    const res = PhoneNormalizer.normalize(fullwidth);
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe('+919876543210');
  });

  it('should reject invalid length numbers', () => {
    expect(PhoneNormalizer.normalize('98765').isValid).toBe(false);
    expect(PhoneNormalizer.normalize('9876543210123456').isValid).toBe(false);
    expect(PhoneNormalizer.normalize('').isValid).toBe(false);
  });

  it('should reject non-numeric input and letters', () => {
    expect(PhoneNormalizer.normalize('abcd efghij').isValid).toBe(false);
    expect(PhoneNormalizer.normalize('98765abcde').isValid).toBe(false);
  });

  it('should mask phone numbers for OTP display correctly', () => {
    const masked = PhoneNormalizer.mask('+919876543210');
    expect(masked).toBe('+91 98*** ***10');
  });
});

describe('AuthErrorMapper — Sanitization & Error Categorization', () => {
  it('should map rate limit errors correctly', () => {
    const mapped = AuthErrorMapper.map({ message: 'Over_SMS_send_rate_limit' });
    expect(mapped.category).toBe('RATE_LIMIT');
    expect(mapped.isRetryable).toBe(false);
  });

  it('should map invalid OTP errors correctly', () => {
    const mapped = AuthErrorMapper.map({ message: 'Token has expired or is invalid' });
    expect(mapped.category).toBe('INVALID_INPUT');
    expect(mapped.isRetryable).toBe(true);
  });

  it('should map network failure errors correctly', () => {
    const mapped = AuthErrorMapper.map({ message: 'Network request failed' });
    expect(mapped.category).toBe('NETWORK');
    expect(mapped.isRetryable).toBe(true);
  });

  it('should sanitize raw error message in fallback mode', () => {
    const mapped = AuthErrorMapper.map({ message: 'Something custom happened' });
    expect(mapped.code).toBe('AUTH_ERROR');
    expect(mapped.userMessage).toBe('Something custom happened');
  });
});
