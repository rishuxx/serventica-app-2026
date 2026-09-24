import { Injectable, Logger } from '@nestjs/common';
import {
  InvoiceDTO,
  InvoiceStatus,
  PricingSnapshot,
} from '@serventica/types';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  generateInvoiceNumber(bookingId: string): string {
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
    const suffix = bookingId.replace(/-/g, '').slice(0, 6).toUpperCase();
    return `INV-${yearMonth}-${suffix}`;
  }

  buildInvoice(params: {
    bookingId: string;
    customerId: string;
    paymentId: string;
    amountMinor: number;
    taxMinor: number;
    pricingSnapshot: Record<string, any>;
    status?: InvoiceStatus;
  }): InvoiceDTO {
    const invoiceNumber = this.generateInvoiceNumber(params.bookingId);
    return {
      id: `inv_${params.bookingId.slice(0, 8)}`,
      bookingId: params.bookingId,
      customerId: params.customerId,
      paymentId: params.paymentId,
      invoiceNumber,
      amountMinor: params.amountMinor,
      taxMinor: params.taxMinor,
      currency: 'INR',
      status: params.status || 'PAID',
      pricingSnapshot: params.pricingSnapshot,
      issuedAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
    };
  }
}
