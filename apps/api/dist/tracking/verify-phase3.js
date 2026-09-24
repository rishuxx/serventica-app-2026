"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const location_validation_service_1 = require("./location-validation.service");
const tracking_session_service_1 = require("./tracking-session.service");
const tracking_gateway_1 = require("./tracking.gateway");
const socket_io_client_1 = require("socket.io-client");
const http_1 = require("http");
const socket_io_1 = require("socket.io");
async function runVerification() {
    console.log('============================================================');
    console.log('PHASE 3 VERIFICATION: REAL-TIME SOCKET.IO LIVE TRACKING');
    console.log('============================================================\n');
    console.log('[STEP 1] Validating LocationValidationService...');
    const validator = new location_validation_service_1.LocationValidationService();
    const validRes = validator.validatePartnerLocation({
        bookingId: 'SRV-TEST-B101',
        partnerId: 'part-uuid-2222',
        latitude: 12.9716,
        longitude: 77.5946,
        accuracy: 10,
        timestamp: new Date().toISOString(),
    });
    if (!validRes.isValid) {
        throw new Error(`Valid coordinate rejected: ${validRes.reason}`);
    }
    console.log('  ✓ Valid physical GPS coordinates accepted and sanitized');
    const outOfBounds = validator.validatePartnerLocation({
        bookingId: 'SRV-TEST-B101',
        partnerId: 'part-uuid-2222',
        latitude: 95.0,
        longitude: 77.5946,
        timestamp: new Date().toISOString(),
    });
    if (outOfBounds.isValid || outOfBounds.reason !== 'LATITUDE_OUT_OF_BOUNDS') {
        throw new Error(`Out of bounds check failed: ${outOfBounds.reason}`);
    }
    console.log('  ✓ Out-of-bounds coordinates correctly rejected (LATITUDE_OUT_OF_BOUNDS)');
    const staleRes = validator.validatePartnerLocation({
        bookingId: 'SRV-TEST-B101',
        partnerId: 'part-uuid-2222',
        latitude: 12.9716,
        longitude: 77.5946,
        timestamp: new Date(Date.now() - 30000).toISOString(),
    });
    if (staleRes.isValid || staleRes.reason !== 'STALE_GPS_READING') {
        throw new Error(`Stale GPS check failed: ${staleRes.reason}`);
    }
    console.log('  ✓ Stale GPS reading (>15s) correctly rejected (STALE_GPS_READING)');
    const jumpRes = validator.validatePartnerLocation({
        bookingId: 'SRV-TEST-B101',
        partnerId: 'part-uuid-2222',
        latitude: 13.5000,
        longitude: 77.5946,
        timestamp: new Date().toISOString(),
    }, {
        bookingId: 'SRV-TEST-B101',
        partnerId: 'part-uuid-2222',
        latitude: 12.9716,
        longitude: 77.5946,
        accuracy: 10,
        timestamp: new Date(Date.now() - 1000).toISOString(),
    });
    if (jumpRes.isValid || jumpRes.reason !== 'IMPOSSIBLE_MOVEMENT_JUMP_DETECTED') {
        throw new Error(`Jump check failed: ${jumpRes.reason}`);
    }
    console.log('  ✓ Impossible speed jump (>50 m/s ~ 180 km/h) correctly rejected (IMPOSSIBLE_MOVEMENT_JUMP_DETECTED)');
    console.log('\n[STEP 2] Initializing Socket.IO Tracking Gateway...');
    const httpServer = (0, http_1.createServer)();
    const io = new socket_io_1.Server(httpServer, {
        cors: { origin: '*' },
        path: '/socket.io',
    });
    const geofenceService = new (require('./geofence.service').GeofenceService)();
    const pushNotificationService = new (require('./push-notification.service').PushNotificationService)();
    const featureFlagsService = new (require('./tracking-feature-flags.service').TrackingFeatureFlagsService)();
    const sessionService = new tracking_session_service_1.TrackingSessionService(validator, geofenceService, pushNotificationService, featureFlagsService);
    const gateway = new tracking_gateway_1.TrackingGateway(sessionService);
    gateway.server = io.of('/tracking');
    const validBookingId = 'SRV-TEST-B101';
    const customerId = 'cust-uuid-1111';
    const partnerId = 'part-uuid-2222';
    const unauthorizedCustomerId = 'cust-uuid-attacker';
    sessionService.registerOrUpdateBooking({
        bookingId: validBookingId,
        bookingNumber: 'SRV-TEST-B101',
        bookingStatus: 'ASSIGNED',
        trackingStatus: 'PARTNER_ASSIGNED',
        customerId: customerId,
        partnerId: partnerId,
        partner: {
            id: partnerId,
            name: 'Rohan Sharma',
            phone: '+919876543210',
            rating: 4.9,
            specialization: 'Plumbing Expert',
        },
        customerLocation: {
            addressId: 'addr_1',
            latitude: 12.9716,
            longitude: 77.5946,
            formattedAddress: 'MG Road, Bangalore',
            shortAddress: 'MG Road',
            city: 'Bangalore',
        },
    });
    io.of('/tracking').use(async (socket, next) => {
        try {
            await gateway.handleConnection(socket);
            next();
        }
        catch (err) {
            next(err);
        }
    });
    io.of('/tracking').on('connection', (socket) => {
        socket.on('tracking:join', (data) => gateway.handleJoinRoom(socket, data));
        socket.on('partner:location', (data) => gateway.handlePartnerLocation(socket, data));
        socket.on('disconnect', () => gateway.handleDisconnect(socket));
    });
    await new Promise((resolve) => httpServer.listen(0, resolve));
    const port = httpServer.address().port;
    console.log(`  ✓ Gateway listening on port ${port} (namespace: /tracking)`);
    console.log('\n[STEP 3] Testing Authorization & Rejection...');
    const rogueSocket = (0, socket_io_client_1.io)(`http://localhost:${port}/tracking`, {
        auth: {
            token: 'token-unauthorized',
            userId: unauthorizedCustomerId,
            role: 'CUSTOMER',
        },
        transports: ['websocket'],
    });
    await new Promise((resolve, reject) => {
        rogueSocket.on('connect', () => {
            rogueSocket.emit('tracking:join', { bookingId: validBookingId });
        });
        rogueSocket.on('tracking:error', (err) => {
            console.log(`  ✓ Unauthorized client blocked from room: [${err.code}] ${err.message}`);
            rogueSocket.disconnect();
            resolve();
        });
        setTimeout(() => reject(new Error('Timeout waiting for rogue socket rejection')), 3000);
    });
    console.log('\n[STEP 4] Testing Real-time Customer & Partner Live GPS Pipeline...');
    const customerSocket = (0, socket_io_client_1.io)(`http://localhost:${port}/tracking`, {
        auth: {
            token: 'valid-token',
            userId: customerId,
            role: 'CUSTOMER',
        },
        transports: ['websocket'],
    });
    const partnerSocket = (0, socket_io_client_1.io)(`http://localhost:${port}/tracking`, {
        auth: {
            token: 'valid-token',
            userId: partnerId,
            role: 'PARTNER',
        },
        transports: ['websocket'],
    });
    await new Promise((resolve, reject) => {
        let customerReceivedSnapshot = false;
        let partnerReceivedSnapshot = false;
        customerSocket.on('connect', () => {
            customerSocket.emit('tracking:join', { bookingId: validBookingId });
        });
        partnerSocket.on('connect', () => {
            partnerSocket.emit('tracking:join', { bookingId: validBookingId });
        });
        customerSocket.on('tracking:snapshot', (snapshot) => {
            console.log(`  ✓ Customer received authoritative snapshot: status=${snapshot.trackingStatus}, partner=${snapshot.partner?.name}`);
            customerReceivedSnapshot = true;
            triggerGPSIfReady();
        });
        partnerSocket.on('tracking:snapshot', (snapshot) => {
            console.log(`  ✓ Partner received authoritative snapshot: status=${snapshot.trackingStatus}`);
            partnerReceivedSnapshot = true;
            triggerGPSIfReady();
        });
        function triggerGPSIfReady() {
            if (customerReceivedSnapshot && partnerReceivedSnapshot) {
                console.log('  → Partner emitting live physical GPS coordinate (12.9720, 77.5950)...');
                partnerSocket.emit('partner:location', {
                    bookingId: validBookingId,
                    partnerId: partnerId,
                    latitude: 12.9720,
                    longitude: 77.5950,
                    accuracy: 8,
                    heading: 65,
                    speed: 4.2,
                    timestamp: new Date().toISOString(),
                });
            }
        }
        customerSocket.on('tracking:location', (location) => {
            console.log(`  ✓ Customer RECEIVED live broadcasted location: lat=${location.latitude}, lon=${location.longitude}, speed=${location.speed} m/s, heading=${location.heading}°`);
            if (location.bookingId === validBookingId && Math.abs(location.latitude - 12.9720) < 0.0001) {
                resolve();
            }
            else {
                reject(new Error('Received incorrect location payload'));
            }
        });
        setTimeout(() => reject(new Error('Timeout waiting for live location delivery')), 5000);
    });
    customerSocket.disconnect();
    partnerSocket.disconnect();
    httpServer.close();
    console.log('\n============================================================');
    console.log('ALL PHASE 3 VERIFICATION CRITERIA PASSED SUCCESSFULLY!');
    console.log('============================================================');
}
runVerification().catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
});
//# sourceMappingURL=verify-phase3.js.map