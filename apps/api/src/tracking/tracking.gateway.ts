import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  PartnerLiveLocation,
  SocketTrackingEvents,
  TrackingSnapshotPayload,
  DispatchOfferPayload,
  MatchedPartnerPayload,
} from '@serventica/types';
import {
  TrackingSessionService,
  AuthenticatedUser,
} from './tracking-session.service';

/**
 * SERVENTICA — Tracking WebSocket Gateway (Phase 3)
 * Authoritative Socket.IO Gateway for tracking:{bookingId} rooms,
 * authenticated connections, sanitized GPS broadcasts, and snapshot delivery.
 */
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  namespace: '/',
  pingInterval: 10000,
  pingTimeout: 5000,
  maxHttpBufferSize: 64 * 1024, // 64KB max payload per message
})
export class TrackingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TrackingGateway.name);
  // Socket ID -> Authenticated User Record
  private readonly socketUsers: Map<string, AuthenticatedUser> = new Map();
  // Socket ID -> Joined Booking Rooms Set
  private readonly socketRooms: Map<string, Set<string>> = new Map();

  // ── Scalability Guards ────────────────────────────────────────
  // Max concurrent WebSocket connections (200 users × ~2 sockets each = 400, plus buffer)
  private static readonly MAX_CONNECTIONS = 500;
  // GPS ping throttle: userId -> lastPingTimestamp
  private readonly gpsPingThrottle: Map<string, number> = new Map();
  // Min interval between GPS pings per partner (2 seconds)
  private static readonly GPS_PING_MIN_INTERVAL_MS = 2000;

  constructor(private readonly sessionService: TrackingSessionService) {}

  /**
   * Handle incoming Socket.IO connection
   * Enforces a hard connection cap to prevent memory exhaustion.
   */
  handleConnection(client: Socket) {
    // ── Connection Cap ────────────────────────────────────────
    if (this.socketUsers.size >= TrackingGateway.MAX_CONNECTIONS) {
      this.logger.warn(
        `[ConnectionRejected] Max connections reached (${TrackingGateway.MAX_CONNECTIONS}). Rejecting ${client.id}`
      );
      client.emit('error', { message: 'Server at capacity. Please retry shortly.' });
      client.disconnect(true);
      return;
    }
    const token =
      (client.handshake.auth?.token as string) ||
      (client.handshake.headers?.authorization as string) ||
      'anonymous_token';

    const userId =
      (client.handshake.auth?.userId as string) ||
      (client.handshake.query?.userId as string) ||
      `user_${client.id.slice(0, 8)}`;

    const role = (client.handshake.auth?.role as any) || 'CUSTOMER';

    const user: AuthenticatedUser = {
      userId,
      role: role === 'PARTNER' ? 'PARTNER' : 'CUSTOMER',
    };

    this.socketUsers.set(client.id, user);
    const userRooms = new Set<string>();
    this.socketRooms.set(client.id, userRooms);

    // If partner, automatically subscribe to private offer channel
    if (user.role === 'PARTNER') {
      const partnerRoom = `partner:${user.userId}`;
      client.join(partnerRoom);
      userRooms.add(partnerRoom);
      this.logger.log(`[PartnerRoomJoined] Partner ${user.userId} auto-subscribed to ${partnerRoom}`);
    }

    this.logger.log(
      `[SocketConnected] Client ${client.id} authenticated as ${user.role} (${user.userId})`
    );
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(client: Socket) {
    const user = this.socketUsers.get(client.id);
    const rooms = this.socketRooms.get(client.id);

    if (rooms) {
      rooms.forEach((room) => client.leave(room));
    }

    this.socketUsers.delete(client.id);
    this.socketRooms.delete(client.id);

    this.logger.log(
      `[SocketDisconnected] Client ${client.id} (${user?.userId || 'unknown'}) left ${rooms?.size || 0} rooms`
    );
  }

  /**
   * Room Join: tracking:join
   * Customer / Partner subscribes to tracking:{bookingId}
   */
  @SubscribeMessage('tracking:join')
  handleJoinRoom(
    client: Socket,
    payload: { bookingId: string; clientRole: 'CUSTOMER' | 'PARTNER'; token?: string }
  ) {
    const user = this.socketUsers.get(client.id);
    if (!user) {
      client.emit('tracking:error', {
        code: 'UNAUTHENTICATED',
        message: 'Socket session is not authenticated.',
      });
      return;
    }

    const { bookingId } = payload || {};
    if (!bookingId) {
      client.emit('tracking:error', {
        code: 'INVALID_PAYLOAD',
        message: 'bookingId is required to join tracking room.',
      });
      return;
    }

    // Authorize room membership
    const authResult = this.sessionService.authorizeRoomJoin(user, bookingId);
    if (!authResult.authorized) {
      this.logger.warn(
        `[RoomRejected] Client ${client.id} denied access to booking ${bookingId}: ${authResult.reason}`
      );
      client.emit('tracking:error', {
        code: 'UNAUTHORIZED_ROOM_ACCESS',
        message: authResult.reason || 'You are not authorized to track this booking.',
      });
      return;
    }

    const roomName = `tracking:${bookingId}`;
    client.join(roomName);

    const userRooms = this.socketRooms.get(client.id) || new Set();
    userRooms.add(roomName);
    this.socketRooms.set(client.id, userRooms);

    this.logger.log(
      `[RoomJoined] ${user.role} (${user.userId}) joined room ${roomName}`
    );

    // Immediately deliver authoritative snapshot to the newly joined client
    const snapshot: TrackingSnapshotPayload =
      this.sessionService.getTrackingSnapshot(bookingId);

    client.emit('tracking:snapshot', snapshot);
  }

  /**
   * Partner GPS Ingestion: partner:location
   * Receives real GPS from partner, validates, sanitizes, deduplicates, and broadcasts.
   */
  @SubscribeMessage('partner:location')
  handlePartnerLocation(
    client: Socket,
    location: Partial<PartnerLiveLocation>
  ) {
    const user = this.socketUsers.get(client.id);
    if (!user || user.role !== 'PARTNER') {
      client.emit('tracking:error', {
        code: 'FORBIDDEN_LOCATION_BROADCAST',
        message: 'Only authorized partners may broadcast location.',
      });
      return;
    }

    // ── GPS Ping Throttle (max 1 ping per 2s per partner) ─────
    const now = Date.now();
    const lastPing = this.gpsPingThrottle.get(user.userId) || 0;
    if (now - lastPing < TrackingGateway.GPS_PING_MIN_INTERVAL_MS) {
      // Silently drop — don't emit error to avoid flooding the partner client
      return;
    }
    this.gpsPingThrottle.set(user.userId, now);

    const bookingId = location?.bookingId;
    if (!bookingId) {
      client.emit('tracking:error', {
        code: 'MISSING_BOOKING_ID',
        message: 'bookingId is required.',
      });
      return;
    }

    // Process & Validate through service layer
    const result = this.sessionService.processPartnerLocation(
      user.userId,
      location
    );

    if (!result.success || !result.sanitizedLocation) {
      // If error is insignificant movement deduplication, do not warn
      if (result.error !== 'INSIGNIFICANT_MOVEMENT_DEDUPLICATED') {
        this.logger.debug(
          `[GPSDropped] Partner ${user.userId} on ${bookingId}: ${result.error}`
        );
      }
      return;
    }

    const sanitizedLocation = result.sanitizedLocation;
    const roomName = `tracking:${bookingId}`;

    this.logger.log(
      `[ServerGPS] RECEIVED\nlat=${location.latitude}\nlon=${location.longitude}`
    );
    this.logger.log(
      `[ServerGPS] BROADCAST\nlat=${sanitizedLocation.latitude}\nlon=${sanitizedLocation.longitude}`
    );

    // Broadcast sanitized canonical DTO to everyone in tracking:{bookingId}
    this.server.to(roomName).emit('tracking:location', sanitizedLocation);

    // If arrival geofence triggered authoritative arrival, broadcast arrival status to room
    if (result.hasTriggeredArrival) {
      const arrivedTimestamp = new Date().toISOString();
      this.server.to(roomName).emit('tracking:status', {
        bookingId,
        status: 'ARRIVED',
        timestamp: arrivedTimestamp,
      });
      this.server.to(roomName).emit('tracking:arrival', {
        bookingId,
        arrivedAt: arrivedTimestamp,
      });
      this.logger.log(`[ArrivalBroadcasted] Broadcasted ARRIVED event to room ${roomName}`);
    }

    if (result.shouldPersistRecovery) {
      this.logger.log(
        `[RecoveryPersisted] Booking ${bookingId}: Lat ${sanitizedLocation.latitude}, Lon ${sanitizedLocation.longitude}`
      );
    }
  }

  /**
   * Authoritative Status Notification: tracking:status
   */
  @SubscribeMessage('tracking:status')
  handleStatusUpdate(
    client: Socket,
    payload: { bookingId: string; status: any }
  ) {
    const user = this.socketUsers.get(client.id);
    if (!user || (user.role !== 'PARTNER' && user.role !== 'ADMIN')) {
      client.emit('tracking:error', {
        code: 'FORBIDDEN',
        message: 'Unauthorized status update attempt.',
      });
      return;
    }

    const { bookingId, status } = payload;
    if (!bookingId || !status) return;

    this.sessionService.updateStatus(bookingId, status);
    const roomName = `tracking:${bookingId}`;

    this.server.to(roomName).emit('tracking:status', {
      bookingId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Explicit offer room subscription: partner:subscribe_offers
   */
  @SubscribeMessage('partner:subscribe_offers')
  handleSubscribeOffers(
    client: Socket,
    payload?: { partnerId?: string }
  ) {
    const user = this.socketUsers.get(client.id);
    const partnerId = payload?.partnerId || user?.userId;

    if (!partnerId) {
      client.emit('tracking:error', {
        code: 'MISSING_PARTNER_ID',
        message: 'partnerId is required to subscribe to offers.',
      });
      return;
    }

    const partnerRoom = `partner:${partnerId}`;
    client.join(partnerRoom);

    const userRooms = this.socketRooms.get(client.id) || new Set();
    userRooms.add(partnerRoom);
    this.socketRooms.set(client.id, userRooms);

    this.logger.log(`[PartnerOfferSubscribed] Client ${client.id} joined ${partnerRoom}`);
    client.emit('partner:subscribed', { partnerId, channel: partnerRoom });
  }

  // ==============================================================================
  // PHASE 3: INSTANT EVENT BROADCASTING BRIDGE METHODS
  // ==============================================================================

  /**
   * Dispatches Wave Offer to candidate's private room: partner:{partnerId}
   */
  public broadcastOfferToPartner(partnerId: string, offer: DispatchOfferPayload): void {
    const room = `partner:${partnerId}`;
    this.server?.to(room).emit('dispatch:new_offer', offer);
    this.logger.log(`[SocketBroadcast] Emitted dispatch:new_offer (${offer.offerId}) to ${room}`);
  }

  /**
   * Cancels active offer when expired or declined: partner:{partnerId}
   */
  public broadcastOfferCancelled(partnerId: string, offerId: string, reason: string): void {
    const room = `partner:${partnerId}`;
    this.server?.to(room).emit('dispatch:offer_cancelled', { offerId, reason });
    this.logger.log(`[SocketBroadcast] Emitted dispatch:offer_cancelled (${offerId}) to ${room}`);
  }

  /**
   * Broadcasts partner match & confirmation to customer tracking room: tracking:{bookingId}
   */
  public broadcastMatchToBooking(bookingId: string, payload: MatchedPartnerPayload): void {
    const room = `tracking:${bookingId}`;
    this.server?.to(room).emit('dispatch:matched', payload);
    this.logger.log(`[SocketBroadcast] Emitted dispatch:matched to ${room}`);
  }

  /**
   * Broadcasts doorstep arrival & verification OTP to customer room: tracking:{bookingId}
   */
  public broadcastArrivalToBooking(
    bookingId: string,
    payload: { bookingId: string; arrivedAt: string; verificationOtp?: string }
  ): void {
    const room = `tracking:${bookingId}`;
    this.server?.to(room).emit('partner:arrived', payload);
    this.logger.log(`[SocketBroadcast] Emitted partner:arrived to ${room}`);
  }

  /**
   * Broadcasts service started event to customer room: tracking:{bookingId}
   */
  public broadcastServiceStarted(bookingId: string, startedAt: string): void {
    const room = `tracking:${bookingId}`;
    this.server?.to(room).emit('job:started', { bookingId, startedAt });
    this.logger.log(`[SocketBroadcast] Emitted job:started to ${room}`);
  }

  /**
   * Prompts partner with in-job duration extension request: partner:{partnerId}
   */
  public broadcastExtensionPrompt(
    partnerId: string,
    payload: {
      bookingId: string;
      extensionId: string;
      additionalMinutes: number;
      additionalPayout: number;
      expiresAt: string;
    }
  ): void {
    const room = `partner:${partnerId}`;
    this.server?.to(room).emit('job:extension_prompt', payload);
    this.logger.log(`[SocketBroadcast] Emitted job:extension_prompt to ${room}`);
  }

  /**
   * Broadcasts confirmed duration extension to customer room: tracking:{bookingId}
   */
  public broadcastExtensionConfirmed(
    bookingId: string,
    payload: {
      bookingId: string;
      extensionId: string;
      newDurationMinutes: number;
      newTotal: number;
    }
  ): void {
    const room = `tracking:${bookingId}`;
    this.server?.to(room).emit('job:extension_confirmed', payload);
    this.logger.log(`[SocketBroadcast] Emitted job:extension_confirmed to ${room}`);
  }

  /**
   * Broadcasts laundry weight reconciliation notice to customer room: tracking:{bookingId}
   */
  public broadcastLaundryReconciliation(
    bookingId: string,
    payload: {
      bookingId: string;
      initialTotal: number;
      reconciledTotal: number;
      deviationPercent: number;
      requiresCustomerConfirmation: boolean;
    }
  ): void {
    const room = `tracking:${bookingId}`;
    this.server?.to(room).emit('job:laundry_weight_confirmation', payload);
    this.logger.log(`[SocketBroadcast] Emitted job:laundry_weight_confirmation to ${room}`);
  }

  /**
   * Broadcasts job completion to customer room: tracking:{bookingId}
   */
  public broadcastJobCompleted(
    bookingId: string,
    payload: { bookingId: string; completedAt: string; total: number }
  ): void {
    const room = `tracking:${bookingId}`;
    this.server?.to(room).emit('job:completed', payload);
    this.logger.log(`[SocketBroadcast] Emitted job:completed to ${room}`);
  }

  /**
   * Broadcasts booking cancellation to tracking room
   */
  public broadcastCancellation(bookingId: string, reason: string): void {
    const room = `tracking:${bookingId}`;
    this.server?.to(room).emit('job:cancelled', { bookingId, reason });
    this.logger.log(`[SocketBroadcast] Emitted job:cancelled to ${room}`);
  }

  /**
   * Broadcasts automated redispatch notification to customer room
   */
  public broadcastRedispatching(bookingId: string, message: string): void {
    const room = `tracking:${bookingId}`;
    this.server?.to(room).emit('job:redispatching', { bookingId, message });
    this.logger.log(`[SocketBroadcast] Emitted job:redispatching to ${room}`);
  }
}
