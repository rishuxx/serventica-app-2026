import { CalculateInstantQuoteParams } from '@serventica/types';
import { InstantPricingStrategy, InstantPricingSnapshot } from './pricing-strategy.interface';

export class PackMovePricingStrategy implements InstantPricingStrategy {
  private readonly BASE_SHIFTING_FEE = 199;
  private readonly HELPER_HOURLY_RATE = 120;
  private readonly VEHICLE_SURCHARGE = 350;
  private readonly PLATFORM_FEE = 25;
  private readonly SAFETY_FEE = 20;
  private readonly TAX_RATE = 0.18;

  calculate(params: CalculateInstantQuoteParams): InstantPricingSnapshot {
    const durationMinutes = Math.min(360, Math.max(60, params.requirements.durationMinutes || 120));
    const helperCount = Math.min(4, Math.max(1, params.requirements.requiredPartnerCount || 1));
    const durationHours = durationMinutes / 60;
    const vehicleType = params.requirements.vehicleType;

    const labourCharge = Math.round(durationHours * this.HELPER_HOURLY_RATE * helperCount);
    const vehicleCharge = (vehicleType && vehicleType !== 'OTHER') ? this.VEHICLE_SURCHARGE : 0;
    const baseAmount = this.BASE_SHIFTING_FEE + labourCharge + vehicleCharge;

    const platformAndSafety = this.PLATFORM_FEE + this.SAFETY_FEE;
    const subtotal = baseAmount + platformAndSafety;
    const tax = Math.round(subtotal * this.TAX_RATE * 100) / 100;
    const discount = 0;
    const totalPayable = Math.round((subtotal + tax - discount) * 100) / 100;

    const quoteId = `qte_pm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const lineItems = [
      { description: 'Pack & Move Base Booking', amount: this.BASE_SHIFTING_FEE },
      {
        description: `Labour Assistance (${helperCount} helper${helperCount > 1 ? 's' : ''} × ${durationHours} hr${durationHours > 1 ? 's' : ''})`,
        amount: labourCharge,
      },
    ];
    if (vehicleCharge > 0) {
      lineItems.push({ description: `Transport Vehicle (${vehicleType})`, amount: vehicleCharge });
    }
    lineItems.push({ description: 'Platform & Moving Insurance/Safety', amount: platformAndSafety });
    lineItems.push({ description: 'Taxes (GST 18%)', amount: tax });

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
      lineItems,
      breakdown: {
        service: 'PACK_MOVE',
        durationMinutes,
        durationHours,
        helperCount,
        vehicleType,
        baseFee: this.BASE_SHIFTING_FEE,
        labourCharge,
        vehicleCharge,
        platformFee: this.PLATFORM_FEE,
        safetyFee: this.SAFETY_FEE,
      },
    };
  }
}
