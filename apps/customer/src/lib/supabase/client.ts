import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { ServenticaEnvironment } from '../../../../../packages/config/src';

/**
 * SERVENTICA — Centralized Supabase Client for React Native
 * Configured with AsyncStorage for persistent sessions, token refreshing, and OAuth redirect detection.
 */
export const supabase = createClient(
  ServenticaEnvironment.supabase.url,
  ServenticaEnvironment.supabase.anonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Handled manually via React Native Linking
    },
  }
);
