import { PhoneNormalizer } from '../packages/utils/src/auth/phone-normalizer';
import { AuthErrorMapper } from '../packages/utils/src/auth/auth-error-mapper';

describe('PhoneNormalizer', () => {
  it('should normalize standard 10-digit Indian mobile numbers', () => {
    const res = PhoneNormalizer.normalize('9876543210');
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe('+919876543210');
    expect(res.displayNumber).toBe('+91 98765 43210');
  });

  it('should normalize phone numbers with +91 prefix and spaces', () => {
    const res = PhoneNormalizer.normalize('+91 98765 43210');
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe('+919876543210');
  });

  it('should normalize phone numbers with leading 0', () => {
    const res = PhoneNormalizer.normalize('09876543210');
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe('+919876543210');
  });

  it('should reject invalid length numbers', () => {
    const shortRes = PhoneNormalizer.normalize('98765');
    expect(shortRes.isValid).toBe(false);
    expect(shortRes.error).toBeDefined();

    const longRes = PhoneNormalizer.normalize('9876543210123456');
    expect(longRes.isValid).toBe(false);
  });

  it('should reject non-numeric input', () => {
    const res = PhoneNormalizer.normalize('abcd efghij');
    expect(res.isValid).toBe(false);
  });

  it('should mask phone numbers for OTP display', () => {
    const masked = PhoneNormalizer.mask('+919876543210');
    expect(masked).toBe('+91 98*** ***10');
  });
});

describe('AuthErrorMapper', () => {
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
});
