import { Socket } from 'socket.io-client';
import {
  PartnerLiveLocation,
  TrackingSnapshotPayload,
  TrackingStatus,
} from '@serventica/types';
import { socketConnectionManager } from './SocketConnectionManager';

export interface TrackingSocketCallbacks {
  onSnapshot?: (snapshot: TrackingSnapshotPayload) => void;
  onLocationUpdate?: (location: PartnerLiveLocation) => void;
  onStatusUpdate?: (status: { bookingId: string; status: TrackingStatus; timestamp: string }) => void;
  onError?: (error: { code: string; message: string }) => void;
}

/**
 * SERVENTICA — TrackingSocketService (Phase 3)
 * Decoupled domain service handling room joins, event listeners,
 * partner GPS emissions, and automatic resubscription upon reconnection.
 */
export class TrackingSocketService {
  private static instance: TrackingSocketService;
  private readonly joinedRooms: Set<string> = new Set();
  private readonly roomCallbacks: Map<string, Set<TrackingSocketCallbacks>> = new Map();

  private constructor() {
    // Listen for reconnection to re-join active rooms and request fresh snapshots
    socketConnectionManager.onConnectionStateChange((state) => {
      if (state === 'CONNECTED') {
        this.resubscribeActiveRooms();
      }
    });
  }

  public static getInstance(): TrackingSocketService {
    if (!TrackingSocketService.instance) {
      TrackingSocketService.instance = new TrackingSocketService();
    }
    return TrackingSocketService.instance;
  }

  /**
   * Subscribes customer or partner to tracking room: tracking:{bookingId}
   */
  public joinTrackingRoom(
    bookingId: string,
    role: 'CUSTOMER' | 'PARTNER',
    callbacks: TrackingSocketCallbacks,
    userId?: string
  ): () => void {
    if (!bookingId) return () => {};

    const socket = socketConnectionManager.connect({
      role,
      userId: userId || 'guest_user',
    });

    if (!this.roomCallbacks.has(bookingId)) {
      this.roomCallbacks.set(bookingId, new Set());
    }
    this.roomCallbacks.get(bookingId)!.add(callbacks);
    this.joinedRooms.add(bookingId);

    this.setupSocketListeners(socket);

    // Emit join room request
    socket.emit('tracking:join', {
      bookingId,
      clientRole: role,
    });

    return () => {
      this.leaveTrackingRoom(bookingId, callbacks);
    };
  }

  /**
   * Partner emits real physical GPS coordinates
   */
  public emitPartnerLocation(location: PartnerLiveLocation): void {
    console.log(
      `[PartnerGPS] EMIT\nlat=${location.latitude}\nlon=${location.longitude}`
    );
    const socket = socketConnectionManager.getSocket();
    if (socket && socket.connected) {
      socket.emit('partner:location', location);
    }
  }

  private setupSocketListeners(socket: Socket): void {
    // Remove old listeners to prevent duplicates
    socket.off('tracking:snapshot');
    socket.off('tracking:location');
    socket.off('tracking:status');
    socket.off('tracking:error');

    socket.on('tracking:snapshot', (snapshot: TrackingSnapshotPayload) => {
      const cbs = this.roomCallbacks.get(snapshot.bookingId);
      if (cbs) {
        cbs.forEach((cb) => cb.onSnapshot?.(snapshot));
      }
    });

    socket.on('tracking:location', (loc: PartnerLiveLocation) => {
      console.log(
        `[CustomerGPS] SOCKET RECEIVED\nbookingId=${loc.bookingId}\nlat=${loc.latitude}\nlon=${loc.longitude}`
      );
      const cbs = this.roomCallbacks.get(loc.bookingId);
      if (cbs) {
        cbs.forEach((cb) => cb.onLocationUpdate?.(loc));
      }
    });

    socket.on('tracking:status', (statusPayload: any) => {
      const cbs = this.roomCallbacks.get(statusPayload.bookingId);
      if (cbs) {
        cbs.forEach((cb) => cb.onStatusUpdate?.(statusPayload));
      }
    });

    socket.on('tracking:error', (err: any) => {
      this.roomCallbacks.forEach((cbSet) => {
        cbSet.forEach((cb) => cb.onError?.(err));
      });
    });
  }

  private resubscribeActiveRooms(): void {
    const socket = socketConnectionManager.getSocket();
    if (!socket || !socket.connected) return;

    this.joinedRooms.forEach((bookingId) => {
      socket.emit('tracking:join', {
        bookingId,
        clientRole: 'CUSTOMER',
      });
    });
  }

  private leaveTrackingRoom(bookingId: string, callbacks: TrackingSocketCallbacks): void {
    const cbSet = this.roomCallbacks.get(bookingId);
    if (cbSet) {
      cbSet.delete(callbacks);
      if (cbSet.size === 0) {
        this.roomCallbacks.delete(bookingId);
        this.joinedRooms.delete(bookingId);
      }
    }
  }
}

export const trackingSocketService = TrackingSocketService.getInstance();
