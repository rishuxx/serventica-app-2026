import crypto from 'crypto';
import { PaymentTransactionEngine } from '../payment_transaction_engine';

describe('Phase 6 — Payment Transaction & Razorpay Verification Engine', () => {
  const testSecret = 'rzp_test_secret_key_12345';
  const testOrderId = 'order_test_9876543210';
  const testPaymentId = 'pay_test_1122334455';

  describe('Authoritative Price Recalculation', () => {
    it('calculates exact INR and Paise without floating point money errors', () => {
      const price = PaymentTransactionEngine.calculateAuthoritativePrice({
        basePrice: 499,
        platformFee: 49,
        convenienceFee: 49,
        discountAmount: 0,
      });

      expect(price.amountRupees).toBe(597);
      expect(price.amountPaise).toBe(59700);
      expect(price.platformTotalFee).toBe(98);
    });

    it('overrides base price with variant price when variant is selected', () => {
      const price = PaymentTransactionEngine.calculateAuthoritativePrice({
        basePrice: 499,
        variantPrice: 799,
        platformFee: 49,
        convenienceFee: 49,
        discountAmount: 50,
      });

      expect(price.amountRupees).toBe(847);
      expect(price.amountPaise).toBe(84700);
    });
  });

  describe('Server-Side HMAC SHA256 Signature Verification', () => {
    it('validates authentic Razorpay payment callback signature with constant-time equality', () => {
      const payload = `${testOrderId}|${testPaymentId}`;
      const validSignature = crypto
        .createHmac('sha256', testSecret)
        .update(payload)
        .digest('hex');

      const isValid = PaymentTransactionEngine.verifyRazorpaySignature({
        orderId: testOrderId,
        paymentId: testPaymentId,
        signature: validSignature,
        secret: testSecret,
      });

      expect(isValid).toBe(true);
    });

    it('rejects tampered or fraudulent payment signatures', () => {
      const fraudulentSignature = 'f0e0d0c0b0a090807060504030201000';

      const isValid = PaymentTransactionEngine.verifyRazorpaySignature({
        orderId: testOrderId,
        paymentId: testPaymentId,
        signature: fraudulentSignature,
        secret: testSecret,
      });

      expect(isValid).toBe(false);
    });
  });

  describe('Webhook Signature Verification', () => {
    it('validates genuine Razorpay webhook event payloads', () => {
      const rawBody = JSON.stringify({
        event: 'payment.captured',
        payload: { payment: { entity: { id: testPaymentId, amount: 59700 } } },
      });

      const webhookSecret = 'whsec_test_secret_9988';
      const webhookSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      const isWebhookValid = PaymentTransactionEngine.verifyRazorpayWebhookSignature({
        rawBody,
        webhookSignature,
        webhookSecret,
      });

      expect(isWebhookValid).toBe(true);
    });
  });
});
