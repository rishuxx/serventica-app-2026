import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  /**
   * Compares internal payment ledger against provider batch records to flag anomalies
   */
  reconcilePayments(
    internalRecords: InternalPaymentRecord[],
    providerRecords: Map<string, ProviderPaymentRecord>
  ): ReconciliationExceptionDTO[] {
    const exceptions: ReconciliationExceptionDTO[] = [];

    for (const record of internalRecords) {
      const providerData = providerRecords.get(record.paymentId);

      if (!providerData) {
        exceptions.push({
          entityType: 'PAYMENT',
          internalReferenceId: record.paymentId,
          expectedAmountMinor: record.amountMinor,
          actualAmountMinor: 0,
          severity: 'HIGH',
          status: 'OPEN',
          discrepancyDetails: {
            reason: 'MISSING_PROVIDER_TRANSACTION',
            bookingId: record.bookingId,
          },
        });
        continue;
      }

      if (record.amountMinor !== providerData.amountMinor) {
        exceptions.push({
          entityType: 'PAYMENT',
          internalReferenceId: record.paymentId,
          providerReferenceId: providerData.providerPaymentId,
          expectedAmountMinor: record.amountMinor,
          actualAmountMinor: providerData.amountMinor,
          severity: 'CRITICAL',
          status: 'OPEN',
          discrepancyDetails: {
            reason: 'AMOUNT_MISMATCH',
            differenceMinor: Math.abs(record.amountMinor - providerData.amountMinor),
          },
        });
      }

      if (record.status === 'CAPTURED' && providerData.status !== 'captured') {
        exceptions.push({
          entityType: 'PAYMENT',
          internalReferenceId: record.paymentId,
          providerReferenceId: providerData.providerPaymentId,
          expectedAmountMinor: record.amountMinor,
          actualAmountMinor: providerData.amountMinor,
          severity: 'HIGH',
          status: 'OPEN',
          discrepancyDetails: {
            reason: 'STATUS_DESYNCHRONIZATION',
            internalStatus: record.status,
            providerStatus: providerData.status,
          },
        });
      }
    }

    if (exceptions.length > 0) {
      this.logger.warn(`[Reconciliation] Detected ${exceptions.length} exceptions during audit run`);
    }

    return exceptions;
  }
}
