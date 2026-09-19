import { Linking } from 'react-native';
import { supabase } from '../lib/supabase/client';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { ServenticaEnvironment } from '../../../../packages/config/src';
import {
  PhoneNormalizer,
  AuthErrorMapper,
  NormalizedAuthError,
} from '../../../../packages/utils/src';

export interface AuthActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: NormalizedAuthError;
}

/**
 * SERVENTICA — Production Authentication Service
 * Single Responsibility: Authoritative communication with Supabase Auth API.
 * Enforces mutex locks, strict E.164 normalization, error mapping, and no mock bypasses.
 */
export class ServenticaAuthService {
  private isSendingOtp: boolean = false;
  private isVerifyingOtp: boolean = false;

  /**
   * Request real SMS Phone OTP via Supabase Auth
   * @param rawPhone User input phone number
   */
  async requestPhoneOtp(rawPhone: string): Promise<AuthActionResult<{ phone: string }>> {
    if (this.isSendingOtp) {
      return {
        success: false,
        error: {
          code: 'REQUEST_IN_PROGRESS',
          userMessage: 'An OTP request is already in progress. Please wait.',
          isRetryable: false,
          category: 'RATE_LIMIT',
        },
      };
    }

    const validation = PhoneNormalizer.normalize(rawPhone);
    if (!validation.isValid || !validation.normalized) {
      return {
        success: false,
        error: {
          code: 'INVALID_PHONE',
          userMessage: validation.error || 'Please enter a valid 10-digit mobile number.',
          isRetryable: true,
          category: 'INVALID_INPUT',
        },
      };
    }

    try {
      this.isSendingOtp = true;

      const { error } = await supabase.auth.signInWithOtp({
        phone: validation.normalized,
        options: {
          channel: 'sms',
        },
      });

      if (error) {
        return {
          success: false,
          error: AuthErrorMapper.map(error),
        };
      }

      return {
        success: true,
        data: { phone: validation.normalized },
      };
    } catch (err: any) {
      return {
        success: false,
        error: AuthErrorMapper.map(err),
      };
    } finally {
      this.isSendingOtp = false;
    }
  }

  /**
   * Verify real SMS OTP code via Supabase Auth
   * @param rawPhone Normalized or raw phone number
   * @param token 6-digit OTP code received via SMS
   */
  async verifyPhoneOtp(
    rawPhone: string,
    token: string
  ): Promise<AuthActionResult<{ session: Session | null; user: User | null }>> {
    if (this.isVerifyingOtp) {
      return {
        success: false,
        error: {
          code: 'VERIFICATION_IN_PROGRESS',
          userMessage: 'Verification is currently in progress. Please wait.',
          isRetryable: false,
          category: 'RATE_LIMIT',
        },
      };
    }

    const validation = PhoneNormalizer.normalize(rawPhone);
    if (!validation.isValid || !validation.normalized) {
      return {
        success: false,
        error: {
          code: 'INVALID_PHONE',
          userMessage: validation.error || 'Invalid phone number format.',
          isRetryable: true,
          category: 'INVALID_INPUT',
        },
      };
    }

    const cleanToken = token.trim();
    if (!/^\d{6}$/.test(cleanToken)) {
      return {
        success: false,
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          userMessage: 'Please enter the complete 6-digit verification code.',
          isRetryable: true,
          category: 'INVALID_INPUT',
        },
      };
    }

    try {
      this.isVerifyingOtp = true;

      const { data, error } = await supabase.auth.verifyOtp({
        phone: validation.normalized,
        token: cleanToken,
        type: 'sms',
      });

      if (error) {
        return {
          success: false,
          error: AuthErrorMapper.map(error),
        };
      }

      if (!data.session) {
        return {
          success: false,
          error: {
            code: 'SESSION_CREATION_FAILED',
            userMessage: 'Authentication succeeded but session could not be established. Please try again.',
            isRetryable: true,
            category: 'SESSION',
          },
        };
      }

      return {
        success: true,
        data: {
          session: data.session,
          user: data.user,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: AuthErrorMapper.map(err),
      };
    } finally {
      this.isVerifyingOtp = false;
    }
  }

  /**
   * Sign in with Google OAuth via browser/system redirect flow
   */
  async signInWithGoogle(): Promise<AuthActionResult<{ url?: string }>> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: ServenticaEnvironment.supabase.authCallbackScheme,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        return {
          success: false,
          error: AuthErrorMapper.map(error),
        };
      }

      if (data?.url) {
        try {
          await Linking.openURL(data.url);
          return {
            success: true,
            data: { url: data.url },
          };
        } catch {
          return {
            success: false,
            error: {
              code: 'BROWSER_LAUNCH_FAILED',
              userMessage: 'Unable to open browser for Google authentication.',
              isRetryable: true,
              category: 'UNKNOWN',
            },
          };
        }
      }

      return {
        success: false,
        error: {
          code: 'OAUTH_URL_MISSING',
          userMessage: 'No OAuth URL returned by authentication provider.',
          isRetryable: false,
          category: 'PROVIDER',
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: AuthErrorMapper.map(err),
      };
    }
  }

  /**
   * Retrieve active authenticated session from persistent storage
   */
  async getSession(): Promise<Session | null> {
    try {
      const { data } = await supabase.auth.getSession();
      return data.session;
    } catch {
      return null;
    }
  }

  /**
   * Retrieve current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data } = await supabase.auth.getUser();
      return data.user;
    } catch {
      return null;
    }
  }

  /**
   * Sign out and clear stored Supabase session
   */
  async signOut(): Promise<AuthActionResult<void>> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return {
          success: false,
          error: AuthErrorMapper.map(error),
        };
      }
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: AuthErrorMapper.map(err),
      };
    }
  }

  /**
   * Subscribe to auth state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
   */
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

export const authService = new ServenticaAuthService();
