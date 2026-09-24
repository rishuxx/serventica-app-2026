"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
/**
 * SERVENTICA — Tracking WebSocket Gateway (Phase 3)
 * Authoritative Socket.IO Gateway for tracking:{bookingId} rooms,
 * authenticated connections, sanitized GPS broadcasts, and snapshot delivery.
 */
let TrackingGateway = (() => {
    let _classDecorators = [(0, websockets_1.WebSocketGateway)({
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
            },
            namespace: '/',
            pingInterval: 10000,
            pingTimeout: 5000,
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _server_decorators;
    let _server_initializers = [];
    let _server_extraInitializers = [];
    let _handleJoinRoom_decorators;
    let _handlePartnerLocation_decorators;
    let _handleStatusUpdate_decorators;
    var TrackingGateway = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _server_decorators = [(0, websockets_1.WebSocketServer)()];
            _handleJoinRoom_decorators = [(0, websockets_1.SubscribeMessage)('tracking:join')];
            _handlePartnerLocation_decorators = [(0, websockets_1.SubscribeMessage)('partner:location')];
            _handleStatusUpdate_decorators = [(0, websockets_1.SubscribeMessage)('tracking:status')];
            __esDecorate(this, null, _handleJoinRoom_decorators, { kind: "method", name: "handleJoinRoom", static: false, private: false, access: { has: obj => "handleJoinRoom" in obj, get: obj => obj.handleJoinRoom }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _handlePartnerLocation_decorators, { kind: "method", name: "handlePartnerLocation", static: false, private: false, access: { has: obj => "handlePartnerLocation" in obj, get: obj => obj.handlePartnerLocation }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _handleStatusUpdate_decorators, { kind: "method", name: "handleStatusUpdate", static: false, private: false, access: { has: obj => "handleStatusUpdate" in obj, get: obj => obj.handleStatusUpdate }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, null, _server_decorators, { kind: "field", name: "server", static: false, private: false, access: { has: obj => "server" in obj, get: obj => obj.server, set: (obj, value) => { obj.server = value; } }, metadata: _metadata }, _server_initializers, _server_extraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            TrackingGateway = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        sessionService = __runInitializers(this, _instanceExtraInitializers);
        server = __runInitializers(this, _server_initializers, void 0);
        logger = (__runInitializers(this, _server_extraInitializers), new common_1.Logger(TrackingGateway.name));
        // Socket ID -> Authenticated User Record
        socketUsers = new Map();
        // Socket ID -> Joined Booking Rooms Set
        socketRooms = new Map();
        constructor(sessionService) {
            this.sessionService = sessionService;
        }
        /**
         * Handle incoming Socket.IO connection
         */
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
        /**
         * Handle client disconnect
         */
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
        /**
         * Room Join: tracking:join
         * Customer / Partner subscribes to tracking:{bookingId}
         */
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
            // Authorize room membership
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
            // Immediately deliver authoritative snapshot to the newly joined client
            const snapshot = this.sessionService.getTrackingSnapshot(bookingId);
            client.emit('tracking:snapshot', snapshot);
        }
        /**
         * Partner GPS Ingestion: partner:location
         * Receives real GPS from partner, validates, sanitizes, deduplicates, and broadcasts.
         */
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
            // Process & Validate through service layer
            const result = this.sessionService.processPartnerLocation(user.userId, location);
            if (!result.success || !result.sanitizedLocation) {
                // If error is insignificant movement deduplication, do not warn
                if (result.error !== 'INSIGNIFICANT_MOVEMENT_DEDUPLICATED') {
                    this.logger.debug(`[GPSDropped] Partner ${user.userId} on ${bookingId}: ${result.error}`);
                }
                return;
            }
            const sanitizedLocation = result.sanitizedLocation;
            const roomName = `tracking:${bookingId}`;
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
                this.logger.log(`[RecoveryPersisted] Booking ${bookingId}: Lat ${sanitizedLocation.latitude}, Lon ${sanitizedLocation.longitude}`);
            }
        }
        /**
         * Authoritative Status Notification: tracking:status
         */
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
    return TrackingGateway = _classThis;
})();
exports.TrackingGateway = TrackingGateway;
