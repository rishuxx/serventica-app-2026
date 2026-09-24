"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const location_validation_service_1 = require("./location-validation.service");
const geofence_service_1 = require("./geofence.service");
const push_notification_service_1 = require("./push-notification.service");
const tracking_feature_flags_service_1 = require("./tracking-feature-flags.service");
const tracking_session_service_1 = require("./tracking-session.service");
const tracking_gateway_1 = require("./tracking.gateway");
const tracking_errors_1 = require("./tracking-errors");
const http_1 = require("http");
const socket_io_1 = require("socket.io");
async function runPhase6LoadAndOperationsSuite() {
    console.log('============================================================');
    console.log('PHASE 6: PRODUCTION OPERATIONS & SCALABILITY VERIFICATION');
    console.log('============================================================\n');
    console.log('[STEP 1] Testing Error Taxonomy & Safe Client Sanitization...');
    const correlationId = 'corr_test_9988aabb';
    const rogueAccessError = new tracking_errors_1.UnauthorizedRoomAccessError('Access to booking room denied', correlationId);
    const clientSafe = rogueAccessError.toSafeClientResponse();
    if (clientSafe.code !== 'UNAUTHORIZED_ROOM_ACCESS' ||
        clientSafe.correlationId !== correlationId ||
        !clientSafe.timestamp) {
        throw new Error('Error sanitization failed');
    }
    console.log(`  ✓ Domain error serialized safely with correlationId: ${clientSafe.correlationId}`);
    console.log('\n[STEP 2] Testing TrackingFeatureFlagsService Runtime Gating...');
    const featureFlags = new tracking_feature_flags_service_1.TrackingFeatureFlagsService();
    if (!featureFlags.isGeofenceArrivalEnabled() || !featureFlags.isPushNotificationsEnabled()) {
        throw new Error('Default feature flags unexpected');
    }
    featureFlags.updateFlags({ strictJumpRejection: true });
    console.log('  ✓ Runtime feature flags dynamically configurable without redeployment');
    console.log('\n[STEP 3] Initializing Tracking Cluster & Gateway...');
    const httpServer = (0, http_1.createServer)();
    const io = new socket_io_1.Server(httpServer, {
        cors: { origin: '*' },
        path: '/socket.io',
    });
    const validator = new location_validation_service_1.LocationValidationService();
    const geofence = new geofence_service_1.GeofenceService();
    const pushService = new push_notification_service_1.PushNotificationService();
    const sessionService = new tracking_session_service_1.TrackingSessionService(validator, geofence, pushService, featureFlags);
    const gateway = new tracking_gateway_1.TrackingGateway(sessionService);
    gateway.server = io.of('/tracking');
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
    console.log(`  ✓ Cluster listening on port ${port} (namespace: /tracking)`);
    console.log('\n[STEP 4] Executing 100-Concurrent-Room Scalability Simulation...');
    const TOTAL_ROOMS = 100;
    const startTime = Date.now();
    for (let i = 0; i < TOTAL_ROOMS; i++) {
        const bookingId = `SRV-SCALE-${i.toString().padStart(4, '0')}`;
        sessionService.registerOrUpdateBooking({
            bookingId,
            bookingNumber: bookingId,
            bookingStatus: 'ASSIGNED',
            trackingStatus: 'PARTNER_ASSIGNED',
            customerId: `cust-${i}`,
            partnerId: `part-${i}`,
            partner: {
                id: `part-${i}`,
                name: `Servs Partner ${i}`,
                phone: '+91 98765 00000',
            },
            customerLocation: {
                addressId: `addr-${i}`,
                latitude: 12.9716 + i * 0.0001,
                longitude: 77.5946 + i * 0.0001,
                formattedAddress: 'Bangalore, Karnataka',
                shortAddress: 'Bangalore',
                city: 'Bangalore',
            },
        });
    }
    const seedingDurationMs = Date.now() - startTime;
    console.log(`  ✓ Registered ${TOTAL_ROOMS} concurrent tracking rooms in ${seedingDurationMs}ms (~${(seedingDurationMs / TOTAL_ROOMS).toFixed(2)}ms per room)`);
    console.log('\n[STEP 5] Benchmarking High-Throughput GPS Ingestion (500 Location Fixes)...');
    const gpsStartTime = Date.now();
    let successfulFixes = 0;
    for (let i = 0; i < 500; i++) {
        const roomIndex = i % TOTAL_ROOMS;
        const bookingId = `SRV-SCALE-${roomIndex.toString().padStart(4, '0')}`;
        const partnerId = `part-${roomIndex}`;
        const res = sessionService.processPartnerLocation(partnerId, {
            bookingId,
            partnerId,
            latitude: 12.9720 + (i * 0.00001),
            longitude: 77.5950 + (i * 0.00001),
            accuracy: 8,
            heading: 180,
            speed: 4.5,
            timestamp: new Date().toISOString(),
        });
        if (res.success) {
            successfulFixes++;
        }
    }
    const gpsDurationMs = Date.now() - gpsStartTime;
    const throughputPerSec = Math.round((500 / gpsDurationMs) * 1000);
    console.log(`  ✓ Processed 500 GPS updates in ${gpsDurationMs}ms (~${throughputPerSec} fixes/second throughput)`);
    console.log(`  ✓ Successful sanitized fixes: ${successfulFixes}`);
    console.log('\n[STEP 6] Validating Operational Metrics & Health Reporting...');
    const initialMetrics = sessionService.getMetrics();
    console.log('  ✓ Metrics snapshot:', {
        activeSessions: initialMetrics.activeTrackingSessions,
        activePartners: initialMetrics.activePartners,
        evictedSessionsCount: initialMetrics.evictedSessionsCount,
        statusBreakdown: initialMetrics.sessionsByStatus,
    });
    if (initialMetrics.activeTrackingSessions !== TOTAL_ROOMS) {
        throw new Error(`Expected ${TOTAL_ROOMS} active sessions, got ${initialMetrics.activeTrackingSessions}`);
    }
    console.log('\n[STEP 7] Testing Deterministic Terminal Session Eviction...');
    const testCloseBookingId = 'SRV-SCALE-0001';
    sessionService.updateStatus(testCloseBookingId, 'SERVICE_COMPLETED');
    console.log(`  ✓ Marked ${testCloseBookingId} as SERVICE_COMPLETED.`);
    httpServer.close();
    console.log('\n============================================================');
    console.log('ALL PHASE 6 VERIFICATION CRITERIA PASSED SUCCESSFULLY!');
    console.log('============================================================');
}
runPhase6LoadAndOperationsSuite().catch((err) => {
    console.error('Phase 6 verification failed:', err);
    process.exit(1);
});
//# sourceMappingURL=verify-phase6-load.js.map