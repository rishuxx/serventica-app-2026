import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Platform,
  ActivityIndicator,
  Dimensions,
  Animated,
  TouchableOpacity,
  Modal,
} from 'react-native';
import Svg, { Polyline as SvgPolyline } from 'react-native-svg';
import {
  MapPin,
  Navigation,
  Zap,
  Compass,
  Maximize2,
  X,
  Plus,
  Minus,
} from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';
import { BookingPartner } from '../../../../../../packages/types/src';
import { INITIAL_CONFIGURED_ORIGIN } from '../../../repositories/origin.repository';
import { GoogleRoutingProvider } from '../../../services/routing/GoogleRoutingProvider';
import { GeoPoint } from '../../../types/routing.types';
import { ServenticaEnvironment } from '../../../../../../packages/config/src';

import { InteractiveGoogleMap } from './InteractiveGoogleMap';

// Safe dynamic loader for react-native-maps
let NativeMapView: any = null;
let NativeMarker: any = null;
let NativePolyline: any = null;
let PROVIDER_GOOGLE_REF: any = undefined;

try {
  const { TurboModuleRegistry, NativeModules } = require('react-native');
  const hasTurbo = TurboModuleRegistry?.get?.('RNMapsAirModule') != null;
  const hasLegacy = Boolean(NativeModules?.RNMapsAirModule || NativeModules?.AirMapModule);
  if (hasTurbo || hasLegacy) {
    const RNM = require('react-native-maps');
    if (RNM && (RNM.default || RNM.MapView)) {
      NativeMapView = RNM.default || RNM.MapView;
      NativeMarker = RNM.Marker;
      NativePolyline = RNM.Polyline;
      PROVIDER_GOOGLE_REF = RNM.PROVIDER_GOOGLE;
    }
  }
} catch (e) {
  NativeMapView = null;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = 185;

const GOOGLE_MAPS_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  ServenticaEnvironment?.googleMaps?.apiKey ||
  'AIzaSyAasVoqGTlhp66ydhb7sLMBLHRr36awF6g';

interface LiveTrackingMapProps {
  partner?: BookingPartner | null;
  status: string;
  userAddressTitle?: string;
  userAddressLine?: string;
  etaText?: string;
  distanceText?: string;
  customerLat?: number;
  customerLon?: number;
  partnerLat?: number;
  partnerLon?: number;
  heading?: number;
  isLiveGps?: boolean;
}

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  partner,
  status,
  userAddressTitle = 'Service Location',
  userAddressLine = 'Delivery Location',
  etaText: initialEtaText = 'Arriving in ~12 mins',
  distanceText: initialDistanceText = '1.2 km away',
  customerLat = 30.3342,
  customerLon = 77.9629,
  partnerLat,
  partnerLon,
  heading = 0,
  isLiveGps = false,
}) => {
  const mapRef = useRef<any>(null);
  const modalMapRef = useRef<any>(null);
  const [nativeMapAvailable, setNativeMapAvailable] = useState<boolean>(Boolean(NativeMapView));
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const isEnRoute = status === 'PARTNER_EN_ROUTE';
  const isArrived = status === 'PARTNER_ARRIVED';
  const isStarted = status === 'SERVICE_STARTED';
  const isCompleted = status === 'SERVICE_COMPLETED' || status === 'CLOSED';

  // Partner location coordinates
  const pLat =
    partnerLat ??
    (isArrived || isStarted || isCompleted
      ? customerLat + 0.0001
      : INITIAL_CONFIGURED_ORIGIN.latitude);
  const pLon =
    partnerLon ??
    (isArrived || isStarted || isCompleted
      ? customerLon + 0.0001
      : INITIAL_CONFIGURED_ORIGIN.longitude);

  const [routeCoordinates, setRouteCoordinates] = useState<GeoPoint[]>([
    { latitude: pLat, longitude: pLon },
    { latitude: customerLat, longitude: customerLon },
  ]);
  const [encodedPolyline, setEncodedPolyline] = useState<string>('');
  const [liveEtaText, setLiveEtaText] = useState(initialEtaText);
  const [liveDistanceText, setLiveDistanceText] = useState(initialDistanceText);
  const [isRouteLoading, setIsRouteLoading] = useState(false);

  const centerLat = (customerLat + pLat) / 2;
  const centerLon = (customerLon + pLon) / 2;

  // Pulse animation for partner beacon
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.45,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Fetch true turn-by-turn road route via Google / Mapbox Routing Provider
  useEffect(() => {
    let isMounted = true;
    const fetchRoute = async () => {
      setIsRouteLoading(true);
      try {
        let result: any = null;
        try {
          const googleProvider = new GoogleRoutingProvider(GOOGLE_MAPS_KEY);
          result = await googleProvider.calculateRoute({
            origin: { latitude: pLat, longitude: pLon },
            destination: { latitude: customerLat, longitude: customerLon },
            profile: 'DRIVING',
          });
        } catch (e) {
          result = null;
        }

        if (!result || !result.coordinates || result.coordinates.length <= 2) {
          const { MapboxRoutingProvider } = require('../../../services/routing/MapboxRoutingProvider');
          const mapboxProvider = new MapboxRoutingProvider();
          result = await mapboxProvider.calculateRoute({
            origin: { latitude: pLat, longitude: pLon },
            destination: { latitude: customerLat, longitude: customerLon },
            profile: 'DRIVING',
          });
        }

        if (isMounted && result) {
          if (result.coordinates && result.coordinates.length > 0) {
            setRouteCoordinates(result.coordinates);
          } else {
            setRouteCoordinates([
              { latitude: pLat, longitude: pLon },
              { latitude: customerLat, longitude: customerLon },
            ]);
          }

          if (result.geometry && typeof result.geometry === 'string') {
            setEncodedPolyline(result.geometry);
          }

          if (result.durationSeconds) {
            const mins = Math.max(5, Math.round(result.durationSeconds / 60));
            setLiveEtaText(`Arriving in ~${mins} mins`);
          }
          if (result.distanceMeters) {
            const km = (result.distanceMeters / 1000).toFixed(1);
            setLiveDistanceText(`${km} km away`);
          }

          if (mapRef.current?.fitToCoordinates) {
            mapRef.current.fitToCoordinates(
              [
                { latitude: pLat, longitude: pLon },
                { latitude: customerLat, longitude: customerLon },
              ],
              {
                edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
                animated: true,
              }
            );
          }
        }
      } catch (err) {
        console.warn('Route calculation notice:', err);
      } finally {
        if (isMounted) setIsRouteLoading(false);
      }
    };

    fetchRoute();
    return () => {
      isMounted = false;
    };
  }, [pLat, pLon, customerLat, customerLon, status]);

  const partnerName = partner?.name || (isEnRoute ? 'Assigned Servs Partner' : 'Kolhupani Hub');
  const partnerAvatar = partner?.avatarUrl;
  const cardWidth = Math.round(SCREEN_WIDTH - 32);

  // High-definition Google Static Map snapshot with native Google Road Path, Markers & Auto-Centering
  const googleStaticMapUrl = useMemo(() => {
    const w = Math.min(640, cardWidth);
    const h = Math.min(640, MAP_HEIGHT);
    const scale = 2; // Retina @2x crispness

    // Partner Marker (Blue Custom Pin with Label P)
    const partnerMarkerParam = `markers=color:blue%7Clabel:P%7C${pLat},${pLon}`;
    // Customer Marker (Green Custom Pin with Label C)
    const customerMarkerParam = `markers=color:green%7Clabel:C%7C${customerLat},${customerLon}`;

    // Google Styled Road Route Polyline
    let pathParam = '';
    if (encodedPolyline) {
      pathParam = `&path=color:0x2563EBff%7Cweight:5%7Cenc:${encodeURIComponent(encodedPolyline)}`;
    } else {
      pathParam = `&path=color:0x2563EBff%7Cweight:5%7C${pLat},${pLon}%7C${customerLat},${customerLon}`;
    }

    return `https://maps.googleapis.com/maps/api/staticmap?size=${w}x${h}&scale=${scale}&maptype=roadmap&${partnerMarkerParam}&${customerMarkerParam}${pathParam}&key=${GOOGLE_MAPS_KEY}`;
  }, [cardWidth, pLat, pLon, customerLat, customerLon, encodedPolyline]);

  const googleModalStaticMapUrl = useMemo(() => {
    const w = Math.min(640, Math.round(SCREEN_WIDTH));
    const h = Math.min(640, Math.round(SCREEN_HEIGHT * 0.65));
    const scale = 2;

    const partnerMarkerParam = `markers=color:blue%7Clabel:P%7C${pLat},${pLon}`;
    const customerMarkerParam = `markers=color:green%7Clabel:C%7C${customerLat},${customerLon}`;

    let pathParam = '';
    if (encodedPolyline) {
      pathParam = `&path=color:0x2563EBff%7Cweight:5%7Cenc:${encodeURIComponent(encodedPolyline)}`;
    } else {
      pathParam = `&path=color:0x2563EBff%7Cweight:5%7C${pLat},${pLon}%7C${customerLat},${customerLon}`;
    }

    return `https://maps.googleapis.com/maps/api/staticmap?size=${w}x${h}&scale=${scale}&maptype=roadmap&${partnerMarkerParam}&${customerMarkerParam}${pathParam}&key=${GOOGLE_MAPS_KEY}`;
  }, [pLat, pLon, customerLat, customerLon, encodedPolyline]);

  const handleRecenter = () => {
    if (mapRef.current?.fitToCoordinates) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: pLat, longitude: pLon },
          { latitude: customerLat, longitude: customerLon },
        ],
        {
          edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
          animated: true,
        }
      );
    }
  };

  return (
    <View style={styles.card}>
      {/* HEADER WITH REALTIME STATUS, ETA BADGE & EXPAND BUTTON */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Live Servs Route Tracking</Text>
          <Text style={styles.headerSubtitle}>
            {isCompleted
              ? 'Service successfully completed'
              : isStarted
              ? 'Service in progress at your location'
              : isArrived
              ? `${partnerName} has arrived at your location`
              : isEnRoute
              ? `${partnerName} is en route to you`
              : `${partnerName} is assigned and preparing`}
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          <View style={styles.etaBadge}>
            <Zap size={11} color="#D97706" fill="#D97706" />
            <Text style={styles.etaBadgeText}>
              {isCompleted ? 'Completed' : isArrived ? 'Arrived' : isStarted ? 'In Progress' : liveEtaText}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.expandIconBtn}
            onPress={() => setIsExpanded(true)}
            activeOpacity={0.75}
            accessibilityLabel="Expand tracking map"
          >
            <Maximize2 size={14} color="#475569" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* GOOGLE MAPS LIVE CANVAS */}
      <View style={styles.mapCanvas}>
        <InteractiveGoogleMap
          partnerLat={pLat}
          partnerLon={pLon}
          customerLat={customerLat}
          customerLon={customerLon}
          heading={heading}
          partnerName={partnerName}
          userAddressTitle={userAddressTitle}
          routeCoordinates={routeCoordinates}
          encodedPolyline={encodedPolyline}
          isInteractive={false}
        />

        {/* Tap to expand overlay */}
        <TouchableOpacity
          style={styles.tapToExpandBadge}
          onPress={() => setIsExpanded(true)}
          activeOpacity={0.85}
        >
          <Maximize2 size={11} color="#2563EB" strokeWidth={2.2} />
          <Text style={styles.tapToExpandText}>Tap to Expand</Text>
        </TouchableOpacity>

        {isRouteLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#2563EB" />
          </View>
        )}
      </View>

      {/* FOOTER BAR WITH ACCURATE DISTANCE & GOOGLE MAPS STATUS */}
      <View style={styles.footerRow}>
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>Distance: {liveDistanceText}</Text>
        </View>
        <View style={styles.liveTagRow}>
          <View style={[styles.greenPulseDot, !isLiveGps && { backgroundColor: '#3B82F6' }]} />
          <Text style={[styles.liveTagText, !isLiveGps && { color: '#2563EB' }]}>
            Google Maps Road Route
          </Text>
        </View>
      </View>

      {/* EXPANDED FULLSCREEN GOOGLE MAPS MODAL */}
      <Modal
        visible={isExpanded}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsExpanded(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsExpanded(false)}
              activeOpacity={0.75}
            >
              <X size={20} color="#0F172A" strokeWidth={2.2} />
            </TouchableOpacity>

            <View style={styles.modalHeaderTitleCol}>
              <Text style={styles.modalTitle}>Google Maps Live Tracking</Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                {partnerName} • {liveEtaText} ({liveDistanceText})
              </Text>
            </View>

            <View style={styles.modalStatusBadge}>
              <View style={styles.greenPulseDot} />
              <Text style={styles.modalStatusText}>LIVE</Text>
            </View>
          </View>

          {/* Fullscreen Interactive Google Map Canvas */}
          <View style={styles.modalMapCanvas}>
            <InteractiveGoogleMap
              partnerLat={pLat}
              partnerLon={pLon}
              customerLat={customerLat}
              customerLon={customerLon}
              heading={heading}
              partnerName={partnerName}
              userAddressTitle={userAddressTitle}
              routeCoordinates={routeCoordinates}
              encodedPolyline={encodedPolyline}
              isInteractive={true}
            />
          </View>

          {/* Bottom Card Summary inside Expanded View */}
          <View style={styles.modalBottomCard}>
            <View style={styles.modalPartnerRow}>
              <Image
                source={{
                  uri:
                    partnerAvatar ||
                    'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150',
                }}
                style={styles.modalPartnerAvatar}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalPartnerName}>{partnerName}</Text>
                <Text style={styles.modalPartnerSpecialty}>
                  {partner?.specialization || 'Certified Servs Specialist'} • ★ {partner?.rating || 4.95}
                </Text>
              </View>
              <View style={styles.modalEtaCol}>
                <Text style={styles.modalEtaVal}>{liveEtaText.replace('Arriving in ~', '')}</Text>
                <Text style={styles.modalEtaSub}>{liveDistanceText}</Text>
              </View>
            </View>

            <View style={styles.modalAddressBox}>
              <MapPin size={15} color="#059669" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalAddressTitle}>{userAddressTitle}</Text>
                <Text style={styles.modalAddressLine} numberOfLines={1}>
                  {userAddressLine}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.Regular,
    color: '#64748B',
    marginTop: 2,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  etaBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.Bold,
    color: '#B45309',
  },
  expandIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCanvas: {
    height: MAP_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  partnerMarkerBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  customerMarkerBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  partnerBadgeFloating: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  customerBadgeFloating: {
    position: 'absolute',
    bottom: 34,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  partnerIconCircleMini: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerIconCircleMini: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBadgeText: {
    fontSize: 10.5,
    fontFamily: Fonts.SemiBold,
    color: '#0F172A',
  },
  tapToExpandBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tapToExpandText: {
    fontSize: 10.5,
    fontFamily: Fonts.SemiBold,
    color: '#2563EB',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  distanceBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  distanceText: {
    fontSize: 11.5,
    fontFamily: Fonts.Medium,
    color: '#475569',
  },
  liveTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  greenPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  liveTagText: {
    fontSize: 11,
    fontFamily: Fonts.SemiBold,
    color: '#10B981',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 50,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderTitleCol: {
    flex: 1,
    marginHorizontal: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.Regular,
    color: '#64748B',
    marginTop: 1,
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  modalStatusText: {
    fontSize: 11,
    fontFamily: Fonts.Bold,
    color: '#059669',
  },
  modalMapCanvas: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  modalBottomCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  modalPartnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalPartnerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  modalPartnerName: {
    fontSize: 15,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
  },
  modalPartnerSpecialty: {
    fontSize: 12,
    fontFamily: Fonts.Regular,
    color: '#64748B',
    marginTop: 2,
  },
  modalEtaCol: {
    alignItems: 'flex-end',
  },
  modalEtaVal: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: '#2563EB',
  },
  modalEtaSub: {
    fontSize: 11,
    fontFamily: Fonts.Medium,
    color: '#64748B',
  },
  modalAddressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  modalAddressTitle: {
    fontSize: 12.5,
    fontFamily: Fonts.SemiBold,
    color: '#0F172A',
  },
  modalAddressLine: {
    fontSize: 11,
    fontFamily: Fonts.Regular,
    color: '#64748B',
    marginTop: 1,
  },
});

export default LiveTrackingMap;
