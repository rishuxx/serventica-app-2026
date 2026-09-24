import { ReconciliationExceptionDTO } from '@serventica/types';
export interface InternalPaymentRecord {
    paymentId: string;
    bookingId: string;
    amountMinor: number;
    status: string;
}
export interface ProviderPaymentRecord {
    providerPaymentId: string;
    amountMinor: number;
    status: string;
}
export declare class ReconciliationService {
    private readonly logger;
    reconcilePayments(internalRecords: InternalPaymentRecord[], providerRecords: Map<string, ProviderPaymentRecord>): ReconciliationExceptionDTO[];
}
