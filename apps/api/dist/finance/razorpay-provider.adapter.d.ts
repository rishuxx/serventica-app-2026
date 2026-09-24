import { AuthoritativeCaptureParams, AuthoritativeCaptureResult, AuthoritativeRefundParams, AuthoritativeRefundResult } from '@serventica/types';
import { IPaymentProvider, CreateOrderParams, CreateOrderResult, WebhookVerificationParams } from './payment-provider.interface';
export declare class RazorpayPaymentProvider implements IPaymentProvider {
    readonly providerName = "RAZORPAY";
    private readonly logger;
    private readonly keyId;
    private readonly keySecret;
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
