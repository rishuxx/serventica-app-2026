import { LedgerTransactionDTO, LedgerEntryDTO } from '@serventica/types';
export declare class FinancialLedgerService {
    private readonly logger;
    assertBalance(entries: LedgerEntryDTO[]): void;
    buildPaymentCaptureJournal(bookingId: string, paymentId: string, amountMinor: number): LedgerTransactionDTO;
    buildServiceFulfillmentJournal(bookingId: string, totalMinor: number, partnerPayoutMinor: number, platformFeeMinor: number, taxMinor: number): LedgerTransactionDTO;
    buildRefundJournal(bookingId: string, paymentId: string, refundId: string, refundMinor: number): LedgerTransactionDTO;
}
