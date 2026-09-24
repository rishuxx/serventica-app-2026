"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ReconciliationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationService = void 0;
const common_1 = require("@nestjs/common");
let ReconciliationService = ReconciliationService_1 = class ReconciliationService {
    constructor() {
        this.logger = new common_1.Logger(ReconciliationService_1.name);
    }
    reconcilePayments(internalRecords, providerRecords) {
        const exceptions = [];
        for (const record of internalRecords) {
            const providerData = providerRecords.get(record.paymentId);
            if (!providerData) {
                exceptions.push({
                    entityType: 'PAYMENT',
                    internalReferenceId: record.paymentId,
                    expectedAmountMinor: record.amountMinor,
                    actualAmountMinor: 0,
                    severity: 'HIGH',
                    status: 'OPEN',
                    discrepancyDetails: {
                        reason: 'MISSING_PROVIDER_TRANSACTION',
                        bookingId: record.bookingId,
                    },
                });
                continue;
            }
            if (record.amountMinor !== providerData.amountMinor) {
                exceptions.push({
                    entityType: 'PAYMENT',
                    internalReferenceId: record.paymentId,
                    providerReferenceId: providerData.providerPaymentId,
                    expectedAmountMinor: record.amountMinor,
                    actualAmountMinor: providerData.amountMinor,
                    severity: 'CRITICAL',
                    status: 'OPEN',
                    discrepancyDetails: {
                        reason: 'AMOUNT_MISMATCH',
                        differenceMinor: Math.abs(record.amountMinor - providerData.amountMinor),
                    },
                });
            }
            if (record.status === 'CAPTURED' && providerData.status !== 'captured') {
                exceptions.push({
                    entityType: 'PAYMENT',
                    internalReferenceId: record.paymentId,
                    providerReferenceId: providerData.providerPaymentId,
                    expectedAmountMinor: record.amountMinor,
                    actualAmountMinor: providerData.amountMinor,
                    severity: 'HIGH',
                    status: 'OPEN',
                    discrepancyDetails: {
                        reason: 'STATUS_DESYNCHRONIZATION',
                        internalStatus: record.status,
                        providerStatus: providerData.status,
                    },
                });
            }
        }
        if (exceptions.length > 0) {
            this.logger.warn(`[Reconciliation] Detected ${exceptions.length} exceptions during audit run`);
        }
        return exceptions;
    }
};
exports.ReconciliationService = ReconciliationService;
exports.ReconciliationService = ReconciliationService = ReconciliationService_1 = __decorate([
    (0, common_1.Injectable)()
], ReconciliationService);
//# sourceMappingURL=reconciliation.service.js.map