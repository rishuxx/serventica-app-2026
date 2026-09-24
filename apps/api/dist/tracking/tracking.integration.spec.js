"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const socket_io_client_1 = require("socket.io-client");
const tracking_gateway_1 = require("./tracking.gateway");
const location_validation_service_1 = require("./location-validation.service");
const tracking_session_service_1 = require("./tracking-session.service");
describe('Phase 3: Production Real-time Socket.IO Tracking Ecosystem', () => {
    let app;
    let validationService;
    let sessionService;
    let gateway;
    let port;
    const validBookingId = 'SRV-TEST-B101';
    const customerId = 'cust-uuid-1111';
    const partnerId = 'part-uuid-2222';
    const unauthorizedCustomerId = 'cust-uuid-attacker';
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            providers: [
                tracking_gateway_1.TrackingGateway,
                location_validation_service_1.LocationValidationService,
                tracking_session_service_1.TrackingSessionService,
            ],
        }).compile();
        app = moduleFixture.createNestApplication();
        await app.listen(0);
        const address = app.getHttpServer().address();
        port = typeof address === 'string' ? 3000 : address.port;
        validationService = moduleFixture.get(location_validation_service_1.LocationValidationService);
        sessionService = moduleFixture.get(tracking_session_service_1.TrackingSessionService);
        gateway = moduleFixture.get(tracking_gateway_1.TrackingGateway);
    });
    afterAll(async () => {
        await app.close();
    });
    describe('1. LocationValidationService Unit Verification', () => {
        it('should validate valid physical GPS coordinates', () => {
            const result = validationService.validateCoordinates(12.9716, 77.5946, 12, Date.now());
            expect(result.isValid).toBe(true);
            expect(result.reason).toBeUndefined();
        });
        it('should reject out-of-bounds latitude/longitude', () => {
            expect(validationService.validateCoordinates(95, 77.5946).isValid).toBe(false);
            expect(validationService.validateCoordinates(-95, 77.5946).isValid).toBe(false);
            expect(validationService.validateCoordinates(12.9716, 190).isValid).toBe(false);
            expect(validationService.validateCoordinates(12.9716, -190).isValid).toBe(false);
        });
        it('should reject stale GPS timestamps older than 15s', () => {
            const staleTimestamp = Date.now() - 25000;
            const result = validationService.validateCoordinates(12.9716, 77.5946, 10, staleTimestamp);
            expect(result.isValid).toBe(false);
            expect(result.reason).toContain('Stale GPS');
        });
        it('should reject low GPS accuracy (> 100 meters)', () => {
            const result = validationService.validateCoordinates(12.9716, 77.5946, 150, Date.now());
            expect(result.isValid).toBe(false);
            expect(result.reason).toContain('Low GPS accuracy');
        });
        it('should detect unrealistic physical speed jumps (> 50 m/s ~ 180 km/h)', () => {
            const prevLoc = {
                latitude: 12.9716,
                longitude: 77.5946,
                timestamp: Date.now() - 1000,
            };
            const teleportedLoc = {
                latitude: 13.0716,
                longitude: 77.5946,
                timestamp: Date.now(),
            };
            const result = validationService.detectJump(prevLoc, teleportedLoc);
            expect(result.isJump).toBe(true);
            expect(result.speedMps).toBeGreaterThan(50);
        });
        it('should calculate accurate forward bearing', () => {
            const bearing = validationService.calculateBearing(12.0, 77.0, 13.0, 77.0);
            expect(Math.round(bearing)).toBe(0);
        });
    });
    describe('2. Socket.IO Real-time Tracking Room & Broadcast Flow', () => {
        let customerSocket;
        let partnerSocket;
        afterEach(() => {
            if (customerSocket && customerSocket.connected)
                customerSocket.disconnect();
            if (partnerSocket && partnerSocket.connected)
                partnerSocket.disconnect();
        });
        it('should authenticate client and deliver snapshot upon authorized room join', (done) => {
            customerSocket = (0, socket_io_client_1.io)(`http://localhost:${port}/tracking`, {
                auth: {
                    token: `valid-token-for-${customerId}`,
                    userId: customerId,
                    role: 'CUSTOMER',
                },
                transports: ['websocket'],
            });
            customerSocket.on('connect', () => {
                customerSocket.emit('tracking:join', { bookingId: validBookingId });
            });
            customerSocket.on('tracking:snapshot', (snapshot) => {
                expect(snapshot).toBeDefined();
                expect(snapshot.bookingId).toBe(validBookingId);
                expect(snapshot.trackingStatus).toBe('PARTNER_ASSIGNED');
                expect(snapshot.partner).toBeDefined();
                expect(snapshot.serviceLocation).toBeDefined();
                done();
            });
        });
        it('should reject unauthorized customer attempting to join another booking room', (done) => {
            const rogueSocket = (0, socket_io_client_1.io)(`http://localhost:${port}/tracking`, {
                auth: {
                    token: 'token-unauthorized',
                    userId: unauthorizedCustomerId,
                    role: 'CUSTOMER',
                },
                transports: ['websocket'],
            });
            rogueSocket.on('connect', () => {
                rogueSocket.emit('tracking:join', { bookingId: validBookingId });
            });
            rogueSocket.on('tracking:error', (error) => {
                expect(error).toBeDefined();
                expect(error.code).toBe('FORBIDDEN');
                expect(error.message).toContain('Unauthorized');
                rogueSocket.disconnect();
                done();
            });
        });
        it('should receive partner physical GPS, sanitize, and broadcast to customer room', (done) => {
            customerSocket = (0, socket_io_client_1.io)(`http://localhost:${port}/tracking`, {
                auth: {
                    token: 'valid-token',
                    userId: customerId,
                    role: 'CUSTOMER',
                },
                transports: ['websocket'],
            });
            partnerSocket = (0, socket_io_client_1.io)(`http://localhost:${port}/tracking`, {
                auth: {
                    token: 'valid-token',
                    userId: partnerId,
                    role: 'PARTNER',
                },
                transports: ['websocket'],
            });
            let customerJoined = false;
            let partnerJoined = false;
            const maybeEmitPartnerGPS = () => {
                if (customerJoined && partnerJoined) {
                    partnerSocket.emit('partner:location', {
                        bookingId: validBookingId,
                        partnerId: partnerId,
                        latitude: 12.9720,
                        longitude: 77.5950,
                        accuracy: 10,
                        heading: 45,
                        speed: 5.5,
                        timestamp: new Date().toISOString(),
                    });
                }
            };
            customerSocket.on('tracking:snapshot', () => {
                customerJoined = true;
                maybeEmitPartnerGPS();
            });
            partnerSocket.on('tracking:snapshot', () => {
                partnerJoined = true;
                maybeEmitPartnerGPS();
            });
            customerSocket.on('connect', () => {
                customerSocket.emit('tracking:join', { bookingId: validBookingId });
            });
            partnerSocket.on('connect', () => {
                partnerSocket.emit('tracking:join', { bookingId: validBookingId });
            });
            customerSocket.on('tracking:location', (data) => {
                expect(data).toBeDefined();
                expect(data.bookingId).toBe(validBookingId);
                expect(data.latitude).toBeCloseTo(12.9720, 4);
                expect(data.longitude).toBeCloseTo(77.5950, 4);
                expect(data.accuracy).toBe(10);
                expect(data.heading).toBe(45);
                expect(data.speed).toBe(5.5);
                done();
            });
        });
    });
});
//# sourceMappingURL=tracking.integration.spec.js.map