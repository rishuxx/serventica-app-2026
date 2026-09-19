import { Linking } from 'react-native';
import { supabase } from '../lib/supabase/client';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { ServenticaEnvironment } from '../../../../packages/config/src';

/**
 * SERVENTICA — Authentication Service
 * Clean domain abstraction over Supabase Auth APIs.
 * Does NOT leak Supabase implementation specifics directly to UI screens.
 */
export class ServenticaAuthService {
  /**
   * Request Phone OTP via Supabase Auth (with developer test bypass support)
   * @param rawPhone 10-digit Indian phone number (or with +91)
   */
  async requestPhoneOtp(rawPhone: string): Promise<{ error?: string }> {
    try {
      const cleanDigits = rawPhone.replace(/[^0-9]/g, '');
      const formattedPhone = cleanDigits.length === 10 ? `+91${cleanDigits}` : `+${cleanDigits}`;

      // Developer Test Bypass: Accept standard test numbers instantly without SMS provider requirement
      if (
        cleanDigits === '9999999999' ||
        cleanDigits === '9876543210' ||
        cleanDigits === '1234567890' ||
        cleanDigits.startsWith('99999')
      ) {
        return {};
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          channel: 'sms',
        },
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (err: any) {
      return { error: err.message || 'An unexpected error occurred requesting OTP.' };
    }
  }

  /**
   * Verify Phone OTP via Supabase Auth (with developer test bypass support)
   * @param rawPhone 10-digit phone number
   * @param token 6-digit OTP code received via SMS (or 123456 for test bypass)
   */
  async verifyPhoneOtp(rawPhone: string, token: string): Promise<{ session?: Session; error?: string }> {
    try {
      const cleanDigits = rawPhone.replace(/[^0-9]/g, '');
      const formattedPhone = cleanDigits.length === 10 ? `+91${cleanDigits}` : `+${cleanDigits}`;
      const trimmedToken = token.trim();

      // Developer Test Bypass: Allow 123456 or 000000 for ANY phone number, or ANY test number
      if (
        trimmedToken === '123456' ||
        trimmedToken === '000000' ||
        cleanDigits === '1234567890' ||
        cleanDigits === '9999999999' ||
        cleanDigits === '9876543210' ||
        cleanDigits.startsWith('99999')
      ) {
        // Return dummy valid session payload to allow instant bypass
        const mockSession: any = {
          access_token: 'mock-test-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: {
            id: '00000000-0000-0000-0000-000000000001',
            aud: 'authenticated',
            role: 'authenticated',
            email: 'test@serventica.com',
            phone: formattedPhone,
            created_at: new Date().toISOString(),
            user_metadata: { first_name: 'Test', last_name: 'User', phone: formattedPhone },
            app_metadata: { provider: 'phone' },
          },
        };
        return { session: mockSession };
      }

      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: trimmedToken,
        type: 'sms',
      });

      if (error) {
        return { error: error.message };
      }

      return { session: data.session || undefined };
    } catch (err: any) {
      return { error: err.message || 'Failed to verify OTP.' };
    }
  }

  /**
   * Sign in with Google OAuth via browser/system redirect flow
   */
  async signInWithGoogle(): Promise<{ url?: string; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: ServenticaEnvironment.supabase.authCallbackScheme,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data?.url) {
        try {
          await Linking.openURL(data.url);
          return { url: data.url };
        } catch (openErr: any) {
          return { error: `Failed to launch browser: ${openErr.message}` };
        }
      }

      return { error: 'No OAuth URL returned by authentication provider.' };
    } catch (err: any) {
      return { error: err.message || 'Failed to initiate Google Sign-In.' };
    }
  }

  /**
   * Retrieve active authenticated session
   */
  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  /**
   * Retrieve current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return data.user;
  }

  /**
   * Sign out and clear stored session
   */
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  /**
   * Subscribe to auth state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
   */
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

export const authService = new ServenticaAuthService();
