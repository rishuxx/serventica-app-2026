import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { X, ArrowRight, Check } from 'lucide-react-native';
import { ServenticaTokens, Fonts } from '../../../../../../packages/design-system/src';
import { OrchestratedPaymentResult } from '../../../services/payment/PaymentOrchestrator';

const GREEN = '#45A878';
const GREEN_TINT = '#E9F7EF';
const GRAY_TEXT = '#9AA0A8';
const DARK = '#111827';
const DIVIDER = '#E5E7EB';

interface BookingSuccessSheetProps {
  transactionResult: OrchestratedPaymentResult;
  customerName?: string;
  itemCount?: number;
  selectedDate?: string | null;
  bookingMode?: 'EXPRESS' | 'SCHEDULED';
  onClose: () => void;
  onViewBooking: () => void;
}

const Row: React.FC<{
  label: string;
  value: string;
  valueStyle?: object;
}> = ({ label, value, valueStyle }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, valueStyle]}>{value}</Text>
  </View>
);

export const BookingSuccessSheet: React.FC<BookingSuccessSheetProps> = ({
  transactionResult,
  customerName = 'Rishu',
  itemCount = 1,
  selectedDate,
  bookingMode = 'EXPRESS',
  onClose,
  onViewBooking,
}) => {
  // Pure native spring animations for instant 60fps celebration
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseRingAnim = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Entrance Pop Animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Subtle Continuous Pulse Ring
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseRingAnim, {
          toValue: 1.2,
          duration: 1200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseRingAnim, {
          toValue: 0.95,
          duration: 1000,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => pulseLoop.stop();
  }, [scaleAnim, pulseRingAnim, opacityAnim]);

  const bookingDateText = selectedDate
    ? selectedDate
    : bookingMode === 'EXPRESS'
    ? 'today'
    : 'upcoming date';

  return (
    <View style={styles.sheet}>
      {/* Top Drag Handle */}
      <View style={styles.handle} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Review Booking</Text>
          <Text style={styles.subtitle}>
            {itemCount} {itemCount === 1 ? 'service' : 'services'} • Serventica Certified
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={20} color={GRAY_TEXT} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Animated Celebration Badge */}
        <View style={styles.celebrationWrapper}>
          {/* Animated Pulsing Halo */}
          <Animated.View
            style={[
              styles.pulseHalo,
              {
                transform: [{ scale: pulseRingAnim }],
                opacity: pulseRingAnim.interpolate({
                  inputRange: [0.95, 1.2],
                  outputRange: [0.4, 0.08],
                }),
              },
            ]}
          />

          {/* Spring Badge Circle */}
          <Animated.View
            style={[
              styles.checkWrap,
              {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            <Check size={36} color={GREEN} strokeWidth={2.8} />
          </Animated.View>
        </View>

        <Text style={styles.heading}>Booking Successful</Text>
        <Text style={styles.message}>
          {customerName ? `${customerName}, your` : 'Your'} booking is confirmed for{' '}
          {bookingDateText}. Our partner will contact you shortly.
        </Text>

        {/* Ticket Perforated Box */}
        <View style={styles.ticket}>
          <Row
            label="Payment Mode"
            value={transactionResult.paymentMethod || 'UPI'}
          />
          <Row
            label="Total Amount"
            value={`₹${transactionResult.amount}`}
          />
          <View style={styles.perforation} />
          <Row
            label="Booking ID"
            value={`#${transactionResult.bookingNumber}`}
          />
          <Row
            label="Status"
            value="Paid & Confirmed"
            valueStyle={{ color: GREEN }}
          />
        </View>

        {/* Main CTA */}
        <TouchableOpacity
          style={styles.cta}
          onPress={onViewBooking}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="View Booking"
        >
          <Text style={styles.ctaText}>View Booking</Text>
          <ArrowRight size={20} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'android' ? 24 : 36,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D8DCE2',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts.Bold,
    color: DARK,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: Fonts.Regular,
    color: GRAY_TEXT,
    marginTop: 4,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: DIVIDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  body: {
    marginTop: 18,
    alignItems: 'center',
  },
  celebrationWrapper: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 4,
  },
  pulseHalo: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: GREEN,
  },
  checkWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: GREEN_TINT,
    borderWidth: 2,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 24,
    fontFamily: Fonts.Bold,
    color: DARK,
    marginTop: 14,
  },
  message: {
    fontSize: 14,
    fontFamily: Fonts.Regular,
    color: '#6E7681',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
    paddingHorizontal: 12,
  },
  ticket: {
    width: '100%',
    marginTop: 20,
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 6,
    backgroundColor: '#FAFAFA',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  rowLabel: {
    fontSize: 14.5,
    fontFamily: Fonts.Medium,
    color: '#6E7681',
  },
  rowValue: {
    fontSize: 14.5,
    fontFamily: Fonts.Bold,
    color: DARK,
  },
  perforation: {
    borderBottomWidth: 1.5,
    borderColor: DIVIDER,
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  cta: {
    width: '100%',
    height: 56,
    marginTop: 22,
    backgroundColor: GREEN,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
});
