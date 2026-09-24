import { InvoiceDTO, InvoiceStatus } from '@serventica/types';
export declare class InvoiceService {
    private readonly logger;
    generateInvoiceNumber(bookingId: string): string;
    buildInvoice(params: {
        bookingId: string;
        customerId: string;
        paymentId: string;
        amountMinor: number;
        taxMinor: number;
        pricingSnapshot: Record<string, any>;
        status?: InvoiceStatus;
    }): InvoiceDTO;
}
