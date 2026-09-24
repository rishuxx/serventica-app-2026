import React, { useState, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  PanResponder,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import {
  MapPin,
  Navigation,
  Plus,
  Minus,
  RotateCcw,
  Compass,
} from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';
import { GeoPoint } from '../../../types/routing.types';
import { ServenticaEnvironment } from '../../../../../../packages/config/src';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = 195;

const GOOGLE_MAPS_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  ServenticaEnvironment?.googleMaps?.apiKey ||
  'AIzaSyAasVoqGTlhp66ydhb7sLMBLHRr36awF6g';

const MAPBOX_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  process.env.MAPBOX_ACCESS_TOKEN ||
  ServenticaEnvironment?.mapbox?.accessToken ||
  '';

export interface InteractiveGoogleMapProps {
  partnerLat: number;
  partnerLon: number;
  customerLat: number;
  customerLon: number;
  heading?: number;
  partnerName?: string;
  userAddressTitle?: string;
  routeCoordinates?: GeoPoint[];
  encodedPolyline?: string;
  isInteractive?: boolean;
  onMapLoaded?: () => void;
}

export const InteractiveGoogleMap: React.FC<InteractiveGoogleMapProps> = ({
  partnerLat,
  partnerLon,
  customerLat,
  customerLon,
  heading = 0,
  partnerName = 'Servs Partner',
  userAddressTitle = 'Your Location',
  routeCoordinates = [],
  encodedPolyline,
  isInteractive = false,
}) => {
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  // Explicit Follow Mode (Phase 5)
  const [isFollowingPartner, setIsFollowingPartner] = useState<boolean>(true);
  const [zoomOffset, setZoomOffset] = useState<number>(0);

  // Stable Anchor Coordinates (Prevents tile reload on subtle drag/GPS updates)
  const lastBasePartnerRef = useRef<{ lat: number; lon: number }>({
    lat: partnerLat,
    lon: partnerLon,
  });

  // Calculate distance moved from last base tile anchor
  const distFromBase = Math.hypot(
    partnerLat - lastBasePartnerRef.current.lat,
    partnerLon - lastBasePartnerRef.current.lon
  );

  // Only update tile base if displaced significantly (~250m) and in follow mode
  if (isFollowingPartner && distFromBase > 0.0025) {
    lastBasePartnerRef.current = { lat: partnerLat, lon: partnerLon };
  }

  const basePartner = lastBasePartnerRef.current;
  const initialCenterLat = (basePartner.lat + customerLat) / 2;
  const initialCenterLon = (basePartner.lon + customerLon) / 2;

  const cardWidth = isInteractive ? Math.min(640, Math.round(SCREEN_WIDTH)) : Math.min(640, Math.round(SCREEN_WIDTH - 32));
  const cardHeight = isInteractive ? Math.min(640, Math.round(SCREEN_HEIGHT * 0.65)) : Math.min(640, MAP_HEIGHT);

  // Gesture scaling and translation (Native 60fps transform layer)
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;
  const lastDistance = useRef<number | null>(null);

  // Pan responder for direct 60fps drag & pinch gestures without resetting camera or reloading tiles
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isInteractive,
      onMoveShouldSetPanResponder: () => isInteractive,
      onPanResponderGrant: () => {
        // User touched/dragged -> explicitly disable follow mode (Phase 5)
        setIsFollowingPartner(false);
        pan.setOffset({
          x: (pan.x as any)._value || 0,
          y: (pan.y as any)._value || 0,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (evt, gestureState) => {
        // Multi-touch pinch detection
        if (evt.nativeEvent.touches.length === 2) {
          const touch1 = evt.nativeEvent.touches[0];
          const touch2 = evt.nativeEvent.touches[1];
          const dist = Math.hypot(
            touch1.pageX - touch2.pageX,
            touch1.pageY - touch2.pageY
          );
          if (lastDistance.current !== null) {
            const diff = dist - lastDistance.current;
            if (Math.abs(diff) > 2) {
              const newScale = Math.max(0.65, Math.min(3.0, ((scale as any)._value || 1) + diff * 0.008));
              scale.setValue(newScale);
            }
          }
          lastDistance.current = dist;
        } else {
          // Single finger pan - 60fps GPU animated translation
          pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        }
      },
      onPanResponderRelease: () => {
        lastDistance.current = null;
        pan.flattenOffset();
        // NEVER call setPanCenter or trigger map reload on drag!
        // Transform offset stays intact smoothly on the canvas.
      },
    })
  ).current;

  // Zoom in / out handlers using smooth animation
  const handleZoomIn = () => {
    setIsFollowingPartner(false);
    Animated.spring(scale, {
      toValue: Math.min(3.0, ((scale as any)._value || 1) * 1.25),
      useNativeDriver: true,
    }).start();
  };

  const handleZoomOut = () => {
    setIsFollowingPartner(false);
    Animated.spring(scale, {
      toValue: Math.max(0.65, ((scale as any)._value || 1) * 0.8),
      useNativeDriver: true,
    }).start();
  };

  // Re-center on partner button (Phase 5)
  const handleResetRecenter = () => {
    setIsFollowingPartner(true);
    Animated.parallel([
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Stable Mapbox Street engine URL: Only depends on stable base coordinates and route
  const mapUrl = useMemo(() => {
    const partnerPin = `pin-s-car+2563eb(${basePartner.lon},${basePartner.lat})`;
    const customerPin = `pin-s-home+059669(${customerLon},${customerLat})`;

    let pathOverlay = '';
    if (encodedPolyline) {
      pathOverlay = `path-5+2563eb-0.95(${encodeURIComponent(encodedPolyline)}),`;
    }

    // Default auto-framing with generous padding
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pathOverlay}${partnerPin},${customerPin}/auto/${cardWidth}x${cardHeight}@2x?padding=50,50,50,50&access_token=${MAPBOX_TOKEN}`;
  }, [basePartner.lat, basePartner.lon, customerLat, customerLon, encodedPolyline, cardWidth, cardHeight]);

  return (
    <View style={styles.container} {...(isInteractive ? panResponder.panHandlers : {})}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          isInteractive && {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: scale },
            ],
          },
        ]}
      >
        <Image
          source={{ uri: mapUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          fadeDuration={0}
          onLoad={() => {
            setImageLoaded(true);
          }}
          onError={() => {
            if (!hasError) {
              setHasError(true);
            }
          }}
        />
      </Animated.View>

      {!imageLoaded && (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loaderText}>Loading live map route...</Text>
        </View>
      )}

      {/* Partner Live Beacon Pill with Dynamic Heading */}
      <View style={styles.partnerFloatingBadge}>
        <View
          style={[
            styles.partnerPulseCircle,
            {
              transform: [{ rotate: `${Math.round(heading || 0)}deg` }],
            },
          ]}
        >
          <Navigation size={11} color="#FFFFFF" strokeWidth={2.4} fill="#FFFFFF" />
        </View>
        <Text style={styles.partnerBadgeText} numberOfLines={1}>
          {partnerName}
        </Text>
      </View>

      {/* Customer Location Pill */}
      <View style={styles.customerFloatingBadge}>
        <View style={styles.customerPinCircle}>
          <MapPin size={12} color="#FFFFFF" strokeWidth={2.4} />
        </View>
        <Text style={styles.customerBadgeText} numberOfLines={1}>
          {userAddressTitle}
        </Text>
      </View>

      {/* Interactive Navigation Control Tools (Zoom In, Zoom Out, Re-center) */}
      {isInteractive && (
        <View
          style={[
            styles.navControlsCol,
            { top: (Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 44) + 18 },
          ]}
        >
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={handleZoomIn}
            activeOpacity={0.8}
            accessibilityLabel="Zoom in"
          >
            <Plus size={18} color="#0F172A" strokeWidth={2.4} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={handleZoomOut}
            activeOpacity={0.8}
            accessibilityLabel="Zoom out"
          >
            <Minus size={18} color="#0F172A" strokeWidth={2.4} />
          </TouchableOpacity>

          {!isFollowingPartner && (
            <TouchableOpacity
              style={[styles.controlBtn, styles.recenterBtn]}
              onPress={handleResetRecenter}
              activeOpacity={0.8}
              accessibilityLabel="Center on partner"
            >
              <RotateCcw size={16} color="#2563EB" strokeWidth={2.2} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
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
  partnerFloatingBadge: {
    position: 'absolute',
    top: 12,
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
    elevation: 3,
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
  customerFloatingBadge: {
    position: 'absolute',
    bottom: 12,
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
    elevation: 3,
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
  partnerBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.SemiBold,
    color: '#FFFFFF',
  },
  customerBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.SemiBold,
    color: '#0F172A',
  },
  navControlsCol: {
    position: 'absolute',
    right: 14,
    top: 60,
    flexDirection: 'column',
    gap: 8,
    zIndex: 20,
  },
  controlBtn: {
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
  recenterBtn: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
});
