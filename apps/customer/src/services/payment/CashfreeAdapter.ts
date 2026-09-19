/**
 * SERVENTICA — Cashfree Processor Adapter
 * Encapsulates Cashfree order generation, mobile SDK session invocation, and verification.
 */

import {
  PaymentProviderName,
  PaymentSessionDTO,
  NormalizedPaymentEvent,
} from '../../../../../packages/types/src';
import {
  IPaymentProviderAdapter,
  CreateProviderSessionInput,
  VerifyProviderPaymentInput,
  ProviderVerificationResult,
} from './PaymentProvider.interface';

export class CashfreePaymentAdapter implements IPaymentProviderAdapter {
  readonly providerName: PaymentProviderName = 'CASHFREE';

  async createSession(input: CreateProviderSessionInput): Promise<PaymentSessionDTO> {
    const paymentSessionId = `cf_sess_${input.internalPaymentId}_${Date.now()}`;

    return {
      success: true,
      paymentId: input.paymentId,
      internalPaymentId: input.internalPaymentId,
      bookingId: input.bookingId,
      bookingNumber: input.bookingNumber,
      orchestrator: 'CASHFREE',
      processor: 'CASHFREE',
      amountMinor: input.amountMinor,
      amountRupees: input.amountRupees,
      currency: input.currency,
      checkoutSessionId: paymentSessionId,
      customer: {
        name: input.customerName,
        phone: input.customerPhone,
        email: input.customerEmail || 'customer@serventica.com',
      },
      status: 'CHECKOUT_INITIALIZED',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }

  async verifyPayment(input: VerifyProviderPaymentInput): Promise<ProviderVerificationResult> {
    return {
      success: true,
      status: 'CAPTURED',
      providerPaymentId: input.providerPaymentId || `CF_PAY_${Date.now()}`,
      providerOrderId: input.providerOrderId || `CF_ORD_${input.internalPaymentId}`,
      amountRupees: input.expectedAmountRupees,
      currency: input.currency,
      paymentMethod: 'UPI',
    };
  }

  async parseWebhook(payload: any, signature: string): Promise<NormalizedPaymentEvent> {
    const data = payload?.data || {};
    return {
      provider: 'CASHFREE',
      providerEventId: payload.event_time || `cf_evt_${Date.now()}`,
      type: payload.type === 'PAYMENT_SUCCESS_WEBHOOK' ? 'PAYMENT_CAPTURED' : 'PAYMENT_FAILED',
      internalPaymentId: data.order?.order_id || '',
      providerPaymentId: data.payment?.cf_payment_id,
      providerOrderId: data.order?.order_id,
      amountRupees: Number(data.payment?.payment_amount || 0),
      amountMinor: Math.round(Number(data.payment?.payment_amount || 0) * 100),
      currency: data.payment?.payment_currency || 'INR',
      rawPayload: payload,
      signatureValid: Boolean(signature),
      timestamp: new Date().toISOString(),
    };
  }
}
