import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapboxGL from '@rnmapbox/maps';
import { ServenticaEnvironment } from '../../../../../../packages/config/src';

// Access runtime public token only (never the secret downloads token)
const PUBLIC_MAPBOX_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  process.env.MAPBOX_ACCESS_TOKEN ||
  ServenticaEnvironment?.mapbox?.accessToken ||
  '';

// Initialize native Mapbox access token
MapboxGL.setAccessToken(PUBLIC_MAPBOX_TOKEN);

export interface NativeMapboxDiagnosticScreenProps {
  onBack?: () => void;
}

/**
 * SERVENTICA — Native Mapbox Diagnostic Screen (Phase 1)
 *
 * Isolated validation component:
 * - MapboxGL.MapView
 * - MapboxGL.Camera
 * - Standard Mapbox Streets style
 *
 * Intentionally contains NO:
 * - Socket.IO
 * - Supabase
 * - Booking state
 * - Partner tracking
 * - Routing API
 * - Bottom sheets
 * - PanResponder / Animated transforms
 */
export const NativeMapboxDiagnosticScreen: React.FC<NativeMapboxDiagnosticScreenProps> = ({
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [cameraState, setCameraState] = useState('Default (New Delhi)');

  // Default coordinate: New Delhi center (28.6139, 77.2090)
  const defaultCenter = [77.209, 28.6139];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Diagnostic Header Bar */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerRow}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Native Mapbox Diagnostic</Text>
            <Text style={styles.subtitle}>
              SDK: @rnmapbox/maps (Native Vector MapView)
            </Text>
          </View>
        </View>

        {/* Diagnostic Status Indicator */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: mapLoaded ? '#10B981' : '#F59E0B' },
            ]}
          />
          <Text style={styles.statusText}>
            {mapLoaded ? 'Map Loaded (Native Vector Tiles Active)' : 'Loading Native Map...'}
          </Text>
        </View>
      </View>

      {/* Pure Native Vector MapView */}
      <View style={styles.mapContainer}>
        <MapboxGL.MapView
          style={styles.map}
          styleURL={MapboxGL.StyleURL.Street}
          logoEnabled={true}
          attributionEnabled={true}
          compassEnabled={true}
          scaleBarEnabled={true}
          onDidFinishLoadingMap={() => {
            setMapLoaded(true);
          }}
          onCameraChanged={(state) => {
            if (state?.properties?.center) {
              const [lon, lat] = state.properties.center;
              setCameraState(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
            }
          }}
        >
          <MapboxGL.Camera
            defaultSettings={{
              centerCoordinate: defaultCenter,
              zoomLevel: 14,
            }}
          />
        </MapboxGL.MapView>

        {!mapLoaded && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#0F172A" />
            <Text style={styles.loadingText}>Initializing Native Mapbox Engine...</Text>
          </View>
        )}
      </View>

      {/* Diagnostic Footer Info */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Text style={styles.footerLabel}>Camera Center:</Text>
        <Text style={styles.footerValue}>{cameraState}</Text>
        <Text style={styles.footerNote}>
          Pinch, pan, rotate, and pitch gestures are handled natively by Mapbox GL.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#334155',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  footer: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 2,
  },
  footerNote: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 4,
  },
});
