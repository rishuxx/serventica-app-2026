import {
  IsApprovedPartnerSpecification,
  HasRequiredSkillSpecification,
  IsOnlineSpecification,
  IsAvailableSpecification,
  HasFreshLocationSpecification,
  IsWithinRadiusSpecification,
  CanReachWithinEtaSpecification,
  HasCapacitySpecification,
  EligiblePartnerSpecification,
  PartnerCandidate,
  PartnerCandidateContext,
} from '../specifications';
import { ETAService } from '../services/eta.service';
import { PartnerMatchingService } from '../services/partner-matching.service';

describe('MASTER SUITE: Serventica Hyperlocal Partner Discovery & Scan Engine v1', () => {
  // Test reference center: Dehradun Clock Tower
  const DEHRADUN_LAT = 30.3244;
  const DEHRADUN_LNG = 78.0416;

  const defaultContext: PartnerCandidateContext = {
    serviceType: 'HELPING_HAND',
    requiredCapability: 'GENERAL_HELP',
    customerLatitude: DEHRADUN_LAT,
    customerLongitude: DEHRADUN_LNG,
    maxRadiusKm: 8.0, // Initial Wave 1 ring
    maxEtaMinutes: 30,
    durationMinutes: 60,
  };

  const createBaseCandidate = (id: string, overrides: Partial<PartnerCandidate> = {}): PartnerCandidate => ({
    partnerId: id,
    userId: `usr_${id}`,
    fullName: `Partner ${id}`,
    phone: '+919876543210',
    isApproved: true,
    isActive: true,
    status: 'AVAILABLE',
    capabilities: ['GENERAL_HELP'],
    vehicleType: 'BIKE',
    lastLatitude: DEHRADUN_LAT + 0.01, // ~1.1 km away
    lastLongitude: DEHRADUN_LNG + 0.01,
    lastHeartbeatAt: new Date(Date.now() - 30 * 1000).toISOString(), // Fresh (30s ago)
    rating: 4.8,
    acceptanceRate: 0.95,
    completedJobCount: 42,
    currentActiveJobCount: 0,
    hasConflictingFutureBooking: false,
    ...overrides,
  });

  // ============================================================================
  // SECTION 1: GEOGRAPHIC SEARCH & MULTI-RING EXPANSION
  // ============================================================================
  describe('1. Geographic Search & Radius Rings', () => {
    test('1. Partner inside initial radius (Ring 1: 8km) is identified', () => {
      const candidate = createBaseCandidate('p1', {
        lastLatitude: DEHRADUN_LAT + 0.02, // ~2.2 km
        lastLongitude: DEHRADUN_LNG + 0.02,
      });
      const spec = new IsWithinRadiusSpecification();
      const res = spec.isSatisfiedBy(candidate, defaultContext);
      expect(res.isSatisfied).toBe(true);
    });

    test('2. Partner outside initial radius (8km) but inside expanded ring (15km) is handled by ring expansion', () => {
      // ~11 km away
      const candidate = createBaseCandidate('p_ring2', {
        lastLatitude: DEHRADUN_LAT + 0.07,
        lastLongitude: DEHRADUN_LNG + 0.07,
      });

      const ring1Spec = new IsWithinRadiusSpecification();
      expect(ring1Spec.isSatisfiedBy(candidate, defaultContext).isSatisfied).toBe(false);

      // Ring 2 expanded context
      const ring2Context = { ...defaultContext, maxRadiusKm: 15.0 };
      expect(ring1Spec.isSatisfiedBy(candidate, ring2Context).isSatisfied).toBe(true);
    });

    test('3. Partner outside maximum search boundary (25km) is excluded', () => {
      // ~45 km away (e.g. Rishikesh outskirts)
      const candidate = createBaseCandidate('p_far', {
        lastLatitude: DEHRADUN_LAT + 0.4,
        lastLongitude: DEHRADUN_LNG + 0.4,
      });

      const maxRingContext = { ...defaultContext, maxRadiusKm: 25.0 };
      const spec = new IsWithinRadiusSpecification();
      const res = spec.isSatisfiedBy(candidate, maxRingContext);
      expect(res.isSatisfied).toBe(false);
      expect(res.reason).toContain('exceeds operational radius');
    });

    test('4. Empty geographic result in Ring 1 cascades cleanly to next radius without duplicate IDs', () => {
      const pool = [
        createBaseCandidate('p_12km', {
          lastLatitude: DEHRADUN_LAT + 0.07, // ~10 km
          lastLongitude: DEHRADUN_LNG + 0.07,
        }),
      ];

      const spec = new IsWithinRadiusSpecification();
      const ring1Matches = pool.filter((c) => spec.isSatisfiedBy(c, defaultContext).isSatisfied);
      expect(ring1Matches.length).toBe(0);

      const ring2Context = { ...defaultContext, maxRadiusKm: 15.0 };
      const ring2Matches = pool.filter((c) => spec.isSatisfiedBy(c, ring2Context).isSatisfied);
      expect(ring2Matches.length).toBe(1);
      expect(ring2Matches[0].partnerId).toBe('p_12km');
    });
  });

  // ============================================================================
  // SECTION 2: HARD ELIGIBILITY FILTERING & EXCLUSION DIAGNOSTICS
  // ============================================================================
  describe('2. Hard Eligibility Filtering & Diagnostic Codes', () => {
    const compositeSpec = new EligiblePartnerSpecification();

    test('10. Approved, qualified, available partner with fresh heartbeat passes all hard filters', () => {
      const candidate = createBaseCandidate('p_perfect');
      const evalRes = compositeSpec.evaluate(candidate, defaultContext);
      expect(evalRes.isEligible).toBe(true);
      expect(evalRes.failedSpecifications.length).toBe(0);
    });

    test('11. Unapproved partner is strictly excluded with code IS_APPROVED_PARTNER', () => {
      const candidate = createBaseCandidate('p_unapproved', { isApproved: false });
      const evalRes = compositeSpec.evaluate(candidate, defaultContext);
      expect(evalRes.isEligible).toBe(false);
      expect(evalRes.failedSpecifications.some((f) => f.code === 'IS_APPROVED_PARTNER')).toBe(true);
    });

    test('12. Inactive partner is excluded with IS_APPROVED_PARTNER', () => {
      const candidate = createBaseCandidate('p_inactive', { isActive: false });
      const spec = new IsApprovedPartnerSpecification();
      expect(spec.isSatisfiedBy(candidate, defaultContext).isSatisfied).toBe(false);
    });

    test('13. Partner missing required service skill is excluded with HAS_REQUIRED_SKILL', () => {
      const candidate = createBaseCandidate('p_no_skill', { capabilities: ['BATTERY_START'] });
      const evalRes = compositeSpec.evaluate(candidate, defaultContext);
      expect(evalRes.isEligible).toBe(false);
      expect(evalRes.failedSpecifications.some((f) => f.code === 'HAS_REQUIRED_SKILL')).toBe(true);
    });

    test('15. Partner online with fresh heartbeat (<3 minutes) is accepted', () => {
      const candidate = createBaseCandidate('p_fresh', {
        lastHeartbeatAt: new Date(Date.now() - 45 * 1000).toISOString(),
      });
      const spec = new HasFreshLocationSpecification(3 * 60 * 1000);
      expect(spec.isSatisfiedBy(candidate, defaultContext).isSatisfied).toBe(true);
    });

    test('16. Offline partner status is rejected with IS_ONLINE', () => {
      const candidate = createBaseCandidate('p_offline', { status: 'OFFLINE' });
      const evalRes = compositeSpec.evaluate(candidate, defaultContext);
      expect(evalRes.isEligible).toBe(false);
      expect(evalRes.failedSpecifications.some((f) => f.code === 'IS_ONLINE')).toBe(true);
    });

    test('17. Stale heartbeat (>3 minutes) fails HAS_FRESH_LOCATION even if status is AVAILABLE', () => {
      const candidate = createBaseCandidate('p_stale', {
        status: 'AVAILABLE',
        lastHeartbeatAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins stale
      });
      const evalRes = compositeSpec.evaluate(candidate, defaultContext);
      expect(evalRes.isEligible).toBe(false);
      expect(evalRes.failedSpecifications.some((f) => f.code === 'HAS_FRESH_LOCATION')).toBe(true);
    });

    test('19. Busy partner is rejected with IS_AVAILABLE', () => {
      const candidate = createBaseCandidate('p_busy_status', { status: 'BUSY' });
      const spec = new IsAvailableSpecification();
      expect(spec.isSatisfiedBy(candidate, defaultContext).isSatisfied).toBe(false);
    });

    test('20. Busy partner with running job is rejected with HAS_CAPACITY', () => {
      const candidate = createBaseCandidate('p_busy_job', { currentActiveJobCount: 1 });
      const evalRes = compositeSpec.evaluate(candidate, defaultContext);
      expect(evalRes.isEligible).toBe(false);
      expect(evalRes.failedSpecifications.some((f) => f.code === 'HAS_CAPACITY')).toBe(true);
    });

    test('21. Partner with overlapping future scheduled booking fails HAS_NO_SCHEDULE_CONFLICT', () => {
      const candidate = createBaseCandidate('p_conflict', { hasConflictingFutureBooking: true });
      const evalRes = compositeSpec.evaluate(candidate, defaultContext);
      expect(evalRes.isEligible).toBe(false);
      expect(evalRes.failedSpecifications.some((f) => f.code === 'HAS_NO_SCHEDULE_CONFLICT')).toBe(true);
    });

    test('25. Missing GPS coordinate fails HAS_FRESH_LOCATION', () => {
      const candidate = createBaseCandidate('p_nogps', {
        lastLatitude: undefined as any,
        lastLongitude: undefined as any,
      });
      const spec = new HasFreshLocationSpecification();
      expect(spec.isSatisfiedBy(candidate, defaultContext).isSatisfied).toBe(false);
    });
  });

  // ============================================================================
  // SECTION 3: DETERMINISTIC CANDIDATE RANKING
  // ============================================================================
  describe('3. Deterministic Candidate Ranking & Fairness', () => {
    const etaService = new ETAService();
    const matchingService = new PartnerMatchingService(etaService);

    test('27. Nearest eligible candidate with lower ETA ranks first', () => {
      const closeCandidate = createBaseCandidate('p_close', {
        lastLatitude: DEHRADUN_LAT + 0.005, // ~500m
        lastLongitude: DEHRADUN_LNG + 0.005,
        rating: 4.8,
      });
      const farCandidate = createBaseCandidate('p_far', {
        lastLatitude: DEHRADUN_LAT + 0.04, // ~4.5km
        lastLongitude: DEHRADUN_LNG + 0.04,
        rating: 4.8,
      });

      const ranked = matchingService.rankCandidates([farCandidate, closeCandidate], defaultContext);
      expect(ranked[0].candidate.partnerId).toBe('p_close');
      expect(ranked[0].distanceKm).toBeLessThan(ranked[1].distanceKm);
      expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    });

    test('28. Closer ineligible partner is never included in ranked list', () => {
      const closeIneligible = createBaseCandidate('p_close_bad', {
        lastLatitude: DEHRADUN_LAT + 0.001,
        lastLongitude: DEHRADUN_LNG + 0.001,
        isApproved: false, // Disqualified
      });
      const fartherEligible = createBaseCandidate('p_far_good', {
        lastLatitude: DEHRADUN_LAT + 0.02,
        lastLongitude: DEHRADUN_LNG + 0.02,
        isApproved: true,
      });

      const compositeSpec = new EligiblePartnerSpecification();
      const eligiblePool = [closeIneligible, fartherEligible].filter(
        (c) => compositeSpec.isSatisfiedBy(c, defaultContext).isSatisfied
      );

      const ranked = matchingService.rankCandidates(eligiblePool, defaultContext);
      expect(ranked.length).toBe(1);
      expect(ranked[0].candidate.partnerId).toBe('p_far_good');
    });

    test('30. Workload and rating balance: highly rated, active partner beats low-rated idle', () => {
      const starPartner = createBaseCandidate('p_star', {
        lastLatitude: DEHRADUN_LAT + 0.015,
        lastLongitude: DEHRADUN_LNG + 0.015,
        rating: 4.95,
        completedJobCount: 120,
        acceptanceRate: 0.98,
      });
      const lowRated = createBaseCandidate('p_low', {
        lastLatitude: DEHRADUN_LAT + 0.014, // Slightly closer
        lastLongitude: DEHRADUN_LNG + 0.014,
        rating: 3.5,
        completedJobCount: 2,
        acceptanceRate: 0.6,
      });

      const ranked = matchingService.rankCandidates([lowRated, starPartner], defaultContext);
      expect(ranked[0].candidate.partnerId).toBe('p_star');
    });

    test('34. Identical candidate metrics produce deterministic ordering (stable tie-breaking)', () => {
      const p1 = createBaseCandidate('p_alpha', { rating: 4.8, completedJobCount: 10 });
      const p2 = createBaseCandidate('p_beta', { rating: 4.8, completedJobCount: 10 });

      const run1 = matchingService.rankCandidates([p1, p2], defaultContext).map((r) => r.candidate.partnerId);
      const run2 = matchingService.rankCandidates([p1, p2], defaultContext).map((r) => r.candidate.partnerId);

      expect(run1).toEqual(run2);
    });
  });
});
