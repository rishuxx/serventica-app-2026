import { z } from 'zod';

/**
 * SERVENTICA INSTANT FULFILLMENT SCHEMAS & VALIDATORS (Prompt 01)
 * Enforces business constraints, boundary limits, and safety invariants.
 */

export const FulfillmentModeSchema = z.enum(['INSTANT', 'SCHEDULED']);

export const InstantServiceTypeSchema = z.enum([
  'HELPING_HAND',
  'ROAD_HELP',
  'LAUNDRY',
  'PACK_MOVE',
]);

export const VehicleTypeSchema = z.enum([
  'BIKE',
  'SCOOTER',
  'CAR',
  'SUV',
  'OTHER',
]);

export const StarterStatusSchema = z.enum(['YES', 'NO', 'NOT_SURE']);

export const RoadIssueTypeSchema = z.enum([
  'FUEL',
  'BREAKDOWN',
  'FLAT_TYRE',
  'BATTERY',
  'OTHER',
]);

export const FuelTypeSchema = z.enum(['PETROL', 'DIESEL']);

export const PartnerPresenceStatusSchema = z.enum([
  'OFFLINE',
  'ONLINE',
  'AVAILABLE',
  'BUSY',
  'PAUSED',
  'SUSPENDED',
]);

export const AssignmentRoleSchema = z.enum(['PRIMARY', 'ASSISTANT', 'SPECIALIST']);

export const AssignmentStatusSchema = z.enum([
  'ASSIGNED',
  'ACCEPTED',
  'DECLINED',
  'EN_ROUTE',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

/**
 * Core Service Requirement Input Schema
 */
export const ServiceRequirementInputSchema = z
  .object({
    instantServiceType: InstantServiceTypeSchema,
    requiredPartnerCount: z.number().int().min(1, 'At least 1 partner is required').default(1),
    durationMinutes: z.number().int().min(15, 'Minimum duration is 15 minutes'),
    taskCategory: z.string().optional(),
    vehicleType: VehicleTypeSchema.optional(),
    starterStatus: StarterStatusSchema.optional(),
    issueType: RoadIssueTypeSchema.optional(),
    fuelType: FuelTypeSchema.optional(),
    fuelQuantityLitres: z
      .number()
      .positive('Fuel quantity must be greater than 0')
      .max(1.0, 'Fuel delivery is strictly capped at 1.0 Litre emergency top-up')
      .optional(),
    approxLoadKg: z.number().positive().optional(),
    specialInstructions: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    // 1. Helping Hand initial booking duration cannot exceed 4 hours (240 minutes)
    if (data.instantServiceType === 'HELPING_HAND' && data.durationMinutes > 240) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['durationMinutes'],
        message: 'Helping Hand initial booking duration cannot exceed 4 hours (240 minutes). Extensions may be requested later.',
      });
    }

    // 2. Road Help Fuel Delivery must not exceed 1 Litre
    if (data.issueType === 'FUEL') {
      if (!data.fuelType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fuelType'],
          message: 'Fuel type (PETROL or DIESEL) is required for fuel requests',
        });
      }
      if (data.fuelQuantityLitres && data.fuelQuantityLitres > 1.0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fuelQuantityLitres'],
          message: 'Fuel delivery is restricted to a maximum of 1.0 Litre to reach the nearest fuel station.',
        });
      }
    }
  });

export const CalculateInstantQuoteSchema = z.object({
  serviceSlug: z.string().min(1, 'Service slug is required'),
  latitude: z.number().min(-90).max(90, 'Invalid latitude'),
  longitude: z.number().min(-180).max(180, 'Invalid longitude'),
  requirements: ServiceRequirementInputSchema,
});

export const CreateInstantDispatchSchema = z.object({
  quoteId: z.string().uuid('Valid quote ID required'),
  addressId: z.string().uuid('Valid address ID required'),
  serviceSlug: z.string().min(1, 'Service slug is required'),
  requirements: ServiceRequirementInputSchema,
  paymentMethod: z.string().min(1, 'Payment method required'),
  idempotencyKey: z.string().optional(),
});

export const RequestExtensionSchema = z.object({
  bookingId: z.string().uuid('Valid booking ID required'),
  additionalMinutes: z
    .number()
    .int()
    .refine((val) => [30, 60, 90, 120].includes(val), {
      message: 'Extension must be in increments of 30, 60, 90, or 120 minutes',
    }),
});

export const RespondExtensionSchema = z.object({
  bookingId: z.string().uuid('Valid booking ID required'),
  extensionId: z.string().uuid('Valid extension ID required'),
  accepted: z.boolean(),
});

export const PartnerPresenceUpdateSchema = z.object({
  status: PartnerPresenceStatusSchema,
  currentLatitude: z.number().min(-90).max(90).optional(),
  currentLongitude: z.number().min(-180).max(180).optional(),
});

export const PartnerHeartbeatSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
  accuracy: z.number().min(0).optional(),
  recordedAt: z.string().optional(),
});

/**
 * Task Safety & Specialist Policy Checker
 */
export class InstantSafetyPolicy {
  private static readonly PROHIBITED_KEYWORDS = [
    'electric',
    'wiring',
    'switchboard',
    'mcb',
    'short circuit',
    'gas',
    'cylinder',
    'lpg',
    'leakage',
    'pipe burst',
    'medical',
    'injection',
    'nurse',
    'elderly care physical',
    'hazardous',
    'acid',
    'roof repair',
    'high rise window',
  ];

  /**
   * Validates if a customer-entered task description violates safety boundaries
   * and requires a certified specialist instead of a general Helping Hand.
   */
  static evaluateTaskSafety(taskDescription: string): {
    isPermitted: boolean;
    reason?: string;
    specialistRequired?: boolean;
  } {
    const lower = taskDescription.toLowerCase();
    for (const keyword of this.PROHIBITED_KEYWORDS) {
      if (lower.includes(keyword)) {
        return {
          isPermitted: false,
          specialistRequired: true,
          reason: `Task involves '${keyword}', which requires a licensed professional specialist.`,
        };
      }
    }

    return {
      isPermitted: true,
      specialistRequired: false,
    };
  }
}
