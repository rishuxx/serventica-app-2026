import { FulfillmentTransactionService } from './fulfillment-transaction.service';
import type { ConfirmBookingParams, ReassignPartnerParams, StartServiceParams, CompleteServiceParams, CancelBookingFulfillmentParams } from '@serventica/types';
export declare class FulfillmentController {
    private readonly fulfillmentService;
    constructor(fulfillmentService: FulfillmentTransactionService);
    confirmBooking(body: ConfirmBookingParams, idempotencyKey?: string): Promise<import("@serventica/types").FulfillmentTransitionResult>;
    acceptOffer(body: {
        bookingId: string;
        partnerId: string;
    }): Promise<import("@serventica/types").FulfillmentTransitionResult>;
    reassignPartner(body: ReassignPartnerParams): Promise<import("@serventica/types").FulfillmentTransitionResult>;
    startService(body: StartServiceParams): Promise<import("@serventica/types").FulfillmentTransitionResult>;
    completeService(body: CompleteServiceParams): Promise<import("@serventica/types").FulfillmentTransitionResult>;
    cancelBooking(body: CancelBookingFulfillmentParams): Promise<import("@serventica/types").FulfillmentTransitionResult>;
}
