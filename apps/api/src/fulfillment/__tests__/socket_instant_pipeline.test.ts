import { createServer, Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { LocationValidationService } from '../../tracking/location-validation.service';
import { GeofenceService } from '../../tracking/geofence.service';
import { PushNotificationService } from '../../tracking/push-notification.service';
import { TrackingFeatureFlagsService } from '../../tracking/tracking-feature-flags.service';
import { TrackingSessionService } from '../../tracking/tracking-session.service';
import { TrackingGateway } from '../../tracking/tracking.gateway';
import { InMemoryFulfillmentRepository } from '../repositories/in-memory-fulfillment.repository';
import { ServicePolicyFactory } from '../policies/service-policy.factory';
import { PricingStrategyFactory } from '../pricing/pricing-strategy.factory';
import {
  ETAService,
  CapacityService,
  PartnerEligibilityService,
  PartnerMatchingService,
  DispatchService,
  AssignmentService,
  ExtensionService,
  CancellationService,
  BookingLifecycleService,
  NotificationService,
} from '../services';
import { FulfillmentOutboxService } from '../fulfillment-outbox.service';
import { BookingRecord } from '../repositories/fulfillment.repository.interface';
import { BookingAssignment } from '@serventica/types';

describe('Phase 3 Real-Time Socket.IO Live Tracking & Fulfillment Bridge', () => {
  let httpServer: HttpServer;
  let ioServer: SocketIOServer;
  let serverPort: number;

  let sessionService: TrackingSessionService;
  let gateway: TrackingGateway;
  let repository: InMemoryFulfillmentRepository;
  let policyFactory: ServicePolicyFactory;
  let pricingFactory: PricingStrategyFactory;
  let etaService: ETAService;
  let capacityService: CapacityService;
  let eligibilityService: PartnerEligibilityService;
  let matchingService: PartnerMatchingService;
  let dispatchService: DispatchService;
  let outboxService: FulfillmentOutboxService;
  let assignmentService: AssignmentService;
  let notificationService: NotificationService;
  let lifecycleService: BookingLifecycleService;
  let extensionService: ExtensionService;
  let cancellationService: CancellationService;

  // Real Dehradun coordinates matching seeded partners
  const DEHRADUN_LAT = 30.316494;
  const DEHRADUN_LON = 78.032191;

  function createMockBooking(overrides: Partial<BookingRecord> & { id: string }): BookingRecord {
    return {
      booking_number: `SRV-${overrides.id}`,
      customer_id: 'cust_socket_01',
      service_id: 'helping-hand',
      fulfillment_mode: 'INSTANT',
      status: 'CONFIRMED',
      latitude: DEHRADUN_LAT,
      longitude: DEHRADUN_LON,
      address_id: 'addr_test',
      address_line: 'Rajpur Road, Dehradun',
      subtotal: 143,
      total: 168.74,
      currency: 'INR',
      required_partner_count: 1,
      assigned_partner_ids: [],
      pricing_snapshot: { totalPayable: 168.74, expiresAt: new Date().toISOString() } as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  function createMockAssignment(overrides: Partial<BookingAssignment> & { id: string; bookingId: string; partnerId: string }): BookingAssignment {
    return {
      role: 'PRIMARY',
      assignmentStatus: 'ASSIGNED',
      payoutAmount: 135,
      currency: 'INR',
      assignedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  beforeAll(async () => {
    httpServer = createServer();
    ioServer = new SocketIOServer(httpServer, {
      cors: { origin: '*' },
      path: '/socket.io',
    });

    const validator = new LocationValidationService();
    const geofence = new GeofenceService();
    const pushNotificationService = new PushNotificationService();
    const featureFlagsService = new TrackingFeatureFlagsService();

    sessionService = new TrackingSessionService(validator, geofence, pushNotificationService, featureFlagsService);
    gateway = new TrackingGateway(sessionService);
    (gateway as any).server = ioServer.of('/tracking');

    // Attach tracking namespace handlers
    const nsp = ioServer.of('/tracking');
    nsp.use(async (socket, next) => {
      try {
        await gateway.handleConnection(socket as any);
        next();
      } catch (err: any) {
        next(err);
      }
    });

    nsp.on('connection', (socket) => {
      socket.on('tracking:join', (data) => gateway.handleJoinRoom(socket as any, data));
      socket.on('partner:subscribe_offers', (data) => gateway.handleSubscribeOffers(socket as any, data));
      socket.on('partner:location', (data) => gateway.handlePartnerLocation(socket as any, data));
      socket.on('disconnect', () => gateway.handleDisconnect(socket as any));
    });

    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    serverPort = (httpServer.address() as any).port;

    // Domain services instantiation
    repository = new InMemoryFulfillmentRepository();
    policyFactory = new ServicePolicyFactory();
    pricingFactory = new PricingStrategyFactory();
    etaService = new ETAService();
    capacityService = new CapacityService();
    eligibilityService = new PartnerEligibilityService();
    matchingService = new PartnerMatchingService(etaService);
    dispatchService = new DispatchService(repository, eligibilityService, matchingService, policyFactory, gateway);
    outboxService = new FulfillmentOutboxService(pushNotificationService, gateway);
    assignmentService = new AssignmentService(repository, dispatchService, outboxService, gateway);
    notificationService = new NotificationService();
    lifecycleService = new BookingLifecycleService(repository, outboxService, notificationService, etaService, gateway);
    extensionService = new ExtensionService(repository, capacityService, pricingFactory, outboxService, gateway);
    cancellationService = new CancellationService(repository, dispatchService, outboxService, gateway);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => ioServer.close(() => resolve()));
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  function createClient(userId: string, role: 'CUSTOMER' | 'PARTNER'): ClientSocketType {
    return ClientSocket(`http://127.0.0.1:${serverPort}/tracking`, {
      auth: { token: 'valid-test-token', userId, role },
      transports: ['websocket'],
    });
  }

  describe('1. Topology & Offer Broadcasts (partner:{partnerId})', () => {
    let partnerSocket: ClientSocketType;

    afterEach(() => {
      partnerSocket?.disconnect();
    });

    it('partner connects and receives dispatch:new_offer on Wave 1 dispatch', async () => {
      const partnerId = 'prt_hh_01';
      partnerSocket = createClient(partnerId, 'PARTNER');

      await new Promise<void>((resolve) => {
        partnerSocket.on('connect', () => resolve());
      });

      const booking = createMockBooking({
        id: 'bok_socket_wave1',
        customer_id: 'cust_01',
        service_id: 'helping-hand',
        service_requirement: {
          durationMinutes: 60,
          serviceTitle: 'On-Demand Helping Hand',
        },
      });
      await repository.saveBooking(booking);

      const offerPromise = new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for dispatch:new_offer')), 4000);
        partnerSocket.on('dispatch:new_offer', (offer) => {
          clearTimeout(timer);
          resolve(offer);
        });
      });

      await dispatchService.initiateDispatch(booking);
      const receivedOffer = await offerPromise;

      expect(receivedOffer.bookingId).toBe('bok_socket_wave1');
      expect(receivedOffer.serviceType).toBe('helping-hand');
      expect(receivedOffer.durationMinutes).toBe(60);
      expect(receivedOffer.payoutAmount).toBeGreaterThan(0);
      expect(receivedOffer.remainingSeconds).toBeGreaterThan(40);
    });

    it('partner receives dispatch:offer_cancelled when offer is declined', async () => {
      const partnerId = 'prt_hh_01';
      partnerSocket = createClient(partnerId, 'PARTNER');

      await new Promise<void>((resolve) => {
        partnerSocket.on('connect', () => resolve());
      });

      const booking = createMockBooking({
        id: 'bok_socket_decline',
        customer_id: 'cust_01',
        service_id: 'helping-hand',
        service_requirement: {
          durationMinutes: 60,
          serviceTitle: 'Helping Hand Service',
        },
      });
      await repository.saveBooking(booking);

      let capturedOfferId = '';
      const offerReceived = new Promise<void>((resolve) => {
        partnerSocket.on('dispatch:new_offer', (offer) => {
          capturedOfferId = offer.offerId;
          resolve();
        });
      });

      await dispatchService.initiateDispatch(booking);
      await offerReceived;

      const cancelPromise = new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for dispatch:offer_cancelled')), 4000);
        partnerSocket.on('dispatch:offer_cancelled', (payload) => {
          clearTimeout(timer);
          resolve(payload);
        });
      });

      await dispatchService.handleOfferDecline(capturedOfferId, 'TOO_FAR');
      const cancelPayload = await cancelPromise;

      expect(cancelPayload.offerId).toBe(capturedOfferId);
      expect(cancelPayload.reason).toBe('TOO_FAR');
    });
  });

  describe('2. Customer Tracking & Lifecycle Bridge (tracking:{bookingId})', () => {
    let partnerSocket: ClientSocketType;
    let customerSocket: ClientSocketType;
    const partnerId = 'prt_hh_01';
    const customerId = 'cust_socket_01';

    afterEach(() => {
      customerSocket?.disconnect();
      partnerSocket?.disconnect();
    });

    async function setupTrackingPair(testBookingId: string): Promise<void> {
      sessionService.registerOrUpdateBooking({
        bookingId: testBookingId,
        bookingNumber: `SRV-${testBookingId}`,
        bookingStatus: 'ASSIGNED' as any,
        trackingStatus: 'PARTNER_ASSIGNED',
        customerId,
        partnerId,
        partner: {
          id: partnerId,
          name: 'Vikram Singh',
          phone: '+919876500001',
          rating: 4.9,
          specialization: 'Helping Hand Partner',
        },
        customerLocation: {
          addressId: 'addr_socket',
          latitude: DEHRADUN_LAT,
          longitude: DEHRADUN_LON,
          formattedAddress: 'Rajpur Road, Dehradun',
          shortAddress: 'Rajpur Road',
          city: 'Dehradun',
        },
      });

      customerSocket = createClient(customerId, 'CUSTOMER');
      partnerSocket = createClient(partnerId, 'PARTNER');

      await Promise.all([
        new Promise<void>((resolve) => customerSocket.on('connect', resolve)),
        new Promise<void>((resolve) => partnerSocket.on('connect', resolve)),
      ]);

      customerSocket.emit('tracking:join', { bookingId: testBookingId });
      await new Promise<void>((resolve) => {
        customerSocket.on('tracking:snapshot', () => resolve());
      });
    }

    it('customer receives dispatch:matched when partner accepts offer', async () => {
      const bId = 'bok_test_match';
      await setupTrackingPair(bId);

      const booking = createMockBooking({
        id: bId,
        customer_name: 'Aditi Sharma',
        customer_phone: '+919876543210',
        service_requirement: {
          durationMinutes: 60,
          serviceTitle: 'Helping Hand Support',
        },
      });
      await repository.saveBooking(booking);

      let offerId = '';
      const offerReceived = new Promise<void>((resolve) => {
        partnerSocket.on('dispatch:new_offer', (offer) => {
          offerId = offer.offerId;
          resolve();
        });
      });

      await dispatchService.initiateDispatch(booking);
      await offerReceived;

      const matchedPromise = new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for dispatch:matched')), 4000);
        customerSocket.on('dispatch:matched', (payload) => {
          clearTimeout(timer);
          resolve(payload);
        });
      });

      await assignmentService.acceptOffer(offerId, partnerId, { latitude: 30.3182, longitude: 78.0345 });
      const matched = await matchedPromise;

      expect(matched.bookingId).toBe(bId);
      expect(matched.status).toBe('PARTNER_ACCEPTED');
      expect(matched.partner.id).toBe(partnerId);
      expect(matched.partner.name).toBeDefined();
      expect(matched.targetArrivalAt).toBeDefined();
      expect(matched.estimatedArrivalMinutes).toBeGreaterThan(0);
    });

    it('customer receives live sanitized tracking:location when partner streams GPS', async () => {
      const bId = 'bok_test_gps';
      await setupTrackingPair(bId);

      const locationPromise = new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for tracking:location')), 4000);
        customerSocket.on('tracking:location', (loc) => {
          clearTimeout(timer);
          resolve(loc);
        });
      });

      partnerSocket.emit('partner:location', {
        bookingId: bId,
        partnerId,
        latitude: DEHRADUN_LAT + 0.001,
        longitude: DEHRADUN_LON + 0.001,
        accuracy: 10,
        heading: 45,
        speed: 5.5,
        timestamp: new Date().toISOString(),
      });

      const locPayload = await locationPromise;
      expect(locPayload.bookingId).toBe(bId);
      expect(locPayload.latitude).toBeCloseTo(DEHRADUN_LAT + 0.001, 3);
      expect(locPayload.longitude).toBeCloseTo(DEHRADUN_LON + 0.001, 3);
    });

    it('customer receives partner:arrived with verification OTP on doorstep arrival', async () => {
      const bId = 'bok_test_arrived';
      await setupTrackingPair(bId);

      const booking = createMockBooking({
        id: bId,
        status: 'PARTNER_EN_ROUTE',
        assigned_partner_ids: [partnerId],
        service_requirement: { durationMinutes: 60 },
      });
      await repository.saveBooking(booking);

      await repository.saveAssignment(createMockAssignment({
        id: `asg_${bId}`,
        bookingId: bId,
        partnerId,
        assignmentStatus: 'EN_ROUTE',
      }));

      const arrivedPromise = new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for partner:arrived')), 4000);
        customerSocket.on('partner:arrived', (payload) => {
          clearTimeout(timer);
          resolve(payload);
        });
      });

      const res = await lifecycleService.markArrived(bId, partnerId, { latitude: DEHRADUN_LAT, longitude: DEHRADUN_LON });
      const arrivedPayload = await arrivedPromise;

      expect(arrivedPayload.bookingId).toBe(bId);
      expect(arrivedPayload.verificationOtp).toBe(res.verificationOtp);
      expect(arrivedPayload.arrivedAt).toBeDefined();
    });

    it('customer receives job:started when service is started with OTP', async () => {
      const bId = 'bok_test_started';
      await setupTrackingPair(bId);

      const booking = createMockBooking({
        id: bId,
        status: 'PARTNER_ARRIVED',
        verification_otp: '7890',
        assigned_partner_ids: [partnerId],
        service_requirement: { durationMinutes: 60 },
      });
      await repository.saveBooking(booking);

      await repository.saveAssignment(createMockAssignment({
        id: `asg_${bId}`,
        bookingId: bId,
        partnerId,
        assignmentStatus: 'ARRIVED',
      }));

      const startedPromise = new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for job:started')), 4000);
        customerSocket.on('job:started', (payload) => {
          clearTimeout(timer);
          resolve(payload);
        });
      });

      await lifecycleService.startService(bId, partnerId, '7890');
      const startedPayload = await startedPromise;

      expect(startedPayload.bookingId).toBe(bId);
      expect(startedPayload.startedAt).toBeDefined();
    });

    it('partner receives job:extension_prompt and customer receives job:extension_confirmed', async () => {
      const bId = 'bok_test_extension';
      await setupTrackingPair(bId);

      const booking = createMockBooking({
        id: bId,
        status: 'SERVICE_STARTED',
        assigned_partner_ids: [partnerId],
        service_requirement: { durationMinutes: 60 },
      });
      await repository.saveBooking(booking);

      // 1. Customer initiates extension request
      const promptPromise = new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for job:extension_prompt')), 4000);
        partnerSocket.on('job:extension_prompt', (payload) => {
          clearTimeout(timer);
          resolve(payload);
        });
      });

      const extRes = await extensionService.requestExtension(bId, 30);
      const promptPayload = await promptPromise;

      expect(promptPayload.bookingId).toBe(bId);
      expect(promptPayload.extensionId).toBe(extRes.extensionId);
      expect(promptPayload.additionalMinutes).toBe(30);
      expect(promptPayload.additionalPayout).toBeGreaterThan(0);

      // 2. Partner accepts extension
      const confirmPromise = new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for job:extension_confirmed')), 4000);
        customerSocket.on('job:extension_confirmed', (payload) => {
          clearTimeout(timer);
          resolve(payload);
        });
      });

      await extensionService.respondExtension(bId, extRes.extensionId, partnerId, true);
      const confirmPayload = await confirmPromise;

      expect(confirmPayload.bookingId).toBe(bId);
      expect(confirmPayload.extensionId).toBe(extRes.extensionId);
      expect(confirmPayload.newDurationMinutes).toBe(90);
      expect(confirmPayload.newTotal).toBeGreaterThan(168);
    });

    it('customer receives job:completed on job completion', async () => {
      const bId = 'bok_test_completed';
      await setupTrackingPair(bId);

      const booking = createMockBooking({
        id: bId,
        status: 'SERVICE_STARTED',
        assigned_partner_ids: [partnerId],
        service_requirement: { durationMinutes: 60 },
      });
      await repository.saveBooking(booking);

      await repository.saveAssignment(createMockAssignment({
        id: `asg_${bId}`,
        bookingId: bId,
        partnerId,
        assignmentStatus: 'IN_PROGRESS',
      }));

      const completedPromise = new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for job:completed')), 4000);
        customerSocket.on('job:completed', (payload) => {
          clearTimeout(timer);
          resolve(payload);
        });
      });

      await lifecycleService.completeService(bId, partnerId, 'Completed helping hand safely');
      const completedPayload = await completedPromise;

      expect(completedPayload.bookingId).toBe(bId);
      expect(completedPayload.completedAt).toBeDefined();
      expect(completedPayload.total).toBeGreaterThan(0);
    });

    it('customer receives job:redispatching when partner cancels assigned job', async () => {
      const bId = 'bok_socket_redispatch';
      await setupTrackingPair(bId);

      const booking = createMockBooking({
        id: bId,
        status: 'PARTNER_ACCEPTED',
        assigned_partner_ids: [partnerId],
        service_requirement: { durationMinutes: 60, serviceTitle: 'Helping Hand' },
      });
      await repository.saveBooking(booking);

      await repository.saveAssignment(createMockAssignment({
        id: `asg_${bId}`,
        bookingId: bId,
        partnerId,
        assignmentStatus: 'ACCEPTED',
      }));

      const redispatchPromise = new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for job:redispatching')), 4000);
        customerSocket.on('job:redispatching', (payload) => {
          clearTimeout(timer);
          resolve(payload);
        });
      });

      await cancellationService.cancelByPartner(bId, partnerId, 'Bike puncture');
      const redispatchPayload = await redispatchPromise;

      expect(redispatchPayload.bookingId).toBe(bId);
      expect(redispatchPayload.message).toContain('replacement partner');
    });

    it('customer receives job:cancelled when customer cancels active booking', async () => {
      const bId = 'bok_test_cust_cancel';
      await setupTrackingPair(bId);

      const booking = createMockBooking({
        id: bId,
        status: 'PARTNER_EN_ROUTE',
        assigned_partner_ids: [partnerId],
        service_requirement: { durationMinutes: 60 },
      });
      await repository.saveBooking(booking);

      await repository.saveAssignment(createMockAssignment({
        id: `asg_${bId}`,
        bookingId: bId,
        partnerId,
        assignmentStatus: 'EN_ROUTE',
      }));

      const cancelPromise = new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for job:cancelled')), 4000);
        customerSocket.on('job:cancelled', (payload) => {
          clearTimeout(timer);
          resolve(payload);
        });
      });

      await cancellationService.cancelByCustomer(bId, customerId, 'Changed plans');
      const cancelPayload = await cancelPromise;

      expect(cancelPayload.bookingId).toBe(bId);
      expect(cancelPayload.reason).toBe('Changed plans');
    });
  });
});
