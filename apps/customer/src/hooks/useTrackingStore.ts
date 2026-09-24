import { useState, useEffect, useRef, useCallback } from 'react';
import {
  PartnerLiveLocation,
  TrackingSnapshotPayload,
  TrackingStatus,
  TrackingConnectionState,
} from '@serventica/types';
import { trackingSocketService } from '../services/tracking/TrackingSocketService';
import { socketConnectionManager } from '../services/tracking/SocketConnectionManager';

export interface UseTrackingStoreState {
  connectionState: TrackingConnectionState;
  snapshot: TrackingSnapshotPayload | null;
  partnerLocation: PartnerLiveLocation | null;
  trackingStatus: TrackingStatus;
  isLive: boolean;
  isStale: boolean;
  error: string | null;
}

/**
 * SERVENTICA — useTrackingStore (Phase 4)
 * Isolated client tracking store:
 * - Subscribes to tracking:{bookingId}
 * - Holds authoritative snapshot & connection state
 * - Automatic reconnection recovery and stale data detection
 * - Discards out-of-order GPS updates (timestamp monotonic check)
 * - Decouples BookingDetailScreen from raw socket listeners
 */
export function useTrackingStore(bookingId?: string, clientRole: 'CUSTOMER' | 'PARTNER' = 'CUSTOMER') {
  const [state, setState] = useState<UseTrackingStoreState>({
    connectionState: socketConnectionManager.getConnectionState(),
    snapshot: null,
    partnerLocation: null,
    trackingStatus: 'WAITING_FOR_FIRST_LOCATION',
    isLive: false,
    isStale: false,
    error: null,
  });

  const lastLocationRef = useRef<PartnerLiveLocation | null>(null);
  const lastLocationTimestampMsRef = useRef<number>(0);

  useEffect(() => {
    if (!bookingId) return;

    // Periodic staleness check: mark as STALE if no GPS fix received for > 20 seconds
    const stalenessInterval = setInterval(() => {
      const now = Date.now();
      if (
        lastLocationTimestampMsRef.current > 0 &&
        now - lastLocationTimestampMsRef.current > 20000 &&
        lastLocationRef.current
      ) {
        setState((prev) => {
          if (!prev.isStale && prev.isLive) {
            return {
              ...prev,
              isStale: true,
              trackingStatus: 'STALE',
            };
          }
          return prev;
        });
      }
    }, 5000);

    // 1. Listen for connection changes
    const unsubConn = socketConnectionManager.onConnectionStateChange((connState) => {
      setState((prev) => {
        const isLive = connState === 'CONNECTED' && Boolean(lastLocationRef.current) && !prev.isStale;
        return {
          ...prev,
          connectionState: connState,
          isLive,
        };
      });
    });

    // 2. Join tracking room with snapshot & location handlers
    const unsubRoom = trackingSocketService.joinTrackingRoom(bookingId, clientRole, {
      onSnapshot: (snapshot) => {
        if (snapshot.lastKnownPartnerLocation) {
          lastLocationRef.current = snapshot.lastKnownPartnerLocation;
          lastLocationTimestampMsRef.current = new Date(snapshot.lastKnownPartnerLocation.timestamp).getTime();
        }
        setState((prev) => ({
          ...prev,
          snapshot,
          partnerLocation: snapshot.lastKnownPartnerLocation || prev.partnerLocation,
          trackingStatus: snapshot.trackingStatus,
          isLive: Boolean(snapshot.lastKnownPartnerLocation),
          isStale: false,
          error: null,
        }));
      },
      onLocationUpdate: (loc) => {
        // Out-of-order event protection: Discard location if timestamp is older than current
        const locTime = new Date(loc.timestamp).getTime();
        if (locTime < lastLocationTimestampMsRef.current) {
          return;
        }

        console.log(
          `[CustomerGPS] STORE UPDATED\nbookingId=${loc.bookingId}\nlat=${loc.latitude}\nlon=${loc.longitude}`
        );

        lastLocationRef.current = loc;
        lastLocationTimestampMsRef.current = locTime;

        setState((prev) => ({
          ...prev,
          partnerLocation: loc,
          trackingStatus: 'LIVE',
          isLive: true,
          isStale: false,
          error: null,
        }));
      },
      onStatusUpdate: (statusPayload) => {
        setState((prev) => ({
          ...prev,
          trackingStatus: statusPayload.status,
        }));
      },
      onError: (err) => {
        setState((prev) => ({
          ...prev,
          error: err.message,
        }));
      },
    });

    return () => {
      clearInterval(stalenessInterval);
      unsubConn();
      unsubRoom();
    };
  }, [bookingId, clientRole]);

  return state;
}
