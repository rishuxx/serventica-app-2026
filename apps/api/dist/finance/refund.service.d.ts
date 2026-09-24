export declare class RefundService {
    private readonly logger;
    validateRefundRequest(params: {
        capturedAmountMinor: number;
        alreadyRefundedAmountMinor: number;
        requestedRefundMinor: number;
    }): {
        valid: boolean;
        error?: string;
        remainingRefundableMinor: number;
    };
}
