import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  PanResponder,
  Animated,
  Platform,
  Keyboard,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { ServenticaTokens } from '../../../../packages/design-system/src';

// Reusable Luxury Purple Linear Gradient (matching washitup theme: #9333EA -> #7C3AED -> #6D28D9)
const PurpleGradientBg: React.FC<{
  id?: string;
  rx?: number;
  opacity?: number;
  active?: boolean;
}> = ({ id = 'purpleGradDefault', rx = 14, opacity = 1, active = true }) => (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: active ? '#7C3AED' : '#C084FC', borderRadius: rx, overflow: 'hidden' }]}>
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={active ? '#A855F7' : '#D8B4FE'} stopOpacity={opacity} />
          <Stop offset="50%" stopColor={active ? '#8B5CF6' : '#C084FC'} stopOpacity={opacity} />
          <Stop offset="100%" stopColor={active ? '#6D28D9' : '#A78BFA'} stopOpacity={opacity} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" rx={rx} fill={`url(#${id})`} />
    </Svg>
  </View>
);

interface LoginSheetProps {
  phoneNumber: string;
  onChangePhone: (phone: string) => void;
  onGetOtp: () => void;
  onGoogleLogin?: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
  isLoading?: boolean;
  isValidPhone: boolean;
  errorMessage?: string | null;
  focusedField: 'phone' | null;
  setFocusedField: (field: 'phone' | null) => void;
  isExpanded: boolean;
  onToggleExpand: (expanded: boolean) => void;
}

// Crisp 4-Color Google Auth Vector
const GoogleLogoSvg: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <Path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.33 24 12 24z"
    />
    <Path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
    />
    <Path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </Svg>
);

export const LoginInteractiveSheet: React.FC<LoginSheetProps> = ({
  phoneNumber,
  onChangePhone,
  onGetOtp,
  onGoogleLogin,
  onOpenTerms,
  onOpenPrivacy,
  isLoading = false,
  isValidPhone,
  errorMessage = null,
  focusedField,
  setFocusedField,
  isExpanded,
  onToggleExpand,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;

  // Dismiss keyboard when collapsing
  useEffect(() => {
    if (!isExpanded) {
      Keyboard.dismiss();
    }
  }, [isExpanded]);

  // PanResponder for smooth interactive gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 6,
      onPanResponderMove: (_, gestureState) => {
        if (!isExpanded) {
          // In collapsed state: drag up brings sheet up
          if (gestureState.dy < 0) {
            translateY.setValue(gestureState.dy * 0.7);
          }
        } else {
          // In expanded state: drag down collapses
          if (gestureState.dy > 0) {
            translateY.setValue(gestureState.dy * 0.7);
          } else {
            // Rubber band up
            translateY.setValue(gestureState.dy * 0.35);
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!isExpanded) {
          if (gestureState.dy < -25 || gestureState.vy < -0.4) {
            onToggleExpand(true);
          }
        } else {
          if (gestureState.dy > 40 || gestureState.vy > 0.4) {
            onToggleExpand(false);
          }
        }
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 280,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.sheetContainer,
        {
          transform: [{ translateY }],
        },
      ]}
    >
      {/* 1. Grabber & Header (Always Visible & Tap to Toggle) */}
      <View {...panResponder.panHandlers}>
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => onToggleExpand(!isExpanded)}
          style={styles.headerPressable}
        >
          {/* Top Pill Handle */}
          <View style={styles.dragHandlePill} />

          {/* Header Row: Title & Action */}
          <View style={styles.headerRow}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.sheetTitle}>Get Started</Text>
              <Text style={styles.sheetSubtitle}>
                {isExpanded
                  ? 'Enter your phone number to receive an OTP'
                  : 'Tap to login or create your account'}
              </Text>
            </View>

            {/* Quick action button when collapsed with Purple Gradient */}
            {!isExpanded && (
              <TouchableOpacity
                style={styles.collapsedCtaPill}
                activeOpacity={0.85}
                onPress={() => onToggleExpand(true)}
                accessibilityRole="button"
                accessibilityLabel="Get Started"
              >
                <PurpleGradientBg id="collapsedLoginGrad" rx={20} active={true} />
                <Text style={styles.collapsedCtaText}>Login</Text>
                <Text style={styles.collapsedCtaArrow}>→</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* 2. Expandable Body Content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Phone Input Box with India Flag */}
          <View
            style={[
              styles.glassInputContainer,
              styles.phoneInputRow,
              focusedField === 'phone' && styles.glassInputFocused,
              errorMessage ? styles.glassInputError : null,
            ]}
          >
            <View style={styles.countryCodeBadge}>
              <Text style={styles.flagEmoji}>🇮🇳</Text>
              <Text style={styles.countryCodeText}>+91</Text>
              <Text style={styles.chevronDown}>▾</Text>
            </View>

            <View style={styles.inputDivider} />

            <TextInput
              style={styles.phoneTextInput}
              placeholder="Enter your phone number"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              maxLength={10}
              value={phoneNumber}
              onChangeText={onChangePhone}
              onFocus={() => setFocusedField('phone')}
              onBlur={() => setFocusedField(null)}
              editable={!isLoading}
              accessibilityLabel="Phone Number Input"
              autoComplete="tel"
              autoFocus={true}
            />
          </View>

          {/* Inline Error Banner */}
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Primary CTA Button with Luxury Purple Gradient */}
          <TouchableOpacity
            style={[
              styles.appleGlassCta,
              isValidPhone && !isLoading ? styles.ctaActive : styles.ctaInactive,
            ]}
            activeOpacity={0.88}
            disabled={!isValidPhone || isLoading}
            onPress={onGetOtp}
            accessibilityRole="button"
            accessibilityLabel="Get OTP"
          >
            <PurpleGradientBg
              id="getOtpGrad"
              rx={14}
              active={isValidPhone && !isLoading}
              opacity={isValidPhone && !isLoading ? 1 : 0.6}
            />
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.ctaContentRow}>
                <Text style={styles.ctaText}>Get OTP</Text>
                <Text style={styles.ctaArrow}>→</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Compact OR Divider */}
          <View style={styles.orDividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Glass Social Auth Button */}
          <View style={styles.socialAuthRow}>
            <TouchableOpacity
              style={styles.glassSocialBtn}
              activeOpacity={0.78}
              onPress={onGoogleLogin}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              <GoogleLogoSvg size={22} />
            </TouchableOpacity>
          </View>

          {/* Legal Disclaimer */}
          <View style={styles.legalBox}>
            <Text style={styles.legalText}>
              By continuing, you agree to our{' '}
              <Text style={styles.legalLink} onPress={onOpenTerms}>
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text style={styles.legalLink} onPress={onOpenPrivacy}>
                Privacy Policy
              </Text>
            </Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 12,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 90 : 75,
    marginBottom: Platform.OS === 'ios' ? -70 : -55,
  },
  headerPressable: {
    width: '100%',
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 14,
    alignItems: 'center',
  },
  dragHandlePill: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    marginBottom: 10,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextGroup: {
    flex: 1,
    paddingRight: 10,
  },
  sheetTitle: {
    fontFamily: ServenticaTokens.fonts.Bold,
    fontSize: 22,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontFamily: ServenticaTokens.fonts.Regular,
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 17,
  },

  // Collapsed State Compact CTA Pill
  collapsedCtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  collapsedCtaText: {
    fontFamily: ServenticaTokens.fonts.Bold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  collapsedCtaArrow: {
    fontFamily: ServenticaTokens.fonts.Bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  closeHandleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeHandleText: {
    fontSize: 18,
    color: '#64748B',
    marginTop: -2,
  },

  // Expanded Content
  expandedContent: {
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 8,
  },

  // Inputs
  glassInputContainer: {
    height: 50,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  glassInputFocused: {
    borderColor: '#8B5CF6',
    backgroundColor: '#FFFFFF',
  },
  glassInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  phoneInputRow: {
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 6,
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 6,
  },
  flagEmoji: {
    fontSize: 16,
  },
  countryCodeText: {
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontSize: 14,
    color: '#1E293B',
  },
  chevronDown: {
    fontSize: 10,
    color: '#94A3B8',
    marginLeft: 2,
  },
  inputDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  phoneTextInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 6,
    fontFamily: ServenticaTokens.fonts.Medium,
    fontSize: 14.5,
    color: '#0F172A',
    letterSpacing: 0.3,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Error Banner
  errorContainer: {
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  errorBannerText: {
    fontFamily: ServenticaTokens.fonts.Medium,
    fontSize: 11.5,
    color: '#B91C1C',
    lineHeight: 15,
  },

  // Primary CTA Button
  appleGlassCta: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ctaActive: {
    borderColor: 'rgba(255, 255, 255, 0.45)',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaInactive: {
    borderColor: 'rgba(255, 255, 255, 0.25)',
    opacity: 0.65,
  },
  ctaContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: ServenticaTokens.fonts.Bold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.2,
    marginRight: 6,
  },
  ctaArrow: {
    fontFamily: ServenticaTokens.fonts.Bold,
    fontSize: 15,
    color: '#FFFFFF',
  },

  // OR Divider
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  orText: {
    marginHorizontal: 12,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontSize: 10.5,
    color: '#94A3B8',
    letterSpacing: 0.5,
  },

  // Social Auth
  socialAuthRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  glassSocialBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1.2,
    borderColor: 'rgba(226, 232, 240, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },

  // Legal
  legalBox: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  legalText: {
    fontFamily: ServenticaTokens.fonts.Regular,
    fontSize: 10.5,
    lineHeight: 15,
    textAlign: 'center',
    color: '#64748B',
  },
  legalLink: {
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#D97706',
  },
});
