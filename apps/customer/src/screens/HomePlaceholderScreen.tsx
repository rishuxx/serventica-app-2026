import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { ServenticaTokens } from '../../../../packages/design-system/src';

/**
 * SERVENTICA — Home Placeholder Screen
 * Temporary screen proving end-to-end authentication, session persistence, and customer profile bootstrap.
 * NOTE: DO NOT design final home screen UI here. This will be replaced by the real home screen.
 */
export const HomePlaceholderScreen: React.FC = () => {
  const { user, profile, roles, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Brand Header */}
        <View style={styles.header}>
          <Text style={styles.brandTitle}>
            Serventica<Text style={styles.brandDot}>.</Text>
          </Text>
          <Text style={styles.tagline}>Home Services Marketplace</Text>
        </View>

        {/* Auth Success Banner */}
        <View style={styles.statusCard}>
          <View style={styles.badgeRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusBadgeText}>AUTHENTICATED</Text>
          </View>
          <Text style={styles.welcomeHeading}>Welcome to Serventica</Text>
          <Text style={styles.welcomeSubtext}>
            Authentication, session persistence, and customer bootstrap foundation verified.
          </Text>
        </View>

        {/* Identity & Profile Data */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionHeader}>Customer Identity</Text>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>User ID:</Text>
            <Text style={styles.dataValue} numberOfLines={1} ellipsizeMode="middle">
              {user?.id || 'N/A'}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Phone / Email:</Text>
            <Text style={styles.dataValue}>
              {user?.phone || user?.email || 'N/A'}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Onboarding State:</Text>
            <Text style={[styles.dataValue, styles.highlightValue]}>
              {profile?.onboarding_status || 'NEW'}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Assigned Roles:</Text>
            <Text style={styles.dataValue}>
              {roles.join(', ')}
            </Text>
          </View>
        </View>

        {/* Notice on Next Phase */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>Next Phase Ready</Text>
          <Text style={styles.noticeText}>
            Awaiting reference design for the production Home Screen (categories, search, banners, booking flow).
          </Text>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          activeOpacity={0.85}
          onPress={signOut}
          accessibilityLabel="Sign Out"
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcfbf7', // Ivory background
  },
  scrollContent: {
    padding: 24,
    paddingTop: 30,
  },
  header: {
    marginBottom: 28,
  },
  brandTitle: {
    fontSize: 36,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    fontWeight: '700',
    color: '#e5aa1e',
    letterSpacing: -0.5,
  },
  brandDot: {
    color: '#e5aa1e',
    fontWeight: '900',
  },
  tagline: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: ServenticaTokens.fonts.Medium,
    marginTop: 2,
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.2,
    borderColor: '#e5e7eb',
    marginBottom: 20,
    shadowColor: '#1E242B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981', // Green indicator
    marginRight: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.8,
  },
  welcomeHeading: {
    fontSize: 20,
    fontFamily: ServenticaTokens.fonts.Bold,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  welcomeSubtext: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
    fontFamily: ServenticaTokens.fonts.Regular,
  },
  infoSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.2,
    borderColor: '#e5e7eb',
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.Bold,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dataLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  dataValue: {
    fontSize: 13,
    color: '#111827',
    fontFamily: ServenticaTokens.fonts.Bold,
    fontWeight: '600',
    maxWidth: '55%',
  },
  highlightValue: {
    color: '#e5aa1e',
  },
  noticeBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 28,
  },
  noticeTitle: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Bold,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 16,
    fontFamily: ServenticaTokens.fonts.Regular,
  },
  signOutButton: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#ef4444',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.Bold,
    fontWeight: '700',
  },
});
