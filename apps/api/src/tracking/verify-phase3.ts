/**
 * Phase 3 Real-time Socket.IO Live Tracking Integration Verification
 * 
 * Tests the real end-to-end flow:
 * 1. LocationValidationService bounds, accuracy, and jump detection
 * 2. Socket.IO connection & handshake
 * 3. Customer + Partner authorization and room join: tracking:{bookingId}
 * 4. Authoritative snapshot delivery (tracking:snapshot)
 * 5. Partner physical GPS emission -> Server validation -> Sanitized room broadcast (tracking:location)
 * 6. Unauthorized access rejection (wrong customer/partner)
 */

import { LocationValidationService } from './location-validation.service';
import { TrackingSessionService } from './tracking-session.service';
import { TrackingGateway } from './tracking.gateway';
import { io as ClientSocket } from 'socket.io-client';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

async function runVerification() {
  console.log('============================================================');
  console.log('PHASE 3 VERIFICATION: REAL-TIME SOCKET.IO LIVE TRACKING');
  console.log('============================================================\n');

  // Step 1: Unit Validation Check
  console.log('[STEP 1] Validating LocationValidationService...');
  const validator = new LocationValidationService();

  // Test 1: Valid coordinate
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

  // Test 2: Out of bounds
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

  // Test 3: Stale coordinates
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

  // Test 4: Physical jump / teleportation detection
  const jumpRes = validator.validatePartnerLocation(
    {
      bookingId: 'SRV-TEST-B101',
      partnerId: 'part-uuid-2222',
      latitude: 13.5000,
      longitude: 77.5946,
      timestamp: new Date().toISOString(),
    },
    {
      bookingId: 'SRV-TEST-B101',
      partnerId: 'part-uuid-2222',
      latitude: 12.9716,
      longitude: 77.5946,
      accuracy: 10,
      timestamp: new Date(Date.now() - 1000).toISOString(),
    }
  );
  if (jumpRes.isValid || jumpRes.reason !== 'IMPOSSIBLE_MOVEMENT_JUMP_DETECTED') {
    throw new Error(`Jump check failed: ${jumpRes.reason}`);
  }
  console.log('  ✓ Impossible speed jump (>50 m/s ~ 180 km/h) correctly rejected (IMPOSSIBLE_MOVEMENT_JUMP_DETECTED)');

  // Step 2: Socket.IO Gateway & Room Communication
  console.log('\n[STEP 2] Initializing Socket.IO Tracking Gateway...');
  const httpServer = createServer();
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
    path: '/socket.io',
  });

  const geofenceService = new (require('./geofence.service').GeofenceService)();
  const pushNotificationService = new (require('./push-notification.service').PushNotificationService)();
  const featureFlagsService = new (require('./tracking-feature-flags.service').TrackingFeatureFlagsService)();
  const sessionService = new TrackingSessionService(validator, geofenceService, pushNotificationService, featureFlagsService);
  const gateway = new TrackingGateway(sessionService);
  (gateway as any).server = io.of('/tracking');

  const validBookingId = 'SRV-TEST-B101';
  const customerId = 'cust-uuid-1111';
  const partnerId = 'part-uuid-2222';
  const unauthorizedCustomerId = 'cust-uuid-attacker';

  // Seed authoritative booking session in sessionService
  sessionService.registerOrUpdateBooking({
    bookingId: validBookingId,
    bookingNumber: 'SRV-TEST-B101',
    bookingStatus: 'ASSIGNED' as any,
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

  // Wire up socket gateway listeners
  io.of('/tracking').use(async (socket, next) => {
    try {
      await gateway.handleConnection(socket as any);
      next();
    } catch (err: any) {
      next(err);
    }
  });

  io.of('/tracking').on('connection', (socket) => {
    socket.on('tracking:join', (data) => gateway.handleJoinRoom(socket as any, data));
    socket.on('partner:location', (data) => gateway.handlePartnerLocation(socket as any, data));
    socket.on('disconnect', () => gateway.handleDisconnect(socket as any));
  });

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const port = (httpServer.address() as any).port;
  console.log(`  ✓ Gateway listening on port ${port} (namespace: /tracking)`);


  // Step 3: Test Unauthorized Customer
  console.log('\n[STEP 3] Testing Authorization & Rejection...');
  const rogueSocket = ClientSocket(`http://localhost:${port}/tracking`, {
    auth: {
      token: 'token-unauthorized',
      userId: unauthorizedCustomerId,
      role: 'CUSTOMER',
    },
    transports: ['websocket'],
  });

  await new Promise<void>((resolve, reject) => {
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

  // Step 4: Test Authorized Customer & Partner Room Join + Snapshot + Live GPS
  console.log('\n[STEP 4] Testing Real-time Customer & Partner Live GPS Pipeline...');
  const customerSocket = ClientSocket(`http://localhost:${port}/tracking`, {
    auth: {
      token: 'valid-token',
      userId: customerId,
      role: 'CUSTOMER',
    },
    transports: ['websocket'],
  });

  const partnerSocket = ClientSocket(`http://localhost:${port}/tracking`, {
    auth: {
      token: 'valid-token',
      userId: partnerId,
      role: 'PARTNER',
    },
    transports: ['websocket'],
  });

  await new Promise<void>((resolve, reject) => {
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

    // Customer receives live sanitized broadcast
    customerSocket.on('tracking:location', (location) => {
      console.log(`  ✓ Customer RECEIVED live broadcasted location: lat=${location.latitude}, lon=${location.longitude}, speed=${location.speed} m/s, heading=${location.heading}°`);
      if (location.bookingId === validBookingId && Math.abs(location.latitude - 12.9720) < 0.0001) {
        resolve();
      } else {
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
