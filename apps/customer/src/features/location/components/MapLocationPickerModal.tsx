import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  PanResponder,
  Dimensions,
  Image,
  Animated,
} from 'react-native';
import {
  ArrowLeft,
  Search,
  X,
  LocateFixed,
  MapPin,
  Plus,
  Minus,
  Navigation2,
} from 'lucide-react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { LocationItem } from '../../../types/location.types';
import { locationService } from '../../../services/location.service';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TILE_SIZE = 256;

// Slippy map coordinate conversions
function lon2tile(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function lat2tile(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}

function tile2lon(x: number, zoom: number): number {
  return (x / Math.pow(2, zoom)) * 360 - 180;
}

function tile2lat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

interface MapLocationPickerModalProps {
  visible: boolean;
  initialLocation?: LocationItem | null;
  onClose: () => void;
  onConfirmLocation: (location: LocationItem) => void;
}

export const MapLocationPickerModal: React.FC<MapLocationPickerModalProps> = ({
  visible,
  initialLocation,
  onClose,
  onConfirmLocation,
}) => {
  // Default coordinates: initialLocation -> Dehradun / Delhi fallback
  const defaultLat = initialLocation?.latitude ?? 30.3342;
  const defaultLon = initialLocation?.longitude ?? 77.9629;

  const [centerLat, setCenterLat] = useState<number>(defaultLat);
  const [centerLon, setCenterLon] = useState<number>(defaultLon);
  const [zoom, setZoom] = useState<number>(16);

  // Address resolution state
  const [resolvedLocation, setResolvedLocation] = useState<LocationItem | null>(null);
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);

  // Search state within Map
  const [mapSearchQuery, setMapSearchQuery] = useState<string>('');
  const [mapSearchResults, setMapSearchResults] = useState<LocationItem[]>([]);
  const [isMapSearching, setIsMapSearching] = useState<boolean>(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false);

  const debounceTimerRef = useRef<any>(null);
  const searchDebounceRef = useRef<any>(null);

  // Smooth Hardware-Accelerated Pan Offset
  const panOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // Pin animation
  const pinBounceAnim = useRef(new Animated.Value(0)).current;

  // Track latest coordinates in ref for PanResponder
  const coordsRef = useRef({ lat: defaultLat, lon: defaultLon, zoom: 16 });
  useEffect(() => {
    coordsRef.current = { lat: centerLat, lon: centerLon, zoom };
  }, [centerLat, centerLon, zoom]);

  // Sync initial location when modal becomes visible
  useEffect(() => {
    if (visible) {
      const lat = initialLocation?.latitude ?? 30.3342;
      const lon = initialLocation?.longitude ?? 77.9629;
      setCenterLat(lat);
      setCenterLon(lon);
      setZoom(16);
      panOffset.setValue({ x: 0, y: 0 });
      coordsRef.current = { lat, lon, zoom: 16 };
      reverseGeocodeCoords(lat, lon);
    }
  }, [visible, initialLocation]);

  // Reverse Geocoding Function
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
          city: 'Nearby',
        });
      }
    } catch (e) {
      console.warn('Map reverse geocode error:', e);
    } finally {
      setIsResolving(false);
    }
  }, []);

  // Pan gesture responder for fluid 60fps map dragging
  const panStartCoords = useRef({ lat: defaultLat, lon: defaultLon });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
        onPanResponderGrant: () => {
          setIsPanning(true);
          panStartCoords.current = {
            lat: coordsRef.current.lat,
            lon: coordsRef.current.lon,
          };
          Animated.spring(pinBounceAnim, {
            toValue: -16,
            useNativeDriver: true,
            speed: 30,
            bounciness: 0,
          }).start();
        },
        onPanResponderMove: (_, gestureState) => {
          // Move map directly via Animated.ValueXY without triggering React state re-renders
          panOffset.setValue({ x: gestureState.dx, y: gestureState.dy });
        },
        onPanResponderRelease: (_, gestureState) => {
          setIsPanning(false);
          Animated.spring(pinBounceAnim, {
            toValue: 0,
            friction: 5,
            tension: 50,
            useNativeDriver: true,
          }).start();

          const { zoom: currentZoom } = coordsRef.current;
          const startTileX = lon2tile(panStartCoords.current.lon, currentZoom);
          const startTileY = lat2tile(panStartCoords.current.lat, currentZoom);

          // Calculate new tile center from total drag delta
          const newTileX = startTileX - gestureState.dx / TILE_SIZE;
          const newTileY = startTileY - gestureState.dy / TILE_SIZE;

          const newLon = tile2lon(newTileX, currentZoom);
          const newLat = tile2lat(newTileY, currentZoom);

          // Reset pan transform & update center coordinates
          panOffset.setValue({ x: 0, y: 0 });
          setCenterLat(newLat);
          setCenterLon(newLon);
          coordsRef.current = { lat: newLat, lon: newLon, zoom: currentZoom };

          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = setTimeout(() => {
            reverseGeocodeCoords(newLat, newLon);
          }, 200);
        },
      }),
    [pinBounceAnim, panOffset, reverseGeocodeCoords]
  );

  // In-Map Search Input Handler
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
        const results = await locationService.searchPlaces(text.trim());
        setMapSearchResults(results);
      } catch (err) {
        console.warn('Map search error:', err);
      } finally {
        setIsMapSearching(false);
      }
    }, 350);
  };

  const handleSelectSearchResult = (item: LocationItem) => {
    if (item.latitude != null && item.longitude != null) {
      panOffset.setValue({ x: 0, y: 0 });
      setCenterLat(item.latitude);
      setCenterLon(item.longitude);
      setZoom(16);
      coordsRef.current = { lat: item.latitude, lon: item.longitude, zoom: 16 };
      setResolvedLocation(item);
      setMapSearchQuery('');
      setMapSearchResults([]);
      setIsSearchExpanded(false);
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (zoom < 18) {
      const nextZoom = zoom + 1;
      panOffset.setValue({ x: 0, y: 0 });
      setZoom(nextZoom);
      coordsRef.current.zoom = nextZoom;
    }
  };

  const handleZoomOut = () => {
    if (zoom > 12) {
      const nextZoom = zoom - 1;
      panOffset.setValue({ x: 0, y: 0 });
      setZoom(nextZoom);
      coordsRef.current.zoom = nextZoom;
    }
  };

  // Recenter to Current GPS
  const handleRecenterGPS = async () => {
    try {
      const gps = await locationService.getCurrentLocation();
      if (gps && gps.latitude != null && gps.longitude != null) {
        panOffset.setValue({ x: 0, y: 0 });
        setCenterLat(gps.latitude);
        setCenterLon(gps.longitude);
        setZoom(16);
        coordsRef.current = { lat: gps.latitude, lon: gps.longitude, zoom: 16 };
        reverseGeocodeCoords(gps.latitude, gps.longitude);
      }
    } catch (e) {
      console.warn('GPS recenter error:', e);
    }
  };

  // Calculate expanded grid of tiles around center
  const tiles = useMemo(() => {
    const centerTileX = lon2tile(centerLon, zoom);
    const centerTileY = lat2tile(centerLat, zoom);

    const intTileX = Math.floor(centerTileX);
    const intTileY = Math.floor(centerTileY);

    const offsetX = (centerTileX - intTileX) * TILE_SIZE;
    const offsetY = (centerTileY - intTileY) * TILE_SIZE;

    const mapCenterX = SCREEN_WIDTH / 2;
    const mapCenterY = (SCREEN_HEIGHT - 220) / 2; // offset by bottom sheet

    const tileList: Array<{
      key: string;
      url: string;
      left: number;
      top: number;
    }> = [];

    // 5x5 tile buffer around center to ensure zero gaps during fast pan
    const radiusX = 3;
    const radiusY = 4;

    for (let dx = -radiusX; dx <= radiusX; dx++) {
      for (let dy = -radiusY; dy <= radiusY; dy++) {
        const tx = intTileX + dx;
        const ty = intTileY + dy;
        const maxTile = Math.pow(2, zoom);

        if (tx >= 0 && tx < maxTile && ty >= 0 && ty < maxTile) {
          const left = Math.round(mapCenterX - offsetX + dx * TILE_SIZE);
          const top = Math.round(mapCenterY - offsetY + dy * TILE_SIZE);

          // Google Maps standard tile source (with high-res satellite & street fallback)
          const googleTileKey = process.env.GOOGLE_MAPS_API_KEY;
          const url = googleTileKey
            ? `https://maps.googleapis.com/maps/api/staticmap?center=${tile2lat(ty + 0.5, zoom)},${tile2lon(tx + 0.5, zoom)}&zoom=${zoom}&size=256x256&key=${googleTileKey}`
            : `https://mt1.google.com/vt/lyrs=m&x=${tx}&y=${ty}&z=${zoom}`;

          tileList.push({
            key: `${zoom}_${tx}_${ty}`,
            url,
            left,
            top,
          });
        }
      }
    }

    return tileList;
  }, [centerLat, centerLon, zoom]);

  const handleConfirm = () => {
    if (resolvedLocation) {
      onConfirmLocation(resolvedLocation);
    } else {
      onConfirmLocation({
        latitude: centerLat,
        longitude: centerLon,
        shortAddress: 'Selected Pin Location',
        formattedAddress: `${centerLat.toFixed(5)}, ${centerLon.toFixed(5)}`,
        city: 'Dehradun',
      });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* 1. INTERACTIVE REAL MAP VIEWPORT (GPU Accelerated 60fps Pan) */}
        <Animated.View
          style={[
            styles.mapCanvas,
            {
              transform: panOffset.getTranslateTransform(),
            },
          ]}
          {...panResponder.panHandlers}
        >
          {tiles.map((tile) => (
            <Image
              key={tile.key}
              source={{ uri: tile.url }}
              style={[
                styles.tileImage,
                {
                  left: tile.left,
                  top: tile.top,
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                },
              ]}
              resizeMode="cover"
            />
          ))}
        </Animated.View>

        {/* 2. SIMPLE YELLOW DROPPER / PIN */}
        <View style={styles.centerPinContainer} pointerEvents="none">
          <Animated.View
            style={[
              styles.pinWrapper,
              {
                transform: [{ translateY: pinBounceAnim }],
              },
            ]}
          >
            {/* Minimal Dropper Tooltip */}
            <View style={styles.pinTooltip}>
              <Text style={styles.pinTooltipText}>
                {isPanning ? 'Placing pin...' : 'Move to adjust your location'}
              </Text>
            </View>

            {/* Default Solid Google Maps-style Yellow Pin */}
            <View style={styles.dropperContainer}>
              <View style={styles.dropperHead}>
                <Svg width={38} height={46} viewBox="0 0 38 46" fill="none">
                  {/* Solid Teardrop Pin */}
                  <Path
                    d="M19 0C8.50659 0 0 8.50659 0 19C0 30.5 16.5 44.5 18.2 45.85C18.67 46.23 19.33 46.23 19.8 45.85C21.5 44.5 38 30.5 38 19C38 8.50659 29.4934 0 19 0Z"
                    fill="#FAC420"
                  />
                  {/* Clean Solid Center Dot */}
                  <Circle cx="19" cy="18" r="7" fill="#1E242B" />
                </Svg>
              </View>
            </View>
          </Animated.View>
          <View style={styles.pinShadow} />
        </View>

        {/* 3. TOP SEARCH & CONTROLS OVERLAY (Yellow Accented) */}
        <View style={styles.topOverlay} pointerEvents="box-none">
          <View style={styles.searchBarRow}>
            <TouchableOpacity
              style={styles.circleButton}
              activeOpacity={0.8}
              onPress={onClose}
              accessibilityLabel="Close map"
            >
              <ArrowLeft size={20} color="#1E242B" strokeWidth={2.4} />
            </TouchableOpacity>

            <View style={styles.searchBox}>
              <Search size={16} color="#B45309" strokeWidth={2.4} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search area, landmark, or street..."
                placeholderTextColor="#94A3B8"
                value={mapSearchQuery}
                onChangeText={handleMapSearch}
                onFocus={() => setIsSearchExpanded(true)}
                autoCapitalize="none"
              />
              {mapSearchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => handleMapSearch('')}
                  style={styles.clearSearchBtn}
                >
                  <X size={15} color="#64748B" strokeWidth={2.2} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Search Dropdown Results */}
          {isSearchExpanded && mapSearchQuery.trim().length > 0 && (
            <View style={styles.searchDropdownCard}>
              {isMapSearching ? (
                <View style={styles.dropdownLoadingRow}>
                  <ActivityIndicator size="small" color="#fac420" />
                  <Text style={styles.dropdownLoadingText}>Finding places...</Text>
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
                      <MapPin size={15} color="#B45309" strokeWidth={2.2} />
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

        {/* 4. FLOATING MAP ACTION BUTTONS (Yellow Themed Zoom + GPS) */}
        <View style={styles.floatingControls} pointerEvents="box-none">
          {/* Recenter GPS Button */}
          <TouchableOpacity
            style={styles.fabButton}
            activeOpacity={0.8}
            onPress={handleRecenterGPS}
            accessibilityLabel="Recenter to GPS"
          >
            <LocateFixed size={20} color="#1E242B" strokeWidth={2.4} />
          </TouchableOpacity>

          {/* Zoom Controls */}
          <View style={styles.zoomButtonGroup}>
            <TouchableOpacity
              style={styles.zoomBtn}
              activeOpacity={0.7}
              onPress={handleZoomIn}
              accessibilityLabel="Zoom in"
            >
              <Plus size={18} color="#1E242B" strokeWidth={2.4} />
            </TouchableOpacity>
            <View style={styles.zoomDivider} />
            <TouchableOpacity
              style={styles.zoomBtn}
              activeOpacity={0.7}
              onPress={handleZoomOut}
              accessibilityLabel="Zoom out"
            >
              <Minus size={18} color="#1E242B" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. BOTTOM DETAILS & CONFIRMATION CARD (Yellow Themed) */}
        <View style={styles.bottomCard}>
          <View style={styles.dragHandleBar} />

          <View style={styles.locationDetailRow}>
            <View style={styles.locationIconBox}>
              <MapPin size={22} color="#B45309" strokeWidth={2.4} />
            </View>

            <View style={styles.locationTextBox}>
              {isResolving ? (
                <View style={styles.resolvingRow}>
                  <ActivityIndicator size="small" color="#fac420" />
                  <Text style={styles.resolvingText}>Fetching address details...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.locationTitle} numberOfLines={1}>
                    {resolvedLocation?.shortAddress || 'Selected Pin Location'}
                  </Text>
                  <Text style={styles.locationSubtitle} numberOfLines={2}>
                    {resolvedLocation?.formattedAddress ||
                      `${centerLat.toFixed(5)}, ${centerLon.toFixed(5)}`}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Confirm Button in Serventica Yellow */}
          <TouchableOpacity
            style={styles.confirmButton}
            activeOpacity={0.85}
            onPress={handleConfirm}
            accessibilityRole="button"
            accessibilityLabel="Confirm this location"
          >
            <Text style={styles.confirmButtonText}>CONFIRM LOCATION</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  mapCanvas: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  tileImage: {
    position: 'absolute',
    backgroundColor: '#F1F5F9',
  },
  centerPinContainer: {
    position: 'absolute',
    top: (SCREEN_HEIGHT - 220) / 2 - 48,
    left: SCREEN_WIDTH / 2 - 90,
    width: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinWrapper: {
    alignItems: 'center',
  },
  pinTooltip: {
    backgroundColor: '#1E242B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  pinTooltipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    letterSpacing: 0.1,
  },
  dropperContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropperHead: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  pinShadow: {
    width: 10,
    height: 4,
    borderRadius: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    marginTop: 1,
  },
  topOverlay: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 20,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  circleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  searchBox: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#1E242B',
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
    maxHeight: 220,
    borderWidth: 1,
    borderColor: 'rgba(250, 196, 32, 0.3)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
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
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  dropdownTitle: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#1E242B',
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
    bottom: 230,
    alignItems: 'center',
    gap: 10,
    zIndex: 15,
  },
  fabButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
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
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 20,
  },
  dragHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  locationDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  locationIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    borderWidth: 1,
    borderColor: 'rgba(250, 196, 32, 0.4)',
  },
  locationTextBox: {
    flex: 1,
  },
  resolvingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  resolvingText: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#B45309',
  },
  locationTitle: {
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#0F172A',
    marginBottom: 3,
  },
  locationSubtitle: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
    lineHeight: 16,
  },
  confirmButton: {
    height: 46,
    backgroundColor: '#fac420',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButtonText: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
    letterSpacing: 0.5,
  },
});
