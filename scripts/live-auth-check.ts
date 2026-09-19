import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gzaihyhglxelrahoopju.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_zyuPCOht_hTBN4G3y9Kn0A_U1vxhyzA';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function runLiveAuthCheck() {
  console.log('Testing live Supabase connection to:', SUPABASE_URL);

  // 1. Test live OTP request
  const testPhone = '+919876543210';
  console.log('Sending signInWithOtp for:', testPhone);

  const { data, error } = await supabase.auth.signInWithOtp({
    phone: testPhone,
    options: {
      channel: 'sms',
    },
  });

  if (error) {
    console.log('SUPABASE_AUTH_RESPONSE: ERROR');
    console.log('Code:', (error as any).code || error.status);
    console.log('Message:', error.message);
  } else {
    console.log('SUPABASE_AUTH_RESPONSE: SUCCESS');
    console.log('Data:', data);
  }
}

runLiveAuthCheck();
