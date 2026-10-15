import {
  ServiceRequirementInputSchema,
  RequestExtensionSchema,
  InstantSafetyPolicy,
  CalculateInstantQuoteSchema,
} from '../instant_fulfillment_schemas';

describe('Serventica Instant — Domain & Schema Validation (Prompt 01)', () => {
  describe('Helping Hand Constraints', () => {
    it('accepts valid Helping Hand initial durations (30m to 240m)', () => {
      const valid = ServiceRequirementInputSchema.safeParse({
        instantServiceType: 'HELPING_HAND',
        durationMinutes: 120,
        requiredPartnerCount: 1,
        taskCategory: 'General Cleaning',
      });
      expect(valid.success).toBe(true);
    });

    it('rejects Helping Hand initial booking exceeding 240 minutes (4 hours)', () => {
      const invalid = ServiceRequirementInputSchema.safeParse({
        instantServiceType: 'HELPING_HAND',
        durationMinutes: 300, // 5 hours
        requiredPartnerCount: 1,
      });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.issues[0].message).toContain('cannot exceed 4 hours');
      }
    });
  });

  describe('Road Help Fuel Delivery Constraints', () => {
    it('accepts strictly 1.0 Litre fuel delivery emergency top-up', () => {
      const valid = ServiceRequirementInputSchema.safeParse({
        instantServiceType: 'ROAD_HELP',
        durationMinutes: 30,
        issueType: 'FUEL',
        fuelType: 'PETROL',
        fuelQuantityLitres: 1.0,
      });
      expect(valid.success).toBe(true);
    });

    it('rejects fuel requests exceeding 1.0 Litre', () => {
      const invalid = ServiceRequirementInputSchema.safeParse({
        instantServiceType: 'ROAD_HELP',
        durationMinutes: 30,
        issueType: 'FUEL',
        fuelType: 'PETROL',
        fuelQuantityLitres: 2.5, // Exceeds 1L limit
      });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.issues[0].message).toContain('1.0 Litre');
      }
    });

    it('rejects fuel request missing fuel type (PETROL/DIESEL)', () => {
      const invalid = ServiceRequirementInputSchema.safeParse({
        instantServiceType: 'ROAD_HELP',
        durationMinutes: 30,
        issueType: 'FUEL',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('Pack & Move Multi-Partner Support', () => {
    it('accepts multiple helpers (e.g. 2 helpers for shifting)', () => {
      const valid = ServiceRequirementInputSchema.safeParse({
        instantServiceType: 'PACK_MOVE',
        durationMinutes: 120,
        requiredPartnerCount: 2,
        specialInstructions: 'Moving sofa and 4 boxes',
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.requiredPartnerCount).toBe(2);
      }
    });

    it('defaults required partner count to at least 1', () => {
      const valid = ServiceRequirementInputSchema.safeParse({
        instantServiceType: 'LAUNDRY',
        durationMinutes: 30,
        approxLoadKg: 5.5,
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.requiredPartnerCount).toBe(1);
      }
    });
  });

  describe('Duration Extension Invariants', () => {
    it('permits valid extension durations (30, 60, 90, 120 minutes)', () => {
      const valid = RequestExtensionSchema.safeParse({
        bookingId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        additionalMinutes: 30,
      });
      expect(valid.success).toBe(true);
    });

    it('rejects arbitrary or unsupported extension durations (e.g. 45 minutes)', () => {
      const invalid = RequestExtensionSchema.safeParse({
        bookingId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        additionalMinutes: 45,
      });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.issues[0].message).toContain('increments of 30, 60, 90, or 120');
      }
    });
  });

  describe('Task Safety & Specialist Boundary Policy', () => {
    it('permits non-specialized general household assistance', () => {
      const result = InstantSafetyPolicy.evaluateTaskSafety(
        'Folding laundry, organizing bedroom closets, sweeping living room floor'
      );
      expect(result.isPermitted).toBe(true);
      expect(result.specialistRequired).toBe(false);
    });

    it('flags electrical wiring as requiring a certified specialist', () => {
      const result = InstantSafetyPolicy.evaluateTaskSafety(
        'Fix burnt electrical wiring in the bedroom switchboard'
      );
      expect(result.isPermitted).toBe(false);
      expect(result.specialistRequired).toBe(true);
      expect(result.reason).toContain('licensed professional specialist');
    });

    it('flags gas cylinder/leakage work as requiring a specialist', () => {
      const result = InstantSafetyPolicy.evaluateTaskSafety(
        'Check kitchen gas cylinder pipe connection'
      );
      expect(result.isPermitted).toBe(false);
      expect(result.specialistRequired).toBe(true);
    });
  });

  describe('Quote Calculation Schema Validation', () => {
    it('validates quote params with valid coordinates', () => {
      const valid = CalculateInstantQuoteSchema.safeParse({
        serviceSlug: 'helping-hand',
        latitude: 30.3251,
        longitude: 78.0412,
        requirements: {
          instantServiceType: 'HELPING_HAND',
          durationMinutes: 60,
          requiredPartnerCount: 1,
        },
      });
      expect(valid.success).toBe(true);
    });

    it('rejects quote request with invalid coordinates', () => {
      const invalid = CalculateInstantQuoteSchema.safeParse({
        serviceSlug: 'helping-hand',
        latitude: 105.0, // Invalid latitude > 90
        longitude: 78.0412,
        requirements: {
          instantServiceType: 'HELPING_HAND',
          durationMinutes: 60,
        },
      });
      expect(invalid.success).toBe(false);
    });
  });
});
