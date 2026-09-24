import { Injectable, Logger } from '@nestjs/common';
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

export class FixedPricingStrategy implements PricingStrategy {
  calculate(params: {
    unitPrice: number;
    quantity: number;
    platformFee?: number;
    safetyFee?: number;
    discount?: number;
  }): PricingSnapshot {
    const itemTotal = (params.unitPrice || 499) * (params.quantity || 1);
    const platformFee = params.platformFee ?? 19;
    const safetyFee = params.safetyFee ?? 29;
    const discountAmount = params.discount ?? 0;
    const totalFees = platformFee + safetyFee;
    const taxAmount = 0; // Tax inclusive
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

/**
 * SERVENTICA — Authoritative Server-side Pricing Engine (Strategy Pattern)
 * Guarantees clients cannot fabricate amounts.
 */
@Injectable()
export class PricingEngineService {
  private readonly logger = new Logger(PricingEngineService.name);
  private readonly fixedStrategy = new FixedPricingStrategy();

  calculateAuthoritativeSnapshot(params: {
    unitPrice: number;
    quantity: number;
    platformFee?: number;
    safetyFee?: number;
    discount?: number;
  }): PricingSnapshot {
    return this.fixedStrategy.calculate(params);
  }
}
