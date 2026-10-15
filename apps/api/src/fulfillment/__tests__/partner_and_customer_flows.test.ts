import { PartnerService } from '../../partner/partner.service';
import { InMemoryFulfillmentRepository } from '../repositories/in-memory-fulfillment.repository';
import { PricingStrategyFactory } from '../pricing/pricing-strategy.factory';
import { ServicePolicyFactory } from '../policies/service-policy.factory';
import {
  ETAService,
  CapacityService,
  PartnerEligibilityService,
  PartnerMatchingService,
  ServiceabilityService,
  QuoteService,
  DispatchService,
  AssignmentService,
  ExtensionService,
  CancellationService,
  NotificationService,
  BookingLifecycleService,
  FulfillmentService,
} from '../services';
import { FulfillmentOutboxService } from '../fulfillment-outbox.service';

describe('Serventica Instant — Partner App & Customer Flow Integration (Prompt 02)', () => {
  let partnerService: PartnerService;
  let fulfillmentService: FulfillmentService;
  let serviceabilityService: ServiceabilityService;
  let quoteService: QuoteService;
  let extensionService: ExtensionService;
  let cancellationService: CancellationService;
  let policyFactory: ServicePolicyFactory;
  let repository: InMemoryFulfillmentRepository;

  beforeEach(() => {
    repository = new InMemoryFulfillmentRepository();
    const pricingFactory = new PricingStrategyFactory();
    policyFactory = new ServicePolicyFactory();
    const etaService = new ETAService();
    const capacityService = new CapacityService();
    const eligibilityService = new PartnerEligibilityService();
    const matchingService = new PartnerMatchingService(etaService);
    serviceabilityService = new ServiceabilityService(
      policyFactory,
      repository,
      eligibilityService,
      etaService
    );
    quoteService = new QuoteService(pricingFactory, policyFactory);
    const dispatchService = new DispatchService(
      repository,
      eligibilityService,
      matchingService,
      policyFactory
    );
    const outboxService = new FulfillmentOutboxService();
    const assignmentService = new AssignmentService(repository, dispatchService, outboxService);
    extensionService = new ExtensionService(
      repository,
      capacityService,
      pricingFactory,
      outboxService
    );
    cancellationService = new CancellationService(repository, dispatchService, outboxService);
    const notificationService = new NotificationService();
    const lifecycleService = new BookingLifecycleService(
      repository,
      outboxService,
      notificationService,
      etaService
    );
    fulfillmentService = new FulfillmentService(
      repository,
      quoteService,
      serviceabilityService,
      dispatchService,
      policyFactory,
      outboxService
    );

    partnerService = new PartnerService(
      repository,
      assignmentService,
      dispatchService,
      lifecycleService,
      extensionService
    );
  });

  // ── 1. CUSTOMER FLOW ───────────────────────────────────────────────────────
  describe('1. Customer Instant Serviceability, Quote, and Dispatch Flow', () => {
    test('Catalog generation checks serviceability and dynamic ETAs across all 4 verticals', async () => {
      const lat = 30.316494;
      const lon = 78.032191;

      for (const policy of policyFactory.getAllPolicies()) {
        const s = await serviceabilityService.checkServiceability(policy.serviceType, lat, lon);
        expect(s.serviceable).toBe(true);
        expect(s.zoneId).toBe('zone_dehradun_central');
        expect(s.estimatedEtaMinutes).toBeGreaterThan(0);
        expect(s.availableCapacityCount).toBeGreaterThan(0);
      }
    });

    test('Customer Quote -> Dispatch -> Live Status Poll -> Cancellation', async () => {
      // 1. Generate Quote
      const quote = quoteService.generateQuote({
        serviceSlug: 'helping-hand',
        latitude: 30.316494,
        longitude: 78.032191,
        requirements: { durationMinutes: 60, requiredPartnerCount: 1 },
      });

      expect(quote.quoteId).toBeDefined();
      expect(quote.totalPayable).toBeCloseTo(168.74, 1);

      // 2. Launch Dispatch
      const dispatch = await fulfillmentService.createInstantDispatch('usr_flow_cus', {
        quoteId: quote.quoteId,
        addressId: 'addr_flow_1',
        serviceSlug: 'helping-hand',
        requirements: { durationMinutes: 60 },
        paymentMethod: 'UPI',
      });

      expect(dispatch.success).toBe(true);
      expect(dispatch.status).toBe('MATCHING');
      expect(dispatch.trackingChannel).toBe(`tracking:${dispatch.bookingId}`);

      // 3. Poll Live Status
      const status = await fulfillmentService.getBookingStatus(dispatch.bookingId);
      expect(status.bookingId).toBe(dispatch.bookingId);
      expect(status.status).toBe('MATCHING');

      // 4. Cancel
      const cancelRes = await cancellationService.cancelByCustomer(
        dispatch.bookingId,
        'usr_flow_cus',
        'Customer changed their schedule'
      );
      expect(cancelRes.status).toBe('CANCELLED_BY_CUSTOMER');
      expect(cancelRes.cancellationFee).toBe(0);
    });
  });

  // ── 2. PARTNER APP INTEGRATION FLOW ────────────────────────────────────────
  describe('2. Partner App Integration Flow (/api/v1/partner/*)', () => {
    test('Presence status updates and high-frequency GPS heartbeats', async () => {
      const partnerId = 'prt_hh_01';

      // 1. Set status to AVAILABLE
      const statusRes = await partnerService.updatePresenceStatus(partnerId, 'AVAILABLE', {
        latitude: 30.3182,
        longitude: 78.0345,
      });
      expect(statusRes.success).toBe(true);
      expect(statusRes.status).toBe('AVAILABLE');

      // 2. High-frequency GPS Heartbeat
      const heartbeatRes = await partnerService.recordHeartbeat(partnerId, {
        latitude: 30.3185,
        longitude: 78.0348,
        heading: 142.5,
        speed: 22.4,
        accuracy: 4.8,
        recordedAt: new Date().toISOString(),
      });
      expect(heartbeatRes.acknowledged).toBe(true);
      expect(heartbeatRes.serverTime).toBeDefined();

      const candidate = await repository.getPartnerCandidate(partnerId);
      expect(candidate?.lastLatitude).toBe(30.3185);
      expect(candidate?.lastLongitude).toBe(78.0348);
    });

    test('Full End-to-End Partner Lifecycle: Offer Inbox -> Accept -> En Route -> Arrive -> Start -> Extend -> Complete', async () => {
      // 1. Customer initiates Helping Hand instant booking
      const quote = quoteService.generateQuote({
        serviceSlug: 'helping-hand',
        latitude: 30.316494,
        longitude: 78.032191,
        requirements: { durationMinutes: 60 },
      });

      const dispatch = await fulfillmentService.createInstantDispatch('usr_partner_lifecycle_cus', {
        quoteId: quote.quoteId,
        addressId: 'addr_plc_1',
        serviceSlug: 'helping-hand',
        requirements: { durationMinutes: 60 },
        paymentMethod: 'UPI',
      });

      const bookingId = dispatch.bookingId;
      const partnerId = 'prt_hh_01';

      // 2. Partner retrieves active offer from inbox
      const inbox = await partnerService.getActiveOffer(partnerId);
      expect(inbox.offer).not.toBeNull();
      expect(inbox.offer?.bookingId).toBe(bookingId);
      expect(inbox.offer?.remainingSeconds).toBeGreaterThan(0);

      const offerId = inbox.offer!.offerId;

      // 3. Partner accepts offer atomically
      const acceptRes = await partnerService.acceptOffer(partnerId, offerId, {
        latitude: 30.318,
        longitude: 78.034,
      });
      expect(acceptRes.success).toBe(true);
      expect(acceptRes.isFullyAssigned).toBe(true);
      expect(acceptRes.customer.name).toBeDefined();

      // 4. Partner starts traveling (En Route)
      const enRouteRes = await partnerService.markEnRoute(partnerId, bookingId);
      expect(enRouteRes.status).toBe('PARTNER_EN_ROUTE');

      // 5. Partner marks Arrival (triggers proximity push & OTP generation)
      const arriveRes = await partnerService.markArrived(partnerId, bookingId, {
        latitude: 30.3165,
        longitude: 78.0322,
      });
      expect(arriveRes.status).toBe('PARTNER_ARRIVED');
      expect(arriveRes.verificationOtp).toBeDefined();

      const otp = arriveRes.verificationOtp;

      // 6. Partner starts service by entering Customer Verification OTP
      const startRes = await partnerService.startService(partnerId, bookingId, otp);
      expect(startRes.status).toBe('SERVICE_STARTED');

      // 7. Customer requests a +30 min extension
      const extReq = await extensionService.requestExtension(bookingId, 30);
      expect(extReq.status).toBe('REQUESTED');

      // 8. Partner accepts extension in app
      const extResp = await partnerService.respondToExtension(
        partnerId,
        bookingId,
        extReq.extensionId,
        true
      );
      expect(extResp.accepted).toBe(true);
      expect(extResp.newDurationMinutes).toBe(90);

      // 9. Partner completes service with notes
      const completeRes = await partnerService.completeService(
        partnerId,
        bookingId,
        'Finished 90 minutes deep house organization and cleaning'
      );
      expect(completeRes.status).toBe('SERVICE_COMPLETED');

      // 10. Partner status is automatically freed back to AVAILABLE
      const partner = await repository.getPartnerCandidate(partnerId);
      expect(partner?.status).toBe('AVAILABLE');
      expect(partner?.currentActiveJobCount).toBe(0);
      expect(partner?.completedJobCount).toBeGreaterThan(140);
    });

    test('Laundry Workflow: verified actual weight differs by >10% and notifies customer', async () => {
      // 1. Customer initiates Laundry pickup with 5.0 kg estimated load
      const quote = quoteService.generateQuote({
        serviceSlug: 'laundry',
        latitude: 30.316494,
        longitude: 78.032191,
        requirements: { approxLoadKg: 5.0, durationMinutes: 30 },
      });

      const dispatch = await fulfillmentService.createInstantDispatch('usr_laundry_cus', {
        quoteId: quote.quoteId,
        addressId: 'addr_lnd_1',
        serviceSlug: 'laundry',
        requirements: { approxLoadKg: 5.0, durationMinutes: 30 },
        paymentMethod: 'UPI',
      });

      const bookingId = dispatch.bookingId;
      const partnerId = 'prt_lnd_01';

      // 2. Partner accepts offer
      const inbox = await partnerService.getActiveOffer(partnerId);
      expect(inbox.offer).not.toBeNull();
      await partnerService.acceptOffer(partnerId, inbox.offer!.offerId);

      // 3. Partner marks arrived & starts service
      const arriveRes = await partnerService.markArrived(partnerId, bookingId);
      await partnerService.startService(partnerId, bookingId, arriveRes.verificationOtp);

      // 4. Partner weighs laundry at hub: actual verified weight is 7.5 kg (> 10% tolerance)
      const completeRes = await partnerService.completeService(
        partnerId,
        bookingId,
        'Collected laundry and measured at central hub',
        7.5
      );

      expect(completeRes.status).toBe('SERVICE_COMPLETED');
      expect(completeRes.reconciliation).toBeDefined();
      expect(completeRes.reconciliation.requiresCustomerConfirmation).toBe(true);
      expect(completeRes.reconciliation.reconciledTotal).toBeGreaterThan(quote.totalPayable);
    });
  });
});
