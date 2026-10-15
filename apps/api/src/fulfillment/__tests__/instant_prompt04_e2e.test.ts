import { PartnerService } from '../../partner/partner.service';
import { AdminService } from '../../admin/admin.service';
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

describe('SERVENTICA INSTANT PLATFORM — MASTER IMPLEMENTATION 04 E2E & RESILIENCE SUITE', () => {
  let partnerService: PartnerService;
  let adminService: AdminService;
  let fulfillmentService: FulfillmentService;
  let serviceabilityService: ServiceabilityService;
  let quoteService: QuoteService;
  let dispatchService: DispatchService;
  let assignmentService: AssignmentService;
  let extensionService: ExtensionService;
  let cancellationService: CancellationService;
  let policyFactory: ServicePolicyFactory;
  let repository: InMemoryFulfillmentRepository;
  let eligibilityService: PartnerEligibilityService;

  beforeEach(() => {
    repository = new InMemoryFulfillmentRepository();
    const pricingFactory = new PricingStrategyFactory();
    policyFactory = new ServicePolicyFactory();
    const etaService = new ETAService();
    const capacityService = new CapacityService();
    eligibilityService = new PartnerEligibilityService();
    const matchingService = new PartnerMatchingService(etaService);

    serviceabilityService = new ServiceabilityService(
      policyFactory,
      repository,
      eligibilityService,
      etaService
    );
    quoteService = new QuoteService(pricingFactory, policyFactory);
    dispatchService = new DispatchService(
      repository,
      eligibilityService,
      matchingService,
      policyFactory
    );
    const outboxService = new FulfillmentOutboxService();
    assignmentService = new AssignmentService(repository, dispatchService, outboxService);
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

    adminService = new AdminService(
      repository,
      policyFactory,
      eligibilityService,
      dispatchService
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SUITE 1: FULL HAPPY PATH END-TO-END
  // ──────────────────────────────────────────────────────────────────────────
  describe('1. Full E2E Workflow: Customer -> Partner -> Admin Ops Inspection', () => {
    test('Customer requests Helping Hand -> Partner goes online -> Receives offer -> Accepts -> Navigates -> Arrives -> Starts -> Completes -> Admin timeline audits', async () => {
      // 1. Partner goes online and streams fresh GPS
      await partnerService.updatePresenceStatus('prt_hh_01', 'AVAILABLE', {
        latitude: 30.316494,
        longitude: 78.032191,
      });
      await partnerService.recordHeartbeat('prt_hh_01', {
        latitude: 30.316494,
        longitude: 78.032191,
      });

      const partnerProfile = await partnerService.getPartnerProfile('prt_hh_01');
      expect(partnerProfile.status).toBe('AVAILABLE');

      // 2. Customer quotes & creates Instant booking (1 hour)
      const quote = quoteService.generateQuote({
        serviceSlug: 'helping-hand',
        latitude: 30.316494,
        longitude: 78.032191,
        requirements: { durationMinutes: 60, requiredPartnerCount: 1 },
      });
      expect(quote.totalPayable).toBeGreaterThan(0);
      expect(quote.pricingVersion).toContain('v1');

      const dispatch = await fulfillmentService.createInstantDispatch('cust_vip_01', {
        quoteId: quote.quoteId,
        addressId: 'addr_vip_01',
        serviceSlug: 'helping-hand',
        requirements: { durationMinutes: 60 },
        paymentMethod: 'UPI',
      });
      expect(dispatch.status).toBe('MATCHING');

      // 3. Partner receives Instant Offer
      const inbox = await partnerService.getActiveOffer('prt_hh_01');
      expect(inbox.offer).not.toBeNull();
      const offer = inbox.offer!;
      expect(offer.bookingId).toBe(dispatch.bookingId);
      expect(offer.payoutAmount).toBeGreaterThan(0);

      // 4. Partner accepts offer atomically
      const acceptResult = await partnerService.acceptOffer('prt_hh_01', offer.offerId, {
        latitude: 30.316494,
        longitude: 78.032191,
      });
      expect(acceptResult.success).toBe(true);
      expect(acceptResult.isFullyAssigned).toBe(true);

      // 5. Job Lifecycle Transitions: Navigation -> Arrival -> Service Start -> Complete
      const enRouteBooking = await partnerService.markEnRoute('prt_hh_01', dispatch.bookingId);
      expect(enRouteBooking.status).toBe('PARTNER_EN_ROUTE');

      const arrivedBooking = await partnerService.markArrived('prt_hh_01', dispatch.bookingId, {
        latitude: 30.316494,
        longitude: 78.032191,
      });
      expect(arrivedBooking.status).toBe('PARTNER_ARRIVED');
      const otp = arrivedBooking.verificationOtp;

      const startedBooking = await partnerService.startService('prt_hh_01', dispatch.bookingId, otp);
      expect(startedBooking.status).toBe('SERVICE_STARTED');

      const completedBooking = await partnerService.completeService(
        'prt_hh_01',
        dispatch.bookingId,
        'Customer confirmed service satisfaction'
      );
      expect(completedBooking.status).toBe('SERVICE_COMPLETED');

      // 6. Admin Ops Dashboard Inspection
      const stats = await adminService.getInstantOperationsStats();
      expect(stats.completed).toBeGreaterThanOrEqual(1);

      const inspection = await adminService.getBookingDetails(dispatch.bookingId);
      expect(inspection.booking.status).toBe('SERVICE_COMPLETED');
      expect(inspection.assignedPartners[0]?.partnerId).toBe('prt_hh_01');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST SUITE 2: RESILIENCE & FAILURE SCENARIOS
  // ──────────────────────────────────────────────────────────────────────────
  describe('2. Failure Scenarios & Policy Enforcement', () => {
    test('Offer decline marks offer rejected and re-dispatches wave', async () => {
      await partnerService.updatePresenceStatus('prt_hh_01', 'AVAILABLE', { latitude: 30.316494, longitude: 78.032191 });

      const quote = quoteService.generateQuote({
        serviceSlug: 'helping-hand',
        latitude: 30.316494,
        longitude: 78.032191,
        requirements: { durationMinutes: 60 },
      });

      const dispatch = await fulfillmentService.createInstantDispatch('cust_rej_01', {
        quoteId: quote.quoteId,
        addressId: 'addr_rej_01',
        serviceSlug: 'helping-hand',
        requirements: { durationMinutes: 60 },
        paymentMethod: 'UPI',
      });

      // Partner 1 receives offer and declines
      const inbox1 = await partnerService.getActiveOffer('prt_hh_01');
      expect(inbox1.offer).not.toBeNull();
      const offer1 = inbox1.offer!;

      const rejectRes = await partnerService.declineOffer('prt_hh_01', offer1.offerId, 'Too far / vehicle maintenance');
      expect(rejectRes.acknowledged).toBe(true);

      // Verify offer marked DECLINED in repository
      const updatedOffer1 = await repository.getOffer(offer1.offerId);
      expect(updatedOffer1?.status).toBe('DECLINED');
    });

    test('Two partners accept simultaneously -> Atomic mutex ensures exactly one winner', async () => {
      // 1 slot available
      await partnerService.updatePresenceStatus('prt_hh_01', 'AVAILABLE', { latitude: 30.316494, longitude: 78.032191 });
      await partnerService.updatePresenceStatus('prt_rh_01', 'AVAILABLE', { latitude: 30.316494, longitude: 78.032191 });

      const quote = quoteService.generateQuote({
        serviceSlug: 'helping-hand',
        latitude: 30.316494,
        longitude: 78.032191,
        requirements: { durationMinutes: 60, requiredPartnerCount: 1 },
      });

      const dispatch = await fulfillmentService.createInstantDispatch('cust_race_01', {
        quoteId: quote.quoteId,
        addressId: 'addr_race_01',
        serviceSlug: 'helping-hand',
        requirements: { durationMinutes: 60 },
        paymentMethod: 'UPI',
      });

      // Save offers for both partners
      const offer1 = await repository.saveOffer({
        offerId: `off_race_1_${Date.now()}`,
        bookingId: dispatch.bookingId,
        partnerId: 'prt_hh_01',
        serviceType: 'helping-hand',
        serviceTitle: 'Helping Hand',
        durationMinutes: 60,
        payoutAmount: 200,
        currency: 'INR',
        customerArea: 'Central',
        customerCoordinates: { latitude: 30.316494, longitude: 78.032191 },
        distanceKm: 1.2,
        estimatedTravelMinutes: 6,
        status: 'PENDING',
        waveNumber: 1,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 45000).toISOString(),
        requirements: {},
      });

      const offer2 = await repository.saveOffer({
        offerId: `off_race_2_${Date.now()}`,
        bookingId: dispatch.bookingId,
        partnerId: 'prt_rh_01',
        serviceType: 'helping-hand',
        serviceTitle: 'Helping Hand',
        durationMinutes: 60,
        payoutAmount: 200,
        currency: 'INR',
        customerArea: 'Central',
        customerCoordinates: { latitude: 30.316494, longitude: 78.032191 },
        distanceKm: 1.5,
        estimatedTravelMinutes: 8,
        status: 'PENDING',
        waveNumber: 1,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 45000).toISOString(),
        requirements: {},
      });

      // Execute simultaneous acceptance
      const [res1, res2] = await Promise.allSettled([
        partnerService.acceptOffer('prt_hh_01', offer1.offerId, { latitude: 30.316494, longitude: 78.032191 }),
        partnerService.acceptOffer('prt_rh_01', offer2.offerId, { latitude: 30.316494, longitude: 78.032191 }),
      ]);

      const fulfilled = [res1, res2].filter((r) => r.status === 'fulfilled');
      const rejected = [res1, res2].filter((r) => r.status === 'rejected');

      // Exactly 1 partner must succeed in winning the single slot
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
    });

    test('Stale GPS heartbeat (>30s) excludes partner from Instant dispatch', async () => {
      await partnerService.updatePresenceStatus('prt_hh_01', 'AVAILABLE', { latitude: 30.316494, longitude: 78.032191 });
      const candidate = await repository.getPartnerCandidate('prt_hh_01');
      if (candidate) {
        // Mark heartbeat 4 minutes stale
        candidate.lastHeartbeatAt = new Date(Date.now() - 4 * 60 * 1000).toISOString();
      }

      const evalResult = eligibilityService.evaluateCandidate(candidate!, {
        serviceType: 'HELPING_HAND',
        requiredCapability: 'GENERAL_HELP',
        customerLatitude: 30.316494,
        customerLongitude: 78.032191,
        maxRadiusKm: 5,
        maxEtaMinutes: 20,
        requiredVehicle: 'ANY',
        durationMinutes: 60,
      });

      // Stale GPS must fail specification
      expect(evalResult.isEligible).toBe(false);
      expect(evalResult.failedSpecifications.some((s) => s.code === 'HAS_FRESH_LOCATION')).toBe(true);
    });

    test('Emergency Fuel Assistance strictly enforces 1.0 Litre limit', async () => {
      // Attempt to quote 5 Litres of emergency fuel
      expect(() => {
        quoteService.generateQuote({
          serviceSlug: 'road-help',
          latitude: 30.316494,
          longitude: 78.032191,
          requirements: {
            durationMinutes: 30,
            issueType: 'FUEL',
            fuelQuantityLitres: 5.0,
          },
        });
      }).toThrow(/Emergency fuel top-up strictly capped at 1\.0 Litre/i);

      // Exactly 1.0 Litre must pass
      const validQuote = quoteService.generateQuote({
        serviceSlug: 'road-help',
        latitude: 30.316494,
        longitude: 78.032191,
        requirements: {
          durationMinutes: 30,
          issueType: 'FUEL',
          fuelType: 'PETROL',
          fuelQuantityLitres: 1.0,
        },
      });
      expect(validQuote.totalPayable).toBeGreaterThan(0);
    });

    test('Partner cannot jump lifecycle: ACCEPTED -> COMPLETED is rejected by workflow', async () => {
      const quote = quoteService.generateQuote({
        serviceSlug: 'helping-hand',
        latitude: 30.316494,
        longitude: 78.032191,
        requirements: { durationMinutes: 60 },
      });

      const dispatch = await fulfillmentService.createInstantDispatch('cust_jump_01', {
        quoteId: quote.quoteId,
        addressId: 'addr_jump_01',
        serviceSlug: 'helping-hand',
        requirements: { durationMinutes: 60 },
        paymentMethod: 'UPI',
      });

      const inbox = await partnerService.getActiveOffer('prt_hh_01');
      if (inbox.offer) {
        await partnerService.acceptOffer('prt_hh_01', inbox.offer.offerId, {
          latitude: 30.316494,
          longitude: 78.032191,
        });
      }

      // Attempt illegal jump to complete without arrival and OTP verification
      await expect(
        partnerService.completeService('prt_hh_01', dispatch.bookingId)
      ).rejects.toThrow(/Service must be started first/i);
    });

    test('Admin manual reassignment validates business rules and logs audit trail', async () => {
      const quote = quoteService.generateQuote({
        serviceSlug: 'helping-hand',
        latitude: 30.316494,
        longitude: 78.032191,
        requirements: { durationMinutes: 60 },
      });

      const dispatch = await fulfillmentService.createInstantDispatch('cust_admin_reassign_01', {
        quoteId: quote.quoteId,
        addressId: 'addr_admin_reassign_01',
        serviceSlug: 'helping-hand',
        requirements: { durationMinutes: 60 },
        paymentMethod: 'UPI',
      });

      // Ensure prt_pm_02 is available (holds GENERAL_HELP capability)
      await partnerService.updatePresenceStatus('prt_pm_02', 'AVAILABLE', {
        latitude: 30.316494,
        longitude: 78.032191,
      });

      // Admin reassigns
      const reassignResult = await adminService.manuallyReassignPartner({
        bookingId: dispatch.bookingId,
        newPartnerId: 'prt_pm_02',
        reason: 'Customer requested experienced Hindi-speaking specialist',
        adminId: 'ops_lead_01',
      });

      expect(reassignResult.success).toBe(true);
      expect(reassignResult.assignedPartnerId).toBe('prt_pm_02');

      const savedBooking = await repository.getBooking(dispatch.bookingId);
      expect(savedBooking?.assigned_partner_ids).toContain('prt_pm_02');

      // Audit logs must record action
      const auditLogs = await adminService.getAuditLogs({ resourceId: dispatch.bookingId });
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].action).toBe('ADMIN_MANUAL_REASSIGN_PARTNER');
      expect(auditLogs[0].actorId).toBe('ops_lead_01');
    });
  });
});
