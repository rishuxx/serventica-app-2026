import crypto from 'crypto';

export interface AuthoritativePriceInput {
  basePrice: number;
  variantPrice?: number;
  addonsTotal?: number;
  platformFee?: number;
  convenienceFee?: number;
  discountAmount?: number;
}

export class PaymentTransactionEngine {
  /**
   * Recalculates exact authoritative price in INR and smallest currency unit (Paise)
   */
  static calculateAuthoritativePrice(input: AuthoritativePriceInput): {
    amountRupees: number;
    amountPaise: number;
    platformTotalFee: number;
  } {
    const unitPrice = input.variantPrice ?? input.basePrice;
    const addons = input.addonsTotal || 0;
    const platform = input.platformFee ?? 49;
    const convenience = input.convenienceFee ?? 49;
    const discount = input.discountAmount || 0;

    const totalRupees = Math.max(0, unitPrice + addons + platform + convenience - discount);
    const amountPaise = Math.round(totalRupees * 100);

    return {
      amountRupees: totalRupees,
      amountPaise,
      platformTotalFee: platform + convenience,
    };
  }

  /**
   * Server-side HMAC SHA256 Signature Verification matching Razorpay specifications
   * expected: HMAC_SHA256(order_id + "|" + payment_id, secret) === signature
   */
  static verifyRazorpaySignature(params: {
    orderId: string;
    paymentId: string;
    signature: string;
    secret: string;
  }): boolean {
    if (!params.orderId || !params.paymentId || !params.signature || !params.secret) {
      return false;
    }

    const payload = `${params.orderId}|${params.paymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', params.secret)
      .update(payload)
      .digest('hex');

    // Constant-time string equality check to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(generatedSignature, 'utf-8'),
        Buffer.from(params.signature, 'utf-8')
      );
    } catch {
      return false;
    }
  }

  /**
   * Webhook Signature Verification
   */
  static verifyRazorpayWebhookSignature(params: {
    rawBody: string;
    webhookSignature: string;
    webhookSecret: string;
  }): boolean {
    if (!params.rawBody || !params.webhookSignature || !params.webhookSecret) {
      return false;
    }

    const generated = crypto
      .createHmac('sha256', params.webhookSecret)
      .update(params.rawBody)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(generated, 'utf-8'),
        Buffer.from(params.webhookSignature, 'utf-8')
      );
    } catch {
      return false;
    }
  }
}
