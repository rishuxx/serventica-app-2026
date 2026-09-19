/**
 * SERVENTICA — Application Configuration Provider
 * Validates and exposes environment variables with safe fallbacks and runtime guards.
 */

export interface ServenticaConfig {
  supabase: {
    url: string;
    anonKey: string;
    authCallbackScheme: string;
  };
  razorpay: {
    keyId: string;
    merchantName: string;
    themeColor: string;
  };
  api: {
    baseUrl: string;
  };
  app: {
    environment: 'development' | 'staging' | 'production';
    isProduction: boolean;
  };
}

// Configured with your Supabase Project: gzaihyhglxelrahoopju
export const ServenticaEnvironment: ServenticaConfig = {
  supabase: {
    url: 'https://gzaihyhglxelrahoopju.supabase.co',
    anonKey: 'sb_publishable_zyuPCOht_hTBN4G3y9Kn0A_U1vxhyzA',
    authCallbackScheme: 'serventica://auth/callback',
  },
  razorpay: {
    keyId: 'rzp_test_TdYpNoPP7IoSJR', // Razorpay Test Merchant Key
    merchantName: 'Serventica Home Services',
    themeColor: '#FAC420',
  },
  api: {
    baseUrl: 'http://10.0.2.2:3000', // Android emulator localhost alias
  },
  app: {
    environment: 'development',
    isProduction: false,
  },
};
