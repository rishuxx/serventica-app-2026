import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { RazorpayPaymentProvider } from './razorpay-provider.adapter';
import { FinancialLedgerService } from './financial-ledger.service';
import { RefundService } from './refund.service';
import { InvoiceService } from './invoice.service';
import { ReconciliationService } from './reconciliation.service';

@Module({
  controllers: [FinanceController],
  providers: [
    RazorpayPaymentProvider,
    FinancialLedgerService,
    RefundService,
    InvoiceService,
    ReconciliationService,
  ],
  exports: [
    RazorpayPaymentProvider,
    FinancialLedgerService,
    RefundService,
    InvoiceService,
    ReconciliationService,
  ],
})
export class FinanceModule {}
