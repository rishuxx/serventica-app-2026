import { PricingSnapshot } from '@serventica/types';
export interface PricingStrategy {
    calculate(params: {
        unitPrice: number;
        quantity: number;
        platformFee?: number;
        safetyFee?: number;
        discount?: number;
    }): PricingSnapshot;
}
export declare class FixedPricingStrategy implements PricingStrategy {
    calculate(params: {
        unitPrice: number;
        quantity: number;
        platformFee?: number;
        safetyFee?: number;
        discount?: number;
    }): PricingSnapshot;
}
export declare class PricingEngineService {
    private readonly logger;
    private readonly fixedStrategy;
    calculateAuthoritativeSnapshot(params: {
        unitPrice: number;
        quantity: number;
        platformFee?: number;
        safetyFee?: number;
        discount?: number;
    }): PricingSnapshot;
}
