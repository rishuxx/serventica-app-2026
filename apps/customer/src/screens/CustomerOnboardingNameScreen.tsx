import React, { useState } from 'react';
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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Sparkles } from 'lucide-react-native';
import { ServenticaTokens } from '../../../../packages/design-system/src';

const { width } = Dimensions.get('window');

interface CustomerOnboardingNameScreenProps {
  phoneNumber: string;
  onSaveProfile: (firstName: string, lastName: string) => Promise<void>;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const CustomerOnboardingNameScreen: React.FC<CustomerOnboardingNameScreenProps> = ({
  phoneNumber,
  onSaveProfile,
  isLoading = false,
  errorMessage = null,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [focusedField, setFocusedField] = useState<'firstName' | 'lastName' | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const isValid = firstName.trim().length >= 2;

  const handleContinue = () => {
    if (isLoading) return;
    if (!firstName.trim() || firstName.trim().length < 2) {
      setLocalError('Please enter your first name (minimum 2 characters).');
      return;
    }
    setLocalError(null);
    onSaveProfile(firstName.trim(), lastName.trim());
  };

  const displayedError = localError || errorMessage;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Brand Tag */}
          <View style={styles.topBadgeContainer}>
            <View style={styles.topBadge}>
              <Sparkles size={14} color="#B45309" />
              <Text style={styles.topBadgeText}>Welcome to Serventica</Text>
            </View>
          </View>

          {/* Heading */}
          <View style={styles.headerSection}>
            <Text style={styles.mainTitle}>What's your name?</Text>
            <Text style={styles.subtitle}>
              Let our service professionals know how to address you when delivering luxury home services.
            </Text>
          </View>

          {/* Name Input Fields */}
          <View style={styles.inputSection}>
            <View style={styles.nameRow}>
              <View
                style={[
                  styles.glassInputContainer,
                  styles.nameInputHalf,
                  focusedField === 'firstName' && styles.glassInputFocused,
                  displayedError ? styles.glassInputError : null,
                ]}
              >
                <TextInput
                  style={styles.glassTextInput}
                  placeholder="First name *"
                  placeholderTextColor="#94A3B8"
                  value={firstName}
                  onChangeText={(t) => {
                    setLocalError(null);
                    setFirstName(t);
                  }}
                  onFocus={() => setFocusedField('firstName')}
                  onBlur={() => setFocusedField(null)}
                  editable={!isLoading}
                  autoCapitalize="words"
                  autoFocus
                  accessibilityLabel="First Name"
                />
              </View>

              <View
                style={[
                  styles.glassInputContainer,
                  styles.nameInputHalf,
                  focusedField === 'lastName' && styles.glassInputFocused,
                ]}
              >
                <TextInput
                  style={styles.glassTextInput}
                  placeholder="Last name"
                  placeholderTextColor="#94A3B8"
                  value={lastName}
                  onChangeText={setLastName}
                  onFocus={() => setFocusedField('lastName')}
                  onBlur={() => setFocusedField(null)}
                  editable={!isLoading}
                  autoCapitalize="words"
                  accessibilityLabel="Last Name"
                />
              </View>
            </View>

            {/* Error Banner */}
            {displayedError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorBannerText}>{displayedError}</Text>
              </View>
            ) : null}

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[
                styles.appleGlassCta,
                isValid && !isLoading ? styles.ctaActive : styles.ctaInactive,
              ]}
              activeOpacity={0.88}
              disabled={!isValid || isLoading}
              onPress={handleContinue}
              accessibilityRole="button"
              accessibilityLabel="Complete Profile"
            >
              {isLoading ? (
                <ActivityIndicator color="#0F172A" size="small" />
              ) : (
                <View style={styles.ctaContentRow}>
                  <Text style={styles.ctaText}>Complete & Continue</Text>
                  <Text style={styles.ctaArrow}>→</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  topBadgeContainer: {
    marginBottom: 20,
  },
  topBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  topBadgeText: {
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontSize: 12,
    color: '#92400E',
    letterSpacing: 0.2,
  },
  headerSection: {
    marginBottom: 32,
  },
  mainTitle: {
    fontFamily: ServenticaTokens.fonts.Bold,
    fontSize: 28,
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: ServenticaTokens.fonts.Regular,
    fontSize: 14,
    color: '#64748B',
    lineHeight: 21,
  },
  inputSection: {
    marginTop: 4,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  nameInputHalf: {
    flex: 1,
  },
  glassInputContainer: {
    height: 54,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  glassInputFocused: {
    borderColor: '#EAB308',
    backgroundColor: '#FFFFFF',
    shadowColor: '#EAB308',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  glassInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  glassTextInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontFamily: ServenticaTokens.fonts.Medium,
    fontSize: 15,
    color: '#0F172A',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  errorContainer: {
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  errorBannerText: {
    fontFamily: ServenticaTokens.fonts.Medium,
    fontSize: 13,
    color: '#B91C1C',
    lineHeight: 18,
  },
  appleGlassCta: {
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  ctaActive: {
    backgroundColor: '#FFB800',
    borderColor: 'rgba(255, 255, 255, 0.45)',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  ctaInactive: {
    backgroundColor: '#FDE047',
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
    fontSize: 16,
    color: '#0F172A',
    letterSpacing: 0.2,
    marginRight: 8,
  },
  ctaArrow: {
    fontFamily: ServenticaTokens.fonts.Bold,
    fontSize: 16,
    color: '#0F172A',
  },
});
