import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { ServenticaTokens } from '../../../../packages/design-system/src';
import { PhoneNormalizer } from '../../../../packages/utils/src';

const { width } = Dimensions.get('window');
const RESEND_COOLDOWN_SECONDS = 60;
const OTP_LENGTH = 6;

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
  const [cooldown, setCooldown] = useState<number>(RESEND_COOLDOWN_SECONDS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput | null>(null);

  const formattedPhone = `+91 ${phoneNumber}`;
  const isValidOtp = otpCode.trim().length === OTP_LENGTH && /^\d{6}$/.test(otpCode.trim());

  // Resend Countdown Timer
  useEffect(() => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phoneNumber]);

  const handleTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= OTP_LENGTH) {
      setOtpCode(cleaned);
      if (cleaned.length === OTP_LENGTH) {
        onVerifyOtp(cleaned);
      }
    }
  };

  const handleResend = () => {
    if (cooldown === 0 && !isLoading) {
      setOtpCode('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      onResendOtp();
    }
  };

  const renderOtpBoxes = () => {
    const digits = otpCode.split('');
    const boxes = [];

    for (let i = 0; i < OTP_LENGTH; i++) {
      const digit = digits[i] || '';
      const isFocused = i === digits.length || (i === OTP_LENGTH - 1 && digits.length === OTP_LENGTH);

      boxes.push(
        <TouchableOpacity
          key={i}
          activeOpacity={0.9}
          onPress={() => inputRef.current?.focus()}
          style={[
            styles.otpBox,
            digit ? styles.otpBoxFilled : null,
            isFocused ? styles.otpBoxFocused : null,
            errorMessage ? styles.otpBoxError : null,
          ]}
        >
          <Text style={styles.otpDigitText}>{digit}</Text>
        </TouchableOpacity>
      );
    }
    return boxes;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          {/* Top Header with Back Arrow & Title */}
          <View style={styles.topHeader}>
            <TouchableOpacity
              onPress={onBackToPhone}
              style={styles.backButton}
              disabled={isLoading}
              activeOpacity={0.7}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <ArrowLeft size={24} color="#0F172A" />
            </TouchableOpacity>

            <Text style={styles.topHeaderTitle}>OTP verification</Text>
          </View>

          {/* Center Form Section */}
          <View style={styles.formSection}>
            <Text style={styles.mainTitle}>Enter the OTP sent to</Text>
            <Text style={styles.phoneTitle}>{formattedPhone}</Text>

            {/* Hidden Real TextInput for Native Keyboard */}
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              keyboardType="numeric"
              maxLength={OTP_LENGTH}
              value={otpCode}
              onChangeText={handleTextChange}
              autoFocus
              editable={!isLoading}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
            />

            {/* 6 Clean Rounded OTP Boxes */}
            <View style={styles.otpBoxesRow}>
              {renderOtpBoxes()}
            </View>

            {/* Error Message */}
            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            {/* Resend SMS with Live Countdown */}
            <View style={styles.resendSection}>
              {cooldown > 0 ? (
                <Text style={styles.resendTimerText}>
                  Resend SMS in <Text style={styles.timerHighlight}>{cooldown}s</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} disabled={isLoading} activeOpacity={0.7}>
                  <Text style={styles.resendLinkText}>Resend SMS</Text>
                </TouchableOpacity>
              )}
            </View>

            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#EAB308" size="small" />
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    marginBottom: 36,
  },
  backButton: {
    padding: 4,
    marginRight: 16,
  },
  topHeaderTitle: {
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontSize: 18,
    color: '#0F172A',
  },
  formSection: {
    alignItems: 'center',
    paddingTop: 8,
  },
  mainTitle: {
    fontFamily: ServenticaTokens.fonts.Bold,
    fontSize: 22,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  phoneTitle: {
    fontFamily: ServenticaTokens.fonts.Bold,
    fontSize: 22,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 36,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 32,
    width: '100%',
  },
  otpBox: {
    width: 48,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxFilled: {
    borderColor: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  otpBoxFocused: {
    borderColor: '#EAB308',
    shadowColor: '#EAB308',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  otpBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  otpDigitText: {
    fontFamily: ServenticaTokens.fonts.Bold,
    fontSize: 20,
    color: '#0F172A',
  },
  errorText: {
    fontFamily: ServenticaTokens.fonts.Medium,
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  resendSection: {
    alignItems: 'center',
    marginTop: 8,
  },
  resendTimerText: {
    fontFamily: ServenticaTokens.fonts.Regular,
    fontSize: 14,
    color: '#94A3B8',
  },
  timerHighlight: {
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#64748B',
  },
  resendLinkText: {
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontSize: 14,
    color: '#D97706',
  },
  loadingContainer: {
    marginTop: 24,
  },
});
