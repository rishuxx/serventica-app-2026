/**
 * SERVENTICA — Payment Provider Adapter Interface
 * Decouples business logic from specific payment providers (Juspay, Razorpay, Cashfree).
 */

import {
  PaymentProviderName,
  PaymentSessionDTO,
  NormalizedPaymentEvent,
} from '../../../../../packages/types/src';

export interface CreateProviderSessionInput {
  paymentId: string;
  internalPaymentId: string;
  bookingId: string;
  bookingNumber: string;
  amountMinor: number;
  amountRupees: number;
  currency: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceName: string;
  metadata?: Record<string, any>;
}

export interface VerifyProviderPaymentInput {
  paymentId: string;
  internalPaymentId: string;
  providerPaymentId: string;
  providerOrderId: string;
  providerSignature?: string;
  expectedAmountRupees: number;
  currency: string;
}

export interface ProviderVerificationResult {
  success: boolean;
  status: 'CAPTURED' | 'FAILED' | 'PENDING';
  providerPaymentId: string;
  providerOrderId: string;
  amountRupees: number;
  currency: string;
  paymentMethod?: string;
  errorMessage?: string;
}

export interface IPaymentProviderAdapter {
  readonly providerName: PaymentProviderName;

  createSession(input: CreateProviderSessionInput): Promise<PaymentSessionDTO>;

  verifyPayment(input: VerifyProviderPaymentInput): Promise<ProviderVerificationResult>;

  parseWebhook(payload: any, signature: string): Promise<NormalizedPaymentEvent>;
}
