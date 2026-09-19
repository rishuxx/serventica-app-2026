import 'react-native-url-polyfill/auto';
import { SafeAsyncStorage } from '../../../../../packages/utils/src/storage/safe-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { ServenticaEnvironment } from '../../../../../packages/config/src';

/**
 * SERVENTICA — Centralized Supabase Client for React Native
 * Configured with AsyncStorage for persistent sessions, token refreshing,
 * OAuth redirect detection, and mobile diagnostic headers.
 */
export const supabase = createClient(
  ServenticaEnvironment.supabase.url,
  ServenticaEnvironment.supabase.anonKey,
  {
    auth: {
      storage: SafeAsyncStorage as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Handled manually via React Native Linking
    },
    global: {
      headers: {
        'X-Client-Info': 'serventica-customer-mobile',
        'X-Platform': Platform.OS,
        'X-App-Version': '0.0.1',
      },
    },
  }
);
