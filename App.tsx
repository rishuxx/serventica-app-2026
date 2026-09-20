import './src/shims/expo-polyfill';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Lexend_100Thin,
  Lexend_300Light,
  Lexend_400Regular,
  Lexend_500Medium,
  Lexend_600SemiBold,
  Lexend_700Bold,
  Lexend_800ExtraBold,
  Lexend_900Black,
} from '@expo-google-fonts/lexend';

LogBox.ignoreAllLogs(true);
import './src/shims/font-loader';
import { AuthProvider, useAuth } from './apps/customer/src/context/AuthContext';
import { LocationProvider } from './apps/customer/src/context/LocationContext';
import { CartProvider } from './apps/customer/src/features/cart/context/CartContext';
import { MobileErrorBoundary } from './apps/customer/src/shared/components/MobileErrorBoundary';
import { WelcomeSplashScreen } from './apps/customer/src/screens/WelcomeSplashScreen';
import { CustomerLoginScreen } from './apps/customer/src/screens/CustomerLoginScreen';
import { CustomerOtpScreen } from './apps/customer/src/screens/CustomerOtpScreen';
import { CustomerOnboardingNameScreen } from './apps/customer/src/screens/CustomerOnboardingNameScreen';
import { HomeScreen } from './apps/customer/src/features/home/screens/HomeScreen';
import { ServiceCardShowcaseScreen } from './apps/customer/src/features/showcase/ServiceCardShowcaseScreen';
import { authService } from './apps/customer/src/services/auth.service';

type UnauthScreen = 'SPLASH' | 'LOGIN' | 'OTP' | 'ONBOARDING_NAME';

function RootNavigator() {
  const { authState, profile, sendOtp, verifyOtp, updateProfileNames } = useAuth();
  const [splashFinished, setSplashFinished] = useState(false);
  const [unauthScreen, setUnauthScreen] = useState<UnauthScreen>('LOGIN');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Guarantee splash screen is visible for at least 2.5 seconds on every launch
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashFinished(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // When authState transitions to UNAUTHENTICATED (e.g. on logout), ensure screen is LOGIN rather than OTP
  useEffect(() => {
    if (authState === 'UNAUTHENTICATED') {
      setUnauthScreen('LOGIN');
      setErrorMessage(null);
    }
  }, [authState]);

  // 2. Request OTP via Supabase Auth (authoritative phone-only input)
  const handleGetOtp = async (phone: string) => {
    setActionLoading(true);
    setErrorMessage(null);
    setPhoneNumber(phone);

    try {
      const res = await sendOtp(phone);
      if (!res.success && res.error) {
        setErrorMessage(res.error.userMessage);
      } else {
        setUnauthScreen('OTP');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Unable to request OTP. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Verify OTP via Supabase Auth
  const handleVerifyOtp = async (otp: string) => {
    setActionLoading(true);
    setErrorMessage(null);

    try {
      const res = await verifyOtp(phoneNumber, otp);
      if (!res.success && res.error) {
        setErrorMessage(res.error.userMessage);
      }
      // On success, AuthContext sets authState to 'AUTHENTICATED'.
      // If the authenticated user has no first_name yet (New User), the onboarding name screen will be presented.
    } catch (e: any) {
      setErrorMessage(e.message || 'Verification failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Save New User Profile Names
  const handleSaveProfileNames = async (firstName: string, lastName: string) => {
    setActionLoading(true);
    setErrorMessage(null);

    try {
      const success = await updateProfileNames(firstName, lastName);
      if (!success) {
        setErrorMessage('Failed to save profile. Please try again.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to save profile.');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Resend OTP
  const handleResendOtp = async () => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await sendOtp(phoneNumber);
      if (!res.success && res.error) {
        setErrorMessage(res.error.userMessage);
      }
    } catch (e: any) {
      setErrorMessage('Failed to resend OTP.');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Google Sign In
  const handleGoogleLogin = async () => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await authService.signInWithGoogle();
      if (!res.success && res.error) {
        setErrorMessage(res.error.userMessage);
      }
    } catch (e: any) {
      setErrorMessage('Unable to initiate Google Sign-In.');
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Explore as Guest mode
  const [isGuestMode, setIsGuestMode] = useState(false);

  const handleExploreGuest = () => {
    setIsGuestMode(true);
    setErrorMessage(null);
  };

  // Always show the classy splash screen for minimum 1.8 seconds (or until auth initialization finishes)
  if (!splashFinished || authState === 'INITIALIZING') {
    return <WelcomeSplashScreen />;
  }

  // Authenticated state: If first_name is missing (New User), prompt onboarding name screen
  if (authState === 'AUTHENTICATED') {
    const isNewUser = !profile?.first_name || profile.first_name.trim().length === 0;
    if (isNewUser) {
      return (
        <CustomerOnboardingNameScreen
          phoneNumber={phoneNumber}
          onSaveProfile={handleSaveProfileNames}
          isLoading={actionLoading}
          errorMessage={errorMessage}
        />
      );
    }

    return (
      <HomeScreen
        onOpenAccount={() => {}}
      />
    );
  }

  // Guest exploration mode -> Show Production Home Screen
  if (isGuestMode) {
    return (
      <HomeScreen
        onOpenAccount={() => {
          setIsGuestMode(false);
          setUnauthScreen('LOGIN');
        }}
      />
    );
  }

  // Unauthenticated flow
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
      onExploreGuest={handleExploreGuest}
      isLoading={actionLoading}
      errorMessage={errorMessage}
    />
  );
}

export default function App() {
  // Hook-based robust cross-platform font loader for Expo Go & Bare RN
  const [fontsLoaded, fontError] = useFonts({
    'Lexend-Thin': Lexend_100Thin,
    'Lexend-Light': Lexend_300Light,
    'Lexend-Regular': Lexend_400Regular,
    'Lexend-Medium': Lexend_500Medium,
    'Lexend-SemiBold': Lexend_600SemiBold,
    'Lexend-Bold': Lexend_700Bold,
    'Lexend-ExtraBold': Lexend_800ExtraBold,
    'Lexend-Black': Lexend_900Black,
    Lexend_100Thin,
    Lexend_300Light,
    Lexend_400Regular,
    Lexend_500Medium,
    Lexend_600SemiBold,
    Lexend_700Bold,
    Lexend_800ExtraBold,
    Lexend_900Black,
  });

  const [showShowcase, setShowShowcase] = useState(false);

  // If fonts are still loading and there is no error yet, show clean loading indicator
  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ffb300" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <MobileErrorBoundary>
        <AuthProvider>
          <LocationProvider>
            <CartProvider>
              {showShowcase ? (
                <ServiceCardShowcaseScreen onBack={() => setShowShowcase(false)} />
              ) : (
                <RootNavigator />
              )}
            </CartProvider>
          </LocationProvider>
        </AuthProvider>
      </MobileErrorBoundary>
    </SafeAreaProvider>
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