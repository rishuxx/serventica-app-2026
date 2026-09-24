/**
 * SERVENTICA — Phase 8 Financial Integrity, Accounting Ledger & Reconciliation Contracts
 */

export type CurrencyCode = 'INR' | 'USD';

export type PaymentLifecycleStatus =
  | 'CREATED'
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'CANCELLED';

export type RefundStatus =
  | 'REQUESTED'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'FAILED'
  | 'CANCELLED';

export type InvoiceStatus =
  | 'ISSUED'
  | 'PAID'
  | 'VOID'
  | 'REFUNDED';

export type LedgerAccountCode =
  | 'CUSTOMER_RECEIVABLE'
  | 'GATEWAY_CLEARING'
  | 'PLATFORM_REVENUE'
  | 'PARTNER_PAYABLE'
  | 'TAX_LIABILITY'
  | 'REFUND_CLEARING';

export type LedgerEntryType = 'DEBIT' | 'CREDIT';

export interface MoneyMinor {
  amountMinor: number; // e.g. 49900 for ₹499.00
  currency: CurrencyCode;
}

export interface LedgerEntryDTO {
  accountCode: LedgerAccountCode;
  entryType: LedgerEntryType;
  amountMinor: number;
  currency: CurrencyCode;
}

export interface LedgerTransactionDTO {
  id?: string;
  bookingId?: string;
  paymentId?: string;
  refundId?: string;
  transactionType: 'PAYMENT_CAPTURED' | 'PARTNER_EARNING_ACCRUED' | 'REFUND_PROCESSED' | 'SETTLEMENT_DISBURSED' | 'ADJUSTMENT';
  referenceNumber: string;
  description: string;
  entries: LedgerEntryDTO[];
  createdAt?: string;
}

export interface AuthoritativeCaptureParams {
  bookingId: string;
  paymentId: string;
  providerPaymentId: string;
  providerOrderId: string;
  providerSignature: string;
  paymentMethod?: string;
  idempotencyKey?: string;
}

export interface AuthoritativeCaptureResult {
  success: boolean;
  bookingId: string;
  paymentId: string;
  invoiceNumber?: string;
  amountMinor: number;
  status: PaymentLifecycleStatus;
  code?: string;
  error?: string;
}

export interface AuthoritativeRefundParams {
  bookingId: string;
  paymentId: string;
  refundAmountMinor: number;
  reason: string;
  actorId?: string;
  idempotencyKey?: string;
}

export interface AuthoritativeRefundResult {
  success: boolean;
  refundId?: string;
  bookingId: string;
  paymentId: string;
  refundAmountMinor: number;
  paymentStatus: PaymentLifecycleStatus;
  providerRefundId?: string;
  code?: string;
  error?: string;
}

export interface InvoiceDTO {
  id: string;
  bookingId: string;
  customerId: string;
  paymentId: string;
  invoiceNumber: string;
  amountMinor: number;
  taxMinor: number;
  currency: CurrencyCode;
  status: InvoiceStatus;
  pricingSnapshot: Record<string, any>;
  issuedAt: string;
  paidAt?: string;
}

export interface ReconciliationExceptionDTO {
  id?: string;
  entityType: 'PAYMENT' | 'SETTLEMENT' | 'REFUND';
  internalReferenceId: string;
  providerReferenceId?: string;
  expectedAmountMinor: number;
  actualAmountMinor: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'IGNORED';
  discrepancyDetails: Record<string, any>;
  createdAt?: string;
}
