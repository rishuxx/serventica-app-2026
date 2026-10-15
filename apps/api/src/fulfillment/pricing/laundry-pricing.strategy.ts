import { CalculateInstantQuoteParams } from '@serventica/types';
import { InstantPricingStrategy, InstantPricingSnapshot } from './pricing-strategy.interface';

export interface LaundryReconciliationResult {
  reconciledQuote: InstantPricingSnapshot;
  initialTotal: number;
  reconciledTotal: number;
  deviationPercent: number;
  requiresCustomerConfirmation: boolean;
  tolerancePercent: number;
}

export class LaundryPricingStrategy implements InstantPricingStrategy {
  private readonly DOORSTEP_PICKUP_FEE = 49;
  private readonly RATE_PER_KG = 35;
  private readonly PLATFORM_FEE = 15;
  private readonly SAFETY_FEE = 10;
  private readonly TAX_RATE = 0.18;
  public static readonly TOLERANCE_PERCENT = 0.10; // 10% tolerance

  calculate(params: CalculateInstantQuoteParams): InstantPricingSnapshot {
    const approxLoadKg = Math.max(1, params.requirements.approxLoadKg || 5.0);
    return this.calculateForWeight(approxLoadKg, false);
  }

  calculateForWeight(weightKg: number, isVerified = false): InstantPricingSnapshot {
    const weightCharge = Math.round(weightKg * this.RATE_PER_KG);
    const baseAmount = this.DOORSTEP_PICKUP_FEE + weightCharge;
    const platformAndSafety = this.PLATFORM_FEE + this.SAFETY_FEE;
    const subtotal = baseAmount + platformAndSafety;
    const tax = Math.round(subtotal * this.TAX_RATE * 100) / 100;
    const discount = 0;
    const totalPayable = Math.round((subtotal + tax - discount) * 100) / 100;

    const prefix = isVerified ? 'qte_lnd_ver_' : 'qte_lnd_est_';
    const quoteId = `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return {
      quoteId,
      pricingVersion: '2026.10-v1',
      baseAmount,
      itemTotal: baseAmount,
      platformFee: platformAndSafety,
      taxAmount: tax,
      discountAmount: discount,
      finalPayable: totalPayable,
      subtotal,
      tax,
      discount,
      totalPayable,
      currency: 'INR',
      calculatedAt: new Date().toISOString(),
      expiresAt,
      lineItems: [
        { description: 'Instant Doorstep Pickup', amount: this.DOORSTEP_PICKUP_FEE },
        {
          description: `${isVerified ? 'Verified' : 'Estimated'} Wash & Fold (${weightKg.toFixed(1)} kg @ Rs ${this.RATE_PER_KG}/kg)`,
          amount: weightCharge,
        },
        { description: 'Platform & Safety Fee', amount: platformAndSafety },
        { description: 'Taxes (GST 18%)', amount: tax },
      ],
      breakdown: {
        service: 'LAUNDRY',
        weightKg,
        isVerified,
        ratePerKg: this.RATE_PER_KG,
        pickupFee: this.DOORSTEP_PICKUP_FEE,
        platformFee: this.PLATFORM_FEE,
        safetyFee: this.SAFETY_FEE,
      },
    };
  }

  reconcilePrice(
    initialQuote: InstantPricingSnapshot,
    actualVerifiedWeightKg: number
  ): LaundryReconciliationResult {
    const reconciledQuote = this.calculateForWeight(actualVerifiedWeightKg, true);
    const initialTotal = initialQuote.totalPayable;
    const reconciledTotal = reconciledQuote.totalPayable;

    const deviationPercent = Math.abs(reconciledTotal - initialTotal) / initialTotal;
    const requiresCustomerConfirmation = deviationPercent > LaundryPricingStrategy.TOLERANCE_PERCENT;

    return {
      reconciledQuote,
      initialTotal,
      reconciledTotal,
      deviationPercent: Math.round(deviationPercent * 1000) / 10, // e.g. 14.5%
      requiresCustomerConfirmation,
      tolerancePercent: LaundryPricingStrategy.TOLERANCE_PERCENT * 100,
    };
  }
}
