/**
 * Phase 8 Financial Integrity, Accounting Ledger & Reconciliation Verification Suite
 */
import { Money } from '../apps/api/src/finance/money.value-object';
import { FinancialLedgerService } from '../apps/api/src/finance/financial-ledger.service';
import { RazorpayPaymentProvider } from '../apps/api/src/finance/razorpay-provider.adapter';
import { RefundService } from '../apps/api/src/finance/refund.service';
import { InvoiceService } from '../apps/api/src/finance/invoice.service';
import { ReconciliationService } from '../apps/api/src/finance/reconciliation.service';

async function runPhase8Verification() {
  console.log('====================================================');
  console.log('SERVENTICA — PHASE 8 FINANCIAL INTEGRITY TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. MONEY VALUE OBJECT TESTS
  console.log('--- 1. Money Value Object Minor Units (Paise) ---');
  const m1 = Money.fromRupees(499.50); // 49950 paise
  const m2 = Money.fromRupees(100.25); // 10025 paise

  assert(m1.amountMinor === 49950, '₹499.50 converted to 49950 paise');
  assert(m2.amountMinor === 10025, '₹100.25 converted to 10025 paise');

  const mSum = m1.add(m2);
  assert(mSum.amountMinor === 59975, 'Addition exact without floating point drift: 59975 paise');
  assert(mSum.formatted() === '₹599.75', 'Formatted string displays ₹599.75');

  // Allocation without penny/paise loss
  const hundredPaise = new Money(100);
  const shares = hundredPaise.allocate([1, 1, 1]); // 100 divided 3 ways: 34, 33, 33
  const totalShares = shares.reduce((acc, s) => acc + s.amountMinor, 0);
  assert(totalShares === 100, 'Remainder-preserving allocation preserves exact 100 paise');

  // 2. DOUBLE-ENTRY FINANCIAL LEDGER INVARIANTS
  console.log('\n--- 2. Double-Entry Accounting Ledger Invariants ---');
  const ledger = new FinancialLedgerService();
  const captureTx = ledger.buildPaymentCaptureJournal(
    'b0000000-0000-0000-0000-000000000001',
    'p0000000-0000-0000-0000-000000000001',
    59900
  );

  let debits = captureTx.entries.filter((e) => e.entryType === 'DEBIT').reduce((s, e) => s + e.amountMinor, 0);
  let credits = captureTx.entries.filter((e) => e.entryType === 'CREDIT').reduce((s, e) => s + e.amountMinor, 0);
  assert(debits === credits && debits === 59900, 'Payment capture journal balances: 59900 debits == 59900 credits');

  const fulfillTx = ledger.buildServiceFulfillmentJournal(
    'b0000000-0000-0000-0000-000000000001',
    59900,
    49000, // Partner payout
    8000,  // Platform fee
    2900   // Tax
  );
  debits = fulfillTx.entries.filter((e) => e.entryType === 'DEBIT').reduce((s, e) => s + e.amountMinor, 0);
  credits = fulfillTx.entries.filter((e) => e.entryType === 'CREDIT').reduce((s, e) => s + e.amountMinor, 0);
  assert(debits === credits && debits === 59900, 'Service fulfillment journal balances: 59900 debits == 59900 credits');

  let caughtImbalance = false;
  try {
    ledger.assertBalance([
      { accountCode: 'GATEWAY_CLEARING', entryType: 'DEBIT', amountMinor: 100, currency: 'INR' },
      { accountCode: 'PLATFORM_REVENUE', entryType: 'CREDIT', amountMinor: 90, currency: 'INR' },
    ]);
  } catch (e: any) {
    caughtImbalance = true;
  }
  assert(caughtImbalance, 'Ledger rejects unbalanced transaction where debits != credits');

  // 3. PAYMENT PROVIDER ADAPTER & WEBHOOK SIGNATURES
  console.log('\n--- 3. Payment Provider Adapter & Webhook Security ---');
  const provider = new RazorpayPaymentProvider();
  const order = await provider.createPaymentOrder({
    bookingId: 'b0000000-0000-0000-0000-000000000001',
    customerId: 'c0000000-0000-0000-0000-000000000001',
    amountMinor: 59900,
    currency: 'INR',
  });
  assert(order.providerOrderId.startsWith('order_'), 'Provider order ID generated');
  assert(order.amountMinor === 59900, 'Provider order amount exact in minor units');

  const validSig = provider.verifySignature({
    orderId: 'order_123',
    paymentId: 'pay_123',
    signature: 'sig_test_valid',
  });
  assert(validSig, 'Valid signature verified correctly');

  const invalidSig = provider.verifySignature({
    orderId: 'order_123',
    paymentId: 'pay_123',
    signature: '',
  });
  assert(!invalidSig, 'Empty or invalid signature safely rejected');

  // 4. AUTHORITATIVE REFUND ENGINE CONSTRAINTS
  console.log('\n--- 4. Authoritative Refund Engine Constraints ---');
  const refundService = new RefundService();

  const validRefund = refundService.validateRefundRequest({
    capturedAmountMinor: 100000, // ₹1,000
    alreadyRefundedAmountMinor: 30000, // ₹300
    requestedRefundMinor: 40000, // ₹400
  });
  assert(validRefund.valid, 'Partial refund of ₹400 on remaining ₹700 balance allowed');
  assert(validRefund.remainingRefundableMinor === 30000, 'Remaining refundable correctly updated to ₹300 (30000 paise)');

  const excessiveRefund = refundService.validateRefundRequest({
    capturedAmountMinor: 100000,
    alreadyRefundedAmountMinor: 30000,
    requestedRefundMinor: 80000, // Exceeds 70000 available
  });
  assert(!excessiveRefund.valid, 'Refund exceeding remaining captured amount is rejected');

  const zeroRefund = refundService.validateRefundRequest({
    capturedAmountMinor: 100000,
    alreadyRefundedAmountMinor: 0,
    requestedRefundMinor: 0,
  });
  assert(!zeroRefund.valid, 'Zero or negative refund amount is rejected');

  // 5. INVOICE GENERATION & SNAPSHOT PRESERVATION
  console.log('\n--- 5. Authoritative Invoice Generation ---');
  const invoiceService = new InvoiceService();
  const invoice = invoiceService.buildInvoice({
    bookingId: 'b0000000-0000-0000-0000-000000000001',
    customerId: 'c0000000-0000-0000-0000-000000000001',
    paymentId: 'pay_00000001',
    amountMinor: 59900,
    taxMinor: 2900,
    pricingSnapshot: {
      itemsTotal: 541,
      tax: 29,
      platformFee: 29,
      version: 'v1.0',
    },
  });

  assert(invoice.invoiceNumber.startsWith('INV-'), 'Sequential unique invoice number formatted');
  assert(invoice.amountMinor === 59900, 'Invoice amount exact in minor units');
  assert(invoice.pricingSnapshot.version === 'v1.0', 'Pricing snapshot preserved immutably');

  // 6. RECONCILIATION ANOMALY DETECTOR
  console.log('\n--- 6. Reconciliation Engine Exception Detector ---');
  const reconciliation = new ReconciliationService();
  const internalPayments = [
    { paymentId: 'pay_1', bookingId: 'b_1', amountMinor: 59900, status: 'CAPTURED' },
    { paymentId: 'pay_2', bookingId: 'b_2', amountMinor: 99900, status: 'CAPTURED' },
    { paymentId: 'pay_3', bookingId: 'b_3', amountMinor: 49900, status: 'CAPTURED' },
  ];

  const providerBatch = new Map([
    ['pay_1', { providerPaymentId: 'rzp_1', amountMinor: 59900, status: 'captured' }], // Match
    ['pay_2', { providerPaymentId: 'rzp_2', amountMinor: 89900, status: 'captured' }], // Amount discrepancy!
    // pay_3 missing from provider batch!
  ]);

  const exceptions = reconciliation.reconcilePayments(internalPayments, providerBatch);
  assert(exceptions.length === 2, 'Detected exactly 2 reconciliation exceptions');
  assert(exceptions.some((e) => e.internalReferenceId === 'pay_3'), 'Flagged missing payment transaction');
  assert(exceptions.some((e) => e.internalReferenceId === 'pay_2' && e.severity === 'CRITICAL'), 'Flagged amount mismatch as CRITICAL');

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase8Verification().catch((e) => {
  console.error('Phase 8 verification failed with uncaught error:', e);
  process.exit(1);
});
