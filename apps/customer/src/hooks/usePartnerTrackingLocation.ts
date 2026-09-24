import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { locationService } from '../services/location.service';
import { PartnerLiveLocation } from '../types/tracking.types';
import { trackingSocketService } from '../services/tracking/TrackingSocketService';

export interface PartnerTrackingOptions {
  bookingId: string;
  partnerId: string;
  enabled?: boolean;
  emitToSocket?: boolean;       // Automatically broadcast to tracking room
  minIntervalMs?: number;       // e.g. 3000ms
  minDisplacementMeters?: number; // e.g. 10m
  maxAccuracyMeters?: number;   // reject > 100m error margin
  maxStalenessMs?: number;      // reject > 15000ms old
}

export interface PartnerTrackingState {
  currentLocation: PartnerLiveLocation | null;
  isWatching: boolean;
  permissionStatus: 'GRANTED' | 'DENIED' | 'NEVER_ASK_AGAIN' | 'UNDETERMINED';
  error: string | null;
  lastUpdated: number | null;
}

/**
 * Calculates straight line distance between two coordinates in meters
 */
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates bearing between two coordinates in degrees (0 - 360)
 */
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * SERVENTICA — usePartnerTrackingLocation Hook (Phase 2)
 *
 * Responsibilities:
 * - Requests device GPS permissions via existing LocationService
 * - Starts native GPS watcher with battery-friendly configuration
 * - Validates location (lat/lon bounds, accuracy <= 100m, freshness, impossible jump detection)
 * - Throttles updates (configurable 3-5s interval OR 10-20m movement)
 * - Smoothly calculates bearing/heading if device heading is 0/unavailable
 * - Stops watcher on unmount or when app goes to background (lifecycle-aware)
 * - Exposes clean reactive tracking state without coupling to Socket.IO (deferred to Phase 3)
 */
export function usePartnerTrackingLocation(options: PartnerTrackingOptions) {
  const {
    bookingId,
    partnerId,
    enabled = true,
    emitToSocket = true,
    minIntervalMs = 4000,
    minDisplacementMeters = 10,
    maxAccuracyMeters = 100,
    maxStalenessMs = 15000,
  } = options;

  const [state, setState] = useState<PartnerTrackingState>({
    currentLocation: null,
    isWatching: false,
    permissionStatus: 'UNDETERMINED',
    error: null,
    lastUpdated: null,
  });

  const lastAcceptedLocationRef = useRef<PartnerLiveLocation | null>(null);
  const lastAcceptedTimeRef = useRef<number>(0);
  const cleanupWatcherRef = useRef<(() => void) | null>(null);

  const processLocationUpdate = useCallback(
    (raw: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      heading?: number;
      speed?: number;
      altitude?: number;
      timestamp: number;
    }) => {
      const now = Date.now();

      // 1. Basic coordinate validation
      if (
        typeof raw.latitude !== 'number' ||
        typeof raw.longitude !== 'number' ||
        isNaN(raw.latitude) ||
        isNaN(raw.longitude) ||
        raw.latitude < -90 ||
        raw.latitude > 90 ||
        raw.longitude < -180 ||
        raw.longitude > 180
      ) {
        return;
      }

      // 2. Reject stale coordinates
      if (raw.timestamp && now - raw.timestamp > maxStalenessMs) {
        return;
      }

      // 3. Reject inaccurate locations (e.g. cell tower accuracy > 100m)
      if (raw.accuracy != null && raw.accuracy > maxAccuracyMeters) {
        return;
      }

      const prev = lastAcceptedLocationRef.current;

      // 4. Movement & Throttling checks
      if (prev) {
        const distMoved = calculateDistanceMeters(
          prev.latitude,
          prev.longitude,
          raw.latitude,
          raw.longitude
        );
        const timeElapsed = now - lastAcceptedTimeRef.current;

        // Impossible jump detection: speed > 180 km/h (50 m/s)
        if (timeElapsed > 0) {
          const speedCalc = distMoved / (timeElapsed / 1000);
          if (speedCalc > 50 && distMoved > 200) {
            // Unrealistic jump, ignore GPS glitch
            return;
          }
        }

        // Throttle: require at least minIntervalMs OR minDisplacementMeters
        if (timeElapsed < minIntervalMs && distMoved < minDisplacementMeters) {
          return;
        }
      }

      // 5. Heading resolution (use device heading or derive from displacement)
      let resolvedHeading = raw.heading;
      if ((resolvedHeading == null || resolvedHeading === 0) && prev) {
        const dist = calculateDistanceMeters(
          prev.latitude,
          prev.longitude,
          raw.latitude,
          raw.longitude
        );
        if (dist >= 3) {
          resolvedHeading = calculateBearing(
            prev.latitude,
            prev.longitude,
            raw.latitude,
            raw.longitude
          );
        } else {
          resolvedHeading = prev.heading;
        }
      }

      const validLocation: PartnerLiveLocation = {
        bookingId,
        partnerId,
        latitude: raw.latitude,
        longitude: raw.longitude,
        accuracy: raw.accuracy,
        heading: resolvedHeading != null ? Math.round(resolvedHeading) : undefined,
        speed: raw.speed != null ? Math.max(0, raw.speed) : undefined,
        altitude: raw.altitude,
        timestamp: new Date(raw.timestamp || now).toISOString(),
        isMocked: false,
      };

      lastAcceptedLocationRef.current = validLocation;
      lastAcceptedTimeRef.current = now;

      // Broadcast to Socket.IO tracking room if enabled
      if (emitToSocket) {
        trackingSocketService.emitPartnerLocation(validLocation);
      }

      setState((prev) => ({
        ...prev,
        currentLocation: validLocation,
        error: null,
        lastUpdated: now,
      }));
    },
    [bookingId, partnerId, enabled, emitToSocket, minIntervalMs, minDisplacementMeters, maxAccuracyMeters, maxStalenessMs]
  );

  const startWatching = useCallback(async () => {
    try {
      const permission = await locationService.requestPermission();
      setState((prev) => ({ ...prev, permissionStatus: permission }));

      if (permission !== 'GRANTED') {
        setState((prev) => ({
          ...prev,
          error: 'LOCATION_PERMISSION_DENIED',
          isWatching: false,
        }));
        return;
      }

      // Initial fix
      try {
        const initialCoords = await locationService.getCurrentCoordinates();
        processLocationUpdate({
          latitude: initialCoords.latitude,
          longitude: initialCoords.longitude,
          timestamp: Date.now(),
        });
      } catch (initErr) {
        console.warn('[usePartnerTrackingLocation] Initial location fetch notice:', initErr);
      }

      // Start continuous watcher
      const cleanup = await locationService.watchPosition(
        processLocationUpdate,
        (err) => {
          setState((prev) => ({ ...prev, error: err.message }));
        },
        {
          timeInterval: minIntervalMs,
          distanceInterval: minDisplacementMeters,
        }
      );

      cleanupWatcherRef.current = cleanup;
      setState((prev) => ({ ...prev, isWatching: true, error: null }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isWatching: false,
        error: err?.message || 'FAILED_TO_START_GPS_WATCHER',
      }));
    }
  }, [minIntervalMs, minDisplacementMeters, processLocationUpdate]);

  const stopWatching = useCallback(() => {
    if (cleanupWatcherRef.current) {
      cleanupWatcherRef.current();
      cleanupWatcherRef.current = null;
    }
    setState((prev) => ({ ...prev, isWatching: false }));
  }, []);

  // Lifecycle & Enabled listener
  useEffect(() => {
    if (!enabled || !bookingId || !partnerId) {
      stopWatching();
      return;
    }

    startWatching();

    // Handle AppState (pause GPS when backgrounded to conserve battery)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        startWatching();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        stopWatching();
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      sub.remove();
      stopWatching();
    };
  }, [enabled, bookingId, partnerId, startWatching, stopWatching]);

  return {
    ...state,
    startWatching,
    stopWatching,
  };
}
