"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var FinancialLedgerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialLedgerService = void 0;
const common_1 = require("@nestjs/common");
let FinancialLedgerService = FinancialLedgerService_1 = class FinancialLedgerService {
    constructor() {
        this.logger = new common_1.Logger(FinancialLedgerService_1.name);
    }
    assertBalance(entries) {
        let debits = 0;
        let credits = 0;
        for (const entry of entries) {
            if (!Number.isInteger(entry.amountMinor) || entry.amountMinor <= 0) {
                throw new Error(`[Ledger] Invalid entry amount minor: ${entry.amountMinor}`);
            }
            if (entry.entryType === 'DEBIT') {
                debits += entry.amountMinor;
            }
            else if (entry.entryType === 'CREDIT') {
                credits += entry.amountMinor;
            }
            else {
                throw new Error(`[Ledger] Unknown entry type: ${entry.entryType}`);
            }
        }
        if (debits !== credits) {
            throw new Error(`[LedgerInvariantViolation] Debits (${debits} paise) != Credits (${credits} paise). Imbalance: ${debits - credits} paise.`);
        }
    }
    buildPaymentCaptureJournal(bookingId, paymentId, amountMinor) {
        const entries = [
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
    buildServiceFulfillmentJournal(bookingId, totalMinor, partnerPayoutMinor, platformFeeMinor, taxMinor) {
        const entries = [
            {
                accountCode: 'CUSTOMER_RECEIVABLE',
                entryType: 'DEBIT',
                amountMinor: totalMinor,
                currency: 'INR',
            },
            {
                accountCode: 'PARTNER_PAYABLE',
                entryType: 'CREDIT',
                amountMinor: partnerPayoutMinor,
                currency: 'INR',
            },
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
    buildRefundJournal(bookingId, paymentId, refundId, refundMinor) {
        const entries = [
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
};
exports.FinancialLedgerService = FinancialLedgerService;
exports.FinancialLedgerService = FinancialLedgerService = FinancialLedgerService_1 = __decorate([
    (0, common_1.Injectable)()
], FinancialLedgerService);
//# sourceMappingURL=financial-ledger.service.js.map