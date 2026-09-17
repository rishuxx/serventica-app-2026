import { z } from 'zod';

/**
 * SERVENTICA REQUEST SCHEMAS (Schema Validation Layer)
 * Used on clients for form UX validation and on API gateway for input boundaries.
 */

export const PhoneNumberSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number');

export const OtpVerificationSchema = z.object({
  phone: PhoneNumberSchema,
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const AddressInputSchema = z.object({
  street: z.string().min(3),
  landmark: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/, 'Must be a valid 6-digit PIN code'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export * from './availability_engine';
export * from './payment_transaction_engine';

