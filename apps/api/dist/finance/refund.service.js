"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RefundService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundService = void 0;
const common_1 = require("@nestjs/common");
let RefundService = RefundService_1 = class RefundService {
    constructor() {
        this.logger = new common_1.Logger(RefundService_1.name);
    }
    validateRefundRequest(params) {
        const remaining = params.capturedAmountMinor - params.alreadyRefundedAmountMinor;
        if (params.requestedRefundMinor <= 0) {
            return {
                valid: false,
                error: 'INVALID_REFUND_AMOUNT: Refund amount must be greater than zero.',
                remainingRefundableMinor: remaining,
            };
        }
        if (params.requestedRefundMinor > remaining) {
            return {
                valid: false,
                error: `EXCEEDS_REFUNDABLE_LIMIT: Requested ${params.requestedRefundMinor} paise exceeds remaining ${remaining} paise.`,
                remainingRefundableMinor: remaining,
            };
        }
        return {
            valid: true,
            remainingRefundableMinor: remaining - params.requestedRefundMinor,
        };
    }
};
exports.RefundService = RefundService;
exports.RefundService = RefundService = RefundService_1 = __decorate([
    (0, common_1.Injectable)()
], RefundService);
//# sourceMappingURL=refund.service.js.map