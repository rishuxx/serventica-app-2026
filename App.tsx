import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from './apps/customer/src/context/AuthContext';
import { AuthProvider } from './apps/customer/src/context/AuthContext';
import { WelcomeSplashScreen } from './apps/customer/src/screens/WelcomeSplashScreen';
import { CustomerLoginScreen } from './apps/customer/src/screens/CustomerLoginScreen';
import { CustomerOtpScreen } from './apps/customer/src/screens/CustomerOtpScreen';
import { HomePlaceholderScreen } from './apps/customer/src/screens/HomePlaceholderScreen';
import { authService } from './apps/customer/src/services/auth.service';

type UnauthScreen = 'SPLASH' | 'LOGIN' | 'OTP';

function RootNavigator() {
  const { authState, isLoading: authLoading } = useAuth();
  const [unauthScreen, setUnauthScreen] = useState<UnauthScreen>('SPLASH');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Splash slide-to-start
  const handleSlideStart = () => {
    setUnauthScreen('LOGIN');
    setErrorMessage(null);
  };

  // 2. Request OTP
  const handleGetOtp = async (phone: string) => {
    setActionLoading(true);
    setErrorMessage(null);
    setPhoneNumber(phone);

    const res = await authService.requestPhoneOtp(phone);
    setActionLoading(false);

    if (res.error) {
      // Clear messaging indicating real configuration status
      setErrorMessage(
        res.error.includes('SMS') || res.error.includes('provider')
          ? `SMS Provider Configuration Required: ${res.error}`
          : res.error
      );
      // Still navigate to OTP screen for testing valid flows if supported
      setUnauthScreen('OTP');
    } else {
      setUnauthScreen('OTP');
    }
  };

  // 3. Verify OTP
  const handleVerifyOtp = async (otp: string) => {
    setActionLoading(true);
    setErrorMessage(null);

    const res = await authService.verifyPhoneOtp(phoneNumber, otp);
    setActionLoading(false);

    if (res.error) {
      setErrorMessage(res.error);
    }
  };

  // 4. Resend OTP
  const handleResendOtp = async () => {
    setActionLoading(true);
    setErrorMessage(null);
    const res = await authService.requestPhoneOtp(phoneNumber);
    setActionLoading(false);
    if (res.error) {
      setErrorMessage(res.error);
    }
  };

  // 5. Google Sign In
  const handleGoogleLogin = async () => {
    setActionLoading(true);
    setErrorMessage(null);
    const res = await authService.signInWithGoogle();
    setActionLoading(false);
    if (res.error) {
      setErrorMessage(res.error);
    }
  };

  // Initializing state (e.g. while restoring session from AsyncStorage)
  if (authState === 'INITIALIZING' || (authLoading && authState !== 'AUTHENTICATED')) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ffb300" />
      </View>
    );
  }

  // Authenticated state -> Show Home Placeholder
  if (authState === 'AUTHENTICATED') {
    return <HomePlaceholderScreen />;
  }

  // Unauthenticated flow
  if (unauthScreen === 'SPLASH') {
    return <WelcomeSplashScreen onStart={handleSlideStart} />;
  }

  if (unauthScreen === 'OTP') {
    return (
      <CustomerOtpScreen
        phoneNumber={phoneNumber}
        onVerifyOtp={handleVerifyOtp}
        onResendOtp={handleResendOtp}
        onBackToPhone={() => {
          setUnauthScreen('LOGIN');
          setErrorMessage(null);
        }}
        isLoading={actionLoading}
        errorMessage={errorMessage}
      />
    );
  }

  return (
    <CustomerLoginScreen
      onGetOtp={handleGetOtp}
      onGoogleLogin={handleGoogleLogin}
      onBackToSplash={() => setUnauthScreen('SPLASH')}
      isLoading={actionLoading}
      errorMessage={errorMessage}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: '#fcfbf7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
