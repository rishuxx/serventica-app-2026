import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
  Animated,
  Platform,
  Image,
  PanResponder,
} from 'react-native';
import {
  ArrowLeft,
  Search,
  X,
  MapPin,
  Plus,
  Minus,
  Home,
  Briefcase,
  ChevronRight,
  Check,
  Navigation,
} from 'lucide-react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { LocationItem } from '../../../types/location.types';
import { locationService } from '../../../services/location.service';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { ServenticaEnvironment } from '../../../../../../packages/config/src';

// Safe dynamic loader for react-native-maps to prevent binary link crashes in unlinked environments
let NativeMapView: any = null;
let PROVIDER_GOOGLE_REF: any = undefined;

try {
  const { TurboModuleRegistry, NativeModules } = require('react-native');
  const hasTurbo = TurboModuleRegistry?.get?.('RNMapsAirModule') != null;
  const hasLegacy = Boolean(NativeModules?.RNMapsAirModule || NativeModules?.AirMapModule);
  if (hasTurbo || hasLegacy) {
    const RNM = require('react-native-maps');
    if (RNM && (RNM.default || RNM.MapView)) {
      NativeMapView = RNM.default || RNM.MapView;
      PROVIDER_GOOGLE_REF = RNM.PROVIDER_GOOGLE;
    }
  }
} catch (e) {
  NativeMapView = null;
}

const GOOGLE_MAPS_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  ServenticaEnvironment?.googleMaps?.apiKey ||
  'AIzaSyAasVoqGTlhp66ydhb7sLMBLHRr36awF6g';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function metersPerPixel(latitude: number, zoom: number): number {
  return (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoom);
}

function offsetToCoords(
  centerLat: number,
  centerLon: number,
  dxPixels: number,
  dyPixels: number,
  zoom: number
): { lat: number; lon: number } {
  const mPerPx = metersPerPixel(centerLat, zoom);
  const dxMeters = -dxPixels * mPerPx;
  const dyMeters = dyPixels * mPerPx;

  const latDelta = dyMeters / 111132.954;
  const lonDelta = dxMeters / (111132.954 * Math.cos((centerLat * Math.PI) / 180));

  return {
    lat: centerLat + latDelta,
    lon: centerLon + lonDelta,
  };
}

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

interface MapLocationPickerModalProps {
  visible: boolean;
  initialLocation?: LocationItem | null;
  onClose: () => void;
  onConfirmLocation: (location: LocationItem) => void;
}

const ADDRESS_TAGS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'work', label: 'Work', icon: Briefcase },
  { id: 'other', label: 'Other', icon: MapPin },
];

export const MapLocationPickerModal: React.FC<MapLocationPickerModalProps> = ({
  visible,
  initialLocation,
  onClose,
  onConfirmLocation,
}) => {
  const defaultLat = initialLocation?.latitude ?? 30.3541;
  const defaultLon = initialLocation?.longitude ?? 77.9452;

  const mapRef = useRef<any>(null);
  const [nativeMapAvailable, setNativeMapAvailable] = useState<boolean>(Boolean(NativeMapView));

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number }>({
    lat: defaultLat,
    lon: defaultLon,
  });
  const [zoom, setZoom] = useState<number>(18);

  // User's live device GPS position
  const [userGps, setUserGps] = useState<{ lat: number; lon: number } | null>(null);

  // Address resolution state
  const [resolvedLocation, setResolvedLocation] = useState<LocationItem | null>(null);
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [selectedTag, setSelectedTag] = useState<string>('home');

  // Search state within Map
  const [mapSearchQuery, setMapSearchQuery] = useState<string>('');
  const [mapSearchResults, setMapSearchResults] = useState<LocationItem[]>([]);
  const [isMapSearching, setIsMapSearching] = useState<boolean>(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false);

  const debounceTimerRef = useRef<any>(null);
  const searchDebounceRef = useRef<any>(null);
  const pinBounceAnim = useRef(new Animated.Value(0)).current;
  const panOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const coordsRef = useRef({ lat: defaultLat, lon: defaultLon, zoom: 18 });
  useEffect(() => {
    coordsRef.current = { lat: currentCoords.lat, lon: currentCoords.lon, zoom };
  }, [currentCoords, zoom]);

  // Reverse Geocode handler
  const reverseGeocodeCoords = useCallback(async (lat: number, lon: number) => {
    setIsResolving(true);
    try {
      const loc = await locationService.reverseGeocode(lat, lon);
      if (loc) {
        setResolvedLocation(loc);
      } else {
        setResolvedLocation({
          latitude: lat,
          longitude: lon,
          shortAddress: 'Selected Location',
          formattedAddress: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
          city: 'Dehradun',
        });
      }
    } catch (e) {
      console.warn('Map reverse geocode error:', e);
    } finally {
      setIsResolving(false);
    }
  }, []);

  // Sync initial location & fetch live GPS when modal opens
  useEffect(() => {
    if (visible) {
      const lat = initialLocation?.latitude ?? 30.3541;
      const lon = initialLocation?.longitude ?? 77.9452;
      setCurrentCoords({ lat, lon });
      setZoom(18);
      panOffset.setValue({ x: 0, y: 0 });
      coordsRef.current = { lat, lon, zoom: 18 };
      reverseGeocodeCoords(lat, lon);

      locationService
        .getCurrentLocation()
        .then((gps) => {
          if (gps?.latitude && gps?.longitude) {
            setUserGps({ lat: gps.latitude, lon: gps.longitude });
          }
        })
        .catch(() => {});
    }
  }, [visible, initialLocation, reverseGeocodeCoords]);

  // Pan Responder for smooth drag navigation when using fallback map renderer
  const panStartCoords = useRef({ lat: defaultLat, lon: defaultLon });
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
        onPanResponderGrant: () => {
          setIsMoving(true);
          panStartCoords.current = {
            lat: coordsRef.current.lat,
            lon: coordsRef.current.lon,
          };
          Animated.spring(pinBounceAnim, {
            toValue: -18,
            useNativeDriver: true,
            speed: 40,
            bounciness: 0,
          }).start();
        },
        onPanResponderMove: (_, gestureState) => {
          panOffset.setValue({ x: gestureState.dx, y: gestureState.dy });
        },
        onPanResponderRelease: (_, gestureState) => {
          setIsMoving(false);
          Animated.spring(pinBounceAnim, {
            toValue: 0,
            friction: 6,
            tension: 60,
            useNativeDriver: true,
          }).start();

          const { zoom: currentZoom } = coordsRef.current;
          const { lat: newLat, lon: newLon } = offsetToCoords(
            panStartCoords.current.lat,
            panStartCoords.current.lon,
            gestureState.dx,
            gestureState.dy,
            currentZoom
          );

          panOffset.setValue({ x: 0, y: 0 });
          setCurrentCoords({ lat: newLat, lon: newLon });
          coordsRef.current = { lat: newLat, lon: newLon, zoom: currentZoom };

          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = setTimeout(() => {
            reverseGeocodeCoords(newLat, newLon);
          }, 200);
        },
      }),
    [pinBounceAnim, panOffset, reverseGeocodeCoords]
  );

  // Search Places handler
  const handleMapSearch = (text: string) => {
    setMapSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (text.trim().length < 2) {
      setMapSearchResults([]);
      setIsMapSearching(false);
      return;
    }

    setIsMapSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await locationService.searchPlaces(text.trim(), {
          lat: currentCoords.lat,
          lon: currentCoords.lon,
        });
        setMapSearchResults(results);
      } catch (err) {
        console.warn('Map search error:', err);
      } finally {
        setIsMapSearching(false);
      }
    }, 250);
  };

  const handleSelectSearchResult = (item: LocationItem) => {
    if (item.latitude != null && item.longitude != null) {
      panOffset.setValue({ x: 0, y: 0 });
      setCurrentCoords({ lat: item.latitude, lon: item.longitude });
      setZoom(18);
      coordsRef.current = { lat: item.latitude, lon: item.longitude, zoom: 18 };
      setResolvedLocation(item);
      setMapSearchQuery('');
      setMapSearchResults([]);
      setIsSearchExpanded(false);

      if (nativeMapAvailable && mapRef.current?.animateToRegion) {
        mapRef.current.animateToRegion({
          latitude: item.latitude,
          longitude: item.longitude,
          latitudeDelta: 0.0035,
          longitudeDelta: 0.0035,
        }, 500);
      }
    }
  };

  // Zoom buttons
  const handleZoomIn = () => {
    if (zoom < 20) {
      const nextZoom = zoom + 1;
      panOffset.setValue({ x: 0, y: 0 });
      setZoom(nextZoom);
      coordsRef.current.zoom = nextZoom;
    }
  };

  const handleZoomOut = () => {
    if (zoom > 13) {
      const nextZoom = zoom - 1;
      panOffset.setValue({ x: 0, y: 0 });
      setZoom(nextZoom);
      coordsRef.current.zoom = nextZoom;
    }
  };

  // Recenter GPS
  const handleRecenterGPS = async () => {
    setIsLocatingGps(true);
    try {
      await locationService.requestPermission();
      const gps = await locationService.getCurrentLocation();
      if (gps && gps.latitude != null && gps.longitude != null) {
        panOffset.setValue({ x: 0, y: 0 });
        setUserGps({ lat: gps.latitude, lon: gps.longitude });
        setCurrentCoords({ lat: gps.latitude, lon: gps.longitude });
        setZoom(18);
        coordsRef.current = { lat: gps.latitude, lon: gps.longitude, zoom: 18 };
        await reverseGeocodeCoords(gps.latitude, gps.longitude);

        if (nativeMapAvailable && mapRef.current?.animateToRegion) {
          mapRef.current.animateToRegion({
            latitude: gps.latitude,
            longitude: gps.longitude,
            latitudeDelta: 0.0035,
            longitudeDelta: 0.0035,
          }, 500);
        }
      }
    } catch (e) {
      console.warn('GPS recenter error:', e);
    } finally {
      setIsLocatingGps(false);
    }
  };

  const mapImageUrl = useMemo(() => {
    const formattedLon = Number(currentCoords.lon.toFixed(5));
    const formattedLat = Number(currentCoords.lat.toFixed(5));
    const reqWidth = Math.min(640, Math.round(SCREEN_WIDTH));
    const reqHeight = Math.min(640, Math.round(SCREEN_HEIGHT));
    return `https://maps.googleapis.com/maps/api/staticmap?center=${formattedLat},${formattedLon}&zoom=${zoom}&size=${reqWidth}x${reqHeight}&scale=2&maptype=roadmap&key=${GOOGLE_MAPS_KEY}&language=en`;
  }, [currentCoords.lat, currentCoords.lon, zoom]);

  const distanceFromGps = useMemo(() => {
    if (!userGps) return null;
    return calculateDistanceMeters(userGps.lat, userGps.lon, currentCoords.lat, currentCoords.lon);
  }, [userGps, currentCoords]);

  const handleConfirm = () => {
    if (resolvedLocation) {
      onConfirmLocation(resolvedLocation);
    } else {
      onConfirmLocation({
        latitude: currentCoords.lat,
        longitude: currentCoords.lon,
        shortAddress: 'Selected Pin Location',
        formattedAddress: `${currentCoords.lat.toFixed(5)}, ${currentCoords.lon.toFixed(5)}`,
        city: 'Dehradun',
      });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* 1. GOOGLE MAPS INTERACTIVE ROADMAP CANVAS */}
        {nativeMapAvailable && NativeMapView ? (
          <NativeMapView
            ref={mapRef}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE_REF : undefined}
            style={styles.map}
            initialRegion={{
              latitude: currentCoords.lat,
              longitude: currentCoords.lon,
              latitudeDelta: 0.0035,
              longitudeDelta: 0.0035,
            }}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={false}
            onRegionChange={() => {
              if (!isMoving) {
                setIsMoving(true);
                Animated.spring(pinBounceAnim, {
                  toValue: -18,
                  useNativeDriver: true,
                  speed: 40,
                }).start();
              }
            }}
            onRegionChangeComplete={(r: any) => {
              setIsMoving(false);
              setCurrentCoords({ lat: r.latitude, lon: r.longitude });
              Animated.spring(pinBounceAnim, {
                toValue: 0,
                friction: 6,
                useNativeDriver: true,
              }).start();
              if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
              debounceTimerRef.current = setTimeout(() => {
                reverseGeocodeCoords(r.latitude, r.longitude);
              }, 200);
            }}
            onError={() => setNativeMapAvailable(false)}
          />
        ) : (
          <View style={styles.canvasContainer} {...panResponder.panHandlers}>
            <Animated.View
              style={[
                styles.mapTransformWrapper,
                {
                  transform: panOffset.getTranslateTransform(),
                },
              ]}
            >
              <Image
                source={{ uri: mapImageUrl }}
                fadeDuration={0}
                style={styles.mapImage}
                resizeMode="cover"
              />
            </Animated.View>
          </View>
        )}

        {/* 2. STATIONARY CENTER PIN */}
        <View style={styles.centerPinContainer} pointerEvents="none">
          <Animated.View
            style={[
              styles.pinWrapper,
              {
                transform: [{ translateY: pinBounceAnim }],
              },
            ]}
          >
            <View style={styles.pinTooltip}>
              <Text style={styles.pinTooltipTitle}>
                {isMoving ? 'Moving pin...' : 'Your order will be delivered here'}
              </Text>
              <Text style={styles.pinTooltipSubtitle}>Move map to align pin accurately</Text>
            </View>

            <View style={styles.dropperHead}>
              <Svg width={36} height={44} viewBox="0 0 38 46" fill="none">
                <Path
                  d="M19 0C8.50659 0 0 8.50659 0 19C0 30.5 16.5 44.5 18.2 45.85C18.67 46.23 19.33 46.23 19.8 45.85C21.5 44.5 38 30.5 38 19C38 8.50659 29.4934 0 19 0Z"
                  fill="#0F172A"
                />
                <Circle cx="19" cy="18" r="8" fill="#FFFFFF" />
                <Circle cx="19" cy="18" r="4.5" fill="#15803D" />
              </Svg>
            </View>
          </Animated.View>
          <View style={styles.pinShadow} />
        </View>

        {/* 3. TOP HEADER & PLACES SEARCH BAR */}
        <View style={styles.topOverlay} pointerEvents="box-none">
          <View style={styles.headerBar}>
            <TouchableOpacity
              style={styles.backCircleBtn}
              activeOpacity={0.8}
              onPress={onClose}
              accessibilityLabel="Back"
            >
              <ArrowLeft size={20} color="#0F172A" strokeWidth={2.4} />
            </TouchableOpacity>
            <Text style={styles.headerBarTitle}>Confirm location</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Search Box */}
          <View style={styles.searchBox}>
            <Search size={17} color="#64748B" strokeWidth={2.2} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for area, street name..."
              placeholderTextColor="#94A3B8"
              value={mapSearchQuery}
              onChangeText={handleMapSearch}
              onFocus={() => setIsSearchExpanded(true)}
              autoCapitalize="none"
            />
            {mapSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleMapSearch('')} style={styles.clearSearchBtn}>
                <X size={16} color="#64748B" strokeWidth={2.2} />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Dropdown Results */}
          {isSearchExpanded && mapSearchQuery.trim().length > 0 && (
            <View style={styles.searchDropdownCard}>
              {isMapSearching ? (
                <View style={styles.dropdownLoadingRow}>
                  <ActivityIndicator size="small" color="#16A34A" />
                  <Text style={styles.dropdownLoadingText}>Searching locations...</Text>
                </View>
              ) : mapSearchResults.length > 0 ? (
                mapSearchResults.map((result, idx) => (
                  <TouchableOpacity
                    key={`search_${idx}_${result.latitude}`}
                    style={styles.dropdownItem}
                    activeOpacity={0.7}
                    onPress={() => handleSelectSearchResult(result)}
                  >
                    <View style={styles.dropdownIconBox}>
                      <MapPin size={15} color="#16A34A" strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dropdownTitle} numberOfLines={1}>
                        {result.shortAddress}
                      </Text>
                      <Text style={styles.dropdownSubtitle} numberOfLines={1}>
                        {result.formattedAddress}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.dropdownLoadingRow}>
                  <Text style={styles.dropdownEmptyText}>No matching location found</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* 4. ZOOM CONTROLS */}
        <View style={styles.floatingControls} pointerEvents="box-none">
          <View style={styles.zoomButtonGroup}>
            <TouchableOpacity
              style={styles.zoomBtn}
              activeOpacity={0.7}
              onPress={handleZoomIn}
              accessibilityLabel="Zoom in"
            >
              <Plus size={18} color="#1E293B" strokeWidth={2.4} />
            </TouchableOpacity>
            <View style={styles.zoomDivider} />
            <TouchableOpacity
              style={styles.zoomBtn}
              activeOpacity={0.7}
              onPress={handleZoomOut}
              accessibilityLabel="Zoom out"
            >
              <Minus size={18} color="#1E293B" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. FLOATING "GO TO CURRENT LOCATION" BUTTON */}
        <View style={styles.mapFooterRow} pointerEvents="box-none">
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={styles.goToLocationPill}
            activeOpacity={0.85}
            onPress={handleRecenterGPS}
            disabled={isLocatingGps}
          >
            {isLocatingGps ? (
              <ActivityIndicator size="small" color="#15803D" />
            ) : (
              <Navigation size={14} color="#15803D" strokeWidth={2.4} />
            )}
            <Text style={styles.goToLocationText}>
              {isLocatingGps ? 'Locating...' : 'Go to current location'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 6. BOTTOM DETAILS & CONFIRMATION CARD */}
        <View style={styles.bottomCard}>
          <View style={styles.dragHandleBar} />

          <Text style={styles.deliveringToLabel}>Delivering your order to</Text>

          {/* Address Details Card */}
          <View style={styles.addressCard}>
            <View style={styles.addressIconContainer}>
              <MapPin size={22} color="#0F172A" strokeWidth={2.4} />
            </View>

            <View style={styles.addressTextContainer}>
              {isResolving ? (
                <View style={styles.resolvingRow}>
                  <ActivityIndicator size="small" color="#16A34A" />
                  <Text style={styles.resolvingText}>Fetching exact address...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.addressHeading} numberOfLines={1}>
                    {resolvedLocation?.shortAddress || 'Selected Location'}
                  </Text>
                  <Text style={styles.addressSubtext} numberOfLines={2}>
                    {resolvedLocation?.formattedAddress ||
                      `${currentCoords.lat.toFixed(5)}, ${currentCoords.lon.toFixed(5)}`}
                  </Text>
                </>
              )}
            </View>

            <TouchableOpacity
              style={styles.changeBtn}
              activeOpacity={0.7}
              onPress={() => setIsSearchExpanded(true)}
            >
              <Text style={styles.changeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* Distance Alert */}
          {distanceFromGps != null && distanceFromGps > 50 && (
            <Text style={styles.distanceWarningText}>
              Pin location is {distanceFromGps >= 1000 ? `${(distanceFromGps / 1000).toFixed(1)}km` : `${distanceFromGps}m`} away from your current GPS
            </Text>
          )}

          {/* Address Tag Chips */}
          <View style={styles.tagChipsRow}>
            {ADDRESS_TAGS.map((tag) => {
              const IconComp = tag.icon;
              const isSelected = selectedTag === tag.id;
              return (
                <TouchableOpacity
                  key={tag.id}
                  style={[styles.tagChip, isSelected && styles.tagChipSelected]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedTag(tag.id)}
                >
                  <IconComp
                    size={14}
                    color={isSelected ? '#15803D' : '#64748B'}
                    strokeWidth={isSelected ? 2.4 : 2}
                  />
                  <Text style={[styles.tagChipText, isSelected && styles.tagChipTextSelected]}>
                    {tag.label}
                  </Text>
                  {isSelected && (
                    <Check size={12} color="#15803D" strokeWidth={2.6} style={{ marginLeft: 2 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={styles.confirmButton}
            activeOpacity={0.85}
            onPress={handleConfirm}
            accessibilityRole="button"
            accessibilityLabel="Confirm location"
          >
            <Text style={styles.confirmButtonText}>Confirm location</Text>
            <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.8} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  canvasContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mapTransformWrapper: {
    width: SCREEN_WIDTH + 80,
    height: SCREEN_HEIGHT + 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
  },
  centerPinContainer: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginLeft: -100,
    marginTop: -44,
    width: 200,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  pinWrapper: {
    alignItems: 'center',
  },
  pinTooltip: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 6,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  pinTooltipTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Bold,
  },
  pinTooltipSubtitle: {
    color: '#CBD5E1',
    fontSize: 9,
    fontFamily: ServenticaTokens.fonts.Regular,
    marginTop: 1,
  },
  dropperHead: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  pinShadow: {
    width: 14,
    height: 4,
    borderRadius: 7,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    marginTop: 2,
  },
  topOverlay: {
    position: 'absolute',
    top: 44,
    left: 16,
    right: 16,
    zIndex: 20,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  headerBarTitle: {
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#0F172A',
  },
  searchBox: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 23,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#0F172A',
    padding: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  searchDropdownCard: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 6,
    maxHeight: 230,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  dropdownLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  dropdownLoadingText: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#64748B',
  },
  dropdownEmptyText: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#94A3B8',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  dropdownIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  dropdownTitle: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#0F172A',
  },
  dropdownSubtitle: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
    marginTop: 2,
  },
  floatingControls: {
    position: 'absolute',
    right: 16,
    bottom: 345,
    alignItems: 'center',
    gap: 10,
    zIndex: 25,
  },
  zoomButtonGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  zoomBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  mapFooterRow: {
    position: 'absolute',
    bottom: 290,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 25,
  },
  goToLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#16A34A',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  goToLocationText: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#15803D',
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 20,
  },
  dragHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  deliveringToLabel: {
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#0F172A',
    marginBottom: 10,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  addressIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  addressTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  resolvingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resolvingText: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#16A34A',
  },
  addressHeading: {
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#0F172A',
  },
  addressSubtext: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
    marginTop: 2,
  },
  changeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#16A34A',
  },
  changeBtnText: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#15803D',
  },
  distanceWarningText: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#D97706',
    marginBottom: 8,
  },
  tagChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    gap: 5,
  },
  tagChipSelected: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#16A34A',
  },
  tagChipText: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#64748B',
  },
  tagChipTextSelected: {
    color: '#15803D',
    fontFamily: ServenticaTokens.fonts.Bold,
  },
  confirmButton: {
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.Bold,
  },
});

export default MapLocationPickerModal;
