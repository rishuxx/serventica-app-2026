import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  PartnerLiveLocation,
  SocketTrackingEvents,
  TrackingSnapshotPayload,
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

  constructor(private readonly sessionService: TrackingSessionService) {}

  /**
   * Handle incoming Socket.IO connection
   */
  handleConnection(client: Socket) {
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
    this.socketRooms.set(client.id, new Set());

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
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { bookingId: string; clientRole: 'CUSTOMER' | 'PARTNER'; token?: string }
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
    @ConnectedSocket() client: Socket,
    @MessageBody() location: Partial<PartnerLiveLocation>
  ) {
    const user = this.socketUsers.get(client.id);
    if (!user || user.role !== 'PARTNER') {
      client.emit('tracking:error', {
        code: 'FORBIDDEN_LOCATION_BROADCAST',
        message: 'Only authorized partners may broadcast location.',
      });
      return;
    }

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
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { bookingId: string; status: any }
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
}
