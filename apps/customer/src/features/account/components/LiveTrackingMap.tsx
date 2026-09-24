import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
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
  StatusBar,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import {
  MapPin,
  Navigation,
  Zap,
  Maximize2,
  X,
  Plus,
  Minus,
  RotateCcw,
} from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';
import { BookingPartner } from '../../../../../../packages/types/src';
import { GeoPoint } from '../../../types/routing.types';
import { ServenticaEnvironment } from '../../../../../../packages/config/src';
import { ServenticaBrandLogo } from './ServenticaBrandLogo';
import { ServsFoundBackdrop } from './ServsFoundBackdrop';
import { routingFactory } from '../../../services/routing/RoutingProviderFactory';
import { routeCache } from '../../../services/routing/RouteCache';
import { locationService } from '../../../services/location.service';

// Initialize Mapbox public token at file scope
const PUBLIC_MAPBOX_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  process.env.MAPBOX_ACCESS_TOKEN ||
  ServenticaEnvironment?.mapbox?.accessToken ||
  '';

MapboxGL.setAccessToken(PUBLIC_MAPBOX_TOKEN);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = 185;

export interface LiveTrackingMapProps {
  partner?: BookingPartner | null;
  status: string;
  userAddressTitle?: string;
  userAddressLine?: string;
  etaText?: string;
  distanceText?: string;
  customerLat?: number | null;
  customerLon?: number | null;
  partnerLat?: number | null;
  partnerLon?: number | null;
  heading?: number;
  isLiveGps?: boolean;
  isBackdropOnly?: boolean;
  height?: number;
  connectionState?: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';
  isStale?: boolean;
  panY?: Animated.Value;
  onMapReady?: () => void;
}

// Coordinate validator ensuring valid bounds [-90, 90] and [-180, 180]
const isValidCoord = (lat?: number | null, lon?: number | null): boolean => {
  if (lat == null || lon == null) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
};

const LiveTrackingMapComponent: React.FC<LiveTrackingMapProps> = ({
  partner,
  status,
  userAddressTitle = 'Service Location',
  userAddressLine = 'Delivery Location',
  etaText: initialEtaText = 'Arriving in ~12 mins',
  distanceText: initialDistanceText = '1.2 km away',
  customerLat,
  customerLon,
  partnerLat,
  partnerLon,
  heading = 0,
  isLiveGps = false,
  isBackdropOnly = false,
  height,
  connectionState = 'CONNECTED',
  isStale = false,
  panY,
  onMapReady,
}) => {
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const modalCameraRef = useRef<MapboxGL.Camera>(null);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [modalMapLoaded, setModalMapLoaded] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isFollowingPartner, setIsFollowingPartner] = useState<boolean>(true);

  // Development-only mount instrumentation
  const mountCountRef = useRef<number>(0);
  useEffect(() => {
    mountCountRef.current += 1;
    if (__DEV__) {
      console.log(`[NativeMapbox] LiveTrackingMap mounted (count: ${mountCountRef.current})`);
    }
    return () => {
      if (__DEV__) {
        console.log(`[NativeMapbox] LiveTrackingMap unmounted`);
      }
    };
  }, []);

  const isEnRoute = status === 'PARTNER_EN_ROUTE';
  const isArrived = status === 'PARTNER_ARRIVED';
  const isStarted = status === 'SERVICE_STARTED';
  const isCompleted = status === 'SERVICE_COMPLETED' || status === 'CLOSED';

  // Customer destination coordinate validation
  const hasValidCustomerDest = isValidCoord(customerLat, customerLon);
  const validCustomerLat = hasValidCustomerDest ? (customerLat as number) : null;
  const validCustomerLon = hasValidCustomerDest ? (customerLon as number) : null;

  // Partner live GPS coordinate validation - NEVER use fake/fallback coordinates
  const hasValidPartnerGps = isValidCoord(partnerLat, partnerLon);
  const safeTargetLat = hasValidPartnerGps ? (partnerLat as number) : null;
  const safeTargetLon = hasValidPartnerGps ? (partnerLon as number) : null;

  // Presentation-level smoothed coordinates (never jumps/teleports)
  const [pLat, setPLat] = useState<number | null>(safeTargetLat);
  const [pLon, setPLon] = useState<number | null>(safeTargetLon);
  const animFrameRef = useRef<any>(null);
  const currentPosRef = useRef<{ lat: number | null; lon: number | null }>({
    lat: safeTargetLat,
    lon: safeTargetLon,
  });

  // Smooth visual coordinate interpolation (A -> intermediate positions -> B)
  useEffect(() => {
    if (safeTargetLat == null || safeTargetLon == null) {
      currentPosRef.current = { lat: null, lon: null };
      setPLat(null);
      setPLon(null);
      return;
    }

    const prevLat = currentPosRef.current.lat;
    const prevLon = currentPosRef.current.lon;

    if (prevLat == null || prevLon == null) {
      // First authoritative real GPS fix arrives: snap immediately
      if (__DEV__) {
        console.log(
          `[LiveTrackingMap] FIRST AUTHORITATIVE FIX: lat=${safeTargetLat}, lon=${safeTargetLon}`
        );
      }
      currentPosRef.current = { lat: safeTargetLat, lon: safeTargetLon };
      setPLat(safeTargetLat);
      setPLon(safeTargetLon);
      return;
    }

    const startLat = prevLat;
    const startLon = prevLon;
    const deltaLat = safeTargetLat - startLat;
    const deltaLon = safeTargetLon - startLon;

    if (__DEV__) {
      console.log(
        `[LiveTrackingMap] GPS INTERPOLATION START: from=(${startLat.toFixed(5)}, ${startLon.toFixed(5)}) -> to=(${safeTargetLat.toFixed(5)}, ${safeTargetLon.toFixed(5)}) | delta=(${deltaLat.toFixed(6)}, ${deltaLon.toFixed(6)})`
      );
    }

    // If change is tiny (< 1 meter), snap directly
    if (Math.abs(deltaLat) < 0.00001 && Math.abs(deltaLon) < 0.00001) {
      currentPosRef.current = { lat: safeTargetLat, lon: safeTargetLon };
      setPLat(safeTargetLat);
      setPLon(safeTargetLon);
      return;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    const durationMs = 1200;
    const startTime = Date.now();

    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const ease = 1 - Math.pow(1 - progress, 3);

      const nextLat = startLat + deltaLat * ease;
      const nextLon = startLon + deltaLon * ease;

      currentPosRef.current = { lat: nextLat, lon: nextLon };
      setPLat(nextLat);
      setPLon(nextLon);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        if (__DEV__) {
          console.log(
            `[LiveTrackingMap] GPS INTERPOLATION END: arrived at (${nextLat.toFixed(5)}, ${nextLon.toFixed(5)})`
          );
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [safeTargetLat, safeTargetLon]);

  const [routeCoordinates, setRouteCoordinates] = useState<GeoPoint[]>([]);
  const [liveEtaText, setLiveEtaText] = useState(initialEtaText);
  const [liveDistanceText, setLiveDistanceText] = useState(initialDistanceText);
  const [isRouteLoading, setIsRouteLoading] = useState(false);

  const lastRoutedOriginRef = useRef<GeoPoint | null>(null);
  const lastRouteFetchTimeRef = useRef<number>(0);
  const initialFittedRef = useRef<boolean>(false);

  // Fetch true turn-by-turn road route via RoutingProviderFactory (Mapbox primary)
  // ONLY if both partner GPS and customer destination are valid
  useEffect(() => {
    let isMounted = true;
    if (safeTargetLat == null || safeTargetLon == null || validCustomerLat == null || validCustomerLon == null) {
      setRouteCoordinates([]);
      return;
    }

    const fetchRoute = async () => {
      const currentOrigin: GeoPoint = { latitude: safeTargetLat, longitude: safeTargetLon };
      const destPoint: GeoPoint = { latitude: validCustomerLat, longitude: validCustomerLon };
      const now = Date.now();

      // Debounce & Displacement check:
      // Recalculate only if:
      // 1. First fetch
      // 2. Partner moved > 150m from last routed position
      // 3. Or route is older than 60 seconds
      if (lastRoutedOriginRef.current) {
        const distMoved = locationService.calculateDistance(
          lastRoutedOriginRef.current.latitude,
          lastRoutedOriginRef.current.longitude,
          currentOrigin.latitude,
          currentOrigin.longitude
        );
        const timeSinceLast = now - lastRouteFetchTimeRef.current;
        if (distMoved && distMoved.km < 0.15 && timeSinceLast < 60000) {
          return;
        }
      }

      setIsRouteLoading(true);
      try {
        // 1. Check in-memory route cache first
        let result = await routeCache.get(currentOrigin, destPoint, 'DRIVING');

        if (!result) {
          // 2. Calculate via provider factory (Mapbox primary)
          const provider = routingFactory.getProvider();
          result = await provider.calculateRoute({
            origin: currentOrigin,
            destination: destPoint,
            profile: 'DRIVING',
          });

          // Cache result with 10 min TTL
          if (result) {
            await routeCache.set(currentOrigin, destPoint, 'DRIVING', result, 600);
          }
        }

        if (isMounted && result) {
          lastRoutedOriginRef.current = currentOrigin;
          lastRouteFetchTimeRef.current = now;

          if (result.coordinates && result.coordinates.length > 0) {
            setRouteCoordinates(result.coordinates);
          } else {
            setRouteCoordinates([currentOrigin, destPoint]);
          }

          if (result.durationSeconds) {
            const mins = Math.max(5, Math.round(result.durationSeconds / 60));
            setLiveEtaText(`Arriving in ~${mins} mins`);
          }
          if (result.distanceMeters) {
            const km = (result.distanceMeters / 1000).toFixed(1);
            setLiveDistanceText(`${km} km away`);
          }
        }
      } catch (err) {
        console.warn('[NativeMapbox] Route calculation notice:', err);
      } finally {
        if (isMounted) setIsRouteLoading(false);
      }
    };

    fetchRoute();
    return () => {
      isMounted = false;
    };
  }, [safeTargetLat, safeTargetLon, validCustomerLat, validCustomerLon, status]);

  // Initial and displacement-triggered bounds fitting
  const fitTrackingBounds = useCallback((cam: MapboxGL.Camera | null, animated: boolean = true) => {
    if (!cam) return;
    const padding = isBackdropOnly
      ? { paddingLeft: 40, paddingRight: 40, paddingTop: 100, paddingBottom: 320 }
      : { paddingLeft: 30, paddingRight: 30, paddingTop: 30, paddingBottom: 30 };

    if (pLat != null && pLon != null && validCustomerLat != null && validCustomerLon != null) {
      const minLat = Math.min(pLat, validCustomerLat);
      const maxLat = Math.max(pLat, validCustomerLat);
      const minLon = Math.min(pLon, validCustomerLon);
      const maxLon = Math.max(pLon, validCustomerLon);

      cam.setCamera({
        bounds: {
          ne: [maxLon, maxLat],
          sw: [minLon, minLat],
          ...padding,
        },
        animationDuration: animated ? 1000 : 0,
        animationMode: 'easeTo',
      });
    } else if (validCustomerLat != null && validCustomerLon != null) {
      cam.setCamera({
        centerCoordinate: [validCustomerLon, validCustomerLat],
        zoomLevel: 14.5,
        animationDuration: animated ? 1000 : 0,
        animationMode: 'easeTo',
      });
    } else if (pLat != null && pLon != null) {
      cam.setCamera({
        centerCoordinate: [pLon, pLat],
        zoomLevel: 14.5,
        animationDuration: animated ? 1000 : 0,
        animationMode: 'easeTo',
      });
    }
  }, [pLat, pLon, validCustomerLat, validCustomerLon, isBackdropOnly]);

  // Fit bounds once map loads or upon first valid route coordinates
  useEffect(() => {
    if (mapLoaded && !initialFittedRef.current) {
      if ((pLat != null && pLon != null) || (validCustomerLat != null && validCustomerLon != null)) {
        initialFittedRef.current = true;
        fitTrackingBounds(cameraRef.current, false);
      }
    }
  }, [mapLoaded, pLat, pLon, validCustomerLat, validCustomerLon, fitTrackingBounds]);

  // Follow partner camera updates (throttled, only if follow mode is active)
  useEffect(() => {
    if (!isFollowingPartner || !mapLoaded || pLat == null || pLon == null) return;
    cameraRef.current?.setCamera({
      centerCoordinate: [pLon, pLat],
      animationDuration: 1000,
      animationMode: 'easeTo',
    });
  }, [pLat, pLon, isFollowingPartner, mapLoaded]);

  // Memoized GeoJSON LineString for ShapeSource
  const routeGeoJSON = useMemo<GeoJSON.FeatureCollection<GeoJSON.LineString>>(() => {
    const coords: [number, number][] = routeCoordinates
      .filter((pt) => isValidCoord(pt.latitude, pt.longitude))
      .map((pt) => [pt.longitude, pt.latitude]);

    if (coords.length < 2 && pLat != null && pLon != null && validCustomerLat != null && validCustomerLon != null) {
      coords.push([pLon, pLat]);
      coords.push([validCustomerLon, validCustomerLat]);
    }

    return {
      type: 'FeatureCollection',
      features: coords.length >= 2 ? [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coords,
          },
        },
      ] : [],
    };
  }, [routeCoordinates, pLat, pLon, validCustomerLat, validCustomerLon]);

  const partnerName = partner?.name || (isEnRoute ? 'Assigned Servs Partner' : 'Kolhupani Hub');
  const partnerAvatar = partner?.avatarUrl;

  const handleRecenter = () => {
    setIsFollowingPartner(true);
    fitTrackingBounds(cameraRef.current, true);
  };

  // Dedicated Render for Fullscreen Backdrop Mode (BookingDetailScreen)
  if (isBackdropOnly) {
    const topInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44;
    return (
      <View style={{ width: '100%', height: height || '100%', position: 'relative' }}>
        <MapboxGL.MapView
          style={StyleSheet.absoluteFill}
          styleURL={MapboxGL.StyleURL.Street}
          logoEnabled={false}
          attributionEnabled={false}
          compassEnabled={false}
          scaleBarEnabled={false}
          onDidFinishLoadingMap={() => {
            setMapLoaded(true);
            if (onMapReady) {
              onMapReady();
            }
          }}
          onTouchStart={() => {
            // User manually touches/pans -> disable automatic snapback
            if (isFollowingPartner) setIsFollowingPartner(false);
          }}
        >
          <MapboxGL.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate:
                pLon != null && pLat != null && validCustomerLon != null && validCustomerLat != null
                  ? [(pLon + validCustomerLon) / 2, (pLat + validCustomerLat) / 2]
                  : validCustomerLon != null && validCustomerLat != null
                  ? [validCustomerLon, validCustomerLat]
                  : pLon != null && pLat != null
                  ? [pLon, pLat]
                  : [77.9629, 30.3342],
              zoomLevel: 14,
            }}
          />

          {/* Road Route Polyline Layer */}
          {routeGeoJSON.features.length > 0 && (
            <MapboxGL.ShapeSource id="backdropRouteSource" shape={routeGeoJSON}>
              <MapboxGL.LineLayer
                id="backdropRouteLineCasing"
                style={{
                  lineColor: '#1E40AF',
                  lineWidth: 7,
                  lineCap: 'round',
                  lineJoin: 'round',
                  lineOpacity: 0.6,
                }}
              />
              <MapboxGL.LineLayer
                id="backdropRouteLine"
                style={{
                  lineColor: '#2563EB',
                  lineWidth: 5,
                  lineCap: 'round',
                  lineJoin: 'round',
                  lineOpacity: 0.95,
                }}
              />
            </MapboxGL.ShapeSource>
          )}

          {/* Destination Marker - only renders when customer booking coordinates are valid */}
          {validCustomerLat != null && validCustomerLon != null && (
            <MapboxGL.PointAnnotation
              id="destinationAnnotationBackdrop"
              coordinate={[validCustomerLon, validCustomerLat]}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.customerMarkerBox}>
                <MapPin size={15} color="#FFFFFF" strokeWidth={2.4} />
              </View>
            </MapboxGL.PointAnnotation>
          )}

          {/* Partner Marker with Heading Rotation - ONLY rendered when actual partner GPS is present */}
          {pLat != null && pLon != null && (
            <MapboxGL.PointAnnotation
              id="partnerAnnotationBackdrop"
              coordinate={[pLon, pLat]}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View
                style={[
                  styles.partnerIconCircle,
                  { transform: [{ rotate: `${Math.round(heading || 0)}deg` }] },
                ]}
              >
                <Navigation size={15} color="#FFFFFF" strokeWidth={2.4} fill="#FFFFFF" />
              </View>
            </MapboxGL.PointAnnotation>
          )}
        </MapboxGL.MapView>

        {/* Top Logo Inset */}
        <View
          style={{
            position: 'absolute',
            top: topInset + 6,
            left: 0,
            right: 0,
            alignItems: 'center',
            zIndex: 12,
          }}
          pointerEvents="none"
        >
          <ServenticaBrandLogo size="md" color="#FFFFFF" />
        </View>



        {/* Floating Customer Address Badge */}
        <View style={styles.customerFloatingBadge}>
          <View style={styles.customerPinCircle}>
            <MapPin size={12} color="#FFFFFF" strokeWidth={2.4} />
          </View>
          <Text style={styles.customerBadgeText} numberOfLines={1}>
            {validCustomerLat == null || validCustomerLon == null
              ? 'Destination Unavailable'
              : userAddressTitle}
          </Text>
        </View>

        {/* Recenter button when user manually panned away */}
        {!isFollowingPartner && (
          <TouchableOpacity
            style={[styles.floatingRecenterBtn, { top: topInset + 54 }]}
            onPress={handleRecenter}
            activeOpacity={0.8}
            accessibilityLabel="Re-center map on partner and destination"
          >
            <RotateCcw size={16} color="#2563EB" strokeWidth={2.2} />
          </TouchableOpacity>
        )}

        {!mapLoaded && (
          <View style={StyleSheet.absoluteFill}>
            <ServsFoundBackdrop
              height={height || SCREEN_HEIGHT}
              partner={partner}
              panY={panY}
            />
          </View>
        )}
      </View>
    );
  }

  // Card View Mode (Partner Simulator & In-Card usage)
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

      {/* MAPBOX NATIVE VECTOR CANVAS */}
      <View style={styles.mapCanvas}>
        <MapboxGL.MapView
          style={StyleSheet.absoluteFill}
          styleURL={MapboxGL.StyleURL.Street}
          logoEnabled={false}
          attributionEnabled={false}
          compassEnabled={false}
          scaleBarEnabled={false}
          onDidFinishLoadingMap={() => setMapLoaded(true)}
          onTouchStart={() => {
            if (isFollowingPartner) setIsFollowingPartner(false);
          }}
        >
          <MapboxGL.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate:
                pLon != null && pLat != null && validCustomerLon != null && validCustomerLat != null
                  ? [(pLon + validCustomerLon) / 2, (pLat + validCustomerLat) / 2]
                  : validCustomerLon != null && validCustomerLat != null
                  ? [validCustomerLon, validCustomerLat]
                  : pLon != null && pLat != null
                  ? [pLon, pLat]
                  : [77.9629, 30.3342],
              zoomLevel: 13.5,
            }}
          />

          {/* Route Shape and LineLayer */}
          {routeGeoJSON.features.length > 0 && (
            <MapboxGL.ShapeSource id="cardRouteSource" shape={routeGeoJSON}>
              <MapboxGL.LineLayer
                id="cardRouteLineCasing"
                style={{
                  lineColor: '#1E40AF',
                  lineWidth: 7,
                  lineCap: 'round',
                  lineJoin: 'round',
                  lineOpacity: 0.6,
                }}
              />
              <MapboxGL.LineLayer
                id="cardRouteLine"
                style={{
                  lineColor: '#2563EB',
                  lineWidth: 5,
                  lineCap: 'round',
                  lineJoin: 'round',
                  lineOpacity: 0.95,
                }}
              />
            </MapboxGL.ShapeSource>
          )}

          {/* Destination Pin - only if customer coordinates are valid */}
          {validCustomerLat != null && validCustomerLon != null && (
            <MapboxGL.PointAnnotation
              id="cardDestinationPin"
              coordinate={[validCustomerLon, validCustomerLat]}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.customerMarkerBox}>
                <MapPin size={15} color="#FFFFFF" strokeWidth={2.4} />
              </View>
            </MapboxGL.PointAnnotation>
          )}

          {/* Partner Pin - ONLY if partner GPS coordinates are valid */}
          {pLat != null && pLon != null && (
            <MapboxGL.PointAnnotation
              id="cardPartnerPin"
              coordinate={[pLon, pLat]}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View
                style={[
                  styles.partnerIconCircle,
                  { transform: [{ rotate: `${Math.round(heading || 0)}deg` }] },
                ]}
              >
                <Navigation size={15} color="#FFFFFF" strokeWidth={2.4} fill="#FFFFFF" />
              </View>
            </MapboxGL.PointAnnotation>
          )}
        </MapboxGL.MapView>

        {/* Tap to expand overlay */}
        <TouchableOpacity
          style={styles.tapToExpandBadge}
          onPress={() => setIsExpanded(true)}
          activeOpacity={0.85}
        >
          <Maximize2 size={11} color="#2563EB" strokeWidth={2.2} />
          <Text style={styles.tapToExpandText}>Tap to Expand</Text>
        </TouchableOpacity>

        {/* Re-center floating button if panned */}
        {!isFollowingPartner && (
          <TouchableOpacity
            style={styles.cardRecenterBtn}
            onPress={handleRecenter}
            activeOpacity={0.85}
          >
            <RotateCcw size={14} color="#2563EB" strokeWidth={2.2} />
          </TouchableOpacity>
        )}

        {isRouteLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#2563EB" />
          </View>
        )}
      </View>

      {/* FOOTER BAR WITH ACCURATE DISTANCE & MAP STATUS */}
      <View style={styles.footerRow}>
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>
            {validCustomerLat == null || validCustomerLon == null
              ? 'Destination unavailable'
              : pLat == null || pLon == null
              ? 'Locating partner...'
              : `Distance: ${liveDistanceText}`}
          </Text>
        </View>
        <View style={styles.liveTagRow}>
          <View
            style={[
              styles.greenPulseDot,
              connectionState === 'RECONNECTING'
                ? { backgroundColor: '#F59E0B' }
                : isStale
                ? { backgroundColor: '#94A3B8' }
                : pLat == null || pLon == null
                ? { backgroundColor: '#94A3B8' }
                : !isLiveGps
                ? { backgroundColor: '#3B82F6' }
                : { backgroundColor: '#16A34A' },
            ]}
          />
          <Text
            style={[
              styles.liveTagText,
              connectionState === 'RECONNECTING'
                ? { color: '#D97706' }
                : isStale
                ? { color: '#64748B' }
                : pLat == null || pLon == null
                ? { color: '#64748B' }
                : !isLiveGps
                ? { color: '#2563EB' }
                : { color: '#15803D' },
            ]}
          >
            {connectionState === 'RECONNECTING'
              ? 'Reconnecting...'
              : isStale
              ? 'GPS Signal Stale'
              : pLat == null || pLon == null
              ? 'Waiting for Partner GPS'
              : isLiveGps
              ? 'Live GPS Track'
              : 'Live Mapbox Road Route'}
          </Text>
        </View>
      </View>

      {/* EXPANDED FULLSCREEN MAPBOX MODAL */}
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
              <Text style={styles.modalTitle}>Live Mapbox Tracking</Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                {partnerName} • {liveEtaText} ({liveDistanceText})
              </Text>
            </View>

            <View style={styles.modalStatusBadge}>
              <View style={styles.greenPulseDot} />
              <Text style={styles.modalStatusText}>LIVE</Text>
            </View>
          </View>

          {/* Fullscreen Interactive Native Mapbox Canvas */}
          <View style={styles.modalMapCanvas}>
            <MapboxGL.MapView
              style={StyleSheet.absoluteFill}
              styleURL={MapboxGL.StyleURL.Street}
              logoEnabled={true}
              attributionEnabled={true}
              compassEnabled={true}
              scaleBarEnabled={true}
              onDidFinishLoadingMap={() => {
                setModalMapLoaded(true);
                fitTrackingBounds(modalCameraRef.current, false);
              }}
            >
              <MapboxGL.Camera
                ref={modalCameraRef}
                defaultSettings={{
                  centerCoordinate:
                    pLon != null && pLat != null && validCustomerLon != null && validCustomerLat != null
                      ? [(pLon + validCustomerLon) / 2, (pLat + validCustomerLat) / 2]
                      : validCustomerLon != null && validCustomerLat != null
                      ? [validCustomerLon, validCustomerLat]
                      : pLon != null && pLat != null
                      ? [pLon, pLat]
                      : [77.9629, 30.3342],
                  zoomLevel: 14,
                }}
              />

              {/* Fullscreen Route Layer */}
              {routeGeoJSON.features.length > 0 && (
                <MapboxGL.ShapeSource id="modalRouteSource" shape={routeGeoJSON}>
                  <MapboxGL.LineLayer
                    id="modalRouteLineCasing"
                    style={{
                      lineColor: '#1E40AF',
                      lineWidth: 8,
                      lineCap: 'round',
                      lineJoin: 'round',
                      lineOpacity: 0.6,
                    }}
                  />
                  <MapboxGL.LineLayer
                    id="modalRouteLine"
                    style={{
                      lineColor: '#2563EB',
                      lineWidth: 6,
                      lineCap: 'round',
                      lineJoin: 'round',
                      lineOpacity: 0.95,
                    }}
                  />
                </MapboxGL.ShapeSource>
              )}

              {/* Destination Pin - only if customer coordinates are valid */}
              {validCustomerLat != null && validCustomerLon != null && (
                <MapboxGL.PointAnnotation
                  id="modalDestPin"
                  coordinate={[validCustomerLon, validCustomerLat]}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={styles.customerMarkerBox}>
                    <MapPin size={16} color="#FFFFFF" strokeWidth={2.4} />
                  </View>
                </MapboxGL.PointAnnotation>
              )}

              {/* Partner Pin - ONLY if partner GPS coordinates are valid */}
              {pLat != null && pLon != null && (
                <MapboxGL.PointAnnotation
                  id="modalPartnerPin"
                  coordinate={[pLon, pLat]}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View
                    style={[
                      styles.partnerIconCircle,
                      { transform: [{ rotate: `${Math.round(heading || 0)}deg` }] },
                    ]}
                  >
                    <Navigation size={16} color="#FFFFFF" strokeWidth={2.4} fill="#FFFFFF" />
                  </View>
                </MapboxGL.PointAnnotation>
              )}
            </MapboxGL.MapView>

            {/* Modal Controls: Recenter, Zoom In, Zoom Out */}
            <View style={styles.modalNavControls}>
              <TouchableOpacity
                style={styles.modalControlBtn}
                onPress={() => modalCameraRef.current?.zoomTo(16, 400)}
                activeOpacity={0.8}
              >
                <Plus size={18} color="#0F172A" strokeWidth={2.4} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalControlBtn}
                onPress={() => modalCameraRef.current?.zoomTo(12, 400)}
                activeOpacity={0.8}
              >
                <Minus size={18} color="#0F172A" strokeWidth={2.4} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalControlBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                onPress={() => fitTrackingBounds(modalCameraRef.current, true)}
                activeOpacity={0.8}
              >
                <RotateCcw size={16} color="#2563EB" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
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
  partnerFloatingBadge: {
    position: 'absolute',
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
    maxWidth: '55%',
    zIndex: 10,
  },
  partnerPulseCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  partnerBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.SemiBold,
    color: '#FFFFFF',
  },
  customerFloatingBadge: {
    position: 'absolute',
    bottom: 24,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
    maxWidth: '50%',
    zIndex: 10,
  },
  customerPinCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  customerBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.SemiBold,
    color: '#0F172A',
  },
  floatingRecenterBtn: {
    position: 'absolute',
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 15,
  },
  cardRecenterBtn: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 12,
  },
  loader: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  loaderText: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: Fonts.Medium,
    color: '#64748B',
  },
  modalNavControls: {
    position: 'absolute',
    right: 14,
    top: 18,
    flexDirection: 'column',
    gap: 8,
    zIndex: 20,
  },
  modalControlBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
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

const arePropsEqual = (prev: LiveTrackingMapProps, next: LiveTrackingMapProps) => {
  return (
    prev.partnerLat === next.partnerLat &&
    prev.partnerLon === next.partnerLon &&
    prev.customerLat === next.customerLat &&
    prev.customerLon === next.customerLon &&
    prev.heading === next.heading &&
    prev.status === next.status &&
    prev.connectionState === next.connectionState &&
    prev.isStale === next.isStale &&
    prev.isBackdropOnly === next.isBackdropOnly &&
    prev.height === next.height &&
    prev.etaText === next.etaText &&
    prev.distanceText === next.distanceText &&
    prev.userAddressTitle === next.userAddressTitle &&
    prev.userAddressLine === next.userAddressLine &&
    prev.isLiveGps === next.isLiveGps &&
    prev.partner?.id === next.partner?.id &&
    prev.partner?.name === next.partner?.name &&
    prev.panY === next.panY
  );
};

export const LiveTrackingMap = React.memo(LiveTrackingMapComponent, arePropsEqual);
export default LiveTrackingMap;
