"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PricingEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingEngineService = exports.FixedPricingStrategy = void 0;
const common_1 = require("@nestjs/common");
class FixedPricingStrategy {
    calculate(params) {
        const itemTotal = (params.unitPrice || 499) * (params.quantity || 1);
        const platformFee = params.platformFee ?? 19;
        const safetyFee = params.safetyFee ?? 29;
        const discountAmount = params.discount ?? 0;
        const totalFees = platformFee + safetyFee;
        const taxAmount = 0;
        const finalPayable = Math.max(0, itemTotal + totalFees - discountAmount);
        return {
            baseAmount: params.unitPrice || 499,
            itemTotal,
            platformFee: totalFees,
            taxAmount,
            discountAmount,
            finalPayable,
            currency: 'INR',
            pricingVersion: 'v1.0.0',
            calculatedAt: new Date().toISOString(),
            breakdown: {
                unitPrice: params.unitPrice,
                quantity: params.quantity,
                platformFee,
                safetyFee,
                discountAmount,
            },
        };
    }
}
exports.FixedPricingStrategy = FixedPricingStrategy;
let PricingEngineService = PricingEngineService_1 = class PricingEngineService {
    constructor() {
        this.logger = new common_1.Logger(PricingEngineService_1.name);
        this.fixedStrategy = new FixedPricingStrategy();
    }
    calculateAuthoritativeSnapshot(params) {
        return this.fixedStrategy.calculate(params);
    }
};
exports.PricingEngineService = PricingEngineService;
exports.PricingEngineService = PricingEngineService = PricingEngineService_1 = __decorate([
    (0, common_1.Injectable)()
], PricingEngineService);
//# sourceMappingURL=pricing-engine.service.js.map