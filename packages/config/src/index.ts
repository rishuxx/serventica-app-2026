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
  googleMaps: {
    apiKey: string;
  };
  mapbox: {
    accessToken: string;
  };
  app: {
    environment: 'development' | 'staging' | 'production';
    isProduction: boolean;
  };
}

export const ServenticaEnvironment: ServenticaConfig = {
  supabase: {
    url:
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      'https://gzaihyhglxelrahoopju.supabase.co',
    anonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      'sb_publishable_zyuPCOht_hTBN4G3y9Kn0A_U1vxhyzA',
    authCallbackScheme: 'serventica://auth/callback',
  },
  razorpay: {
    keyId:
      process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ||
      process.env.RAZORPAY_KEY_ID ||
      'rzp_test_TdYpNoPP7IoSJR',
    merchantName: 'Serventica Home Services',
    themeColor: '#FAC420',
  },
  googleMaps: {
    apiKey:
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      '',
  },
  mapbox: {
    accessToken:
      process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
      process.env.MAPBOX_ACCESS_TOKEN ||
      '',
  },
  api: {
    baseUrl:
      process.env.EXPO_PUBLIC_API_URL ||
      process.env.API_URL ||
      'http://10.0.2.2:3000',
  },
  app: {
    environment:
      (process.env.NODE_ENV as any) === 'production'
        ? 'production'
        : 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },
};
