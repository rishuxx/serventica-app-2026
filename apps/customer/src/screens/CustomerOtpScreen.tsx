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

interface CustomerOtpScreenProps {
  phoneNumber: string;
  onVerifyOtp: (otp: string) => Promise<void>;
  onResendOtp: () => Promise<void>;
  onBackToPhone: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const CustomerOtpScreen: React.FC<CustomerOtpScreenProps> = ({
  phoneNumber,
  onVerifyOtp,
  onResendOtp,
  onBackToPhone,
  isLoading = false,
  errorMessage = null,
}) => {
  const [otpCode, setOtpCode] = useState('');
  const isValidOtp = otpCode.trim().length === 6;

  const handleTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 6) {
      setOtpCode(cleaned);
    }
  };

  const handleVerify = () => {
    if (isValidOtp && !isLoading) {
      onVerifyOtp(otpCode);
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
            <TouchableOpacity onPress={onBackToPhone} style={styles.backButton}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.logoRow}>
              <Text style={styles.logoText}>
                Serventica<Text style={styles.logoDot}>.</Text>
              </Text>
            </View>
          </View>

          {/* Form Area */}
          <View style={styles.formSection}>
            <Text style={styles.headerTitle}>Enter Verification Code</Text>
            <Text style={styles.instructionText}>
              We sent a 6-digit code to{' '}
              <Text style={styles.instructionBold}>+91 {phoneNumber}</Text>
            </Text>

            {/* OTP Input Box */}
            <View style={styles.otpInputContainer}>
              <TextInput
                style={styles.otpInput}
                placeholder="• • • • • •"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                maxLength={6}
                value={otpCode}
                onChangeText={handleTextChange}
                autoFocus
                accessibilityLabel="6-Digit OTP Input"
              />
            </View>

            {errorMessage ? (
              <Text style={styles.errorBanner}>{errorMessage}</Text>
            ) : null}

            {/* Verify Button */}
            <TouchableOpacity
              style={[
                styles.verifyButton,
                isValidOtp && !isLoading ? styles.buttonActive : styles.buttonInactive,
              ]}
              activeOpacity={0.85}
              disabled={!isValidOtp || isLoading}
              onPress={handleVerify}
              accessibilityLabel="Verify OTP"
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.verifyButtonText}>Verify & Proceed</Text>
              )}
            </TouchableOpacity>

            {/* Resend Row */}
            <View style={styles.resendRow}>
              <Text style={styles.resendNotice}>Didn't receive code? </Text>
              <TouchableOpacity onPress={onResendOtp} disabled={isLoading}>
                <Text style={styles.resendLink}>Resend OTP</Text>
              </TouchableOpacity>
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
    backgroundColor: '#fcfbf7', // Serventica warm ivory
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  backButton: {
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: ServenticaTokens.fonts.Medium,
    fontWeight: '600',
  },
  logoSection: {
    marginTop: 10,
    marginBottom: 36,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoText: {
    fontSize: 38,
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
  headerTitle: {
    fontSize: 22,
    fontFamily: ServenticaTokens.fonts.Bold,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#4b5563',
    fontFamily: ServenticaTokens.fonts.Regular,
    marginBottom: 24,
    lineHeight: 20,
  },
  instructionBold: {
    fontWeight: '700',
    color: '#111827',
  },
  otpInputContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ffb300',
    borderRadius: 14,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#1E242B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  otpInput: {
    fontSize: 26,
    fontFamily: ServenticaTokens.fonts.Bold,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 12,
    textAlign: 'center',
    width: '100%',
  },
  errorBanner: {
    color: '#dc2626',
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Medium,
    marginBottom: 16,
    textAlign: 'center',
  },
  verifyButton: {
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
    opacity: 0.6,
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.Bold,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendNotice: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: ServenticaTokens.fonts.Regular,
  },
  resendLink: {
    fontSize: 13,
    color: '#e5aa1e',
    fontFamily: ServenticaTokens.fonts.Bold,
    fontWeight: '700',
  },
});
