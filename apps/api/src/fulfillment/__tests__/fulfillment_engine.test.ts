import {
  HelpingHandPricingStrategy,
  RoadHelpPricingStrategy,
  LaundryPricingStrategy,
  PackMovePricingStrategy,
  PricingStrategyFactory,
} from '../pricing';
import {
  HelpingHandPolicy,
  RoadHelpPolicy,
  LaundryPolicy,
  PackMovePolicy,
  ServicePolicyFactory,
} from '../policies';
import {
  IsApprovedPartnerSpecification,
  HasRequiredSkillSpecification,
  IsOnlineSpecification,
  IsAvailableSpecification,
  HasFreshLocationSpecification,
  IsWithinRadiusSpecification,
  CanReachWithinEtaSpecification,
  HasCapacitySpecification,
  HasRequiredVehicleSpecification,
  HasNoScheduleConflictSpecification,
  EligiblePartnerSpecification,
  PartnerCandidate,
  PartnerCandidateContext,
} from '../specifications';
import { ETAService } from '../services/eta.service';
import { CapacityService } from '../services/capacity.service';
import { PartnerMatchingService } from '../services/partner-matching.service';
import { PartnerEligibilityService } from '../services/partner-eligibility.service';
import { InMemoryFulfillmentRepository } from '../repositories/in-memory-fulfillment.repository';
import { DispatchService } from '../services/dispatch.service';
import { AssignmentService } from '../services/assignment.service';
import { ExtensionService } from '../services/extension.service';
import { CancellationService } from '../services/cancellation.service';
import { BookingLifecycleService } from '../services/booking-lifecycle.service';
import { NotificationService } from '../services/notification.service';
import { FulfillmentService } from '../services/fulfillment.service';
import { QuoteService } from '../services/quote.service';
import { ServiceabilityService } from '../services/serviceability.service';
import { FulfillmentOutboxService } from '../fulfillment-outbox.service';

describe('Serventica Instant — Master Fulfillment Engine (Prompt 02)', () => {
  // ── 1. PRICING ENGINE STRATEGIES ──────────────────────────────────────────
  describe('1. Pricing Engine (Strategy Pattern & Snapshots)', () => {
    test('Helping Hand calculates base rate, helpers, GST 18%, and locks 15-min snapshot', () => {
      const strategy = new HelpingHandPricingStrategy();
      const quote = strategy.calculate({
        serviceSlug: 'helping-hand',
        latitude: 30.316494,
        longitude: 78.032191,
        requirements: {
          durationMinutes: 120, // 2 hours
          requiredPartnerCount: 1,
        },
      });

      // 2 hours @ Rs 118/hr = Rs 236 base + Rs 25 fees = Rs 261 subtotal + 18% GST (46.98) = Rs 307.98
      expect(quote.baseAmount).toBe(236);
      expect(quote.platformFee).toBe(25);
      expect(quote.subtotal).toBe(261);
      expect(quote.tax).toBeCloseTo(46.98, 1);
      expect(quote.totalPayable).toBeCloseTo(307.98, 1);
      expect(quote.currency).toBe('INR');
      expect(quote.pricingVersion).toBe('2026.10-v1');
      expect(quote.lineItems.length).toBeGreaterThanOrEqual(3);
      expect(new Date(quote.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    test('Helping Hand scales proportionally with multiple helpers', () => {
      const strategy = new HelpingHandPricingStrategy();
      const quote2Helpers = strategy.calculate({
        serviceSlug: 'helping-hand',
        latitude: 30.316494,
        longitude: 78.032191,
        requirements: {
          durationMinutes: 60, // 1 hour
          requiredPartnerCount: 2, // 2 helpers
        },
      });

      // 1 hour * 118 * 2 = 236 base labour
      expect(quote2Helpers.baseAmount).toBe(236);
    });

    test('Road Help strictly enforces 1.0L fuel cap and adds delivery fee', () => {
      const strategy = new RoadHelpPricingStrategy();
      const fuelQuote = strategy.calculate({
        serviceSlug: 'road-help',
        latitude: 30.316494,
        longitude: 78.032191,
        requirements: {
          issueType: 'FUEL',
          fuelType: 'PETROL',
          fuelQuantityLitres: 1.0,
          vehicleType: 'BIKE',
          durationMinutes: 30,
        },
      });

      // 99 base + (96 + 50) fuel + 30 fees = 275 subtotal + 18% GST (49.5) = 324.5
      expect(fuelQuote.subtotal).toBe(275);
      expect(fuelQuote.totalPayable).toBeCloseTo(324.5, 1);

      // Attempting > 1.0L must throw
      expect(() => {
        strategy.calculate({
          serviceSlug: 'road-help',
          latitude: 30.316494,
          longitude: 78.032191,
          requirements: {
            issueType: 'FUEL',
            fuelQuantityLitres: 2.0, // illegal
            durationMinutes: 30,
          },
        });
      }).toThrow(/capped at maximum 1.0 Litre/);
    });

    test('Road Help applies vehicle surcharge for four-wheelers (CAR/SUV)', () => {
      const strategy = new RoadHelpPricingStrategy();
      const carQuote = strategy.calculate({
        serviceSlug: 'road-help',
        latitude: 30.316494,
        longitude: 78.032191,
        requirements: {
          issueType: 'BATTERY',
          vehicleType: 'CAR',
          durationMinutes: 30,
        },
      });

      // 99 base + 140 jumpstart + 50 car surcharge = 289 base + 30 fees = 319 subtotal
      expect(carQuote.subtotal).toBe(319);
      expect(carQuote.lineItems.some((l) => l.description.includes('Four-Wheeler'))).toBe(true);
    });

    test('Laundry estimated load vs verified weight reconciliation with >10% tolerance alert', () => {
      const strategy = new LaundryPricingStrategy();
      const estimatedQuote = strategy.calculate({
        serviceSlug: 'laundry',
        latitude: 30.316494,
        longitude: 78.032191,
        requirements: {
          approxLoadKg: 5.0,
          durationMinutes: 30,
        },
      });

      // 49 pickup + (5 * 35 = 175) = 224 base + 25 fees = 249 subtotal + 18% GST (44.82) = 293.82
      expect(estimatedQuote.totalPayable).toBeCloseTo(293.82, 1);

      // Scenario A: Within 10% tolerance (e.g. 5.3 kg ~ 6% increase)
      const withinTol = strategy.reconcilePrice(estimatedQuote, 5.3);
      expect(withinTol.requiresCustomerConfirmation).toBe(false);

      // Scenario B: Exceeds 10% tolerance (e.g. 7.5 kg ~ 35% increase)
      const exceedsTol = strategy.reconcilePrice(estimatedQuote, 7.5);
      expect(exceedsTol.requiresCustomerConfirmation).toBe(true);
      expect(exceedsTol.reconciledTotal).toBeGreaterThan(estimatedQuote.totalPayable);
    });

    test('Pack & Move calculates helper-hours and vehicle surcharge', () => {
      const strategy = new PackMovePricingStrategy();
      const quote = strategy.calculate({
        serviceSlug: 'pack-move',
        latitude: 30.316494,
        longitude: 78.032191,
        requirements: {
          durationMinutes: 120, // 2 hours
          requiredPartnerCount: 2, // 2 helpers
          vehicleType: 'CAR',
        },
      });

      // 199 base + (2 hrs * 120 * 2 = 480) labour + 350 truck = 1029 base + 45 fees = 1074 subtotal
      expect(quote.subtotal).toBe(1074);
      expect(quote.totalPayable).toBeCloseTo(1074 * 1.18, 1);
    });

    test('PricingStrategyFactory resolves strategy for all 4 services and slugs', () => {
      const factory = new PricingStrategyFactory();
      expect(factory.getStrategy('HELPING_HAND')).toBeInstanceOf(HelpingHandPricingStrategy);
      expect(factory.getStrategy('helping-hand')).toBeInstanceOf(HelpingHandPricingStrategy);
      expect(factory.getStrategy('ROAD_HELP')).toBeInstanceOf(RoadHelpPricingStrategy);
      expect(factory.getStrategy('LAUNDRY')).toBeInstanceOf(LaundryPricingStrategy);
      expect(factory.getStrategy('PACK_MOVE')).toBeInstanceOf(PackMovePricingStrategy);
      expect(() => factory.getStrategy('UNSUPPORTED')).toThrow();
    });
  });

  // ── 2. SERVICE POLICIES & BOUNDARIES ──────────────────────────────────────
  describe('2. Service Policies & Specialist Boundaries', () => {
    test('Helping Hand blocks electrical, gas, or hazardous specialist tasks', () => {
      const policy = new HelpingHandPolicy();

      const generalHelp = policy.validateTaskRequirements({
        durationMinutes: 60,
        taskCategory: 'Dusting and balcony sweeping',
      });
      expect(generalHelp.isValid).toBe(true);

      const electricTask = policy.validateTaskRequirements({
        durationMinutes: 60,
        taskCategory: 'Fix electrical switchboard wiring',
      });
      expect(electricTask.isValid).toBe(false);
      expect(electricTask.code).toBe('SPECIALIST_REQUIRED');
      expect(electricTask.recommendedService).toBe('AC_ELECTRICAL_REPAIR');

      const gasTask = policy.validateTaskRequirements({
        durationMinutes: 60,
        taskCategory: 'Check gas cylinder pipe leakage',
      });
      expect(gasTask.isValid).toBe(false);
      expect(gasTask.code).toBe('SPECIALIST_REQUIRED');
    });

    test('Road Help maps issues directly to specific partner capabilities', () => {
      const policy = new RoadHelpPolicy();
      expect(policy.resolveRequiredCapability({ issueType: 'FUEL' })).toBe('FUEL_TRANSPORT');
      expect(policy.resolveRequiredCapability({ issueType: 'FLAT_TYRE' })).toBe('FLAT_TYRE');
      expect(policy.resolveRequiredCapability({ issueType: 'BATTERY' })).toBe('BATTERY_START');
      expect(policy.resolveRequiredCapability({ issueType: 'BREAKDOWN' })).toBe('ROADSIDE_ASSISTANCE');
    });
  });

  // ── 3. SPECIFICATION PATTERN & PARTNER ELIGIBILITY ─────────────────────────
  describe('3. Specification Pattern & Eligibility Pipeline', () => {
    const validCandidate: PartnerCandidate = {
      partnerId: 'prt_test_01',
      userId: 'usr_p1',
      fullName: 'Aman Verma',
      phone: '+919876543211',
      isApproved: true,
      isActive: true,
      status: 'AVAILABLE',
      capabilities: ['GENERAL_HELP', 'ROADSIDE_ASSISTANCE'],
      vehicleType: 'BIKE',
      lastLatitude: 30.3182,
      lastLongitude: 78.0345,
      lastHeartbeatAt: new Date().toISOString(), // fresh
      currentActiveJobCount: 0,
      completedJobCount: 50,
      acceptanceRate: 0.95,
      rating: 4.8,
      hasConflictingFutureBooking: false,
    };

    const context: PartnerCandidateContext = {
      serviceType: 'HELPING_HAND',
      requiredCapability: 'GENERAL_HELP',
      customerLatitude: 30.3251,
      customerLongitude: 78.0412,
      maxRadiusKm: 7.0,
      maxEtaMinutes: 25,
      durationMinutes: 60,
    };

    test('Candidate meeting all specifications passes composite evaluation', () => {
      const spec = new EligiblePartnerSpecification();
      const evaluation = spec.evaluate(validCandidate, context);
      expect(evaluation.isEligible).toBe(true);
      expect(evaluation.failedSpecifications.length).toBe(0);
    });

    test('Rejects partner with stale GPS heartbeat (> 3 minutes old)', () => {
      const spec = new HasFreshLocationSpecification(180_000); // 3 mins
      const staleCandidate = {
        ...validCandidate,
        lastHeartbeatAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins old
      };
      const res = spec.isSatisfiedBy(staleCandidate, context);
      expect(res.isSatisfied).toBe(false);
      expect(res.reason).toContain('stale');
    });

    test('Rejects partner outside maximum radius', () => {
      const spec = new IsWithinRadiusSpecification();
      const farCandidate = {
        ...validCandidate,
        lastLatitude: 30.5000, // ~25 km away
        lastLongitude: 78.2000,
      };
      const res = spec.isSatisfiedBy(farCandidate, context);
      expect(res.isSatisfied).toBe(false);
      expect(res.reason).toContain('exceeds operational radius');
    });

    test('Rejects partner with active running jobs (capacity check)', () => {
      const spec = new HasCapacitySpecification();
      const busyCandidate = {
        ...validCandidate,
        currentActiveJobCount: 1,
      };
      const res = spec.isSatisfiedBy(busyCandidate, context);
      expect(res.isSatisfied).toBe(false);
      expect(res.reason).toContain('active jobs');
    });

    test('Rejects partner missing required capability', () => {
      const spec = new HasRequiredSkillSpecification();
      const res = spec.isSatisfiedBy(validCandidate, {
        ...context,
        requiredCapability: 'BATTERY_START', // partner lacks this
      });
      expect(res.isSatisfied).toBe(false);
      expect(res.reason).toContain('does not possess required capability');
    });
  });

  // ── 4. ETA & CANDIDATE RANKING ─────────────────────────────────────────────
  describe('4. Real Dynamic ETA & Weighted Candidate Ranking', () => {
    test('ETA Service calculates realistic urban travel time using Haversine', () => {
      const etaService = new ETAService();
      const origin = { latitude: 30.3182, longitude: 78.0345 };
      const destination = { latitude: 30.3251, longitude: 78.0412 };

      const result = etaService.calculateRouteEta(origin, destination);
      expect(result.distanceKm).toBeGreaterThan(0.5);
      expect(result.distanceKm).toBeLessThan(3.0);
      expect(result.durationMinutes).toBeGreaterThanOrEqual(5);
      expect(result.isConservativeFallback).toBe(false);
    });

    test('Partner Matching Service ranks closer, higher-rated candidate higher', () => {
      const etaService = new ETAService();
      const matchingService = new PartnerMatchingService(etaService);

      const closeCandidate: PartnerCandidate = {
        partnerId: 'prt_close',
        userId: 'usr_close',
        fullName: 'Close Partner',
        phone: '+919876500010',
        isApproved: true,
        isActive: true,
        status: 'AVAILABLE',
        capabilities: ['GENERAL_HELP'],
        lastLatitude: 30.324, // very close to customer
        lastLongitude: 78.040,
        lastHeartbeatAt: new Date().toISOString(),
        currentActiveJobCount: 0,
        completedJobCount: 100,
        acceptanceRate: 0.98,
        rating: 4.9,
        hasConflictingFutureBooking: false,
      };

      const farCandidate: PartnerCandidate = {
        partnerId: 'prt_far',
        userId: 'usr_far',
        fullName: 'Far Partner',
        phone: '+919876500020',
        isApproved: true,
        isActive: true,
        status: 'AVAILABLE',
        capabilities: ['GENERAL_HELP'],
        lastLatitude: 30.290, // farther away
        lastLongitude: 78.010,
        lastHeartbeatAt: new Date().toISOString(),
        currentActiveJobCount: 0,
        completedJobCount: 20,
        acceptanceRate: 0.85,
        rating: 4.3,
        hasConflictingFutureBooking: false,
      };

      const context: PartnerCandidateContext = {
        serviceType: 'HELPING_HAND',
        requiredCapability: 'GENERAL_HELP',
        customerLatitude: 30.3251,
        customerLongitude: 78.0412,
        maxRadiusKm: 10.0,
        maxEtaMinutes: 30,
        durationMinutes: 60,
      };

      const ranked = matchingService.rankCandidates([farCandidate, closeCandidate], context);
      expect(ranked[0].candidate.partnerId).toBe('prt_close');
      expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    });
  });

  // ── 5. DISPATCH WAVES & TIMEOUTS ───────────────────────────────────────────
  describe('5. Dispatch Waves & Candidate Cascades', () => {
    test('DispatchService creates Wave 1 offer with 45-second expiry', async () => {
      const repo = new InMemoryFulfillmentRepository();
      const etaService = new ETAService();
      const eligibilityService = new PartnerEligibilityService();
      const matchingService = new PartnerMatchingService(etaService);
      const policyFactory = new ServicePolicyFactory();
      const dispatchService = new DispatchService(
        repo,
        eligibilityService,
        matchingService,
        policyFactory
      );

      const booking = await repo.saveBooking({
        id: 'bok_test_wave_1',
        booking_number: 'SRV-TEST-W1',
        customer_id: 'usr_c1',
        service_id: 'HELPING_HAND',
        fulfillment_mode: 'INSTANT',
        status: 'MATCHING',
        subtotal: 200,
        total: 236,
        currency: 'INR',
        address_id: 'addr_1',
        latitude: 30.316494,
        longitude: 78.032191,
        pricing_snapshot: {},
        assigned_partner_ids: [],
        required_partner_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const waveState = await dispatchService.initiateDispatch(booking);
      expect(waveState.status).toBe('DISPATCHING');
      expect(waveState.currentWave).toBe(2); // advanced to ready for wave 2

      const offers = await repo.getOffersForBooking('bok_test_wave_1');
      expect(offers.length).toBeGreaterThanOrEqual(1);
      expect(offers[0].status).toBe('PENDING');
      expect(new Date(offers[0].expiresAt).getTime()).toBeGreaterThan(Date.now() + 40_000);
    });

    test('Partner decline triggers automatic cascade to next wave candidate', async () => {
      const repo = new InMemoryFulfillmentRepository();
      const etaService = new ETAService();
      const eligibilityService = new PartnerEligibilityService();
      const matchingService = new PartnerMatchingService(etaService);
      const policyFactory = new ServicePolicyFactory();
      const dispatchService = new DispatchService(
        repo,
        eligibilityService,
        matchingService,
        policyFactory
      );

      const booking = await repo.saveBooking({
        id: 'bok_test_cascade',
        booking_number: 'SRV-TEST-CAS',
        customer_id: 'usr_c1',
        service_id: 'HELPING_HAND',
        fulfillment_mode: 'INSTANT',
        status: 'MATCHING',
        subtotal: 200,
        total: 236,
        currency: 'INR',
        address_id: 'addr_1',
        latitude: 30.316494,
        longitude: 78.032191,
        pricing_snapshot: {},
        assigned_partner_ids: [],
        required_partner_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await dispatchService.initiateDispatch(booking);
      const initialOffers = await repo.getOffersForBooking('bok_test_cascade');
      const firstOffer = initialOffers[0];

      // Partner declines offer
      await dispatchService.handleOfferDecline(firstOffer.offerId, 'TOO_FAR');

      const updatedFirstOffer = await repo.getOffer(firstOffer.offerId);
      expect(updatedFirstOffer?.status).toBe('DECLINED');

      // Next candidate received offer
      const subsequentOffers = await repo.getOffersForBooking('bok_test_cascade');
      expect(subsequentOffers.length).toBeGreaterThan(initialOffers.length);
    });
  });

  // ── 6. ATOMIC ACCEPTANCE & CONCURRENCY ──────────────────────────────────────
  describe('6. Concurrency: Simultaneous Partner Acceptance', () => {
    test('Race condition: two partners accept simultaneously, exactly ONE wins', async () => {
      const repo = new InMemoryFulfillmentRepository();
      const etaService = new ETAService();
      const outbox = new FulfillmentOutboxService();
      const dispatch = new DispatchService(
        repo,
        new PartnerEligibilityService(),
        new PartnerMatchingService(etaService),
        new ServicePolicyFactory()
      );
      const assignmentService = new AssignmentService(repo, dispatch, outbox);

      // Create a booking requiring exactly 1 partner
      await repo.saveBooking({
        id: 'bok_race_01',
        booking_number: 'SRV-RACE-01',
        customer_id: 'usr_c1',
        service_id: 'HELPING_HAND',
        fulfillment_mode: 'INSTANT',
        status: 'MATCHING',
        subtotal: 200,
        total: 236,
        currency: 'INR',
        address_id: 'addr_1',
        latitude: 30.316494,
        longitude: 78.032191,
        pricing_snapshot: {},
        assigned_partner_ids: [],
        required_partner_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Create two offers for different partners
      const offer1 = await repo.saveOffer({
        offerId: 'off_race_p1',
        bookingId: 'bok_race_01',
        partnerId: 'prt_hh_01',
        waveNumber: 1,
        serviceType: 'HELPING_HAND',
        serviceTitle: 'Helping Hand',
        durationMinutes: 60,
        payoutAmount: 180,
        currency: 'INR',
        customerArea: 'Dehradun',
        customerCoordinates: { latitude: 30.316, longitude: 78.032 },
        distanceKm: 1.5,
        estimatedTravelMinutes: 8,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 45_000).toISOString(),
        requirements: {},
        createdAt: new Date().toISOString(),
      });

      const offer2 = await repo.saveOffer({
        offerId: 'off_race_p2',
        bookingId: 'bok_race_01',
        partnerId: 'prt_pm_02',
        waveNumber: 1,
        serviceType: 'HELPING_HAND',
        serviceTitle: 'Helping Hand',
        durationMinutes: 60,
        payoutAmount: 180,
        currency: 'INR',
        customerArea: 'Dehradun',
        customerCoordinates: { latitude: 30.316, longitude: 78.032 },
        distanceKm: 1.8,
        estimatedTravelMinutes: 10,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 45_000).toISOString(),
        requirements: {},
        createdAt: new Date().toISOString(),
      });

      // Execute simultaneous acceptance in parallel
      const [res1, res2] = await Promise.allSettled([
        assignmentService.acceptOffer(offer1.offerId, 'prt_hh_01'),
        assignmentService.acceptOffer(offer2.offerId, 'prt_pm_02'),
      ]);

      const fulfilled = [res1, res2].filter((r) => r.status === 'fulfilled');
      const rejected = [res1, res2].filter((r) => r.status === 'rejected');

      // Exactly ONE must succeed and exactly ONE must be rejected with JOB_ALREADY_ASSIGNED
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      if (rejected[0].status === 'rejected') {
        expect(rejected[0].reason.message).toContain('JOB_ALREADY_ASSIGNED');
      }

      // Booking must have exactly 1 assigned partner
      const updatedBooking = await repo.getBooking('bok_race_01');
      expect(updatedBooking?.assigned_partner_ids.length).toBe(1);
      expect(updatedBooking?.status).toBe('PARTNER_ACCEPTED');
    });

    test('Multi-partner atomic reservation: Pack & Move with 2 helpers reserves both before confirming', async () => {
      const repo = new InMemoryFulfillmentRepository();
      const etaService = new ETAService();
      const outbox = new FulfillmentOutboxService();
      const dispatch = new DispatchService(
        repo,
        new PartnerEligibilityService(),
        new PartnerMatchingService(etaService),
        new ServicePolicyFactory()
      );
      const assignmentService = new AssignmentService(repo, dispatch, outbox);

      // Booking requiring 2 partners
      await repo.saveBooking({
        id: 'bok_multi_01',
        booking_number: 'SRV-MULTI-01',
        customer_id: 'usr_c1',
        service_id: 'PACK_MOVE',
        fulfillment_mode: 'INSTANT',
        status: 'MATCHING',
        subtotal: 500,
        total: 590,
        currency: 'INR',
        address_id: 'addr_1',
        latitude: 30.316494,
        longitude: 78.032191,
        pricing_snapshot: {},
        assigned_partner_ids: [],
        required_partner_count: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const off1 = await repo.saveOffer({
        offerId: 'off_m1',
        bookingId: 'bok_multi_01',
        partnerId: 'prt_hh_01',
        waveNumber: 1,
        serviceType: 'PACK_MOVE',
        serviceTitle: 'Pack & Move',
        durationMinutes: 120,
        payoutAmount: 250,
        currency: 'INR',
        customerArea: 'Dehradun',
        customerCoordinates: { latitude: 30.316, longitude: 78.032 },
        distanceKm: 1.5,
        estimatedTravelMinutes: 8,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 45_000).toISOString(),
        requirements: {},
        createdAt: new Date().toISOString(),
      });

      const off2 = await repo.saveOffer({
        offerId: 'off_m2',
        bookingId: 'bok_multi_01',
        partnerId: 'prt_pm_02',
        waveNumber: 1,
        serviceType: 'PACK_MOVE',
        serviceTitle: 'Pack & Move',
        durationMinutes: 120,
        payoutAmount: 250,
        currency: 'INR',
        customerArea: 'Dehradun',
        customerCoordinates: { latitude: 30.316, longitude: 78.032 },
        distanceKm: 2.0,
        estimatedTravelMinutes: 10,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 45_000).toISOString(),
        requirements: {},
        createdAt: new Date().toISOString(),
      });

      // Partner 1 accepts -> slot 1 filled, booking is NOT yet fully confirmed
      const res1 = await assignmentService.acceptOffer(off1.offerId, 'prt_hh_01');
      expect(res1.isFullyAssigned).toBe(false);
      expect(res1.assignedPartnerCount).toBe(1);

      // Partner 2 accepts -> slot 2 filled, booking IS now fully confirmed
      const res2 = await assignmentService.acceptOffer(off2.offerId, 'prt_pm_02');
      expect(res2.isFullyAssigned).toBe(true);
      expect(res2.assignedPartnerCount).toBe(2);

      const booking = await repo.getBooking('bok_multi_01');
      expect(booking?.status).toBe('PARTNER_ACCEPTED');
      expect(booking?.assigned_partner_ids).toEqual(['prt_hh_01', 'prt_pm_02']);
    });
  });

  // ── 7. HELPING HAND EXTENSIONS ─────────────────────────────────────────────
  describe('7. Helping Hand Extension Workflow', () => {
    test('Extension validates 4-hour max cap and incremental pricing snapshot', async () => {
      const repo = new InMemoryFulfillmentRepository();
      const capacityService = new CapacityService();
      const pricingFactory = new PricingStrategyFactory();
      const outbox = new FulfillmentOutboxService();
      const extensionService = new ExtensionService(repo, capacityService, pricingFactory, outbox);

      // Booking with 180 min duration (3 hours)
      await repo.saveBooking({
        id: 'bok_ext_01',
        booking_number: 'SRV-EXT-01',
        customer_id: 'usr_c1',
        service_id: 'HELPING_HAND',
        fulfillment_mode: 'INSTANT',
        status: 'SERVICE_STARTED',
        subtotal: 354,
        total: 417.72,
        currency: 'INR',
        address_id: 'addr_1',
        latitude: 30.316494,
        longitude: 78.032191,
        pricing_snapshot: {},
        service_requirement: { durationMinutes: 180 },
        assigned_partner_ids: ['prt_hh_01'],
        required_partner_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Extending by +30 min (total 210 min <= 240 max cap) succeeds
      const extRes = await extensionService.requestExtension('bok_ext_01', 30);
      expect(extRes.status).toBe('REQUESTED');
      expect(extRes.additionalMinutes).toBe(30);

      // Partner accepts extension
      const response = await extensionService.respondExtension(
        'bok_ext_01',
        extRes.extensionId,
        'prt_hh_01',
        true
      );
      expect(response.accepted).toBe(true);
      expect(response.newDurationMinutes).toBe(210);

      const updatedBooking = await repo.getBooking('bok_ext_01');
      expect(updatedBooking?.service_requirement?.durationMinutes).toBe(210);

      // Attempting further extension of +60m (210 + 60 = 270m > 240m cap) must be rejected
      await expect(extensionService.requestExtension('bok_ext_01', 60)).rejects.toThrow(
        /Total duration cannot exceed 240 minutes/
      );
    });

    test('Extension is rejected if partner has conflicting future booking', async () => {
      const repo = new InMemoryFulfillmentRepository();
      const capacityService = new CapacityService();
      const pricingFactory = new PricingStrategyFactory();
      const outbox = new FulfillmentOutboxService();
      const extensionService = new ExtensionService(repo, capacityService, pricingFactory, outbox);

      // Mark partner as having future schedule conflict
      const partner = await repo.getPartnerCandidate('prt_hh_01');
      if (partner) {
        partner.hasConflictingFutureBooking = true;
      }

      await repo.saveBooking({
        id: 'bok_ext_conflict',
        booking_number: 'SRV-EXT-CONF',
        customer_id: 'usr_c1',
        service_id: 'HELPING_HAND',
        fulfillment_mode: 'INSTANT',
        status: 'SERVICE_STARTED',
        subtotal: 118,
        total: 139.24,
        currency: 'INR',
        address_id: 'addr_1',
        latitude: 30.316494,
        longitude: 78.032191,
        pricing_snapshot: {},
        service_requirement: { durationMinutes: 60 },
        assigned_partner_ids: ['prt_hh_01'],
        required_partner_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await expect(extensionService.requestExtension('bok_ext_conflict', 30)).rejects.toThrow();
    });
  });

  // ── 8. CANCELLATION & PARTNER REDISPATCH ────────────────────────────────────
  describe('8. Cancellation Rules & Partner Redispatch', () => {
    test('Partner cancellation after assignment releases partner and redispatches', async () => {
      const repo = new InMemoryFulfillmentRepository();
      const etaService = new ETAService();
      const outbox = new FulfillmentOutboxService();
      const dispatch = new DispatchService(
        repo,
        new PartnerEligibilityService(),
        new PartnerMatchingService(etaService),
        new ServicePolicyFactory()
      );
      const cancellationService = new CancellationService(repo, dispatch, outbox);

      await repo.saveBooking({
        id: 'bok_cancel_redispatch',
        booking_number: 'SRV-CAN-RED',
        customer_id: 'usr_c1',
        service_id: 'HELPING_HAND',
        fulfillment_mode: 'INSTANT',
        status: 'PARTNER_ACCEPTED',
        subtotal: 200,
        total: 236,
        currency: 'INR',
        address_id: 'addr_1',
        latitude: 30.316494,
        longitude: 78.032191,
        pricing_snapshot: {},
        assigned_partner_ids: ['prt_hh_01'],
        required_partner_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Initialize dispatch wave history
      const savedBooking = await repo.getBooking('bok_cancel_redispatch');
      await dispatch.initiateDispatch(savedBooking!);

      // Partner cancels
      const cancelRes = await cancellationService.cancelByPartner(
        'bok_cancel_redispatch',
        'prt_hh_01',
        'Vehicle flat tyre en route'
      );

      expect(cancelRes.success).toBe(true);
      expect(cancelRes.redispatchAttempted).toBe(true);

      const booking = await repo.getBooking('bok_cancel_redispatch');
      expect(booking?.assigned_partner_ids.includes('prt_hh_01')).toBe(false);
    });
  });

  // ── 9. IDEMPOTENCY ────────────────────────────────────────────────────────
  describe('9. Idempotency & Duplicate Request Protection', () => {
    test('Duplicate dispatch call with same idempotency key returns cached result', async () => {
      const repo = new InMemoryFulfillmentRepository();
      const etaService = new ETAService();
      const pricingFactory = new PricingStrategyFactory();
      const policyFactory = new ServicePolicyFactory();
      const quoteService = new QuoteService(pricingFactory, policyFactory);
      const serviceabilityService = new ServiceabilityService(
        policyFactory,
        repo,
        new PartnerEligibilityService(),
        etaService
      );
      const dispatchService = new DispatchService(
        repo,
        new PartnerEligibilityService(),
        new PartnerMatchingService(etaService),
        policyFactory
      );
      const outbox = new FulfillmentOutboxService();

      const fulfillmentService = new FulfillmentService(
        repo,
        quoteService,
        serviceabilityService,
        dispatchService,
        policyFactory,
        outbox
      );

      // Generate valid quote
      const quote = quoteService.generateQuote({
        serviceSlug: 'helping-hand',
        latitude: 30.316494,
        longitude: 78.032191,
        requirements: { durationMinutes: 60 },
      });

      const params = {
        quoteId: quote.quoteId,
        addressId: 'addr_idemp_1',
        serviceSlug: 'helping-hand',
        requirements: { durationMinutes: 60 },
        paymentMethod: 'UPI',
        idempotencyKey: 'idemp_key_unique_1234',
      };

      const firstCall = await fulfillmentService.createInstantDispatch('usr_c1', params);
      const secondCall = await fulfillmentService.createInstantDispatch('usr_c1', params);

      // Both calls must return identical bookingId without creating duplicate bookings
      expect(firstCall.bookingId).toBe(secondCall.bookingId);
      expect(firstCall.intentId).toBe(secondCall.intentId);
    });
  });
});
