"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var InvoiceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceService = void 0;
const common_1 = require("@nestjs/common");
let InvoiceService = InvoiceService_1 = class InvoiceService {
    constructor() {
        this.logger = new common_1.Logger(InvoiceService_1.name);
    }
    generateInvoiceNumber(bookingId) {
        const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
        const suffix = bookingId.replace(/-/g, '').slice(0, 6).toUpperCase();
        return `INV-${yearMonth}-${suffix}`;
    }
    buildInvoice(params) {
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
};
exports.InvoiceService = InvoiceService;
exports.InvoiceService = InvoiceService = InvoiceService_1 = __decorate([
    (0, common_1.Injectable)()
], InvoiceService);
//# sourceMappingURL=invoice.service.js.map