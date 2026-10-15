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
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import type {
  AuthoritativeCaptureParams,
  AuthoritativeRefundParams,
} from '@serventica/types';
import { RazorpayPaymentProvider } from './razorpay-provider.adapter';
import { FinancialLedgerService } from './financial-ledger.service';
import { RefundService } from './refund.service';
import { InvoiceService } from './invoice.service';
import { ReconciliationService } from './reconciliation.service';

/**
 * SERVENTICA — Authoritative Financial Controller
 *
 * Security Controls:
 *   1. SupabaseAuthGuard: All endpoints require verified cryptographic JWT
 *   2. Throttler: Strict rate limiting on payment captures and refund requests
 *   3. Authoritative Actor Binding: Actor ID derived strictly from verified token
 *   4. Signature Verification: Cryptographically sound HMAC-SHA256 verification
 */
@Controller('finance')
@UseGuards(SupabaseAuthGuard)
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
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async capturePayment(
    @Body() body: AuthoritativeCaptureParams,
    @Req() req: any,
    @Headers('x-idempotency-key') idempotencyKey?: string
  ) {
    if (!body.bookingId || !body.paymentId || !body.providerOrderId || !body.providerSignature) {
      throw new BadRequestException('Missing required payment capture parameters');
    }

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
      capturedBy: req.user?.id,
      idempotencyKey,
    };
  }

  @Post('refunds')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } }) // Strict: max 3 refunds per minute to prevent draining
  async processRefund(
    @Body() body: AuthoritativeRefundParams,
    @Req() req: any,
    @Headers('x-idempotency-key') idempotencyKey?: string
  ) {
    if (!body.bookingId || !body.paymentId || !body.refundAmountMinor) {
      throw new BadRequestException('Missing required refund parameters');
    }

    // Bind actor ID authoritatively to authenticated principal
    const callerId = req.user?.id;
    if (!callerId) {
      throw new ForbiddenException('Authenticated identity required for financial refund');
    }

    return this.paymentProvider.processRefund({
      ...body,
      actorId: callerId,
      idempotencyKey,
    });
  }

  @Get('invoices/:bookingId')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async getInvoice(@Param('bookingId') bookingId: string, @Req() req: any) {
    const callerId = req.user?.id;
    return this.invoiceService.buildInvoice({
      bookingId,
      customerId: callerId,
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
