"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceController = void 0;
const common_1 = require("@nestjs/common");
const razorpay_provider_adapter_1 = require("./razorpay-provider.adapter");
const financial_ledger_service_1 = require("./financial-ledger.service");
const refund_service_1 = require("./refund.service");
const invoice_service_1 = require("./invoice.service");
const reconciliation_service_1 = require("./reconciliation.service");
let FinanceController = class FinanceController {
    constructor(paymentProvider, ledgerService, refundService, invoiceService, reconciliationService) {
        this.paymentProvider = paymentProvider;
        this.ledgerService = ledgerService;
        this.refundService = refundService;
        this.invoiceService = invoiceService;
        this.reconciliationService = reconciliationService;
    }
    async capturePayment(body, idempotencyKey) {
        const verified = this.paymentProvider.verifySignature({
            orderId: body.providerOrderId,
            paymentId: body.providerPaymentId,
            signature: body.providerSignature,
        });
        if (!verified) {
            throw new common_1.BadRequestException('Invalid provider payment signature');
        }
        return {
            success: true,
            bookingId: body.bookingId,
            paymentId: body.paymentId,
            status: 'CAPTURED',
            idempotencyKey,
        };
    }
    async processRefund(body, idempotencyKey) {
        return this.paymentProvider.processRefund({
            ...body,
            idempotencyKey,
        });
    }
    async getInvoice(bookingId) {
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
};
exports.FinanceController = FinanceController;
__decorate([
    (0, common_1.Post)('payments/capture'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "capturePayment", null);
__decorate([
    (0, common_1.Post)('refunds'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "processRefund", null);
__decorate([
    (0, common_1.Get)('invoices/:bookingId'),
    __param(0, (0, common_1.Param)('bookingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getInvoice", null);
exports.FinanceController = FinanceController = __decorate([
    (0, common_1.Controller)('finance'),
    __metadata("design:paramtypes", [razorpay_provider_adapter_1.RazorpayPaymentProvider,
        financial_ledger_service_1.FinancialLedgerService,
        refund_service_1.RefundService,
        invoice_service_1.InvoiceService,
        reconciliation_service_1.ReconciliationService])
], FinanceController);
//# sourceMappingURL=finance.controller.js.map