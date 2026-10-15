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
  Compass,
  XCircle,
  AlertTriangle,
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
import { trackingSocketService } from '../../../services/tracking/TrackingSocketService';
import { socketConnectionManager } from '../../../services/tracking/SocketConnectionManager';
import { locationService } from '../../../services/location.service';
import { backgroundLocationManager } from '../../../services/location/BackgroundLocationManager';
import { DispatchService } from '../../../services/DispatchService';
import { ensureUuid, isUuid } from '../../../lib/uuid.utils';

interface PartnerAppSimulatorScreenProps {
  onBack: () => void;
  onNavigateToBookingDetail?: (bookingId: string) => void;
}

const SIMULATED_PARTNERS = [
  {
    id: 'b9a8d0d3-6a2f-449a-a1c0-8966467faf1a',
    name: 'MD. Zohaib Khab',
    phone: '+91 91638 86934',
    avatarUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop&q=80',
    rating: 4.90,
    specialization: 'Certified Servs Specialist',
    capabilities: ['GENERAL_HELP', 'BATTERY_START', 'FLAT_TYRE'],
    vehicle: 'Bike (Hero Splendor)',
    operationalZone: 'zone_dehradun_central',
  },
  {
    id: 'prt_rd_01',
    name: 'Rajesh Kumar',
    phone: '+91 98112 34567',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    rating: 4.88,
    specialization: 'Roadside Master Tech',
    capabilities: ['ROADSIDE_ASSISTANCE', 'BATTERY_START', 'FUEL_ASSISTANCE'],
    vehicle: 'Utility Van',
    operationalZone: 'zone_dehradun_central',
  },
  {
    id: 'prt_mv_01',
    name: 'Amit & Manoj (Team)',
    phone: '+91 98334 56789',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    rating: 4.92,
    specialization: 'Pack & Move Squad',
    capabilities: ['MOVING_ASSISTANCE', 'GENERAL_HELP'],
    vehicle: 'Tata Ace (Mini Truck)',
    operationalZone: 'zone_dehradun_central',
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

  // Partner Presence State (Prompt 04 Section 2 & 3: OFFLINE, ONLINE, AVAILABLE, BUSY, PAUSED)
  const [presenceState, setPresenceState] = useState<'OFFLINE' | 'ONLINE_AVAILABLE' | 'BUSY' | 'PAUSED'>('ONLINE_AVAILABLE');
  const [isGpsActive, setIsGpsActive] = useState(true);
  const [lastHeartbeatTime, setLastHeartbeatTime] = useState<Date>(new Date());
  const [activeJobTimerSeconds, setActiveJobTimerSeconds] = useState<number>(3600); // 1 hour authoritative timer
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [extensionModalVisible, setExtensionModalVisible] = useState<boolean>(false);
  const [pendingExtensionMinutes, setPendingExtensionMinutes] = useState<number>(30);
  const [doorstepOtpInput, setDoorstepOtpInput] = useState<string>('');
  const [selectedBookingForOtp, setSelectedBookingForOtp] = useState<BookingRecord | null>(null);

  const loadAllBookings = async () => {
    try {
      const all = await bookingRepository.getAllBookings();
      setAllBookings(all);
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
  const [partnerCoords, setPartnerCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Immediately acquire partner's live device GPS on screen mount before any order is accepted
  useEffect(() => {
    let isMounted = true;
    const fetchInitialPartnerGps = async () => {
      try {
        const perm = await locationService.requestPermission();
        if (perm === 'GRANTED' && isMounted) {
          const coords = await locationService.getCurrentCoordinates();
          if (coords && isMounted) {
            console.log(`[PartnerSimulator] Initial live GPS acquired before acceptance: lat=${coords.latitude}, lon=${coords.longitude}`);
            setPartnerCoords({ latitude: coords.latitude, longitude: coords.longitude });
          }
        }
      } catch (e) {
        console.warn('[PartnerSimulator] Initial GPS fetch error:', e);
      }
    };
    fetchInitialPartnerGps();
    return () => {
      isMounted = false;
    };
  }, []);

  const activePartner = SIMULATED_PARTNERS[selectedPartnerIndex];

  const handleAcceptBooking = async (booking: BookingRecord) => {
    try {
      // 1. Request GPS permission and acquire initial physical device GPS fix
      const perm = await locationService.requestPermission();
      let deviceCoords: { latitude: number; longitude: number } | null = null;
      if (perm === 'GRANTED') {
        deviceCoords = await locationService.getCurrentCoordinates();
      }

      if (deviceCoords) {
        setPartnerCoords({ latitude: deviceCoords.latitude, longitude: deviceCoords.longitude });
      }

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

      // 2. Immediately start real device GPS streaming to establish initial anchor
      await startGpsStreaming(updated);

      Alert.alert(
        'Service Accepted!',
        `${activePartner.name} has accepted the service order.${
          deviceCoords
            ? ` Captured live partner location (${deviceCoords.latitude.toFixed(4)}, ${deviceCoords.longitude.toFixed(4)}).`
            : ''
        } Customer app now shows live assigned partner.`,
        [
          { text: 'Stay Here', style: 'cancel' },
          {
            text: 'View Customer UI',
            onPress: () => {
              if (booking.id.startsWith('inst_')) {
                // Return straight to active Instant screen
                onBack();
              } else {
                onNavigateToBookingDetail?.(booking.id);
              }
            },
          },
        ]
      );
    } catch (err: any) {
      console.warn('[PartnerSimulator] Error accepting booking with GPS:', err);
    }
  };

  const startGpsStreaming = async (booking: BookingRecord) => {
    try {
      const perm = await locationService.requestPermission();
      if (perm !== 'GRANTED') {
        Alert.alert('Permission Denied', 'GPS permission is required to stream partner location.');
        return;
      }
      const coords = await locationService.getCurrentCoordinates();
      if (coords) {
        setPartnerCoords({ latitude: coords.latitude, longitude: coords.longitude });
        const initialPayload = {
          bookingId: booking.id,
          partnerId: activePartner.id,
          latitude: coords.latitude,
          longitude: coords.longitude,
          timestamp: new Date().toISOString(),
          isMocked: false,
        };

        socketConnectionManager.connect({
          role: 'PARTNER',
          userId: activePartner.id,
        });

        trackingSocketService.emitPartnerLocation(initialPayload);
        liveTrackingService.publishPartnerLocation(initialPayload);
      }

      if (!backgroundLocationManager.isTracking()) {
        await backgroundLocationManager.startTracking({
          bookingId: booking.id,
          partnerId: activePartner.id,
          profile: 'ACTIVE_NAVIGATION',
          onLocationUpdate: (loc) => {
            console.log(
              `[PartnerGPS] Real Device GPS callback: lat=${loc.latitude.toFixed(5)}, lon=${loc.longitude.toFixed(5)}, accuracy=${loc.accuracy ?? 0}`
            );
            setPartnerCoords({ latitude: loc.latitude, longitude: loc.longitude });
            trackingSocketService.emitPartnerLocation({
              bookingId: booking.id,
              partnerId: activePartner.id,
              latitude: loc.latitude,
              longitude: loc.longitude,
              accuracy: loc.accuracy,
              heading: loc.heading,
              speed: loc.speed,
              timestamp: new Date(loc.timestamp).toISOString(),
              isMocked: false,
            });
          },
        });
      }

      // Continuous 2.5-second fallback heartbeat loop to stream live GPS (e.g. from Emulator "Play Route" or device sensors if watchPosition is idle)
      const existingTimer = (global as any).__servsPartnerGpsTimer;
      if (existingTimer) clearInterval(existingTimer);

      (global as any).__servsPartnerGpsTimer = setInterval(async () => {
        try {
          const fresh = await locationService.getCurrentCoordinates();
          if (fresh) {
            setPartnerCoords({ latitude: fresh.latitude, longitude: fresh.longitude });
            trackingSocketService.emitPartnerLocation({
              bookingId: booking.id,
              partnerId: activePartner.id,
              latitude: fresh.latitude,
              longitude: fresh.longitude,
              timestamp: new Date().toISOString(),
              isMocked: false,
            });
          }
        } catch (pollErr) {}
      }, 2500);
    } catch (e: any) {
      console.warn('[PartnerSimulator] GPS streaming activation error:', e?.message);
    }
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

    // Start single authoritative Android device/emulator GPS streaming
    await startGpsStreaming(updated);

    Alert.alert(
      'En Route Started!',
      `Partner is en route. Live device GPS is streaming directly to customer map over Socket.IO.`,
      [
        { text: 'Stay Here', style: 'cancel' },
        {
          text: 'View Customer UI',
          onPress: () => onNavigateToBookingDetail?.(booking.id),
        },
      ]
    );
  };

  const handleBroadcastDeviceGPS = async (booking: BookingRecord) => {
    try {
      // Mark status as EN_ROUTE if still assigned/accepted
      if (booking.status === 'PARTNER_ASSIGNED' || booking.status === 'PARTNER_ACCEPTED') {
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
        await startGpsStreaming(updated);
      } else {
        await startGpsStreaming(booking);
      }

      const coords = await locationService.getCurrentCoordinates();
      Alert.alert(
        'Physical GPS Broadcasted',
        coords
          ? `Broadcasting live physical device GPS (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}) to Socket.IO tracking room & background service.`
          : 'Broadcasting live physical device GPS to Socket.IO tracking room & background service.'
      );
    } catch (e: any) {
      Alert.alert('GPS Error', e?.message || 'Unable to read physical device GPS.');
    }
  };

  const handleArrived = async (booking: BookingRecord) => {
    const updated: BookingRecord = {
      ...booking,
      status: 'PARTNER_ARRIVED',
      updatedAt: new Date().toISOString(),
    };
    await bookingRepository.saveBooking(updated);
    // Battery optimization: reduce GPS frequency once arrived at location
    backgroundLocationManager.updateProfile('ARRIVED_OR_STARTED');
    Alert.alert('Partner Arrived!', 'Customer notified that Servs has arrived at the location.');
  };

  const handleStartService = async (booking: BookingRecord) => {
    // 1. Authoritative transition via Phase 7 RPC
    await DispatchService.startService({
      bookingId: booking.id,
      partnerId: activePartner.id,
    });

    const updated: BookingRecord = {
      ...booking,
      status: 'SERVICE_STARTED',
      updatedAt: new Date().toISOString(),
    };
    await bookingRepository.saveBooking(updated);
    backgroundLocationManager.updateProfile('ARRIVED_OR_STARTED');
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
    // 1. Authoritative completion & financial settlement via Phase 7 RPC
    const res = await DispatchService.completeService({
      bookingId: booking.id,
      partnerId: activePartner.id,
      completionNotes: 'Work verified and successfully completed.',
    });

    const updated: BookingRecord = {
      ...booking,
      status: 'SERVICE_COMPLETED',
      updatedAt: new Date().toISOString(),
    };
    await bookingRepository.saveBooking(updated);
    // Terminate background tracking task once service lifecycle finishes
    await backgroundLocationManager.stopTracking();
    Alert.alert(
      'Service Completed!',
      `Job completed with settlement created (Specialist Payout: ₹${res.payout ?? 418}). Order moved to Completed tab.`,
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
    // Reassign via Phase 7 RPC: atomically revokes old partner authority & re-opens dispatch
    await DispatchService.reassignPartner({
      bookingId: booking.id,
      reason: 'Partner manually unassigned in simulator',
      actorType: 'PARTNER',
      actorId: activePartner.id,
    });

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

          {/* ACTIVE PARTNER CAPABILITIES & VEHICLE */}
          <View style={styles.partnerMetaDetailsBlock}>
            <Text style={styles.partnerMetaLabel}>APPROVED CAPABILITIES:</Text>
            <View style={styles.capabilitiesRow}>
              {activePartner.capabilities.map((cap) => (
                <View key={cap} style={styles.capabilityBadge}>
                  <Text style={styles.capabilityBadgeText}>{cap.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.partnerMetaLabel, { marginTop: 6 }]}>
              VEHICLE: <Text style={{ fontFamily: Fonts.Medium, color: '#334155' }}>{activePartner.vehicle}</Text>
            </Text>
          </View>
        </View>

        {/* PARTNER PRESENCE & DISPATCH CONTROLLER (PROMPT 04 SECTION 2 & 3) */}
        <View style={styles.presenceControlCard}>
          <View style={styles.presenceStatusHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={[
                  styles.presenceDot,
                  presenceState === 'ONLINE_AVAILABLE'
                    ? { backgroundColor: '#10B981' }
                    : presenceState === 'BUSY'
                    ? { backgroundColor: '#F59E0B' }
                    : { backgroundColor: '#94A3B8' },
                ]}
              />
              <Text style={styles.presenceStateTitle}>
                {presenceState === 'ONLINE_AVAILABLE'
                  ? 'ONLINE • AVAILABLE'
                  : presenceState === 'BUSY'
                  ? 'ONLINE • BUSY ON JOB'
                  : presenceState === 'PAUSED'
                  ? 'PAUSED'
                  : 'OFFLINE'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.presenceToggleBtn,
                presenceState === 'OFFLINE' ? styles.goOnlineBtn : styles.goOfflineBtn,
              ]}
              onPress={() => {
                if (presenceState === 'OFFLINE') {
                  setPresenceState('ONLINE_AVAILABLE');
                  setLastHeartbeatTime(new Date());
                  Alert.alert('You are Online', 'Ready for Instant jobs. Live GPS heartbeat initiated.');
                } else {
                  setPresenceState('OFFLINE');
                  Alert.alert('You are Offline', 'No new instant dispatch offers will be received.');
                }
              }}
            >
              <Text
                style={[
                  styles.presenceToggleBtnText,
                  presenceState === 'OFFLINE' ? { color: '#FFFFFF' } : { color: '#EF4444' },
                ]}
              >
                {presenceState === 'OFFLINE' ? 'GO ONLINE' : 'GO OFFLINE'}
              </Text>
            </TouchableOpacity>
          </View>

          {presenceState === 'ONLINE_AVAILABLE' && (
            <View style={styles.readyBanner}>
              <Zap size={14} color="#16A34A" />
              <Text style={styles.readyBannerText}>
                Ready for Instant jobs • GPS active (&lt;30s stale exclusion enabled)
              </Text>
            </View>
          )}
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={[styles.sectionHeader, { marginBottom: 0 }]}>
            CUSTOMER BOOKING ORDERS ({filteredBookings.length})
          </Text>
          <TouchableOpacity
            style={[styles.acceptBtn, { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#059669' }]}
            onPress={async () => {
              const now = new Date().toISOString();
              const testBookingId = ensureUuid();
              const testBookingNumber = `SRV-${testBookingId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;
              const effectiveCustId = user?.id && isUuid(user.id) ? user.id : '6e9fc42b-8f70-4c39-9278-49d33043aac9';
              const lat = 30.343866;
              const lng = 77.953231;
              const addressStr = 'Rajpur Road, Clock Tower, Dehradun';

              const testBooking: BookingRecord = {
                id: testBookingId,
                bookingNumber: testBookingNumber,
                serviceId: 'e1000000-0000-0001-0001-000000000001',
                serviceName: 'AC Repair & Diagnosis',
                serviceSlug: 'ac-general-service',
                status: 'SEARCHING_PARTNER',
                fulfillmentMode: 'INSTANT',
                customerId: effectiveCustId,
                addressId: ensureUuid(),
                createdAt: now,
                updatedAt: now,
                scheduledDate: now.split('T')[0],
                scheduledStartTime: 'Instant (~9-15 mins)',
                address: {
                  title: 'Customer Residence',
                  shortAddress: 'Clock Tower, Dehradun',
                  addressLine1: addressStr,
                  city: 'Dehradun',
                  state: 'Uttarakhand',
                  pincode: '248001',
                  formattedAddress: addressStr,
                  latitude: lat,
                  longitude: lng,
                },
                partner: null,
                items: [
                  {
                    id: ensureUuid(),
                    bookingId: testBookingId,
                    serviceId: 'e1000000-0000-0001-0001-000000000001',
                    serviceName: 'AC Repair & Diagnosis',
                    quantity: 1,
                    unitPrice: 499,
                    totalPrice: 499,
                  },
                ],
                payment: {
                  subtotal: 499,
                  tax: 0,
                  platformFee: 49,
                  discount: 0,
                  total: 548,
                  currency: 'INR',
                  paymentStatus: 'PENDING',
                  paymentMethod: 'CASH_ON_DELIVERY',
                },
              };

              await bookingRepository.saveBooking(testBooking);

              try {
                const dispRes = await DispatchService.placeOrderAndDispatch({
                  bookingId: testBookingId,
                  bookingNumber: testBookingNumber,
                  customerId: effectiveCustId,
                  serviceIdOrSlug: 'ac-general-service',
                  serviceName: 'AC Repair & Diagnosis',
                  pickupLatitude: lat,
                  pickupLongitude: lng,
                  addressText: addressStr,
                  totalAmount: 548,
                  paymentMethod: 'CASH_ON_DELIVERY',
                });
                console.log('[PartnerSimulator] Partner dispatch wave launched:', dispRes);
              } catch (dispErr) {
                console.warn('[PartnerSimulator] Instant dispatch wave notice:', dispErr);
              }

              await loadAllBookings();
              Alert.alert('Instant Order Dispatched!', `Order #${testBooking.bookingNumber} sent to Scan Engine. Partner app alerted!`);
            }}
            activeOpacity={0.8}
          >
            <Sparkles size={13} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={[styles.acceptBtnText, { fontSize: 12 }]}>+ New Test Order</Text>
          </TouchableOpacity>
        </View>

        {filteredBookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Radio size={28} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No orders in this state</Text>
            <Text style={styles.emptySub}>
              Book a service from the customer app, or create an instant live test order here.
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

                {/* Live GPS Test & Route Setup Card */}
                <View style={styles.liveGpsTestCard}>
                  <View style={styles.liveGpsHeader}>
                    <Compass size={14} color="#059669" strokeWidth={2.4} />
                    <Text style={styles.liveGpsTitle}>Live GPS Test & Route Setup</Text>
                  </View>

                  {/* Route Test Guide */}
                  <View style={styles.routeTestingGuide}>
                    <Text style={styles.routeTestingStep}>
                      <Text style={styles.boldLabel}>START (Partner GPS):</Text>{' '}
                      {partnerCoords
                        ? `${partnerCoords.latitude.toFixed(6)}, ${partnerCoords.longitude.toFixed(6)}`
                        : 'Acquiring device GPS...'}
                    </Text>
                    <Text style={styles.routeTestingStep}>
                      <Text style={styles.boldLabel}>END (Customer Destination):</Text>{' '}
                      {item.address?.latitude != null && item.address?.longitude != null
                        ? `${Number(item.address.latitude).toFixed(6)}, ${Number(item.address.longitude).toFixed(6)}`
                        : 'No destination in booking'}
                    </Text>
                  </View>

                  <View style={styles.gpsGrid}>
                    {/* Partner Current GPS */}
                    <View style={styles.gpsBlock}>
                      <Text style={styles.gpsBlockTag}>PARTNER CURRENT GPS</Text>
                      <Text style={styles.gpsCoordinate}>
                        Latitude: {partnerCoords ? partnerCoords.latitude.toFixed(6) : 'Acquiring...'}
                      </Text>
                      <Text style={styles.gpsCoordinate}>
                        Longitude: {partnerCoords ? partnerCoords.longitude.toFixed(6) : 'Acquiring...'}
                      </Text>
                    </View>

                    {/* Customer Destination */}
                    <View style={styles.gpsBlock}>
                      <Text style={styles.gpsBlockTag}>CUSTOMER DESTINATION</Text>
                      <Text style={styles.gpsCoordinate}>
                        Latitude: {item.address?.latitude != null ? Number(item.address.latitude).toFixed(6) : 'N/A'}
                      </Text>
                      <Text style={styles.gpsCoordinate}>
                        Longitude: {item.address?.longitude != null ? Number(item.address.longitude).toFixed(6) : 'N/A'}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.refreshGpsAction}
                    onPress={async () => {
                      try {
                        const c = await locationService.getCurrentCoordinates();
                        if (c) {
                          setPartnerCoords({ latitude: c.latitude, longitude: c.longitude });
                          Alert.alert(
                            'GPS Updated',
                            `Partner GPS:\nLat: ${c.latitude.toFixed(6)}\nLon: ${c.longitude.toFixed(6)}\n\nDestination:\nLat: ${item.address?.latitude ?? 'N/A'}\nLon: ${item.address?.longitude ?? 'N/A'}`
                          );
                        }
                      } catch (e: any) {
                        Alert.alert('GPS Error', e?.message || 'Failed to read device GPS');
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <RefreshCw size={12} color="#059669" />
                    <Text style={styles.refreshGpsActionText}>Refresh GPS Coordinates</Text>
                  </TouchableOpacity>
                </View>

                {/* 1. Live Interactive Route Map to Customer Location */}
                <View style={{ marginVertical: 8 }}>
                  <LiveTrackingMap
                    partner={item.partner || activePartner}
                    status={item.status}
                    userAddressTitle={item.address?.shortAddress || item.address?.title || item.address?.city || 'Customer Location'}
                    userAddressLine={item.address?.formattedAddress || item.address?.addressLine1 || 'Customer Delivery Address'}
                    customerLat={item.address?.latitude}
                    customerLon={item.address?.longitude}
                    partnerLat={partnerCoords?.latitude}
                    partnerLon={partnerCoords?.longitude}
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
                    <View style={{ gap: 8 }}>
                      {/* Capability Verification Banner */}
                      {item.serviceId?.includes('road') && !activePartner.capabilities.includes('ROADSIDE_ASSISTANCE') && !activePartner.capabilities.includes('BATTERY_START') ? (
                        <View style={styles.capabilityWarningBlock}>
                          <AlertTriangle size={14} color="#DC2626" />
                          <Text style={styles.capabilityWarningText}>
                            Requires Roadside/Battery Start capability. {activePartner.name} does not hold this certification.
                          </Text>
                        </View>
                      ) : null}

                      <TouchableOpacity
                        style={[
                          styles.acceptBtn,
                          item.serviceId?.includes('road') && !activePartner.capabilities.includes('ROADSIDE_ASSISTANCE') && !activePartner.capabilities.includes('BATTERY_START')
                            ? { backgroundColor: '#94A3B8' }
                            : {},
                        ]}
                        disabled={item.serviceId?.includes('road') && !activePartner.capabilities.includes('ROADSIDE_ASSISTANCE') && !activePartner.capabilities.includes('BATTERY_START')}
                        onPress={() => handleAcceptBooking(item)}
                        activeOpacity={0.85}
                      >
                        <UserCheck size={16} color="#FFFFFF" strokeWidth={2.4} />
                        <Text style={styles.acceptBtnText}>
                          ⚡ Accept Instant Order as {activePartner.name}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.resetBtn, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', marginTop: 0 }]}
                        onPress={() => {
                          Alert.alert('Offer Declined', 'Specialist passed on this offer. Next nearby specialist in dispatch wave will receive it.');
                        }}
                        activeOpacity={0.85}
                      >
                        <XCircle size={14} color="#64748B" strokeWidth={2} />
                        <Text style={[styles.resetBtnText, { color: '#64748B' }]}>Decline / Pass Offer</Text>
                      </TouchableOpacity>
                    </View>
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
                          <Text style={styles.enRouteBtnText}>1. Start Navigation (En Route)</Text>
                        </TouchableOpacity>
                      )}

                      {/* Broadcast Real Device GPS */}
                      {(item.status === 'PARTNER_ASSIGNED' || item.status === 'PARTNER_ACCEPTED' || item.status === 'PARTNER_EN_ROUTE') && (
                        <TouchableOpacity
                          style={[styles.enRouteBtn, { backgroundColor: '#059669', marginTop: item.status === 'PARTNER_EN_ROUTE' ? 0 : 6 }]}
                          onPress={() => handleBroadcastDeviceGPS(item)}
                          activeOpacity={0.85}
                        >
                          <Compass size={15} color="#FFFFFF" strokeWidth={2.2} />
                          <Text style={styles.enRouteBtnText}>
                            {backgroundLocationManager.isTracking() ? 'Streaming Real GPS Live ●' : 'Broadcast Real Device GPS'}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Step 2: Mark Arrived (Geofence verified) */}
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
                          onPress={() => {
                            setIsTimerRunning(true);
                            handleStartService(item);
                          }}
                          activeOpacity={0.85}
                        >
                          <Zap size={15} color="#FFFFFF" strokeWidth={2.2} />
                          <Text style={styles.startServiceBtnText}>3. Start Service (Authoritative Timer)</Text>
                        </TouchableOpacity>
                      )}

                      {/* Live In-Progress Service Timer (Prompt 04 Section 10 & 12) */}
                      {item.status === 'SERVICE_STARTED' && (
                        <View style={styles.serviceTimerCard}>
                          <View style={styles.serviceTimerHeader}>
                            <Clock size={16} color="#7C3AED" />
                            <Text style={styles.serviceTimerTitle}>AUTHORITATIVE SERVICE TIMER</Text>
                          </View>
                          <Text style={styles.serviceTimerDigits}>
                            {Math.floor(activeJobTimerSeconds / 60)}m : {(activeJobTimerSeconds % 60).toString().padStart(2, '0')}s
                          </Text>
                          <Text style={styles.serviceTimerSub}>
                            Calculated server-side • Base: 1 Hour
                          </Text>

                          {/* Customer Extension Offer Request (Section 12 & 13) */}
                          <View style={styles.extensionPromptCard}>
                            <Text style={styles.extensionPromptTitle}>⚡ Customer requested +30 minutes</Text>
                            <Text style={styles.extensionPromptSub}>
                              Additional ₹99 will be added to specialist payout.
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                              <TouchableOpacity
                                style={[styles.acceptBtn, { flex: 1, paddingVertical: 8 }]}
                                onPress={() => {
                                  setActiveJobTimerSeconds((prev) => prev + 1800);
                                  Alert.alert(
                                    'Extension Accepted',
                                    'Backend validated capacity & schedule. +30 minutes added to booking.'
                                  );
                                }}
                              >
                                <Text style={styles.acceptBtnText}>Accept +30m</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.resetBtn, { flex: 1, paddingVertical: 8, marginTop: 0 }]}
                                onPress={() => {
                                  Alert.alert('Extension Declined', 'Customer notified that specialist cannot extend due to next slot.');
                                }}
                              >
                                <Text style={styles.resetBtnText}>Decline</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      )}

                      {/* Step 4: Complete Service */}
                      {item.status !== 'SERVICE_COMPLETED' && (
                        <TouchableOpacity
                          style={styles.completeBtn}
                          onPress={() => {
                            setIsTimerRunning(false);
                            handleCompleteService(item);
                          }}
                          activeOpacity={0.85}
                        >
                          <CheckCircle2 size={15} color="#FFFFFF" strokeWidth={2.2} />
                          <Text style={styles.completeBtnText}>4. Complete Service (Proof Verified)</Text>
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
  liveGpsTestCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  liveGpsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  liveGpsTitle: {
    fontSize: 12,
    fontFamily: Fonts.Bold,
    color: '#166534',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeTestingGuide: {
    backgroundColor: '#DCFCE7',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    gap: 4,
  },
  routeTestingStep: {
    fontSize: 11,
    fontFamily: Fonts.Regular,
    color: '#14532D',
  },
  boldLabel: {
    fontFamily: Fonts.Bold,
    color: '#14532D',
  },
  gpsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  gpsBlock: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 8,
  },
  gpsBlockTag: {
    fontSize: 9.5,
    fontFamily: Fonts.Bold,
    color: '#059669',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  gpsCoordinate: {
    fontSize: 11,
    fontFamily: Fonts.Medium,
    color: '#334155',
    lineHeight: 16,
  },
  refreshGpsAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  refreshGpsActionText: {
    fontSize: 11,
    fontFamily: Fonts.SemiBold,
    color: '#059669',
  },
  partnerMetaDetailsBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  partnerMetaLabel: {
    fontSize: 9.5,
    fontFamily: Fonts.Bold,
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  capabilitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  capabilityBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  capabilityBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.Bold,
    color: '#334155',
  },
  presenceControlCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presenceStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  presenceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  presenceStateTitle: {
    fontSize: 13,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
  },
  presenceToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  goOnlineBtn: {
    backgroundColor: '#10B981',
  },
  goOfflineBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  presenceToggleBtnText: {
    fontSize: 11,
    fontFamily: Fonts.Bold,
  },
  readyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  readyBannerText: {
    fontSize: 11,
    fontFamily: Fonts.Medium,
    color: '#15803D',
  },
  capabilityWarningBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  capabilityWarningText: {
    fontSize: 11,
    fontFamily: Fonts.Medium,
    color: '#B91C1C',
    flex: 1,
  },
  serviceTimerCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    alignItems: 'center',
    marginVertical: 4,
  },
  serviceTimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  serviceTimerTitle: {
    fontSize: 10,
    fontFamily: Fonts.Bold,
    color: '#7C3AED',
    letterSpacing: 0.5,
  },
  serviceTimerDigits: {
    fontSize: 26,
    fontFamily: Fonts.Bold,
    color: '#6B21A8',
    marginVertical: 2,
  },
  serviceTimerSub: {
    fontSize: 10.5,
    fontFamily: Fonts.Light,
    color: '#7E22CE',
  },
  extensionPromptCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  extensionPromptTitle: {
    fontSize: 12,
    fontFamily: Fonts.Bold,
    color: '#581C87',
  },
  extensionPromptSub: {
    fontSize: 10.5,
    fontFamily: Fonts.Regular,
    color: '#6B7280',
    marginTop: 1,
  },
});

