/**
 * SERVENTICA — Centralized Auth Error Normalizer
 * Single Responsibility: Translates raw Supabase Auth and network errors into customer-safe, actionable messages.
 */

export interface NormalizedAuthError {
  code: string;
  userMessage: string;
  technicalMessage?: string;
  isRetryable: boolean;
  category: 'NETWORK' | 'RATE_LIMIT' | 'INVALID_INPUT' | 'EXPIRED' | 'PROVIDER' | 'SESSION' | 'UNKNOWN';
}

export class AuthErrorMapper {
  public static map(error: any): NormalizedAuthError {
    if (!error) {
      return {
        code: 'UNKNOWN_ERROR',
        userMessage: 'An unexpected error occurred. Please try again.',
        isRetryable: true,
        category: 'UNKNOWN',
      };
    }

    const rawMessage: string = (error.message || error.error_description || String(error)).toLowerCase();
    const rawCode: string = (error.code || error.status || '').toLowerCase();

    // 1. Rate Limiting / Cooldown
    if (
      rawMessage.includes('rate limit') ||
      rawMessage.includes('too many requests') ||
      rawMessage.includes('over_email_send_rate_limit') ||
      rawMessage.includes('over_sms_send_rate_limit') ||
      rawCode === '429' ||
      rawCode === 'rate_limit_exceeded'
    ) {
      return {
        code: 'RATE_LIMIT_EXCEEDED',
        userMessage: 'Too many OTP requests. Please wait a minute before requesting another code.',
        technicalMessage: error.message,
        isRetryable: false,
        category: 'RATE_LIMIT',
      };
    }

    // 2. Network & Connectivity Failure
    if (
      rawMessage.includes('network request failed') ||
      rawMessage.includes('fetch failed') ||
      rawMessage.includes('timeout') ||
      rawMessage.includes('abort') ||
      rawMessage.includes('connection refused')
    ) {
      return {
        code: 'NETWORK_FAILURE',
        userMessage: 'Unable to connect. Please check your internet connection and try again.',
        technicalMessage: error.message,
        isRetryable: true,
        category: 'NETWORK',
      };
    }

    // 3. Invalid or Incorrect OTP
    if (
      rawMessage.includes('invalid token') ||
      rawMessage.includes('token has expired or is invalid') ||
      rawMessage.includes('invalid otp') ||
      rawMessage.includes('otp incorrect')
    ) {
      return {
        code: 'INVALID_OTP',
        userMessage: 'The verification code is incorrect. Please check and try again.',
        technicalMessage: error.message,
        isRetryable: true,
        category: 'INVALID_INPUT',
      };
    }

    // 4. Expired OTP
    if (
      rawMessage.includes('token expired') ||
      rawMessage.includes('otp expired') ||
      rawMessage.includes('token has expired')
    ) {
      return {
        code: 'OTP_EXPIRED',
        userMessage: 'This verification code has expired. Please request a new OTP.',
        technicalMessage: error.message,
        isRetryable: true,
        category: 'EXPIRED',
      };
    }

    // 5. SMS Provider Missing / Unconfigured on Supabase backend
    if (
      rawMessage.includes('sms provider') ||
      rawMessage.includes('provider is not enabled') ||
      rawMessage.includes('phone provider is not enabled') ||
      rawMessage.includes('error sending sms') ||
      rawMessage.includes('twilio') ||
      rawMessage.includes('messagebird') ||
      rawMessage.includes('phone_provider_disabled')
    ) {
      return {
        code: 'SMS_PROVIDER_NOT_CONFIGURED',
        userMessage: 'SMS delivery is currently unavailable. Please contact support or try again later.',
        technicalMessage: error.message,
        isRetryable: false,
        category: 'PROVIDER',
      };
    }

    // 6. Invalid Phone format from Supabase
    if (
      rawMessage.includes('invalid phone') ||
      rawMessage.includes('unsupported phone') ||
      rawMessage.includes('phone number is invalid')
    ) {
      return {
        code: 'INVALID_PHONE_NUMBER',
        userMessage: 'Please enter a valid mobile number with country code.',
        technicalMessage: error.message,
        isRetryable: true,
        category: 'INVALID_INPUT',
      };
    }

    // 7. Generic Fallback
    return {
      code: 'AUTH_ERROR',
      userMessage: error.message || 'Something went wrong during authentication. Please try again.',
      technicalMessage: error.message,
      isRetryable: true,
      category: 'UNKNOWN',
    };
  }
}
