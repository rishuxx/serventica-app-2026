import { CalculateInstantQuoteParams } from '@serventica/types';
import { InstantPricingStrategy, InstantPricingSnapshot } from './pricing-strategy.interface';

export class HelpingHandPricingStrategy implements InstantPricingStrategy {
  private readonly HOURLY_RATE = 118; // Rs 59 per 30 mins
  private readonly PLATFORM_FEE = 15;
  private readonly SAFETY_FEE = 10;
  private readonly TAX_RATE = 0.18; // 18% GST

  calculate(params: CalculateInstantQuoteParams): InstantPricingSnapshot {
    const durationMinutes = Math.min(240, Math.max(30, params.requirements.durationMinutes || 60));
    const helperCount = Math.max(1, params.requirements.requiredPartnerCount || 1);
    const durationHours = durationMinutes / 60;

    const baseLabourAmount = Math.round(durationHours * this.HOURLY_RATE * helperCount);
    const platformAndSafety = this.PLATFORM_FEE + this.SAFETY_FEE;
    const subtotal = baseLabourAmount + platformAndSafety;
    const tax = Math.round(subtotal * this.TAX_RATE * 100) / 100;
    const discount = 0;
    const totalPayable = Math.round((subtotal + tax - discount) * 100) / 100;

    const quoteId = `qte_hh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return {
      quoteId,
      pricingVersion: '2026.10-v1',
      baseAmount: baseLabourAmount,
      itemTotal: baseLabourAmount,
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
        {
          description: `Helping Hand (${durationHours} hr${durationHours > 1 ? 's' : ''}, ${helperCount} helper${helperCount > 1 ? 's' : ''})`,
          amount: baseLabourAmount,
        },
        { description: 'Platform & Safety Fee', amount: platformAndSafety },
        { description: 'Taxes (GST 18%)', amount: tax },
      ],
      breakdown: {
        service: 'HELPING_HAND',
        durationMinutes,
        durationHours,
        helperCount,
        hourlyRate: this.HOURLY_RATE,
        platformFee: this.PLATFORM_FEE,
        safetyFee: this.SAFETY_FEE,
        taskCategory: params.requirements.taskCategory,
      },
    };
  }
}
