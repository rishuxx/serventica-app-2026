"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var TrackingGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const tracking_session_service_1 = require("./tracking-session.service");
let TrackingGateway = TrackingGateway_1 = class TrackingGateway {
    constructor(sessionService) {
        this.sessionService = sessionService;
        this.logger = new common_1.Logger(TrackingGateway_1.name);
        this.socketUsers = new Map();
        this.socketRooms = new Map();
    }
    handleConnection(client) {
        const token = client.handshake.auth?.token ||
            client.handshake.headers?.authorization ||
            'anonymous_token';
        const userId = client.handshake.auth?.userId ||
            client.handshake.query?.userId ||
            `user_${client.id.slice(0, 8)}`;
        const role = client.handshake.auth?.role || 'CUSTOMER';
        const user = {
            userId,
            role: role === 'PARTNER' ? 'PARTNER' : 'CUSTOMER',
        };
        this.socketUsers.set(client.id, user);
        this.socketRooms.set(client.id, new Set());
        this.logger.log(`[SocketConnected] Client ${client.id} authenticated as ${user.role} (${user.userId})`);
    }
    handleDisconnect(client) {
        const user = this.socketUsers.get(client.id);
        const rooms = this.socketRooms.get(client.id);
        if (rooms) {
            rooms.forEach((room) => client.leave(room));
        }
        this.socketUsers.delete(client.id);
        this.socketRooms.delete(client.id);
        this.logger.log(`[SocketDisconnected] Client ${client.id} (${user?.userId || 'unknown'}) left ${rooms?.size || 0} rooms`);
    }
    handleJoinRoom(client, payload) {
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
        const authResult = this.sessionService.authorizeRoomJoin(user, bookingId);
        if (!authResult.authorized) {
            this.logger.warn(`[RoomRejected] Client ${client.id} denied access to booking ${bookingId}: ${authResult.reason}`);
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
        this.logger.log(`[RoomJoined] ${user.role} (${user.userId}) joined room ${roomName}`);
        const snapshot = this.sessionService.getTrackingSnapshot(bookingId);
        client.emit('tracking:snapshot', snapshot);
    }
    handlePartnerLocation(client, location) {
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
        const result = this.sessionService.processPartnerLocation(user.userId, location);
        if (!result.success || !result.sanitizedLocation) {
            if (result.error !== 'INSIGNIFICANT_MOVEMENT_DEDUPLICATED') {
                this.logger.debug(`[GPSDropped] Partner ${user.userId} on ${bookingId}: ${result.error}`);
            }
            return;
        }
        const sanitizedLocation = result.sanitizedLocation;
        const roomName = `tracking:${bookingId}`;
        this.logger.log(`[ServerGPS] RECEIVED\nlat=${location.latitude}\nlon=${location.longitude}`);
        this.logger.log(`[ServerGPS] BROADCAST\nlat=${sanitizedLocation.latitude}\nlon=${sanitizedLocation.longitude}`);
        this.server.to(roomName).emit('tracking:location', sanitizedLocation);
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
            this.logger.log(`[RecoveryPersisted] Booking ${bookingId}: Lat ${sanitizedLocation.latitude}, Lon ${sanitizedLocation.longitude}`);
        }
    }
    handleStatusUpdate(client, payload) {
        const user = this.socketUsers.get(client.id);
        if (!user || (user.role !== 'PARTNER' && user.role !== 'ADMIN')) {
            client.emit('tracking:error', {
                code: 'FORBIDDEN',
                message: 'Unauthorized status update attempt.',
            });
            return;
        }
        const { bookingId, status } = payload;
        if (!bookingId || !status)
            return;
        this.sessionService.updateStatus(bookingId, status);
        const roomName = `tracking:${bookingId}`;
        this.server.to(roomName).emit('tracking:status', {
            bookingId,
            status,
            timestamp: new Date().toISOString(),
        });
    }
};
exports.TrackingGateway = TrackingGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], TrackingGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('tracking:join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], TrackingGateway.prototype, "handleJoinRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('partner:location'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], TrackingGateway.prototype, "handlePartnerLocation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('tracking:status'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], TrackingGateway.prototype, "handleStatusUpdate", null);
exports.TrackingGateway = TrackingGateway = TrackingGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
        namespace: '/',
        pingInterval: 10000,
        pingTimeout: 5000,
    }),
    __metadata("design:paramtypes", [tracking_session_service_1.TrackingSessionService])
], TrackingGateway);
//# sourceMappingURL=tracking.gateway.js.map