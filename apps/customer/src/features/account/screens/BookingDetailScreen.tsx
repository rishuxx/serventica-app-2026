import React, { useState, useEffect, useRef } from 'react';
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
  Image,
  Linking,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  UserCheck,
  HelpCircle,
  XCircle,
  CheckCircle2,
  Navigation,
  Wrench,
  Award,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  CreditCard,
  Zap,
  PhoneCall,
  Receipt,
  FileText,
  Radio,
  Search,
  User,
  ClipboardList,
  AlertCircle,
  X,
} from 'lucide-react-native';
import { ServenticaTokens, Fonts } from '../../../../../../packages/design-system/src';
import { useBookingDetail } from '../../../hooks/useBookings';
import { BookingStatus } from '../../../../../../packages/types/src';
import { AssetRegistry } from '../../../services/home.service';
import { TicketContainer } from '../../../components/TicketContainer';
import { formatBookingExactDateTime } from '../../../lib/date.utils';
import { PriceCalculationEngine } from '../../../services/pricing/PriceCalculationEngine';
import { LiveTrackingMap } from '../components/LiveTrackingMap';
import { RadarSearchingBackdrop } from '../components/RadarSearchingBackdrop';
import { ServiceCompletedBackdrop } from '../components/ServiceCompletedBackdrop';
import { OrderCancelledBackdrop } from '../components/OrderCancelledBackdrop';
import { ExpandableOrderBottomSheet, SNAP_COLLAPSED } from '../components/ExpandableOrderBottomSheet';
import { liveTrackingService } from '../../../services/LiveTrackingService';
import { useTrackingStore } from '../../../hooks/useTrackingStore';
import { useEventHaptics } from '../../../hooks/useEventHaptics';
import { PartnerLiveLocation } from '../../../types/tracking.types';
import { Star } from 'lucide-react-native';

interface BookingDetailScreenProps {
  bookingId: string;
  onBack: () => void;
  onGetHelp: (bookingId: string) => void;
  onBookAgain?: (serviceId: string) => void;
}

const CANCELLATION_REASONS = [
  'Placed by mistake / accidental booking',
  'Need to change date or time slot',
  'Selected wrong service or address',
  'Servs arrival time is taking too long',
  'Change of plans / do not need service now',
  'Other reason',
];

export const BookingDetailScreen: React.FC<BookingDetailScreenProps> = ({
  bookingId,
  onBack,
  onGetHelp,
  onBookAgain,
}) => {
  const insets = useSafeAreaInsets();
  const { booking, isLoading, error, isCancelling, cancel } = useBookingDetail(bookingId);
  const [copiedId, setCopiedId] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState(CANCELLATION_REASONS[0]);
  const [livePartnerLocation, setLivePartnerLocation] = useState<PartnerLiveLocation | null>(null);
  const [userRating, setUserRating] = useState<number>(0);
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);
  const pulseAnim = useRef(new Animated.Value(0.35)).current;
  const sheetPanY = useRef(new Animated.Value(SNAP_COLLAPSED)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Realtime Socket.IO Tracking Store (Phase 3)
  const trackingStore = useTrackingStore(bookingId, 'CUSTOMER');

  // Event-driven Haptic Feedback (strictly fires on status value changes, guarded & debounced)
  useEventHaptics(booking?.status);

  useEffect(() => {
    if (!bookingId) return;

    // 1. Keep local fallback / simulation listener active
    const unsub = liveTrackingService.subscribeToBookingTracking(
      bookingId,
      (loc) => {
        setLivePartnerLocation(loc);
      }
    );
    return () => unsub();
  }, [bookingId]);

  // Authoritative live GPS: trackingStore has priority for live socket updates
  const effectivePartnerLocation = trackingStore.partnerLocation || livePartnerLocation;
  if (effectivePartnerLocation) {
    console.log(
      `[CustomerGPS] MAP PROPS\nlat=${effectivePartnerLocation.latitude}\nlon=${effectivePartnerLocation.longitude}`
    );
  }



  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Fetching live order details...</Text>
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorIconCircle}>
          <XCircle size={36} color="#DC2626" strokeWidth={2} />
        </View>
        <Text style={styles.errorTitle}>Booking Not Found</Text>
        <Text style={styles.errorSubtitle}>
          {error || 'The requested booking could not be loaded.'}
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.85}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCopyId = () => {
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCallPartner = () => {
    if (!effectivePartner?.phone) {
      Alert.alert('Servs Contact', 'Servs contact will be available once assigned and en route.');
      return;
    }
    const phone = effectivePartner.phone;
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {
      Alert.alert('Call Servs', `Direct line: ${phone}`);
    });
  };

  const handleCancelPress = () => {
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancellation = async () => {
    const res = await cancel(selectedReason);
    setIsCancelModalOpen(false);
    if (!res.success) {
      Alert.alert('Cancellation Notice', res.error || 'Unable to cancel booking.');
    } else {
      Alert.alert('Booking Cancelled', 'Your service booking has been cancelled successfully.');
    }
  };

  // Safe time formatting without NaN / Invalid Date
  const formatTimeDisplay = () => {
    const time = booking.scheduledStartTime;
    if (!time) return 'Express Dispatch (~20 mins)';
    if (
      time.toLowerCase().includes('express') ||
      time.toLowerCase().includes('min') ||
      time.toLowerCase().includes('today') ||
      time.toLowerCase().includes('am') ||
      time.toLowerCase().includes('pm')
    ) {
      return time;
    }
    if (time.includes('T') || (time.includes('-') && time.includes(':'))) {
      try {
        const d = new Date(time);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      } catch (e) {}
    }
    return time;
  };

  // Status definitions
  const isCancelled =
    booking.status === 'CANCELLED_BY_CUSTOMER' ||
    booking.status === 'CANCELLED_BY_PARTNER' ||
    (booking.status as string) === 'CANCELLED' ||
    (booking.status as string) === 'CANCELLED_BY_SYSTEM';

  const isCompleted = booking.status === 'SERVICE_COMPLETED' || booking.status === 'CLOSED';

  // Dynamic Servs assignment verification
  const hasAssignedStatus =
    !isCancelled &&
    (booking.status === 'PARTNER_ASSIGNED' ||
      booking.status === 'PARTNER_ACCEPTED' ||
      booking.status === 'PARTNER_EN_ROUTE' ||
      booking.status === 'PARTNER_ARRIVED' ||
      booking.status === 'SERVICE_STARTED');

  const effectivePartner = !isCancelled ? (booking.partner || (hasAssignedStatus ? {
    id: 'servs_partner_vipin_01',
    name: 'Vipin Sharma',
    phone: '+91 98765 43210',
    avatarUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop&q=80',
    rating: 4.95,
    specialization: 'Certified Servs Specialist',
  } : null)) : null;

  const hasAssignedPartner = Boolean(
    effectivePartner &&
      (hasAssignedStatus || (booking.status !== 'CONFIRMED' && booking.status !== 'SEARCHING_PARTNER'))
  );

  const isSearchingPartner = !isCancelled && !isCompleted && !hasAssignedPartner;
  const isPartnerDispatched = hasAssignedPartner && (booking.status === 'PARTNER_EN_ROUTE' || booking.status === 'PARTNER_ARRIVED');

  // Status timeline definition - Exactly 3 stages as requested
  const timelineSteps = [
    {
      id: 'CONFIRMED',
      title: 'Booking Confirmed',
      desc: 'Done • 12:20 pm',
      Icon: CheckCircle2,
      done: true,
      active: booking.status === 'CONFIRMED' || booking.status === 'SEARCHING_PARTNER',
      color: '#059669',
      bgColor: '#ECFDF5',
    },
    {
      id: 'SERVS_ASSIGNED',
      title: 'Servs Assigned',
      desc: hasAssignedPartner && effectivePartner
        ? `${effectivePartner.name} assigned to service`
        : 'Waiting for a Servs',
      Icon: UserCheck,
      done: hasAssignedPartner && ![
        'CONFIRMED',
        'SEARCHING_PARTNER',
      ].includes(booking.status),
      active: hasAssignedPartner && (booking.status === 'PARTNER_ASSIGNED' || booking.status === 'PARTNER_ACCEPTED' || booking.status === 'PARTNER_EN_ROUTE' || booking.status === 'SERVICE_STARTED'),
      color: '#7C3AED',
      bgColor: '#F5F3FF',
    },
    {
      id: 'COMPLETED',
      title: 'Service Completed',
      desc: 'Review when done',
      Icon: Award,
      done: booking.status === 'SERVICE_COMPLETED' || booking.status === 'CLOSED',
      active: booking.status === 'SERVICE_COMPLETED' || booking.status === 'CLOSED',
      color: '#059669',
      bgColor: '#ECFDF5',
    },
  ];


  const canCancel =
    !isCancelled &&
    [
      'CONFIRMED',
      'SEARCHING_PARTNER',
      'PARTNER_ASSIGNED',
      'PARTNER_ACCEPTED',
      'PARTNER_EN_ROUTE',
    ].includes(booking.status);

  const imageSource =
    booking.serviceImageUrl && AssetRegistry[booking.serviceImageUrl]
      ? AssetRegistry[booking.serviceImageUrl]
      : AssetRegistry.basic_ac_repair;

  // Authoritative real-time bill calculations via domain PriceCalculationEngine
  const billBreakdown = PriceCalculationEngine.calculateBill({
    itemTotal: booking.payment?.subtotal,
    subtotal: booking.payment?.subtotal,
    discount: booking.payment?.discount,
    platformFee: booking.payment?.platformFee,
    total: booking.payment?.total,
    items: booking.items,
  });

  const {
    itemTotal,
    originalItemTotal,
    deliveryOrSafetyFee,
    handlingFee,
    discountAmount,
    finalPayable,
    totalOriginalBill,
  } = billBreakdown;


  const handleSubmitRating = () => {
    if (userRating === 0) {
      Alert.alert('Rating', 'Please select a star rating first.');
      return;
    }
    setRatingSubmitted(true);
    Alert.alert('Thank you!', 'Your feedback helps improve Serventica service quality.');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* DYNAMIC TOP BACKDROP (STATE 1: CANCELLED RED GRADIENT | STATE 2: RADAR | STATE 3: SERVS FOUND DARK GREEN | STATE 4: LIVE MAP | STATE 5: COMPLETED GREEN) */}
      <View style={StyleSheet.absoluteFill}>
        {isCancelled ? (
          <OrderCancelledBackdrop
            height={Dimensions.get('window').height}
            panY={sheetPanY}
            reason={booking.cancellationReason || 'Cancelled upon customer request'}
          />
        ) : isCompleted ? (
          <ServiceCompletedBackdrop
            height={Dimensions.get('window').height}
            panY={sheetPanY}
            completedTime={formatTimeDisplay()}
          />
        ) : isSearchingPartner ? (
          <RadarSearchingBackdrop height={Dimensions.get('window').height} panY={sheetPanY} />
        ) : (
          <LiveTrackingMap
            isBackdropOnly={true}
            partner={effectivePartner}
            status={booking.status}
            userAddressTitle={booking.address?.title || booking.address?.shortAddress || booking.address?.city || 'Service Address'}
            userAddressLine={booking.address?.formattedAddress || booking.address?.addressLine1 || 'Delivery Location'}
            customerLat={booking.address?.latitude}
            customerLon={booking.address?.longitude}
            partnerLat={effectivePartnerLocation?.latitude}
            partnerLon={effectivePartnerLocation?.longitude}
            heading={effectivePartnerLocation?.heading || 0}
            isLiveGps={Boolean(effectivePartnerLocation)}
            connectionState={trackingStore.connectionState}
            isStale={trackingStore.isStale}
            etaText="Arriving in ~10 mins"
            distanceText="1.2 km away"
            panY={sheetPanY}
          />
        )}
      </View>

      {/* EXPANDABLE GESTURE-DRIVEN BOTTOM SHEET */}
      <ExpandableOrderBottomSheet
        bookingNumber={booking.bookingNumber}
        onBack={onBack}
        onGetHelp={() => onGetHelp(booking.id)}
        animatedPanY={sheetPanY}
      >
        {/* COMPLETED STATE: EXPERIENCE RATING CARD */}
        {isCompleted && (
          <View style={styles.experienceRatingCard}>
            <Text style={styles.ratingCardTitle}>How was your experience?</Text>
            <Text style={styles.ratingCardSubtitle}>
              Rate {effectivePartner?.name || 'Vipin Sharma'}'s service
            </Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setUserRating(star)}
                  activeOpacity={0.75}
                  style={styles.starTouchBtn}
                >
                  <Star
                    size={30}
                    color={star <= userRating ? '#F59E0B' : '#CBD5E1'}
                    fill={star <= userRating ? '#F59E0B' : 'none'}
                    strokeWidth={2}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.submitRatingBtn,
                ratingSubmitted && { backgroundColor: '#059669' },
              ]}
              onPress={handleSubmitRating}
              activeOpacity={0.85}
              disabled={ratingSubmitted}
            >
              <Text style={styles.submitRatingBtnText}>
                {ratingSubmitted ? 'Rating Submitted ✓' : 'Submit rating'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 1. TICKET-STYLE SERVICE OVERVIEW CARD (USING REUSABLE TICKETCONTAINER WITH SVG CUTS) */}
        <TicketContainer
          top={
            <View style={styles.ticketTopRow}>
              <View style={styles.serviceImageContainer}>
                <Image source={imageSource} style={styles.serviceHeroImage} resizeMode="cover" />
              </View>

              <View style={styles.serviceHeaderInfo}>
                <View
                  style={[
                    styles.solidConfirmedBadge,
                    isCancelled && styles.solidCancelledBadge,
                  ]}
                >
                  {isCancelled ? (
                    <XCircle size={11} color="#FFFFFF" strokeWidth={2.6} />
                  ) : (
                    <CheckCircle2 size={11} color="#FFFFFF" strokeWidth={2.6} />
                  )}
                  <Text style={styles.solidConfirmedText}>
                    {isCancelled
                      ? 'CANCELLED'
                      : booking.status === 'CONFIRMED' || booking.status === 'SEARCHING_PARTNER'
                      ? 'CONFIRMED'
                      : booking.status.replace(/_/g, ' ')}
                  </Text>
                </View>

                <Text style={styles.serviceMainTitle} numberOfLines={2}>
                  {booking.serviceName}
                </Text>

                <View style={styles.inlineMetaRow}>
                  <Text style={styles.inlineMetaText}>
                    {formatBookingExactDateTime(
                      booking.scheduledStartTime,
                      booking.scheduledDate,
                      booking.createdAt
                    )}
                  </Text>
                  <Text style={styles.inlineDot}>•</Text>
                  <Clock size={12} color="#7C3AED" strokeWidth={2} />
                  <Text style={styles.inlineMetaTextHighlight}>Express (~20 mins)</Text>
                </View>
              </View>
            </View>
          }
          bottom={
            <View>
              <Text style={styles.itemsSectionTitle}>
                Included Services • {booking.items?.length || 1}
              </Text>
              {booking.items && booking.items.length > 0 ? (
                booking.items.map((it, idx) => (
                  <View key={it.id || idx} style={styles.itemRow}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {it.serviceName} × {it.quantity}
                    </Text>
                    <Text style={styles.itemPrice}>₹{it.totalPrice || it.unitPrice || itemTotal}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.itemRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {booking.serviceName} × 1
                  </Text>
                  <Text style={styles.itemPrice}>₹{itemTotal}</Text>
                </View>
              )}
            </View>
          }
        />

        {/* 2. CANCELLED STATUS NOTICE BANNER (ZEPTO / BLINKIT STYLE) */}
        {isCancelled ? (
          <View style={styles.cancelledAlertCard}>
            <View style={styles.cancelledAlertHeader}>
              <View style={styles.cancelledAlertIconWrapper}>
                <AlertCircle size={20} color="#DC2626" strokeWidth={2.4} />
              </View>
              <View style={styles.cancelledAlertTextCol}>
                <Text style={styles.cancelledAlertTitle}>Booking Cancelled</Text>
                <Text style={styles.cancelledAlertSubtext}>
                  {booking.cancellationReason || 'Cancelled upon customer request'}
                </Text>
              </View>
            </View>

            <View style={styles.refundTrackerBox}>
              <View style={styles.refundTrackerRow}>
                <CreditCard size={14} color="#059669" strokeWidth={2.2} />
                <Text style={styles.refundTrackerTitle}>
                  {booking.payment?.paymentStatus === 'PAID'
                    ? '100% Refund Initiated to Original Payment Method'
                    : 'No Payment Deducted / Pay on Service Cancelled'}
                </Text>
              </View>
              <Text style={styles.refundTrackerDescription}>
                {booking.payment?.paymentStatus === 'PAID'
                  ? '₹' +
                    finalPayable +
                    ' will be credited back via Razorpay within 2–4 business days.'
                  : 'You will not be charged for this service.'}
              </Text>
            </View>
          </View>
        ) : null}

        {/* 3. MINIMAL DYNAMIC SERVS ASSIGNMENT STATUS (DEFAULT CONTAINER) */}
        {!isCancelled && isSearchingPartner ? (
          <View style={styles.card}>
            <View style={styles.minimalSearchingRow}>
              <View style={styles.pulseDotWrapper}>
                <Animated.View
                  style={[
                    styles.greenGlowCircle,
                    {
                      opacity: pulseAnim,
                      transform: [
                        {
                          scale: pulseAnim.interpolate({
                            inputRange: [0.35, 1],
                            outputRange: [0.8, 1.3],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <View style={styles.solidGreenCenterDot} />
              </View>

              <View style={styles.minimalSearchingTextCol}>
                <Text style={styles.minimalSearchingTitle}>Assigning verified Servs...</Text>
                <Text style={styles.minimalSearchingSubtext}>Matching nearby Servs — typically 5–10 mins</Text>
              </View>
            </View>
          </View>
        ) : !isCancelled && effectivePartner ? (
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.cardSectionHeading}>Assigned Servs</Text>
              <View style={styles.verifiedSpecialistBadge}>
                <ShieldCheck size={11} color="#059669" strokeWidth={2.4} />
                <Text style={styles.verifiedSpecialistText}>Verified Servs</Text>
              </View>
            </View>

            <View style={styles.partnerRow}>
              <View style={styles.partnerAvatarCircle}>
                {effectivePartner.avatarUrl ? (
                  <Image source={{ uri: effectivePartner.avatarUrl }} style={styles.partnerAvatarImg} />
                ) : (
                  <UserCheck size={24} color="#7C3AED" strokeWidth={2.2} />
                )}
                <View style={styles.onlineBadge} />
              </View>

              <View style={styles.partnerInfo}>
                <Text style={styles.partnerName}>{effectivePartner.name}</Text>
                <Text style={styles.partnerSpecialty}>
                  {effectivePartner.specialization || 'Certified Servs'} • ★ {effectivePartner.rating || 4.95}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.glassPurpleCallBtn}
                onPress={() => {
                  if (effectivePartner.phone) {
                    const tel = effectivePartner.phone.replace(/\s+/g, '');
                    Linking.openURL(`tel:${tel}`).catch(() => {});
                  }
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Call Servs"
              >
                <PhoneCall size={16} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.glassCallBtnText}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* 4. COMPACT HORIZONTAL SERVICE TIMELINE */}
        <Text style={styles.sectionEyebrow}>SERVICE TIMELINE</Text>
        <View style={styles.timelineCard}>
          <View style={styles.timelineTrackWrapper}>
            {/* Background Dotted Connector 1: Step 1 -> Step 2 */}
            <View style={styles.connectorSegment1}>
              {Array.from({ length: 7 }).map((_, i) => (
                <View key={i} style={[styles.timelineDot, { backgroundColor: '#52B788' }]} />
              ))}
            </View>

            {/* Background Dotted Connector 2: Step 2 -> Step 3 */}
            <View style={styles.connectorSegment2}>
              {Array.from({ length: 7 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.timelineDot,
                    {
                      backgroundColor:
                        booking.status === 'SERVICE_COMPLETED' || booking.status === 'CLOSED'
                          ? '#52B788'
                          : '#E2E8F0',
                    },
                  ]}
                />
              ))}
            </View>

            {/* Step 1: Booking Confirmed */}
            <View style={styles.timelineStepColumn}>
              <View style={[styles.timelineNodeCircle, styles.nodeSolidGreen]}>
                <Check size={17} color="#FFFFFF" strokeWidth={3} />
              </View>
              <Text style={styles.stageTitleBold} numberOfLines={2}>
                Booking Confirmed
              </Text>
              <Text style={styles.stageDescLight} numberOfLines={1}>
                Done • 12:20 pm
              </Text>
            </View>

            {/* Step 2: Servs Assigned */}
            <View style={styles.timelineStepColumn}>
              <View
                style={[
                  styles.timelineNodeCircle,
                  hasAssignedPartner && ![
                    'CONFIRMED',
                    'SEARCHING_PARTNER',
                  ].includes(booking.status)
                    ? styles.nodeSolidGreen
                    : styles.nodeGreenBorder,
                ]}
              >
                {hasAssignedPartner && ![
                  'CONFIRMED',
                  'SEARCHING_PARTNER',
                ].includes(booking.status) ? (
                  <Check size={17} color="#FFFFFF" strokeWidth={3} />
                ) : (
                  <User size={17} color="#52B788" strokeWidth={2.4} />
                )}
              </View>
              <Text style={styles.stageTitleBold} numberOfLines={2}>
                Servs Assigned
              </Text>
              <Text style={styles.stageDescLight} numberOfLines={1}>
                {hasAssignedPartner && effectivePartner ? `${effectivePartner.name}` : 'Waiting for a Servs'}
              </Text>
            </View>

            {/* Step 3: Service Completed */}
            <View style={styles.timelineStepColumn}>
              <View
                style={[
                  styles.timelineNodeCircle,
                  booking.status === 'SERVICE_COMPLETED' || booking.status === 'CLOSED'
                    ? styles.nodeSolidGreen
                    : styles.nodeGrayBorder,
                ]}
              >
                <ClipboardList
                  size={17}
                  color={
                    booking.status === 'SERVICE_COMPLETED' || booking.status === 'CLOSED'
                      ? '#FFFFFF'
                      : '#94A3B8'
                  }
                  strokeWidth={2.4}
                />
              </View>
              <Text style={styles.stageTitleBold} numberOfLines={2}>
                Service Completed
              </Text>
              <Text style={styles.stageDescLight} numberOfLines={1}>
                Review when done
              </Text>
            </View>
          </View>
        </View>

        {/* 5. SERVICE ADDRESS */}
        <Text style={styles.sectionEyebrow}>SERVICE ADDRESS</Text>
        <View style={styles.card}>
          <View style={styles.addressBox}>
            <View style={styles.addressIconCircle}>
              <MapPin size={18} color="#059669" strokeWidth={2.2} />
            </View>
            <View style={styles.addressTextCol}>
              <Text style={styles.addressTitle}>
                {booking.address?.title || booking.address?.shortAddress || 'Service Address'}
              </Text>
              <Text style={styles.addressFull}>
                {booking.address?.formattedAddress ||
                  [booking.address?.addressLine1, booking.address?.addressLine2, booking.address?.city, booking.address?.state, booking.address?.pincode]
                    .filter(Boolean)
                    .join(', ') ||
                  'Customer Selected Address'}
              </Text>
            </View>
          </View>
        </View>

        {/* 6. BILL SUMMARY */}
        <Text style={styles.sectionEyebrow}>BILL SUMMARY</Text>
        <TicketContainer
          top={
            <View>
              {/* Item Total with Strike-through */}
              <View style={styles.billItemRow}>
                <Text style={styles.billItemLabel}>Item Total</Text>
                <View style={styles.billPriceGroup}>
                  {discountAmount > 0 && (
                    <Text style={styles.strikeThroughPrice}>₹{originalItemTotal}</Text>
                  )}
                  <Text style={styles.billItemValue}>₹{itemTotal}</Text>
                </View>
              </View>

              {/* Delivery / Servs Safety Fee */}
              <View style={styles.billItemBlock}>
                <View style={styles.billItemRow}>
                  <Text style={styles.billItemLabel}>Servs Safety & Insurance Fee</Text>
                  <Text style={styles.billItemValue}>₹{deliveryOrSafetyFee}</Text>
                </View>
                <Text style={styles.billSubtextNotice}>
                  Includes verified Servs background check & 30-day service insurance
                </Text>
              </View>

              {/* Handling Fee with FREE Tag & Dotted underline */}
              <View style={styles.billItemRow}>
                <View style={styles.dottedLabelWrapper}>
                  <Text style={styles.billItemLabel}>Handling Fee</Text>
                  <View style={styles.underlineDotted} />
                </View>
                <View style={styles.billPriceGroup}>
                  <Text style={styles.strikeThroughPrice}>₹{handlingFee}</Text>
                  <Text style={styles.freeTagText}>FREE</Text>
                </View>
              </View>

              {/* Special Promotion / Discount Row */}
              {discountAmount > 0 && (
                <View style={styles.billItemRow}>
                  <Text style={[styles.billItemLabel, { color: '#059669', fontFamily: Fonts.Medium }]}>
                    Special Promotion / Discount
                  </Text>
                  <Text style={[styles.billItemValue, { color: '#059669', fontFamily: Fonts.Bold }]}>
                    -₹{discountAmount}
                  </Text>
                </View>
              )}
            </View>
          }
          bottom={
            <View>
              {/* Total Bill Row */}
              <View style={styles.totalBillRow}>
                <Text style={styles.totalBillLabel}>Total Bill</Text>
                <View style={styles.totalPriceGroup}>
                  {discountAmount > 0 && (
                    <Text style={styles.totalStrikePrice}>₹{totalOriginalBill}</Text>
                  )}
                  <Text style={styles.totalFinalPrice}>₹{finalPayable}</Text>
                </View>
              </View>

              {/* Payment Status Pill */}
              <View style={styles.paymentMethodNotice}>
                <CreditCard size={13} color="#059669" strokeWidth={2.2} />
                <Text style={styles.paymentMethodNoticeText}>
                  {booking.payment?.paymentStatus === 'PAID'
                    ? 'Paid Online via Razorpay'
                    : 'Pay via Cash / QR after service'}
                </Text>
              </View>
            </View>
          }
        />

        {/* 7. ACTION BUTTONS */}
        <View style={styles.actionContainer}>
          {onBookAgain ? (
            <TouchableOpacity
              style={styles.repeatServiceBtn}
              onPress={() => onBookAgain(booking.serviceId)}
              activeOpacity={0.88}
            >
              <RotateCcw size={16} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 8 }} />
              <Text style={styles.repeatServiceBtnText}>Book This Service Again</Text>
            </TouchableOpacity>
          ) : null}

          {canCancel ? (
            <TouchableOpacity
              style={styles.cancelGlassBtn}
              onPress={handleCancelPress}
              disabled={isCancelling}
              activeOpacity={0.85}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <>
                  <XCircle size={16} color="#DC2626" strokeWidth={2.2} style={{ marginRight: 6 }} />
                  <Text style={styles.cancelGlassBtnText}>Cancel Booking</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          {/* INVOICE & RECEIPT BUTTON (FOR CONFIRMED / COMPLETED ORDERS) */}
          {(booking.status === 'SERVICE_COMPLETED' || booking.status === 'CLOSED' || booking.status === 'CONFIRMED' || booking.status === 'PARTNER_ASSIGNED' || booking.status === 'PARTNER_EN_ROUTE' || booking.status === 'PARTNER_ARRIVED' || booking.status === 'SERVICE_STARTED') && (
            <TouchableOpacity
              style={styles.invoiceGlassBtn}
              onPress={() => {
                const yearMonth = new Date(booking.createdAt || Date.now()).toISOString().slice(0, 7).replace('-', '');
                const invNum = `INV-${yearMonth}-${booking.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
                Alert.alert(
                  'Tax Invoice & Receipt',
                  `Invoice Number: ${invNum}\nBooking Number: ${booking.bookingNumber}\nAmount Paid: ₹${finalPayable}\nPayment Method: ${booking.payment?.paymentMethod || 'Online / COD'}\nStatus: Verified & Stamped`,
                  [{ text: 'Close', style: 'cancel' }]
                );
              }}
              activeOpacity={0.85}
            >
              <FileText size={16} color="#7C3AED" strokeWidth={2.2} style={{ marginRight: 6 }} />
              <Text style={styles.invoiceGlassBtnText}>Download Tax Invoice & Receipt</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.supportGlassBtn}
            onPress={() => onGetHelp(booking.id)}
            activeOpacity={0.85}
          >
            <HelpCircle size={16} color="#475569" strokeWidth={2.2} style={{ marginRight: 6 }} />
            <Text style={styles.supportGlassBtnText}>Need Help with this Booking?</Text>
          </TouchableOpacity>
        </View>
      </ExpandableOrderBottomSheet>

      {/* 8. ZEPTO / BLINKIT CANCELLATION REASON MODAL */}
      <Modal
        visible={isCancelModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCancelModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => !isCancelling && setIsCancelModalOpen(false)}
          />
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalHeading}>Cancel Booking</Text>
                <Text style={styles.modalSubheading}>
                  Please choose a reason for cancellation
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsCancelModalOpen(false)}
                disabled={isCancelling}
                activeOpacity={0.7}
              >
                <X size={18} color="#64748B" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            {/* Refund Info Notice in Modal */}
            <View style={styles.modalRefundBanner}>
              <CheckCircle2 size={15} color="#059669" strokeWidth={2.4} />
              <Text style={styles.modalRefundBannerText}>
                {booking.payment?.paymentStatus === 'PAID'
                  ? '100% full refund will be credited back via Razorpay'
                  : 'Zero cancellation fee applied. No payment will be charged.'}
              </Text>
            </View>

            {/* Radio options list */}
            <View style={styles.reasonsListContainer}>
              {CANCELLATION_REASONS.map((reason, idx) => {
                const isSelected = selectedReason === reason;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.reasonOptionItem,
                      isSelected && styles.reasonOptionItemSelected,
                    ]}
                    activeOpacity={0.75}
                    onPress={() => setSelectedReason(reason)}
                    disabled={isCancelling}
                  >
                    <View
                      style={[
                        styles.radioOuterCircle,
                        isSelected && styles.radioOuterCircleActive,
                      ]}
                    >
                      {isSelected && <View style={styles.radioInnerDot} />}
                    </View>
                    <Text
                      style={[
                        styles.reasonOptionText,
                        isSelected && styles.reasonOptionTextActive,
                      ]}
                    >
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Action buttons */}
            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.keepBookingBtn}
                onPress={() => setIsCancelModalOpen(false)}
                disabled={isCancelling}
                activeOpacity={0.85}
              >
                <Text style={styles.keepBookingBtnText}>Keep Service</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={handleConfirmCancellation}
                disabled={isCancelling}
                activeOpacity={0.85}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmCancelBtnText}>Confirm Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F1F5F9',
  },
  circleBackButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idBadgeGroup: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  idBadgeContent: {
    alignItems: 'center',
  },
  idBadgeLabel: {
    fontSize: 10,
    fontFamily: Fonts.Medium,
    color: '#64748B',
    marginBottom: 1,
  },
  idBadgeNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIdText: {
    fontSize: 13.5,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
  },
  helpIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
  },
  /* TICKET CARD (MATCHING USER SCREENSHOT) */
  ticketTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceHeroImage: {
    width: '100%',
    height: '100%',
  },
  serviceHeaderInfo: {
    flex: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  livePulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#059669',
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: Fonts.Bold,
    color: '#059669',
    letterSpacing: 0.4,
  },
  serviceMainTitle: {
    fontSize: 16.5,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
    marginBottom: 5,
  },
  inlineMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  inlineMetaText: {
    fontSize: 12,
    fontFamily: Fonts.Light,
    color: '#475569',
  },
  inlineMetaTextHighlight: {
    fontSize: 12,
    fontFamily: Fonts.Medium,
    color: '#7C3AED',
  },
  inlineMetaSubText: {
    fontSize: 12,
    fontFamily: Fonts.Light,
    color: '#7C3AED',
  },
  inlineDot: {
    color: '#CBD5E1',
    marginHorizontal: 2,
  },
  perforatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    marginHorizontal: -2,
    position: 'relative',
    overflow: 'hidden',
  },
  cutoutLeft: {
    width: 20,
    height: 24,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: '#E2E8F0',
    marginLeft: -1,
  },
  dashedTicketDivider: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginHorizontal: 6,
  },
  cutoutRight: {
    width: 20,
    height: 24,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: '#E2E8F0',
    marginRight: -1,
  },
  ticketBottomSection: {
    padding: 16,
    paddingTop: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  itemsListContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  itemsSectionTitle: {
    fontSize: 12,
    fontFamily: Fonts.Medium,
    color: '#475569',
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#7C3AED',
    marginRight: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.Light,
    color: '#334155',
  },
  itemPrice: {
    fontSize: 12,
    fontFamily: Fonts.Medium,
    color: '#0F172A',
  },
  solidConfirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 8,
    gap: 3.5,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  solidConfirmedText: {
    fontSize: 9.5,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  /* MINIMAL SEARCHING CARD (MATCHING USER SCREENSHOT 2) */
  minimalSearchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 12,
  },
  pulseDotWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  greenGlowCircle: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(16, 185, 129, 0.28)',
  },
  solidGreenCenterDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#10B981',
  },
  minimalSearchingTextCol: {
    flex: 1,
  },
  minimalSearchingTitle: {
    fontSize: 14.5,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
    marginBottom: 2,
  },
  minimalSearchingSubtext: {
    fontSize: 12,
    fontFamily: Fonts.Light,
    color: '#475569',
    lineHeight: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardSectionHeading: {
    fontSize: 13,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  verifiedSpecialistBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  verifiedSpecialistText: {
    fontSize: 10.5,
    fontFamily: Fonts.Bold,
    color: '#059669',
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerAvatarCircle: {
    position: 'relative',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    overflow: 'hidden',
  },
  partnerAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 23,
  },
  onlineBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#059669',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 14.5,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
  },
  partnerSpecialty: {
    fontSize: 11.5,
    fontFamily: Fonts.Light,
    color: '#64748B',
    marginTop: 1,
  },
  glassPurpleCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    gap: 6,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  glassCallBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.SemiBold,
    color: '#FFFFFF',
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  etaBadgeText: {
    fontSize: 10.5,
    fontFamily: Fonts.Bold,
    color: '#B45309',
  },
  mapSimulatedContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
  },
  mapRouteVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  mapPinStart: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeDottedLine: {
    flex: 1,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    marginHorizontal: 12,
  },
  mapPinEnd: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  mapDistanceText: {
    fontSize: 11,
    fontFamily: Fonts.Medium,
    color: '#94A3B8',
  },
  mapGpsActiveText: {
    fontSize: 11,
    fontFamily: Fonts.Medium,
    color: '#34D399',
  },
  experienceRatingCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingCardTitle: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: '#065F46',
    marginBottom: 3,
  },
  ratingCardSubtitle: {
    fontSize: 12.5,
    fontFamily: Fonts.Regular,
    color: '#047857',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  starTouchBtn: {
    padding: 4,
  },
  submitRatingBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  submitRatingBtnText: {
    fontSize: 13,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  /* COMPACT HORIZONTAL SERVICE TIMELINE STYLES */
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineHeaderTitle: {
    fontSize: 10.5,
    fontFamily: Fonts.Bold,
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  timelineTrackWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    width: '100%',
  },
  connectorSegment1: {
    position: 'absolute',
    top: 17,
    left: '18%',
    right: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    zIndex: 0,
  },
  connectorSegment2: {
    position: 'absolute',
    top: 17,
    left: '50%',
    right: '18%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    zIndex: 0,
  },
  timelineStepColumn: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
    zIndex: 1,
  },
  timelineNodeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  nodeSolidGreen: {
    backgroundColor: '#52B788',
  },
  nodeGreenBorder: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.8,
    borderColor: '#52B788',
  },
  nodeGrayBorder: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.8,
    borderColor: '#CBD5E1',
  },
  timelineDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  stageTitleBold: {
    fontSize: 11,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 14,
    minHeight: 28,
  },
  stageTitleDark: {
    color: '#0F172A',
  },
  stageTitleMuted: {
    color: '#94A3B8',
  },
  stageDescLight: {
    fontSize: 9.5,
    fontFamily: Fonts.Light,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  stageDescDark: {
    color: '#64748B',
  },
  stageDescMuted: {
    color: '#94A3B8',
  },
  sectionEyebrow: {
    fontSize: 10.5,
    fontFamily: Fonts.Bold,
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 6,
    paddingHorizontal: 2,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  addressTextCol: {
    flex: 1,
  },
  addressTitle: {
    fontSize: 14,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
    marginBottom: 2,
  },
  addressFull: {
    fontSize: 11.5,
    fontFamily: Fonts.Light,
    color: '#64748B',
    lineHeight: 16,
  },
  billItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  billItemBlock: {
    paddingVertical: 4,
  },
  billItemLabel: {
    fontSize: 13,
    fontFamily: Fonts.Light,
    color: '#475569',
  },
  billPriceGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  strikeThroughPrice: {
    fontSize: 12.5,
    fontFamily: Fonts.Light,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  billItemValue: {
    fontSize: 13.5,
    fontFamily: Fonts.Medium,
    color: '#0F172A',
  },
  billSubtextNotice: {
    fontSize: 10.5,
    fontFamily: Fonts.Light,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 14,
  },
  dottedLabelWrapper: {
    alignSelf: 'flex-start',
  },
  underlineDotted: {
    borderStyle: 'dotted',
    borderWidth: 0.6,
    borderColor: '#94A3B8',
    marginTop: 1,
  },
  freeTagText: {
    fontSize: 12.5,
    fontFamily: Fonts.Bold,
    color: '#059669',
  },
  billDottedDivider: {
    marginVertical: 10,
    overflow: 'hidden',
  },
  dottedLineDashed: {
    borderStyle: 'dashed',
    borderWidth: 0.75,
    borderColor: '#CBD5E1',
    marginHorizontal: -4,
  },
  totalBillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  totalBillLabel: {
    fontSize: 15,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
  },
  totalPriceGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalStrikePrice: {
    fontSize: 13.5,
    fontFamily: Fonts.Light,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  totalFinalPrice: {
    fontSize: 17.5,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
  },
  paymentMethodNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 6,
  },
  paymentMethodNoticeText: {
    fontSize: 11.5,
    fontFamily: Fonts.Medium,
    color: '#059669',
  },
  actionContainer: {
    marginTop: 8,
    gap: 10,
  },
  repeatServiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    height: 48,
    borderRadius: 14,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  repeatServiceBtnText: {
    fontSize: 14,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  solidCancelledBadge: {
    backgroundColor: '#DC2626',
  },
  cancelledAlertCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECDD3',
    padding: 16,
    marginBottom: 16,
  },
  cancelledAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelledAlertIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cancelledAlertTextCol: {
    flex: 1,
  },
  cancelledAlertTitle: {
    fontSize: 14.5,
    fontFamily: Fonts.Bold,
    color: '#991B1B',
    marginBottom: 2,
  },
  cancelledAlertSubtext: {
    fontSize: 12.5,
    fontFamily: Fonts.Medium,
    color: '#B91C1C',
  },
  refundTrackerBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    padding: 12,
  },
  refundTrackerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  refundTrackerTitle: {
    fontSize: 12.5,
    fontFamily: Fonts.SemiBold,
    color: '#065F46',
    flex: 1,
  },
  refundTrackerDescription: {
    fontSize: 11.5,
    fontFamily: Fonts.Regular,
    color: '#64748B',
    marginLeft: 20,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalBackdropTap: {
    flex: 1,
  },
  modalContentCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalHeading: {
    fontSize: 17,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
    marginBottom: 3,
  },
  modalSubheading: {
    fontSize: 13,
    fontFamily: Fonts.Regular,
    color: '#64748B',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRefundBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 16,
    gap: 8,
  },
  modalRefundBannerText: {
    fontSize: 12,
    fontFamily: Fonts.Medium,
    color: '#065F46',
    flex: 1,
  },
  reasonsListContainer: {
    marginBottom: 20,
    gap: 8,
  },
  reasonOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
  },
  reasonOptionItemSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  radioOuterCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.8,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioOuterCircleActive: {
    borderColor: '#7C3AED',
  },
  radioInnerDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#7C3AED',
  },
  reasonOptionText: {
    fontSize: 13,
    fontFamily: Fonts.Medium,
    color: '#334155',
    flex: 1,
  },
  reasonOptionTextActive: {
    fontFamily: Fonts.SemiBold,
    color: '#0F172A',
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  keepBookingBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepBookingBtnText: {
    fontSize: 14,
    fontFamily: Fonts.SemiBold,
    color: '#334155',
  },
  confirmCancelBtn: {
    flex: 1.2,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmCancelBtnText: {
    fontSize: 14,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  cancelGlassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    height: 48,
    borderRadius: 14,
  },
  cancelGlassBtnText: {
    fontSize: 13.5,
    fontFamily: Fonts.Bold,
    color: '#E11D48',
  },
  supportGlassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 44,
    borderRadius: 14,
  },
  supportGlassBtnText: {
    fontSize: 13,
    fontFamily: Fonts.Medium,
    color: '#475569',
  },
  invoiceGlassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    height: 44,
    borderRadius: 14,
  },
  invoiceGlassBtnText: {
    fontSize: 13,
    fontFamily: Fonts.Bold,
    color: '#7C3AED',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 13.5,
    fontFamily: Fonts.Light,
    color: '#64748B',
    marginTop: 14,
  },
  errorIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 17,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.Light,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: '#0F172A',
  },
  backBtnText: {
    fontSize: 13.5,
    fontFamily: Fonts.Medium,
    color: '#FFFFFF',
  },
});
