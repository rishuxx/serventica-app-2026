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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  FlaskConical,
  Trash2,
} from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { useAuth } from '../../../context/AuthContext';
import { useProfile } from '../../../hooks/useProfile';
import { useBookings } from '../../../hooks/useBookings';
import { useSavedServices } from '../../../hooks/useSavedServices';
import { useNotifications } from '../../../hooks/useNotifications';
import { bookingRepository } from '../../../repositories/booking.repository';
import { ProfileHeader } from '../components/ProfileHeader';
import { QuickActions } from '../components/QuickActions';
import { UpcomingBookingCard } from '../components/UpcomingBookingCard';
import { ProfileSection, ProfileMenuItem } from '../components/ProfileMenuItem';
import { LogoutConfirmationModal } from '../components/LogoutConfirmationModal';

export interface ProfileScreenProps {
  onBack?: () => void;
  onRequireLogin?: () => void;
  onNavigateEditProfile: () => void;
  onNavigateBookings: () => void;
  onNavigateBookingDetail: (bookingId: string) => void;
  onNavigateAddresses: () => void;
  onNavigateSavedServices: () => void;
  onNavigateNotifications: () => void;
  onNavigateSupport: () => void;
  onNavigateReviews: () => void;
  onNavigateSandbox?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onBack,
  onRequireLogin,
  onNavigateEditProfile,
  onNavigateBookings,
  onNavigateBookingDetail,
  onNavigateAddresses,
  onNavigateSavedServices,
  onNavigateNotifications,
  onNavigateSupport,
  onNavigateReviews,
  onNavigateSandbox,
}) => {
  const { signOut, user } = useAuth();
  const { profile } = useProfile();
  const { bookings } = useBookings('UPCOMING');
  const { savedServices } = useSavedServices();
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();

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
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 16) + 8,
          },
        ]}
      >
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Back to Home"
          >
            <ArrowLeft size={22} color='#1E242B' strokeWidth={2.0} />
          </TouchableOpacity>
        ) : null}
        <Text style={styles.screenTitle}>My Account</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* GUEST MODE CARD OR AUTHENTICATED USER PROFILE HEADER */}
        {!user ? (
          <View style={styles.guestCard}>
            <View style={styles.guestAvatar}>
              <User size={28} color="#7C3AED" strokeWidth={2} />
            </View>
            <View style={styles.guestInfo}>
              <Text style={styles.guestTitle}>Welcome to Serventica</Text>
              <Text style={styles.guestSubtitle}>
                Log in to manage your bookings, saved addresses, and profile details.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.loginCtaButton}
              activeOpacity={0.85}
              onPress={onRequireLogin}
              accessibilityRole="button"
              accessibilityLabel="Log In or Sign Up"
            >
              <Text style={styles.loginCtaText}>Log In / Sign Up</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ProfileHeader
            profile={profile}
            phone={user?.phone || ''}
            email={user?.email || (profile as any)?.email || ''}
            onEditPress={onNavigateEditProfile}
          />
        )}

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

        {/* 7. DEVELOPER SANDBOX (TESTING & PREVIEW) */}
        <ProfileSection title="Testing & Data Reset">
          {onNavigateSandbox ? (
            <ProfileMenuItem
              label="Servs Partner Simulator"
              Icon={FlaskConical}
              badge="Accept Orders"
              onPress={onNavigateSandbox}
            />
          ) : null}
          <ProfileMenuItem
            label="Reset / Delete Order History"
            Icon={Trash2}
            isDestructive
            badge="Fresh Test"
            onPress={() => {
              Alert.alert(
                'Delete Order History',
                'This will clear all booking history for this account from both the server and local cache so you can start a clean test. Proceed?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete All',
                    style: 'destructive',
                    onPress: async () => {
                      const res = await bookingRepository.clearAllUserBookings(user?.id);
                      if (res.success) {
                        Alert.alert('History Cleared', 'All previous orders have been completely removed. You can now test freshly.');
                      } else {
                        Alert.alert('Notice', res.error || 'Failed to clear history');
                      }
                    },
                  },
                ]
              );
            }}
          />
        </ProfileSection>

        {/* 8. ACCOUNT ACTION (LOGOUT OR LOGIN) */}
        {user ? (
          <ProfileSection>
            <ProfileMenuItem
              label="Log Out"
              Icon={LogOut}
              isDestructive
              hideChevron
              onPress={() => setIsLogoutModalVisible(true)}
            />
          </ProfileSection>
        ) : (
          <ProfileSection>
            <ProfileMenuItem
              label="Log In / Sign Up"
              Icon={User}
              onPress={onRequireLogin || (() => {})}
            />
          </ProfileSection>
        )}

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
    color: '#1E242B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  guestCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECECE8',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  guestAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  guestInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  guestTitle: {
    fontSize: 18,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#1E242B',
    marginBottom: 4,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  loginCtaButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  loginCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.SemiBold,
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
    letterSpacing: -0.1,
  },
});
