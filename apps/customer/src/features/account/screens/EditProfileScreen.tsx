import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Lock, CheckCircle2 } from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { useProfile } from '../../../hooks/useProfile';

interface EditProfileScreenProps {
  onBack: () => void;
}

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { profile, user, updateProfile, isUpdating } = useProfile();

  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone] = useState(user?.phone || '');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert('Required Field', 'Please provide your first name.');
      return;
    }

    const res = await updateProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
    });

    if (res.success) {
      setSuccessMessage('Profile updated successfully.');
      setTimeout(() => {
        onBack();
      }, 1000);
    } else {
      Alert.alert('Update Failed', res.error || 'Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 16) + 8,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.circleBackButton}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color='#1E242B' strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {successMessage ? (
          <View style={styles.successBanner}>
            <CheckCircle2 size={18} color="#059669" strokeWidth={2} />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        <View style={styles.formCard}>
          {/* FIRST NAME */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>First Name</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="e.g. Rishu"
              placeholderTextColor="#888888"
            />
          </View>

          {/* LAST NAME */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="e.g. Kumar"
              placeholderTextColor="#888888"
            />
          </View>

          {/* EMAIL */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="e.g. rishu@example.com"
              placeholderTextColor="#888888"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* PHONE (SECURE / LOCKED) */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelWithLock}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <View style={styles.verifiedBadge}>
                <Lock size={12} color="#059669" strokeWidth={2} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
            <View style={[styles.input, styles.inputDisabled]}>
              <Text style={styles.disabledText}>{phone}</Text>
            </View>
            <Text style={styles.helperText}>
              Phone number is tied to your account login and cannot be modified without OTP verification.
            </Text>
          </View>
        </View>

        {/* SAVE CTA */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isUpdating}
          activeOpacity={0.85}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFBFA',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 14,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0ED',
  },
  circleBackButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
  },
  headerSpacer: {
    width: 38,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    gap: 8,
  },
  successText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#059669',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F0F0ED',
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  labelWithLock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#444444',
    marginBottom: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#059669',
  },
  input: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F7F7F5',
    borderWidth: 1,
    borderColor: '#E8E8E6',
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#1E242B',
  },
  inputDisabled: {
    justifyContent: 'center',
    backgroundColor: '#EFEFEF',
    borderColor: '#E2E2E0',
  },
  disabledText: {
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#666666',
  },
  helperText: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#888888',
    marginTop: 6,
    lineHeight: 16,
  },
  saveButton: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E242B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E242B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  saveButtonText: {
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
