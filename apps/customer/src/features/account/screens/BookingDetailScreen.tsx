import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  UserCheck,
  Phone,
  HelpCircle,
  XCircle,
  CheckCircle2,
} from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { useBookingDetail } from '../../../hooks/useBookings';
import { BookingStatus } from '../../../../../../packages/types/src';

interface BookingDetailScreenProps {
  bookingId: string;
  onBack: () => void;
  onGetHelp: (bookingId: string) => void;
  onBookAgain?: (serviceId: string) => void;
}

export const BookingDetailScreen: React.FC<BookingDetailScreenProps> = ({
  bookingId,
  onBack,
  onGetHelp,
  onBookAgain,
}) => {
  const { booking, isLoading, error, isCancelling, cancel } = useBookingDetail(bookingId);

  const [cancelPromptVisible, setCancelPromptVisible] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#111111" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.errorTitle}>Booking Not Found</Text>
        <Text style={styles.errorSubtitle}>
          {error || 'The requested booking could not be loaded.'}
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCancelPress = () => {
    Alert.alert(
      'Cancel Booking?',
      'Are you sure you want to cancel this scheduled service? Cancellations are free up to 2 hours before the start time.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Service',
          style: 'destructive',
          onPress: async () => {
            const res = await cancel('Customer requested cancellation');
            if (!res.success) {
              Alert.alert('Cannot Cancel', res.error);
            }
          },
        },
      ]
    );
  };

  // Status timeline determination
  const steps: { label: string; done: boolean; active: boolean }[] = [
    {
      label: 'Confirmed',
      done: true,
      active: booking.status === 'CONFIRMED' || booking.status === 'SEARCHING_PARTNER',
    },
    {
      label: 'Professional Assigned',
      done: [
        'PARTNER_ASSIGNED',
        'PARTNER_ACCEPTED',
        'PARTNER_EN_ROUTE',
        'PARTNER_ARRIVED',
        'SERVICE_STARTED',
        'SERVICE_COMPLETED',
        'CLOSED',
      ].includes(booking.status),
      active: booking.status === 'PARTNER_ASSIGNED' || booking.status === 'PARTNER_ACCEPTED',
    },
    {
      label: 'On the Way',
      done: [
        'PARTNER_EN_ROUTE',
        'PARTNER_ARRIVED',
        'SERVICE_STARTED',
        'SERVICE_COMPLETED',
        'CLOSED',
      ].includes(booking.status),
      active: booking.status === 'PARTNER_EN_ROUTE' || booking.status === 'PARTNER_ARRIVED',
    },
    {
      label: 'Service In Progress',
      done: ['SERVICE_STARTED', 'SERVICE_COMPLETED', 'CLOSED'].includes(booking.status),
      active: booking.status === 'SERVICE_STARTED',
    },
    {
      label: 'Completed',
      done: booking.status === 'SERVICE_COMPLETED' || booking.status === 'CLOSED',
      active: booking.status === 'SERVICE_COMPLETED' || booking.status === 'CLOSED',
    },
  ];

  const canCancel = [
    'CONFIRMED',
    'SEARCHING_PARTNER',
    'PARTNER_ASSIGNED',
    'PARTNER_ACCEPTED',
  ].includes(booking.status);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.circleBackButton}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color="#111111" strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{booking.bookingNumber}</Text>
        <TouchableOpacity
          style={styles.helpIconBtn}
          onPress={() => onGetHelp(booking.id)}
          activeOpacity={0.7}
        >
          <HelpCircle size={20} color="#111111" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SERVICE SUMMARY */}
        <View style={styles.card}>
          <Text style={styles.serviceTitle}>{booking.serviceName}</Text>
          <View style={styles.metaRow}>
            <Calendar size={14} color="#666666" strokeWidth={2} />
            <Text style={styles.metaText}>{booking.scheduledDate || 'Scheduled date'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Clock size={14} color="#666666" strokeWidth={2} />
            <Text style={styles.metaText}>
              {booking.scheduledStartTime
                ? new Date(booking.scheduledStartTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '10:00 AM – 11:00 AM'}
            </Text>
          </View>
        </View>

        {/* STATUS TIMELINE */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Service Status</Text>
          <View style={styles.timeline}>
            {steps.map((step, idx) => (
              <View key={step.label} style={styles.timelineStep}>
                <View style={styles.timelineIndicatorCol}>
                  <View
                    style={[
                      styles.timelineDot,
                      step.done && styles.timelineDotDone,
                      step.active && styles.timelineDotActive,
                    ]}
                  >
                    {step.done ? (
                      <CheckCircle2 size={12} color="#FFFFFF" strokeWidth={2.5} />
                    ) : null}
                  </View>
                  {idx < steps.length - 1 ? (
                    <View
                      style={[
                        styles.timelineLine,
                        step.done && styles.timelineLineDone,
                      ]}
                    />
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.timelineLabel,
                    step.active && styles.timelineLabelActive,
                    step.done && styles.timelineLabelDone,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ASSIGNED PROFESSIONAL (IF ANY) */}
        {booking.partner ? (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Assigned Professional</Text>
            <View style={styles.partnerRow}>
              <View style={styles.partnerAvatarCircle}>
                <UserCheck size={20} color="#059669" strokeWidth={2} />
              </View>
              <View style={styles.partnerInfo}>
                <Text style={styles.partnerName}>{booking.partner.name}</Text>
                <Text style={styles.partnerSpecialty}>
                  {booking.partner.specialization || 'Verified Technician'} · ★ {booking.partner.rating || 4.9}
                </Text>
              </View>
              {booking.partner.phone ? (
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => Alert.alert('Call Professional', booking.partner?.phone)}
                  activeOpacity={0.7}
                >
                  <Phone size={16} color="#FFFFFF" strokeWidth={2} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* SERVICE ADDRESS SNAPSHOT */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Service Address</Text>
          <View style={styles.addressBox}>
            <MapPin size={16} color="#111111" strokeWidth={2} style={styles.addressIcon} />
            <View style={styles.addressTextCol}>
              <Text style={styles.addressTitle}>{booking.address.title}</Text>
              <Text style={styles.addressFull}>{booking.address.formattedAddress}</Text>
            </View>
          </View>
        </View>

        {/* PAYMENT SUMMARY */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Payment Summary</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Subtotal</Text>
            <Text style={styles.billValue}>₹{booking.payment.subtotal}</Text>
          </View>
          {booking.payment.discount > 0 ? (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, styles.discountText]}>Discount</Text>
              <Text style={[styles.billValue, styles.discountText]}>
                -₹{booking.payment.discount}
              </Text>
            </View>
          ) : null}
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Taxes & Fee</Text>
            <Text style={styles.billValue}>₹{booking.payment.tax + booking.payment.platformFee}</Text>
          </View>
          <View style={[styles.billRow, styles.billRowTotal]}>
            <Text style={styles.billLabelTotal}>Total Amount</Text>
            <Text style={styles.billValueTotal}>₹{booking.payment.total}</Text>
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionContainer}>
          {canCancel ? (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelPress}
              disabled={isCancelling}
              activeOpacity={0.8}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Text style={styles.cancelButtonText}>Cancel Booking</Text>
              )}
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => onGetHelp(booking.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.supportButtonText}>Need Help with this Booking?</Text>
          </TouchableOpacity>
        </View>
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
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#111111',
  },
  helpIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F0F0ED',
  },
  serviceTitle: {
    fontSize: 18,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#111111',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#666666',
  },
  cardHeading: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  timeline: {
    paddingLeft: 6,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 38,
  },
  timelineIndicatorCol: {
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E0E0DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: '#059669',
  },
  timelineDotActive: {
    backgroundColor: '#111111',
  },
  timelineLine: {
    width: 2,
    height: 20,
    backgroundColor: '#E0E0DE',
    marginVertical: 2,
  },
  timelineLineDone: {
    backgroundColor: '#059669',
  },
  timelineLabel: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#888888',
    marginTop: 1,
  },
  timelineLabelActive: {
    color: '#111111',
    fontFamily: ServenticaTokens.fonts.Medium,
    fontWeight: '600',
  },
  timelineLabelDone: {
    color: '#222222',
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#111111',
  },
  partnerSpecialty: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#666666',
    marginTop: 2,
  },
  callButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  addressTextCol: {
    flex: 1,
  },
  addressTitle: {
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#111111',
    marginBottom: 2,
  },
  addressFull: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#666666',
    lineHeight: 18,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  billLabel: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#666666',
  },
  billValue: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#111111',
  },
  discountText: {
    color: '#059669',
  },
  billRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0ED',
    marginTop: 8,
    paddingTop: 10,
  },
  billLabelTotal: {
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#111111',
  },
  billValueTotal: {
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#111111',
  },
  actionContainer: {
    marginTop: 10,
    gap: 12,
  },
  cancelButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  cancelButtonText: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#DC2626',
    fontWeight: '600',
  },
  supportButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F7F7F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E6',
  },
  supportButtonText: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#333333',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#666666',
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#111111',
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#111111',
  },
  backBtnText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#FFFFFF',
  },
});
