import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  User,
  MapPin,
  CreditCard,
  Bell,
  Headphones,
  Star,
  Settings,
  LogOut,
  ShieldCheck,
  FileText,
  Heart,
  ChevronRight,
} from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { useAuth } from '../../../context/AuthContext';
import { useProfile } from '../../../hooks/useProfile';
import { useBookings } from '../../../hooks/useBookings';
import { useSavedServices } from '../../../hooks/useSavedServices';
import { useNotifications } from '../../../hooks/useNotifications';
import { ProfileHeader } from '../components/ProfileHeader';
import { QuickActions } from '../components/QuickActions';
import { UpcomingBookingCard } from '../components/UpcomingBookingCard';
import { ProfileSection, ProfileMenuItem } from '../components/ProfileMenuItem';
import { LogoutConfirmationModal } from '../components/LogoutConfirmationModal';

export interface ProfileScreenProps {
  onBack?: () => void;
  onNavigateEditProfile: () => void;
  onNavigateBookings: () => void;
  onNavigateBookingDetail: (bookingId: string) => void;
  onNavigateAddresses: () => void;
  onNavigateSavedServices: () => void;
  onNavigateNotifications: () => void;
  onNavigateSupport: () => void;
  onNavigateReviews: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onBack,
  onNavigateEditProfile,
  onNavigateBookings,
  onNavigateBookingDetail,
  onNavigateAddresses,
  onNavigateSavedServices,
  onNavigateNotifications,
  onNavigateSupport,
  onNavigateReviews,
}) => {
  const { signOut, user } = useAuth();
  const { profile } = useProfile();
  const { bookings } = useBookings('UPCOMING');
  const { savedServices } = useSavedServices();
  const { unreadCount } = useNotifications();

  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const activeBooking = bookings[0] || null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      setIsLogoutModalVisible(false);
    } catch (err: any) {
      Alert.alert("Couldn't log you out", err.message || 'Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* TOP APP BAR WITH BACK TO HOME BUTTON */}
      <View style={styles.topBar}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Back to Home"
          >
            <ArrowLeft size={22} color="#111111" strokeWidth={2.0} />
          </TouchableOpacity>
        ) : null}
        <Text style={styles.screenTitle}>My Account</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. PROFILE IDENTITY HEADER */}
        <ProfileHeader
          profile={profile}
          phone={user?.phone || '+91 63886 93472'}
          email={user?.email || (profile as any)?.email || ''}
          onEditPress={onNavigateEditProfile}
        />

        {/* 2. OPERATIONAL QUICK ACTIONS */}
        <QuickActions
          onPressBookings={onNavigateBookings}
          onPressAddresses={onNavigateAddresses}
          onPressSaved={onNavigateSavedServices}
          activeBookingsCount={bookings.length}
        />

        {/* 3. UPCOMING SERVICE IF ACTIVE */}
        {activeBooking ? (
          <View style={styles.upcomingWrapper}>
            <Text style={styles.sectionHeaderTitle}>Active Service</Text>
            <UpcomingBookingCard
              booking={activeBooking}
              onPress={() => onNavigateBookingDetail(activeBooking.id)}
            />
          </View>
        ) : null}

        {/* 4. ACCOUNT SETTINGS & ADDRESSES */}
        <ProfileSection title="Account & Preferences">
          <ProfileMenuItem
            label="Personal Details"
            Icon={User}
            onPress={onNavigateEditProfile}
          />
          <ProfileMenuItem
            label="Saved Addresses"
            Icon={MapPin}
            onPress={onNavigateAddresses}
          />
          <ProfileMenuItem
            label="Notifications"
            Icon={Bell}
            badge={unreadCount > 0 ? unreadCount : undefined}
            onPress={onNavigateNotifications}
          />
          <ProfileMenuItem
            label="Payment Methods"
            Icon={CreditCard}
            onPress={() => {
              Alert.alert(
                'Payment Methods',
                'Your payment methods are securely managed through Razorpay during booking checkout.'
              );
            }}
          />
        </ProfileSection>

        {/* 5. SERVICES, QUALITY & SUPPORT */}
        <ProfileSection title="Orders & Experience">
          <ProfileMenuItem
            label="Bookings & Orders"
            Icon={FileText}
            onPress={onNavigateBookings}
          />
          <ProfileMenuItem
            label="Saved Services"
            Icon={Heart}
            onPress={onNavigateSavedServices}
          />
          <ProfileMenuItem
            label="My Reviews & Ratings"
            Icon={Star}
            onPress={onNavigateReviews}
          />
          <ProfileMenuItem
            label="Help & Customer Support"
            Icon={Headphones}
            onPress={onNavigateSupport}
          />
        </ProfileSection>

        {/* 6. TRUST, SECURITY & LEGAL */}
        <ProfileSection title="Trust & Legal">
          <ProfileMenuItem
            label="Serventica Assurance"
            Icon={ShieldCheck}
            onPress={() => {
              Alert.alert(
                'Serventica Assurance',
                'Every service is backed by background-verified professionals, transparent upfront pricing, and our 30-day post-service warranty.'
              );
            }}
          />
          <ProfileMenuItem
            label="Terms & Privacy"
            Icon={FileText}
            onPress={() => {
              Alert.alert(
                'Terms & Privacy',
                'Serventica protects your privacy and adheres to enterprise data security standards.'
              );
            }}
          />
        </ProfileSection>

        {/* 7. ACCOUNT ACTION (LOGOUT) */}
        <ProfileSection>
          <ProfileMenuItem
            label="Log Out"
            Icon={LogOut}
            isDestructive
            hideChevron
            onPress={() => setIsLogoutModalVisible(true)}
          />
        </ProfileSection>

        <View style={styles.appFooter}>
          <Text style={styles.appVersionText}>Serventica Customer v1.0.0 (Production)</Text>
        </View>
      </ScrollView>

      {/* LOGOUT CONFIRMATION MODAL */}
      <LogoutConfirmationModal
        visible={isLogoutModalVisible}
        onCancel={() => setIsLogoutModalVisible(false)}
        onConfirm={handleLogout}
        isLoading={isLoggingOut}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFBFA',
  },
  topBar: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0ED',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 6,
    marginRight: 10,
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#111111',
    letterSpacing: 0.2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  upcomingWrapper: {
    marginBottom: 4,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 20,
  },
  appFooter: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  appVersionText: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#AAAAAA',
  },
});
