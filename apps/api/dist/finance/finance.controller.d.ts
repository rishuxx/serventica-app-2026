import type { AuthoritativeCaptureParams, AuthoritativeRefundParams } from '@serventica/types';
import { RazorpayPaymentProvider } from './razorpay-provider.adapter';
import { FinancialLedgerService } from './financial-ledger.service';
import { RefundService } from './refund.service';
import { InvoiceService } from './invoice.service';
import { ReconciliationService } from './reconciliation.service';
export declare class FinanceController {
    private readonly paymentProvider;
    private readonly ledgerService;
    private readonly refundService;
    private readonly invoiceService;
    private readonly reconciliationService;
    constructor(paymentProvider: RazorpayPaymentProvider, ledgerService: FinancialLedgerService, refundService: RefundService, invoiceService: InvoiceService, reconciliationService: ReconciliationService);
    capturePayment(body: AuthoritativeCaptureParams, idempotencyKey?: string): Promise<{
        success: boolean;
        bookingId: string;
        paymentId: string;
        status: string;
        idempotencyKey: string;
    }>;
    processRefund(body: AuthoritativeRefundParams, idempotencyKey?: string): Promise<import("@serventica/types").AuthoritativeRefundResult>;
    getInvoice(bookingId: string): Promise<import("@serventica/types").InvoiceDTO>;
}
