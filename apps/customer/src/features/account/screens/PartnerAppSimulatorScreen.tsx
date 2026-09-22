import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  UserCheck,
  CheckCircle2,
  Navigation,
  RotateCcw,
  Clock,
  MapPin,
  Sparkles,
  Award,
  Zap,
  Radio,
  RefreshCw,
  Trash2,
} from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';
import { useAuth } from '../../../context/AuthContext';
import { bookingRepository } from '../../../repositories/booking.repository';
import { BookingRecord, BookingStatus } from '../../../../../../packages/types/src';
import { AssetRegistry } from '../../../services/home.service';
import { formatBookingExactDateTime } from '../../../lib/date.utils';
import { PriceCalculationEngine } from '../../../services/pricing/PriceCalculationEngine';
import { LiveTrackingMap } from '../components/LiveTrackingMap';
import { liveTrackingService } from '../../../services/LiveTrackingService';
import { INITIAL_CONFIGURED_ORIGIN } from '../../../repositories/origin.repository';

interface PartnerAppSimulatorScreenProps {
  onBack: () => void;
  onNavigateToBookingDetail?: (bookingId: string) => void;
}

const SIMULATED_PARTNERS = [
  {
    id: 'servs_partner_vipin_01',
    name: 'Vipin Sharma',
    phone: '+91 98765 43210',
    avatarUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop&q=80',
    rating: 4.95,
    specialization: 'Certified Servs Specialist',
  },
  {
    id: 'servs_partner_raj_02',
    name: 'Rajesh Kumar',
    phone: '+91 98112 34567',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    rating: 4.88,
    specialization: 'Master HVAC Technician',
  },
];

export const PartnerAppSimulatorScreen: React.FC<PartnerAppSimulatorScreenProps> = ({
  onBack,
  onNavigateToBookingDetail,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [allBookings, setAllBookings] = useState<BookingRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED'>('ALL');
  const [selectedPartnerIndex, setSelectedPartnerIndex] = useState(0);

  const loadAllBookings = async () => {
    try {
      const effectiveId = user?.id || 'guest_user';
      const upcoming = await bookingRepository.getBookings(effectiveId, 'UPCOMING');
      const completed = await bookingRepository.getBookings(effectiveId, 'COMPLETED');
      setAllBookings([...upcoming, ...completed]);
    } catch (e) {
      console.warn('Failed to load bookings in simulator', e);
    }
  };

  useEffect(() => {
    loadAllBookings();
    const unsub = bookingRepository.subscribe(() => {
      loadAllBookings();
    });
    return () => unsub();
  }, [user?.id]);

  const activePartner = SIMULATED_PARTNERS[selectedPartnerIndex];

  const handleAcceptBooking = async (booking: BookingRecord) => {
    const updated: BookingRecord = {
      ...booking,
      status: 'PARTNER_ASSIGNED',
      partner: {
        id: activePartner.id,
        name: activePartner.name,
        phone: activePartner.phone,
        avatarUrl: activePartner.avatarUrl,
        rating: activePartner.rating,
        specialization: activePartner.specialization,
      },
      updatedAt: new Date().toISOString(),
    };
    await bookingRepository.saveBooking(updated);
    Alert.alert(
      'Service Accepted!',
      `${activePartner.name} has accepted the service order. Customer app will now show Servs assigned with live contact.`,
      [
        { text: 'Stay Here', style: 'cancel' },
        {
          text: 'View Customer UI',
          onPress: () => onNavigateToBookingDetail?.(booking.id),
        },
      ]
    );
  };

  const handleStartEnRoute = async (booking: BookingRecord) => {
    const updated: BookingRecord = {
      ...booking,
      status: 'PARTNER_EN_ROUTE',
      partner: booking.partner || {
        id: activePartner.id,
        name: activePartner.name,
        phone: activePartner.phone,
        avatarUrl: activePartner.avatarUrl,
        rating: activePartner.rating,
        specialization: activePartner.specialization,
      },
      updatedAt: new Date().toISOString(),
    };
    await bookingRepository.saveBooking(updated);

    // Broadcast starting GPS coordinate & animate partner movement
    const originLat = INITIAL_CONFIGURED_ORIGIN.latitude;
    const originLng = INITIAL_CONFIGURED_ORIGIN.longitude;
    const destLat = booking.address?.latitude || 30.3342;
    const destLng = booking.address?.longitude || 77.9629;

    // Send initial en route GPS coordinate
    liveTrackingService.publishPartnerLocation({
      bookingId: booking.id,
      partnerId: activePartner.id,
      latitude: originLat,
      longitude: originLng,
      heading: 45,
      speed: 8.5,
      timestamp: new Date().toISOString(),
    });

    // Simulate progressive GPS checkpoints approaching customer
    let step = 1;
    const totalSteps = 4;
    const interval = setInterval(() => {
      if (step >= totalSteps) {
        clearInterval(interval);
        return;
      }
      const progress = step / totalSteps;
      const curLat = originLat + (destLat - originLat) * progress;
      const curLng = originLng + (destLng - originLng) * progress;

      liveTrackingService.publishPartnerLocation({
        bookingId: booking.id,
        partnerId: activePartner.id,
        latitude: curLat,
        longitude: curLng,
        heading: 45,
        speed: 7.2,
        timestamp: new Date().toISOString(),
      });
      step++;
    }, 4000);

    Alert.alert(
      'En Route Started!',
      `Partner is on the way. The customer app will display live tracking route on the map with arriving ETA.`,
      [
        { text: 'OK', style: 'cancel' },
        {
          text: 'View Customer UI',
          onPress: () => onNavigateToBookingDetail?.(booking.id),
        },
      ]
    );
  };

  const handleArrived = async (booking: BookingRecord) => {
    const updated: BookingRecord = {
      ...booking,
      status: 'PARTNER_ARRIVED',
      updatedAt: new Date().toISOString(),
    };
    await bookingRepository.saveBooking(updated);
    Alert.alert('Partner Arrived!', 'Customer notified that Servs has arrived at the location.');
  };

  const handleStartService = async (booking: BookingRecord) => {
    const updated: BookingRecord = {
      ...booking,
      status: 'SERVICE_STARTED',
      updatedAt: new Date().toISOString(),
    };
    await bookingRepository.saveBooking(updated);
    Alert.alert(
      'Service Started!',
      'Work in progress status broadcasted to customer app.',
      [
        { text: 'Stay in Partner App', style: 'cancel' },
        {
          text: 'View Customer UI',
          onPress: () => onNavigateToBookingDetail?.(booking.id),
        },
      ]
    );
  };

  const handleCompleteService = async (booking: BookingRecord) => {
    const updated: BookingRecord = {
      ...booking,
      status: 'SERVICE_COMPLETED',
      updatedAt: new Date().toISOString(),
    };
    await bookingRepository.saveBooking(updated);
    Alert.alert(
      'Service Completed!',
      'Job marked completed in real time. The customer order is now completed and moved to the Completed tab with full invoice.',
      [
        { text: 'Stay in Partner App', style: 'cancel' },
        {
          text: 'View Customer UI',
          onPress: () => onNavigateToBookingDetail?.(booking.id),
        },
      ]
    );
  };

  const handleResetToSearching = async (booking: BookingRecord) => {
    const updated: BookingRecord = {
      ...booking,
      status: 'CONFIRMED',
      partner: null,
      updatedAt: new Date().toISOString(),
    };
    await bookingRepository.saveBooking(updated);
    Alert.alert('Reset to Searching', 'Booking is now unassigned and back in live searching state.');
  };

  const handleClearAllOrders = () => {
    Alert.alert(
      'Delete All Orders?',
      'This will clear all incoming, active, and completed orders from both local memory and database.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              const effectiveId = user?.id || 'guest_user';
              await bookingRepository.clearAllUserBookings(effectiveId);
              setAllBookings([]);
              Alert.alert('Success', 'All partner order history has been deleted.');
            } catch (err) {
              console.warn('Clear orders error:', err);
            }
          },
        },
      ]
    );
  };

  const filteredBookings = allBookings.filter((b) => {
    if (activeFilter === 'PENDING') {
      return !b.partner || b.status === 'CONFIRMED' || b.status === 'SEARCHING_PARTNER';
    }
    if (activeFilter === 'ACCEPTED') {
      return Boolean(b.partner) && b.status !== 'CONFIRMED' && b.status !== 'SEARCHING_PARTNER';
    }
    return true;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* TOP BAR */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop:
              Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 16) +
              8,
          },
        ]}
      >
        <TouchableOpacity style={styles.circleBackButton} onPress={onBack} activeOpacity={0.75}>
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Partner App Sandbox</Text>
          <Text style={styles.headerSubtitle}>Simulate Partner Acceptance & Tracking</Text>
        </View>

        <View style={styles.headerActionsRight}>
          <TouchableOpacity
            style={styles.deleteHistoryBtn}
            onPress={handleClearAllOrders}
            activeOpacity={0.75}
            accessibilityLabel="Clear all order history"
          >
            <Trash2 size={17} color="#DC2626" strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.refreshBtn} onPress={loadAllBookings} activeOpacity={0.75}>
            <RefreshCw size={17} color="#7C3AED" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* PARTNER PROFILE SELECTOR */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>SIMULATED SERVS PARTNER</Text>
          <View style={styles.partnerSelectorRow}>
            {SIMULATED_PARTNERS.map((p, idx) => {
              const isSelected = selectedPartnerIndex === idx;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.partnerSelectChip, isSelected && styles.partnerSelectChipActive]}
                  onPress={() => setSelectedPartnerIndex(idx)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: p.avatarUrl }} style={styles.chipAvatar} />
                  <View style={styles.chipTextCol}>
                    <Text
                      style={[styles.chipName, isSelected && styles.chipNameActive]}
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>
                    <Text style={styles.chipRole} numberOfLines={1}>
                      {p.specialization}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* TABS FILTER */}
        <View style={styles.tabsRow}>
          {(['ALL', 'PENDING', 'ACCEPTED'] as const).map((tab) => {
            const isActive = activeFilter === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveFilter(tab)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab === 'ALL'
                    ? 'All Requests'
                    : tab === 'PENDING'
                    ? 'Incoming / Unassigned'
                    : 'Accepted'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ORDERS LIST */}
        <Text style={styles.sectionHeader}>
          CUSTOMER BOOKING ORDERS ({filteredBookings.length})
        </Text>

        {filteredBookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Radio size={28} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No orders in this state</Text>
            <Text style={styles.emptySub}>
              Book a service from the customer app to test incoming order requests.
            </Text>
          </View>
        ) : (
          filteredBookings.map((item) => {
            const isAssigned =
              Boolean(item.partner) &&
              item.status !== 'CONFIRMED' &&
              item.status !== 'SEARCHING_PARTNER';

            return (
              <View key={item.id} style={styles.orderCard}>
                {/* Header Row */}
                <View style={styles.orderCardHeader}>
                  <View style={styles.orderIdBadge}>
                    <Text style={styles.orderIdText}>#{item.bookingNumber}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isAssigned ? styles.statusBadgeAssigned : styles.statusBadgeSearching,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isAssigned
                          ? styles.statusBadgeTextAssigned
                          : styles.statusBadgeTextSearching,
                      ]}
                    >
                      {item.status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>

                {/* Service Details */}
                <Text style={styles.orderServiceName}>{item.serviceName}</Text>

                <View style={styles.metaRow}>
                  <Clock size={13} color="#64748B" />
                  <Text style={styles.metaText}>
                    {formatBookingExactDateTime(item.scheduledStartTime, item.scheduledDate, item.createdAt)} • Express (~20 mins)
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <MapPin size={13} color="#059669" />
                  <Text style={styles.metaTextBold} numberOfLines={1}>
                    {item.address?.title || item.address?.shortAddress || item.address?.city || item.address?.addressLine1 || 'Service Address'}
                  </Text>
                </View>

                <Text style={styles.addressSub} numberOfLines={2}>
                  {item.address?.formattedAddress ||
                    item.address?.addressLine1 ||
                    item.address?.city ||
                    'Customer Address'}
                </Text>

                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Customer Total</Text>
                  <Text style={styles.priceVal}>
                    ₹{PriceCalculationEngine.calculateBill({
                      itemTotal: item.payment?.subtotal,
                      subtotal: item.payment?.subtotal,
                      discount: item.payment?.discount,
                      platformFee: item.payment?.platformFee,
                      total: item.payment?.total,
                      items: item.items,
                    }).finalPayable}
                  </Text>
                </View>

                {/* Assigned partner info if any */}
                {item.partner && (
                  <View style={styles.currentPartnerBlock}>
                    <Image
                      source={{
                        uri:
                          item.partner.avatarUrl ||
                          'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150',
                      }}
                      style={styles.assignedAvatar}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.assignedName}>{item.partner.name}</Text>
                      <Text style={styles.assignedPhone}>{item.partner.phone}</Text>
                    </View>
                  </View>
                )}

                {/* 1. Live Interactive Route Map to Customer Location */}
                <View style={{ marginVertical: 8 }}>
                  <LiveTrackingMap
                    partner={item.partner || activePartner}
                    status={item.status}
                    userAddressTitle={item.address?.shortAddress || item.address?.title || item.address?.city || 'Customer Location'}
                    userAddressLine={item.address?.formattedAddress || item.address?.addressLine1 || 'Customer Delivery Address'}
                    customerLat={item.address?.latitude || 30.3342}
                    customerLon={item.address?.longitude || 77.9629}
                    etaText={
                      item.status === 'PARTNER_ARRIVED'
                        ? 'Arrived at Doorstep'
                        : item.status === 'SERVICE_STARTED'
                        ? 'Work In Progress'
                        : item.status === 'SERVICE_COMPLETED'
                        ? 'Completed'
                        : item.status === 'PARTNER_EN_ROUTE'
                        ? 'En Route (~10 mins)'
                        : 'Assigned (~15 mins)'
                    }
                    distanceText="1.2 km"
                  />
                </View>

                {/* 2. Partner Action Buttons Grid */}
                <View style={styles.btnGrid}>
                  {!isAssigned ? (
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleAcceptBooking(item)}
                      activeOpacity={0.85}
                    >
                      <UserCheck size={16} color="#FFFFFF" strokeWidth={2.4} />
                      <Text style={styles.acceptBtnText}>Accept Order as {activePartner.name}</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      {/* Step 1: Start Ride */}
                      {(item.status === 'PARTNER_ASSIGNED' || item.status === 'PARTNER_ACCEPTED') && (
                        <TouchableOpacity
                          style={styles.enRouteBtn}
                          onPress={() => handleStartEnRoute(item)}
                          activeOpacity={0.85}
                        >
                          <Navigation size={15} color="#FFFFFF" strokeWidth={2.2} />
                          <Text style={styles.enRouteBtnText}>1. Start Ride (En Route)</Text>
                        </TouchableOpacity>
                      )}

                      {/* Step 2: Mark Arrived */}
                      {(item.status === 'PARTNER_ASSIGNED' || item.status === 'PARTNER_ACCEPTED' || item.status === 'PARTNER_EN_ROUTE') && (
                        <TouchableOpacity
                          style={styles.arrivedBtn}
                          onPress={() => handleArrived(item)}
                          activeOpacity={0.85}
                        >
                          <MapPin size={15} color="#FFFFFF" strokeWidth={2.2} />
                          <Text style={styles.arrivedBtnText}>2. Arrived at Customer Doorstep</Text>
                        </TouchableOpacity>
                      )}

                      {/* Step 3: Start Service */}
                      {(item.status === 'PARTNER_ARRIVED' || item.status === 'PARTNER_EN_ROUTE' || item.status === 'PARTNER_ASSIGNED' || item.status === 'PARTNER_ACCEPTED') && (
                        <TouchableOpacity
                          style={styles.startServiceBtn}
                          onPress={() => handleStartService(item)}
                          activeOpacity={0.85}
                        >
                          <Zap size={15} color="#FFFFFF" strokeWidth={2.2} />
                          <Text style={styles.startServiceBtnText}>3. Start Service Work</Text>
                        </TouchableOpacity>
                      )}

                      {/* Step 4: Complete Service */}
                      {item.status !== 'SERVICE_COMPLETED' && (
                        <TouchableOpacity
                          style={styles.completeBtn}
                          onPress={() => handleCompleteService(item)}
                          activeOpacity={0.85}
                        >
                          <CheckCircle2 size={15} color="#FFFFFF" strokeWidth={2.2} />
                          <Text style={styles.completeBtnText}>4. Complete Service</Text>
                        </TouchableOpacity>
                      )}

                      {/* Step 5: Reset for re-testing */}
                      <TouchableOpacity
                        style={styles.resetBtn}
                        onPress={() => handleResetToSearching(item)}
                        activeOpacity={0.85}
                      >
                        <RotateCcw size={14} color="#64748B" strokeWidth={2} />
                        <Text style={styles.resetBtnText}>Reset to Searching (Test Again)</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
  headerTitleGroup: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.Light,
    color: '#64748B',
    marginTop: 1,
  },
  headerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteHistoryBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  sectionHeader: {
    fontSize: 10.5,
    fontFamily: Fonts.Bold,
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  partnerSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  partnerSelectChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  partnerSelectChipActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  chipAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  chipTextCol: {
    flex: 1,
  },
  chipName: {
    fontSize: 12.5,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
  },
  chipNameActive: {
    color: '#7C3AED',
  },
  chipRole: {
    fontSize: 10,
    fontFamily: Fonts.Light,
    color: '#64748B',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  tabText: {
    fontSize: 11,
    fontFamily: Fonts.Medium,
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.Bold,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderIdBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderIdText: {
    fontSize: 11,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.Bold,
  },
  statusBadgeSearching: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeTextSearching: {
    fontSize: 10,
    fontFamily: Fonts.Bold,
    color: '#D97706',
  },
  statusBadgeAssigned: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgeTextAssigned: {
    fontSize: 10,
    fontFamily: Fonts.Bold,
    color: '#059669',
  },
  orderServiceName: {
    fontSize: 15.5,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 11.5,
    fontFamily: Fonts.Light,
    color: '#64748B',
  },
  metaTextBold: {
    fontSize: 12,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
  },
  addressSub: {
    fontSize: 11,
    fontFamily: Fonts.Light,
    color: '#64748B',
    marginLeft: 19,
    marginBottom: 8,
    lineHeight: 15,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: Fonts.Light,
    color: '#64748B',
  },
  priceVal: {
    fontSize: 15,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
  },
  currentPartnerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    padding: 8,
    borderRadius: 10,
    marginBottom: 10,
    gap: 8,
  },
  assignedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  assignedName: {
    fontSize: 12,
    fontFamily: Fonts.Bold,
    color: '#7C3AED',
  },
  assignedPhone: {
    fontSize: 10.5,
    fontFamily: Fonts.Light,
    color: '#64748B',
  },
  btnGrid: {
    gap: 8,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
  },
  acceptBtnText: {
    fontSize: 13,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  enRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  enRouteBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  arrivedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  arrivedBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  startServiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9333EA',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  startServiceBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  completeBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  resetBtnText: {
    fontSize: 11.5,
    fontFamily: Fonts.Medium,
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
    marginTop: 10,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 11.5,
    fontFamily: Fonts.Light,
    color: '#64748B',
    textAlign: 'center',
  },
});
