import { Injectable, Logger } from '@nestjs/common';
import { LedgerTransactionDTO, LedgerEntryDTO } from '@serventica/types';

@Injectable()
export class FinancialLedgerService {
  private readonly logger = new Logger(FinancialLedgerService.name);

  /**
   * Asserts that total debits equal total credits across minor units
   */
  assertBalance(entries: LedgerEntryDTO[]): void {
    let debits = 0;
    let credits = 0;

    for (const entry of entries) {
      if (!Number.isInteger(entry.amountMinor) || entry.amountMinor <= 0) {
        throw new Error(`[Ledger] Invalid entry amount minor: ${entry.amountMinor}`);
      }
      if (entry.entryType === 'DEBIT') {
        debits += entry.amountMinor;
      } else if (entry.entryType === 'CREDIT') {
        credits += entry.amountMinor;
      } else {
        throw new Error(`[Ledger] Unknown entry type: ${entry.entryType}`);
      }
    }

    if (debits !== credits) {
      throw new Error(
        `[LedgerInvariantViolation] Debits (${debits} paise) != Credits (${credits} paise). Imbalance: ${debits - credits} paise.`
      );
    }
  }

  /**
   * Constructs double-entry journal items for payment capture
   */
  buildPaymentCaptureJournal(
    bookingId: string,
    paymentId: string,
    amountMinor: number
  ): LedgerTransactionDTO {
    const entries: LedgerEntryDTO[] = [
      {
        accountCode: 'GATEWAY_CLEARING',
        entryType: 'DEBIT',
        amountMinor,
        currency: 'INR',
      },
      {
        accountCode: 'CUSTOMER_RECEIVABLE',
        entryType: 'CREDIT',
        amountMinor,
        currency: 'INR',
      },
    ];

    this.assertBalance(entries);

    return {
      bookingId,
      paymentId,
      transactionType: 'PAYMENT_CAPTURED',
      referenceNumber: `TX-PAY-${paymentId.slice(0, 8)}-${Date.now()}`,
      description: `Payment captured: ${amountMinor} paise`,
      entries,
    };
  }

  /**
   * Constructs double-entry journal items for partner earning & platform fee
   */
  buildServiceFulfillmentJournal(
    bookingId: string,
    totalMinor: number,
    partnerPayoutMinor: number,
    platformFeeMinor: number,
    taxMinor: number
  ): LedgerTransactionDTO {
    const entries: LedgerEntryDTO[] = [
      // Debit Customer Receivable cleared
      {
        accountCode: 'CUSTOMER_RECEIVABLE',
        entryType: 'DEBIT',
        amountMinor: totalMinor,
        currency: 'INR',
      },
      // Credit Partner Payable
      {
        accountCode: 'PARTNER_PAYABLE',
        entryType: 'CREDIT',
        amountMinor: partnerPayoutMinor,
        currency: 'INR',
      },
      // Credit Platform Revenue
      {
        accountCode: 'PLATFORM_REVENUE',
        entryType: 'CREDIT',
        amountMinor: platformFeeMinor,
        currency: 'INR',
      },
    ];

    if (taxMinor > 0) {
      entries.push({
        accountCode: 'TAX_LIABILITY',
        entryType: 'CREDIT',
        amountMinor: taxMinor,
        currency: 'INR',
      });
    }

    this.assertBalance(entries);

    return {
      bookingId,
      transactionType: 'PARTNER_EARNING_ACCRUED',
      referenceNumber: `TX-FULFILL-${bookingId.slice(0, 8)}-${Date.now()}`,
      description: `Service fulfilled: partner earning ${partnerPayoutMinor}, platform fee ${platformFeeMinor}`,
      entries,
    };
  }

  /**
   * Constructs double-entry journal items for refund
   */
  buildRefundJournal(
    bookingId: string,
    paymentId: string,
    refundId: string,
    refundMinor: number
  ): LedgerTransactionDTO {
    const entries: LedgerEntryDTO[] = [
      {
        accountCode: 'REFUND_CLEARING',
        entryType: 'DEBIT',
        amountMinor: refundMinor,
        currency: 'INR',
      },
      {
        accountCode: 'GATEWAY_CLEARING',
        entryType: 'CREDIT',
        amountMinor: refundMinor,
        currency: 'INR',
      },
    ];

    this.assertBalance(entries);

    return {
      bookingId,
      paymentId,
      refundId,
      transactionType: 'REFUND_PROCESSED',
      referenceNumber: `TX-RFND-${refundId.slice(0, 8)}-${Date.now()}`,
      description: `Refund processed: ${refundMinor} paise`,
      entries,
    };
  }
}
