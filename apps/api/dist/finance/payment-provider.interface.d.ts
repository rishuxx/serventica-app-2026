import { AuthoritativeCaptureParams, AuthoritativeCaptureResult, AuthoritativeRefundParams, AuthoritativeRefundResult } from '@serventica/types';
export interface CreateOrderParams {
    bookingId: string;
    customerId: string;
    amountMinor: number;
    currency: string;
    idempotencyKey?: string;
}
export interface CreateOrderResult {
    providerOrderId: string;
    amountMinor: number;
    currency: string;
    keyId: string;
}
export interface WebhookVerificationParams {
    rawPayload: string;
    signature: string;
    secret: string;
}
export interface IPaymentProvider {
    readonly providerName: string;
    createPaymentOrder(params: CreateOrderParams): Promise<CreateOrderResult>;
    verifySignature(params: {
        orderId: string;
        paymentId: string;
        signature: string;
    }): boolean;
    verifyWebhookSignature(params: WebhookVerificationParams): boolean;
    capturePayment(params: AuthoritativeCaptureParams): Promise<AuthoritativeCaptureResult>;
    processRefund(params: AuthoritativeRefundParams): Promise<AuthoritativeRefundResult>;
}
