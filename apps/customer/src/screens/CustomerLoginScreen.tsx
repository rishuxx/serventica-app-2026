import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { ServenticaTokens } from '../../../../packages/design-system/src';

interface CustomerLoginScreenProps {
  onGetOtp: (phone: string) => Promise<void>;
  onGoogleLogin?: () => Promise<void>;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
  onBackToSplash?: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const CustomerLoginScreen: React.FC<CustomerLoginScreenProps> = ({
  onGetOtp,
  onGoogleLogin,
  onOpenTerms,
  onOpenPrivacy,
  isLoading = false,
  errorMessage = null,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const isValidPhone = phoneNumber.trim().length === 10;

  const handleTextChange = (text: string) => {
    // Only accept numeric digits
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 10) {
      setPhoneNumber(cleaned);
    }
  };

  const handlePressOtp = () => {
    if (isValidPhone && !isLoading) {
      onGetOtp(phoneNumber);
    }
  };

  const handlePressGoogle = () => {
    if (onGoogleLogin && !isLoading) {
      onGoogleLogin();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          {/* Top Wordmark Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoRow}>
              <Text style={styles.logoText}>
                Serventica<Text style={styles.logoDot}>.</Text>
              </Text>
            </View>
          </View>

          {/* Form Area */}
          <View style={styles.formSection}>
            <Text style={styles.instructionText}>
              Get OTP on <Text style={styles.instructionBold}>Phone Number</Text>
            </Text>

            {/* Phone Input Box */}
            <View
              style={[
                styles.phoneInputContainer,
                isFocused && styles.phoneInputFocused,
              ]}
            >
              {/* India Flag & Country Code */}
              <View style={styles.countryCodeArea}>
                <Text style={styles.flag}>🇮🇳</Text>
                <Text style={styles.countryCode}>+91</Text>
              </View>

              <View style={styles.verticalDivider} />

              <TextInput
                style={styles.textInput}
                placeholder="Enter Phone Number"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                maxLength={10}
                value={phoneNumber}
                onChangeText={handleTextChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                editable={!isLoading}
                accessibilityLabel="Phone Number Input"
              />
            </View>

            {errorMessage ? (
              <Text style={styles.errorBanner}>{errorMessage}</Text>
            ) : null}

            {/* Get OTP Button */}
            <TouchableOpacity
              style={[
                styles.getOtpButton,
                isValidPhone && !isLoading ? styles.buttonActive : styles.buttonInactive,
              ]}
              activeOpacity={0.85}
              disabled={!isValidPhone || isLoading}
              onPress={handlePressOtp}
              accessibilityLabel="Get OTP"
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.getOtpText}>Get OTP</Text>
              )}
            </TouchableOpacity>

            {/* OR Divider */}
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>

            {/* Google Login Button */}
            <TouchableOpacity
              style={styles.googleButton}
              activeOpacity={0.8}
              onPress={handlePressGoogle}
              disabled={isLoading}
              accessibilityLabel="Login with Google"
            >
              <View style={styles.googleCircle}>
                <Text style={styles.googleG}>
                  <Text style={{ color: '#4285F4' }}>G</Text>
                </Text>
              </View>
            </TouchableOpacity>

            {/* Terms and Privacy Text */}
            <View style={styles.legalBox}>
              <Text style={styles.legalText}>
                By continuing, you agree to our{' '}
                <Text style={styles.legalLink} onPress={onOpenTerms}>
                  terms of service
                </Text>{' '}
                and{'\n'}
                <Text style={styles.legalLink} onPress={onOpenPrivacy}>
                  privacy policy
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcfbf7', // Warm ivory from reference
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  logoSection: {
    marginTop: 20,
    marginBottom: 44,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoText: {
    fontSize: 40,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    fontWeight: '700',
    color: '#e5aa1e',
    letterSpacing: -0.5,
  },
  logoDot: {
    color: '#e5aa1e',
    fontWeight: '900',
  },
  formSection: {
    width: '100%',
  },
  instructionText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: ServenticaTokens.fonts.Medium,
    marginBottom: 12,
  },
  instructionBold: {
    fontWeight: '700',
    color: '#111827',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  phoneInputFocused: {
    borderColor: '#ffb300',
  },
  countryCodeArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: 18,
    marginRight: 6,
  },
  countryCode: {
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.Medium,
    fontWeight: '600',
    color: '#1f2937',
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#d1d5db',
    marginHorizontal: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#111827',
    paddingVertical: 0,
  },
  errorBanner: {
    color: '#dc2626',
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Medium,
    marginBottom: 12,
    textAlign: 'center',
  },
  getOtpButton: {
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#ffb300',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonActive: {
    backgroundColor: '#ffb300',
  },
  buttonInactive: {
    backgroundColor: '#ffb300',
    opacity: 0.7,
  },
  getOtpText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.Bold,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  orText: {
    marginHorizontal: 14,
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  googleButton: {
    alignSelf: 'center',
    marginBottom: 32,
  },
  googleCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  googleG: {
    fontSize: 20,
    fontWeight: '900',
  },
  legalBox: {
    alignItems: 'center',
    marginTop: 4,
  },
  legalText: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    color: '#6b7280',
    fontFamily: ServenticaTokens.fonts.Regular,
  },
  legalLink: {
    color: '#4b5563',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
