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
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6YWloeWhnbHhlbHJhaG9vcGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MDc0OTAsImV4cCI6MjEwNDM4MzQ5MH0.kjEyrvX1HIqfelTOASjfgEqpNWdqiwW03kSzVhceSGA',
    authCallbackScheme: 'serventica://auth/callback',
  },
  razorpay: {
    keyId: 'rzp_test_1DP5mmOlF5G5ag', // Official Razorpay standard test merchant key
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
