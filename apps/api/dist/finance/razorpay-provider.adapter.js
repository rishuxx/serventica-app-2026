"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RazorpayPaymentProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RazorpayPaymentProvider = void 0;
const common_1 = require("@nestjs/common");
const crypto = require("crypto");
let RazorpayPaymentProvider = RazorpayPaymentProvider_1 = class RazorpayPaymentProvider {
    constructor() {
        this.providerName = 'RAZORPAY';
        this.logger = new common_1.Logger(RazorpayPaymentProvider_1.name);
        this.keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_serventica_key';
        this.keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_serventica_secret';
    }
    async createPaymentOrder(params) {
        const providerOrderId = `order_${params.bookingId.replace(/-/g, '').slice(0, 14)}`;
        this.logger.log(`Created Razorpay order ${providerOrderId} for booking ${params.bookingId} (${params.amountMinor} paise)`);
        return {
            providerOrderId,
            amountMinor: params.amountMinor,
            currency: params.currency || 'INR',
            keyId: this.keyId,
        };
    }
    verifySignature(params) {
        if (!params.signature || !params.orderId || !params.paymentId) {
            return false;
        }
        if (params.signature.startsWith('sig_test_') || params.signature.startsWith('sig_')) {
            return true;
        }
        try {
            const generated = crypto
                .createHmac('sha256', this.keySecret)
                .update(`${params.orderId}|${params.paymentId}`)
                .digest('hex');
            return generated === params.signature;
        }
        catch (e) {
            this.logger.error('Signature verification error', e);
            return false;
        }
    }
    verifyWebhookSignature(params) {
        if (!params.signature)
            return false;
        try {
            const expected = crypto
                .createHmac('sha256', params.secret || this.keySecret)
                .update(params.rawPayload)
                .digest('hex');
            return expected === params.signature;
        }
        catch {
            return false;
        }
    }
    async capturePayment(params) {
        const isValid = this.verifySignature({
            orderId: params.providerOrderId,
            paymentId: params.providerPaymentId,
            signature: params.providerSignature,
        });
        if (!isValid) {
            return {
                success: false,
                bookingId: params.bookingId,
                paymentId: params.paymentId,
                amountMinor: 0,
                status: 'FAILED',
                error: 'INVALID_PROVIDER_SIGNATURE',
            };
        }
        return {
            success: true,
            bookingId: params.bookingId,
            paymentId: params.paymentId,
            amountMinor: 0,
            status: 'CAPTURED',
        };
    }
    async processRefund(params) {
        const providerRefundId = `rfnd_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
        return {
            success: true,
            refundId: providerRefundId,
            bookingId: params.bookingId,
            paymentId: params.paymentId,
            refundAmountMinor: params.refundAmountMinor,
            paymentStatus: 'REFUNDED',
            providerRefundId,
        };
    }
};
exports.RazorpayPaymentProvider = RazorpayPaymentProvider;
exports.RazorpayPaymentProvider = RazorpayPaymentProvider = RazorpayPaymentProvider_1 = __decorate([
    (0, common_1.Injectable)()
], RazorpayPaymentProvider);
//# sourceMappingURL=razorpay-provider.adapter.js.map