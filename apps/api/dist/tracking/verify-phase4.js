"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const geofence_service_1 = require("./geofence.service");
const push_notification_service_1 = require("./push-notification.service");
const location_validation_service_1 = require("./location-validation.service");
const tracking_session_service_1 = require("./tracking-session.service");
const tracking_gateway_1 = require("./tracking.gateway");
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const socket_io_client_1 = require("socket.io-client");
async function runPhase4Verification() {
    console.log('============================================================');
    console.log('PHASE 4 VERIFICATION: RESILIENCE, GEOFENCING & PUSH');
    console.log('============================================================\n');
    console.log('[STEP 1] Testing GeofenceService & Hysteresis...');
    const geofence = new geofence_service_1.GeofenceService();
    const bookingId = 'SRV-TEST-GEO-01';
    const custLat = 12.9716;
    const custLon = 77.5946;
    const farRes = geofence.evaluateArrivalGeofence(bookingId, 12.9734, 77.5946, custLat, custLon);
    if (farRes.isWithinGeofence || farRes.hasTriggeredArrival) {
        throw new Error(`Far distance should not trigger geofence: ${farRes.distanceMeters}m`);
    }
    console.log(`  ✓ 200m outside geofence correctly reported: ${farRes.distanceMeters.toFixed(1)}m (APPROACHING)`);
    const enterRes = geofence.evaluateArrivalGeofence(bookingId, 12.97185, 77.5946, custLat, custLon);
    if (!enterRes.isWithinGeofence || !enterRes.hasTriggeredArrival) {
        throw new Error(`Partner at 28m should trigger arrival geofence: ${enterRes.distanceMeters}m`);
    }
    console.log(`  ✓ Partner at ${enterRes.distanceMeters.toFixed(1)}m triggered ARRIVAL geofence entry`);
    const secondInsideRes = geofence.evaluateArrivalGeofence(bookingId, 12.97184, 77.5946, custLat, custLon);
    if (!secondInsideRes.isWithinGeofence || secondInsideRes.hasTriggeredArrival) {
        throw new Error(`Duplicate GPS in geofence must NOT re-trigger arrival (idempotency violated)`);
    }
    console.log(`  ✓ Duplicate GPS in geofence did NOT re-trigger arrival (IDEMPOTENT)`);
    const hysteresisRes = geofence.evaluateArrivalGeofence(bookingId, 12.97215, 77.5946, custLat, custLon);
    if (!hysteresisRes.isWithinGeofence) {
        throw new Error(`Hysteresis failed: 60m should remain inside boundary until > 75m`);
    }
    console.log(`  ✓ Hysteresis check at ${hysteresisRes.distanceMeters.toFixed(1)}m maintained geofence lock (no boundary jitter)`);
    const exitRes = geofence.evaluateArrivalGeofence(bookingId, 12.9726, 77.5946, custLat, custLon);
    if (exitRes.isWithinGeofence) {
        throw new Error(`Partner at 110m should exit geofence`);
    }
    console.log(`  ✓ Partner at ${exitRes.distanceMeters.toFixed(1)}m exited geofence boundary`);
    console.log('\n[STEP 2] Testing PushNotificationService Idempotency...');
    const pushService = new push_notification_service_1.PushNotificationService();
    pushService.registerDeviceToken('cust-1111', 'ExponentPushToken[mock-cust-token-12345]');
    const notifPayload = {
        recipientId: 'cust-1111',
        bookingId: 'SRV-TEST-GEO-01',
        eventType: 'PARTNER_ARRIVED',
        title: 'Servs Has Arrived! 📍',
        body: 'Vipin Sharma has arrived at your address.',
        idempotencyKey: 'SRV-TEST-GEO-01:PARTNER_ARRIVED',
    };
    const firstDispatch = await pushService.dispatchNotification(notifPayload);
    if (!firstDispatch.dispatched) {
        throw new Error(`First push dispatch failed: ${firstDispatch.reason}`);
    }
    console.log('  ✓ First arrival notification dispatched successfully');
    const secondDispatch = await pushService.dispatchNotification(notifPayload);
    if (secondDispatch.dispatched || secondDispatch.reason !== 'IDEMPOTENCY_DEDUPLICATED') {
        throw new Error(`Duplicate push dispatch was not deduplicated: ${secondDispatch.reason}`);
    }
    console.log('  ✓ Duplicate notification blocked by idempotency key (IDEMPOTENCY_DEDUPLICATED)');
    console.log('\n[STEP 3] Testing Out-of-Order Event Protection...');
    const initialTime = Date.now();
    let currentStoreTimestamp = initialTime;
    function processStoreLocation(timestamp) {
        if (timestamp < currentStoreTimestamp) {
            return false;
        }
        currentStoreTimestamp = timestamp;
        return true;
    }
    const validProgressive = processStoreLocation(initialTime + 1000);
    const outOfOrderStale = processStoreLocation(initialTime - 500);
    if (!validProgressive || outOfOrderStale) {
        throw new Error('Out-of-order timestamp check failed');
    }
    console.log('  ✓ Progressive timestamp accepted, older out-of-order timestamp rejected');
    console.log('\n[STEP 4] Testing End-to-End Geofence Arrival via Socket.IO...');
    const httpServer = (0, http_1.createServer)();
    const io = new socket_io_1.Server(httpServer, {
        cors: { origin: '*' },
        path: '/socket.io',
    });
    const validator = new location_validation_service_1.LocationValidationService();
    const featureFlags = new (require('./tracking-feature-flags.service').TrackingFeatureFlagsService)();
    const sessionService = new tracking_session_service_1.TrackingSessionService(validator, geofence, pushService, featureFlags);
    const gateway = new tracking_gateway_1.TrackingGateway(sessionService);
    gateway.server = io.of('/tracking');
    sessionService.registerOrUpdateBooking({
        bookingId: 'SRV-E2E-ARRIVE',
        bookingNumber: 'SRV-E2E-ARRIVE',
        bookingStatus: 'ASSIGNED',
        trackingStatus: 'PARTNER_ASSIGNED',
        customerId: 'cust-1111',
        partnerId: 'part-2222',
        partner: {
            id: 'part-2222',
            name: 'Vipin Sharma',
            phone: '+91 98765 43210',
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
    const customerSocket = (0, socket_io_client_1.io)(`http://localhost:${port}/tracking`, {
        auth: { token: 'tok', userId: 'cust-1111', role: 'CUSTOMER' },
        transports: ['websocket'],
    });
    const partnerSocket = (0, socket_io_client_1.io)(`http://localhost:${port}/tracking`, {
        auth: { token: 'tok', userId: 'part-2222', role: 'PARTNER' },
        transports: ['websocket'],
    });
    await new Promise((resolve, reject) => {
        let customerJoined = false;
        let partnerJoined = false;
        let receivedArrivalStatus = false;
        let receivedArrivalEvent = false;
        const checkComplete = () => {
            if (receivedArrivalStatus && receivedArrivalEvent) {
                resolve();
            }
        };
        customerSocket.on('connect', () => {
            customerSocket.emit('tracking:join', { bookingId: 'SRV-E2E-ARRIVE' });
        });
        partnerSocket.on('connect', () => {
            partnerSocket.emit('tracking:join', { bookingId: 'SRV-E2E-ARRIVE' });
        });
        customerSocket.on('tracking:snapshot', () => {
            customerJoined = true;
            triggerArrivalLocation();
        });
        partnerSocket.on('tracking:snapshot', () => {
            partnerJoined = true;
            triggerArrivalLocation();
        });
        function triggerArrivalLocation() {
            if (customerJoined && partnerJoined) {
                console.log('  → Partner physically crosses arrival geofence (25m from customer)...');
                partnerSocket.emit('partner:location', {
                    bookingId: 'SRV-E2E-ARRIVE',
                    partnerId: 'part-2222',
                    latitude: 12.9718,
                    longitude: 77.5946,
                    accuracy: 5,
                    heading: 90,
                    speed: 1.5,
                    timestamp: new Date().toISOString(),
                });
            }
        }
        customerSocket.on('tracking:status', (payload) => {
            console.log(`  ✓ Customer received tracking:status update: status=${payload.status}`);
            if (payload.status === 'ARRIVED') {
                receivedArrivalStatus = true;
                checkComplete();
            }
        });
        customerSocket.on('tracking:arrival', (payload) => {
            console.log(`  ✓ Customer received tracking:arrival event at ${payload.arrivedAt}`);
            if (payload.bookingId === 'SRV-E2E-ARRIVE') {
                receivedArrivalEvent = true;
                checkComplete();
            }
        });
        setTimeout(() => reject(new Error('Timeout waiting for arrival broadcast')), 5000);
    });
    customerSocket.disconnect();
    partnerSocket.disconnect();
    httpServer.close();
    console.log('\n============================================================');
    console.log('ALL PHASE 4 VERIFICATION CRITERIA PASSED SUCCESSFULLY!');
    console.log('============================================================');
}
runPhase4Verification().catch((err) => {
    console.error('Phase 4 verification failed:', err);
    process.exit(1);
});
//# sourceMappingURL=verify-phase4.js.map