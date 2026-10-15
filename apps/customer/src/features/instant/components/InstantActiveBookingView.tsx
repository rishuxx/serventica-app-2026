/**
 * SERVENTICA — Instant Active Booking View
 * En route tracking, Doorstep OTP card, Active Service HUD, and live Mapbox integration
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Zap, HelpCircle, XCircle, Lock, MessageSquare } from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';
import { InstantActiveBooking } from '../types/instant.types';
import { InstantPartnerCard } from './InstantPartnerCard';
import { InstantDoorstepOtpCard } from './InstantDoorstepOtpCard';
import { InstantActiveServiceHUD } from './InstantActiveServiceHUD';
import { InstantStatusTimeline } from './InstantStatusTimeline';
import { LiveTrackingMap } from '../../account/components/LiveTrackingMap';
import { BookingChatModal } from './BookingChatModal';

interface InstantActiveBookingViewProps {
  booking: InstantActiveBooking;
  serviceRemainingSeconds: number;
  onOpenExtension: () => void;
  onCancelBooking: (reason?: string) => void;
  onBack: () => void;
}

export const InstantActiveBookingView: React.FC<InstantActiveBookingViewProps> = ({
  booking,
  serviceRemainingSeconds,
  onOpenExtension,
  onCancelBooking,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const [isChatOpen, setIsChatOpen] = useState(false);

  // 40-Second Cancellation Window & Mid-Way Lock Policy
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (!booking.createdAt) return 40;
    const elapsed = Math.floor((Date.now() - new Date(booking.createdAt).getTime()) / 1000);
    return Math.max(0, 40 - elapsed);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      if (!booking.createdAt) {
        setSecondsRemaining((prev) => Math.max(0, prev - 1));
        return;
      }
      const elapsed = Math.floor((Date.now() - new Date(booking.createdAt).getTime()) / 1000);
      setSecondsRemaining(Math.max(0, 40 - elapsed));
    }, 1000);

    return () => clearInterval(timer);
  }, [booking.createdAt]);

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 16
  );
  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 16 : 24
  );

  const isDoorstepArrived =
    booking.status === 'ARRIVED_AT_DOORSTEP' || booking.status === 'PARTNER_ARRIVED';
  const isServiceStarted =
    booking.status === 'SERVICE_IN_PROGRESS' || booking.status === 'SERVICE_STARTED';
  const isEnRoute =
    booking.status === 'PARTNER_EN_ROUTE' || booking.status === 'EN_ROUTE';
  const isCompleted =
    booking.status === 'COMPLETED' ||
    booking.status === 'SERVICE_COMPLETED' ||
    booking.status === 'CLOSED';

  const isMidway = isEnRoute || isDoorstepArrived || isServiceStarted;
  const isSearching = booking.status === 'SEARCHING_PARTNER' || booking.status === 'MATCHING';
  const canCancel = !isMidway && (isSearching || secondsRemaining > 0);

  const partner = booking.assignedPartner?.partner;

  const handleCancel = () => {
    if (isMidway) {
      Alert.alert(
        'Mid-Way Cancellation Unavailable',
        'Your specialist is already dispatched / en-route to your location. Mid-way cancellation is strictly not permitted to protect our partner community.',
        [{ text: 'Understood', style: 'default' }]
      );
      return;
    }

    if (!isSearching && secondsRemaining <= 0) {
      Alert.alert(
        'Cancellation Window Expired',
        'Free cancellation was available for 40 seconds following booking placement. Your specialist is committed to fulfilling your order.',
        [{ text: 'Understood', style: 'default' }]
      );
      return;
    }

    Alert.alert(
      'Cancel Instant Request?',
      `Are you sure you want to cancel? You have ${secondsRemaining}s remaining in your 40-second free cancellation window.`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => onCancelBooking('Customer cancelled within 40s policy window'),
        },
      ]
    );
  };

  const getStatusHeadline = () => {
    switch (booking.status) {
      case 'PARTNER_ASSIGNED':
      case 'PARTNER_ACCEPTED':
      case 'ACCEPTED':
        return 'Specialist Assigned';
      case 'PARTNER_EN_ROUTE':
      case 'EN_ROUTE':
        return 'Specialist On The Way';
      case 'PARTNER_ARRIVED':
      case 'ARRIVED_AT_DOORSTEP':
        return 'Arrived at Doorstep';
      case 'SERVICE_STARTED':
      case 'SERVICE_IN_PROGRESS':
        return 'Service In Progress';
      case 'SERVICE_COMPLETED':
      case 'COMPLETED':
        return 'Service Completed';
      default:
        return 'Active Instant Request';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={Platform.OS === 'android'}
      />

      {/* HEADER */}
      <View
        style={[
          styles.headerRow,
          {
            paddingTop: topInset + 8,
            paddingLeft: Math.max(insets.left, 16),
            paddingRight: Math.max(insets.right, 16),
          },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#1E242B" />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>{getStatusHeadline()}</Text>
          <Text style={styles.headerSubtitle}>
            {booking.serviceTitle} • #{booking.bookingId.substring(0, 10)}
          </Text>
        </View>
        {!isCompleted && !isServiceStarted && (
          <TouchableOpacity
            style={[styles.cancelTopBtn, !canCancel && styles.cancelTopBtnDisabled]}
            onPress={handleCancel}
          >
            <Text style={[styles.cancelTopBtnText, !canCancel && styles.cancelTopBtnTextDisabled]}>
              {canCancel ? `Cancel (${secondsRemaining}s)` : 'Locked'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: bottomInset + 32,
            paddingLeft: Math.max(insets.left, 16),
            paddingRight: Math.max(insets.right, 16),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. LIVE TRACKING MAP */}
        <View style={styles.mapCard}>
          <LiveTrackingMap
            partner={
              partner
                ? {
                    id: partner.id,
                    name: partner.name,
                    phone: partner.phone,
                    avatarUrl: partner.avatarUrl,
                    rating: partner.rating,
                    specialization: partner.specialization,
                  }
                : null
            }
            status={booking.status}
            userAddressLine={booking.addressLine}
            etaText="12 mins"
            partnerLat={booking.liveLocation?.latitude ?? 30.3175}
            partnerLon={booking.liveLocation?.longitude ?? 78.0335}
            customerLat={30.316494}
            customerLon={78.032191}
            isLiveGps={Boolean(booking.liveLocation)}
          />
        </View>

        {/* 2. DOORSTEP ARRIVAL OTP (Shown when partner is at doorstep) */}
        {isDoorstepArrived && booking.verificationOtp ? (
          <View style={styles.sectionBlock}>
            <InstantDoorstepOtpCard
              otp={booking.verificationOtp}
              partnerName={partner?.name}
            />
          </View>
        ) : null}

        {/* 3. IN-SERVICE LIVE HUD & EXTENSION (Shown during service) */}
        {isServiceStarted ? (
          <View style={styles.sectionBlock}>
            <InstantActiveServiceHUD
              remainingSeconds={serviceRemainingSeconds}
              onOpenExtension={onOpenExtension}
              canExtend={booking.canExtend}
            />
          </View>
        ) : null}

        {/* 4. ASSIGNED PARTNER PROFILE */}
        {partner ? (
          <View style={styles.sectionBlock}>
            <InstantPartnerCard
              partner={partner}
              etaMinutes={12}
              onOpenChat={() => setIsChatOpen(true)}
            />
            <TouchableOpacity
              style={styles.chatPromptBtn}
              onPress={() => setIsChatOpen(true)}
              activeOpacity={0.8}
            >
              <MessageSquare size={16} color="#7C3AED" />
              <Text style={styles.chatPromptBtnText}>
                Chat with {partner.name ? partner.name.split(' ')[0] : 'Specialist'} (Gate codes, directions)
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* 5. STATUS TIMELINE */}
        <View style={styles.sectionBlock}>
          <InstantStatusTimeline currentStatus={booking.status} />
        </View>

        {/* 6. BOTTOM CANCEL BUTTON IF NOT COMPLETED */}
        {!isCompleted && !isServiceStarted && (
          <View style={styles.cancelSectionWrapper}>
            <TouchableOpacity
              style={[
                styles.destructiveCancelBtn,
                !canCancel && styles.destructiveCancelBtnDisabled,
              ]}
              onPress={handleCancel}
              activeOpacity={0.8}
            >
              {isMidway ? (
                <>
                  <Lock size={15} color="#64748B" />
                  <Text style={styles.destructiveCancelBtnTextDisabled}>
                    Mid-way Cancellation Unavailable • Specialist En Route
                  </Text>
                </>
              ) : !isSearching && secondsRemaining <= 0 ? (
                <>
                  <Lock size={15} color="#64748B" />
                  <Text style={styles.destructiveCancelBtnTextDisabled}>
                    Free Cancellation Expired (40s Window Reached)
                  </Text>
                </>
              ) : (
                <>
                  <XCircle size={15} color="#DC2626" />
                  <Text style={styles.destructiveCancelBtnText}>
                    Cancel Request ({secondsRemaining}s remaining)
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.cancelPolicyNotice}>
              Serventica Policy: Free cancellation allowed within 40 seconds. Once specialist is en route, mid-way cancellation is strictly blocked.
            </Text>
          </View>
        )}

        {/* 7. BOTTOM DONE BUTTON IF COMPLETED */}
        {isCompleted && (
          <TouchableOpacity
            style={styles.completedDoneBtn}
            onPress={onBack}
            activeOpacity={0.85}
          >
            <Text style={styles.completedDoneBtnText}>Service Completed • Back to Home</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* REAL-TIME CHAT MODAL WITH AUTHORIZED ASSIGNED PARTNER */}
      <BookingChatModal
        visible={isChatOpen}
        bookingId={booking.bookingId}
        bookingNumber={booking.bookingNumber}
        customerId={booking.customerId || '6e9fc42b-8f70-4c39-9278-49d33043aac9'}
        customerName="Customer"
        partnerName={partner?.name || 'Serventica Specialist'}
        partnerAvatarUrl={partner?.avatarUrl}
        partnerSpecialization={partner?.specialization}
        onClose={() => setIsChatOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  backBtn: {
    padding: 6,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: '#1E242B',
  },
  headerSubtitle: {
    fontSize: 11.5,
    fontFamily: Fonts.Regular,
    color: '#64748B',
    marginTop: 1,
  },
  cancelTopBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cancelTopBtnDisabled: {
    opacity: 0.6,
  },
  cancelTopBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.SemiBold,
    color: '#DC2626',
  },
  cancelTopBtnTextDisabled: {
    color: '#64748B',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  mapCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionBlock: {
    width: '100%',
  },
  chatPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
    marginTop: 8,
  },
  chatPromptBtnText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 12,
    color: '#7C3AED',
  },
  cancelSectionWrapper: {
    width: '100%',
    marginTop: 8,
  },
  destructiveCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
  },
  destructiveCancelBtnDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  destructiveCancelBtnText: {
    fontSize: 13,
    fontFamily: Fonts.Bold,
    color: '#DC2626',
  },
  destructiveCancelBtnTextDisabled: {
    fontSize: 12,
    fontFamily: Fonts.Medium,
    color: '#64748B',
  },
  cancelPolicyNotice: {
    fontFamily: Fonts.Regular,
    fontSize: 10.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 15,
  },
  completedDoneBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    elevation: 3,
  },
  completedDoneBtnText: {
    fontSize: 14,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
