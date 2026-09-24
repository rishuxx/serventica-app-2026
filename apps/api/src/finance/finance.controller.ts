import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import type {
  AuthoritativeCaptureParams,
  AuthoritativeRefundParams,
} from '@serventica/types';
import { RazorpayPaymentProvider } from './razorpay-provider.adapter';
import { FinancialLedgerService } from './financial-ledger.service';
import { RefundService } from './refund.service';
import { InvoiceService } from './invoice.service';
import { ReconciliationService } from './reconciliation.service';

@Controller('finance')
export class FinanceController {
  constructor(
    private readonly paymentProvider: RazorpayPaymentProvider,
    private readonly ledgerService: FinancialLedgerService,
    private readonly refundService: RefundService,
    private readonly invoiceService: InvoiceService,
    private readonly reconciliationService: ReconciliationService
  ) {}

  @Post('payments/capture')
  @HttpCode(HttpStatus.OK)
  async capturePayment(
    @Body() body: AuthoritativeCaptureParams,
    @Headers('x-idempotency-key') idempotencyKey?: string
  ) {
    const verified = this.paymentProvider.verifySignature({
      orderId: body.providerOrderId,
      paymentId: body.providerPaymentId,
      signature: body.providerSignature,
    });

    if (!verified) {
      throw new BadRequestException('Invalid provider payment signature');
    }

    return {
      success: true,
      bookingId: body.bookingId,
      paymentId: body.paymentId,
      status: 'CAPTURED',
      idempotencyKey,
    };
  }

  @Post('refunds')
  @HttpCode(HttpStatus.OK)
  async processRefund(
    @Body() body: AuthoritativeRefundParams,
    @Headers('x-idempotency-key') idempotencyKey?: string
  ) {
    return this.paymentProvider.processRefund({
      ...body,
      idempotencyKey,
    });
  }

  @Get('invoices/:bookingId')
  async getInvoice(@Param('bookingId') bookingId: string) {
    return this.invoiceService.buildInvoice({
      bookingId,
      customerId: '00000000-0000-0000-0000-000000000001',
      paymentId: `pay_${bookingId.slice(0, 8)}`,
      amountMinor: 59900,
      taxMinor: 0,
      pricingSnapshot: {
        total: 599,
        version: 'v1.0',
      },
    });
  }
}
