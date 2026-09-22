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

  // Dynamic Navigation & Pan/Zoom State
  const [zoomOffset, setZoomOffset] = useState<number>(0); // manual zoom delta
  const [panCenter, setPanCenter] = useState<{ lat: number; lon: number } | null>(null);

  const initialCenterLat = (partnerLat + customerLat) / 2;
  const initialCenterLon = (partnerLon + customerLon) / 2;

  const currentCenterLat = panCenter ? panCenter.lat : initialCenterLat;
  const currentCenterLon = panCenter ? panCenter.lon : initialCenterLon;

  const cardWidth = isInteractive ? Math.min(640, Math.round(SCREEN_WIDTH)) : Math.min(640, Math.round(SCREEN_WIDTH - 32));
  const cardHeight = isInteractive ? Math.min(640, Math.round(SCREEN_HEIGHT * 0.65)) : Math.min(640, MAP_HEIGHT);

  // Gesture scaling and translation
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;
  const lastDistance = useRef<number | null>(null);

  // Pan responder for direct 60fps drag & pinch gestures in expanded view
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isInteractive,
      onMoveShouldSetPanResponder: () => isInteractive,
      onPanResponderGrant: () => {
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
              const newScale = Math.max(0.75, Math.min(2.5, ((scale as any)._value || 1) + diff * 0.008));
              scale.setValue(newScale);
            }
          }
          lastDistance.current = dist;
        } else {
          // Single finger pan
          pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        lastDistance.current = null;
        pan.flattenOffset();
        // Convert screen drag offset into lat/lon displacement
        if (Math.abs(gestureState.dx) > 15 || Math.abs(gestureState.dy) > 15) {
          const latDiff = (gestureState.dy / cardHeight) * 0.04;
          const lonDiff = -(gestureState.dx / cardWidth) * 0.04;
          setPanCenter({
            lat: currentCenterLat + latDiff,
            lon: currentCenterLon + lonDiff,
          });
          pan.setValue({ x: 0, y: 0 });
        }
      },
    })
  ).current;

  // Zoom in / out handlers
  const handleZoomIn = () => {
    setZoomOffset((prev) => Math.min(prev + 1, 4));
  };

  const handleZoomOut = () => {
    setZoomOffset((prev) => Math.max(prev - 1, -3));
  };

  const handleResetRecenter = () => {
    setPanCenter(null);
    setZoomOffset(0);
    pan.setValue({ x: 0, y: 0 });
    scale.setValue(1);
  };

  // High-definition Mapbox Street engine with live path and navigation
  const mapUrl = useMemo(() => {
    const partnerPin = `pin-s-car+2563eb(${partnerLon},${partnerLat})`;
    const customerPin = `pin-s-home+059669(${customerLon},${customerLat})`;

    let pathOverlay = '';
    if (encodedPolyline) {
      pathOverlay = `path-5+2563eb-0.95(${encodeURIComponent(encodedPolyline)}),`;
    }

    if (panCenter !== null || zoomOffset !== 0) {
      // Manual pan / zoom level
      const baseZoom = 13 + zoomOffset;
      return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pathOverlay}${partnerPin},${customerPin}/${currentCenterLon},${currentCenterLat},${baseZoom},0/${cardWidth}x${cardHeight}@2x?access_token=${MAPBOX_TOKEN}`;
    }

    // Default auto-framing
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pathOverlay}${partnerPin},${customerPin}/auto/${cardWidth}x${cardHeight}@2x?padding=45,45,45,45&access_token=${MAPBOX_TOKEN}`;
  }, [partnerLat, partnerLon, customerLat, customerLon, encodedPolyline, cardWidth, cardHeight, panCenter, zoomOffset, currentCenterLat, currentCenterLon]);

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

      {/* Dynamic Animated Partner Floating Pill Over Map */}
      <View style={styles.partnerFloatingBadge}>
        <View style={styles.partnerPulseCircle}>
          <Navigation
            size={12}
            color="#FFFFFF"
            strokeWidth={2.4}
            style={{ transform: [{ rotate: `${heading}deg` }] }}
          />
        </View>
        <Text style={styles.partnerBadgeText} numberOfLines={1}>
          {partnerName} (En Route)
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
        <View style={styles.navControlsCol}>
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

          {(panCenter !== null || zoomOffset !== 0) && (
            <TouchableOpacity
              style={[styles.controlBtn, styles.recenterBtn]}
              onPress={handleResetRecenter}
              activeOpacity={0.8}
              accessibilityLabel="Reset map view"
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
