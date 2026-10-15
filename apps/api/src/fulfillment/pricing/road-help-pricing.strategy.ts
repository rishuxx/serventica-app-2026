import { CalculateInstantQuoteParams } from '@serventica/types';
import { BadRequestException } from '@nestjs/common';
import { InstantPricingStrategy, InstantPricingSnapshot } from './pricing-strategy.interface';

export class RoadHelpPricingStrategy implements InstantPricingStrategy {
  private readonly BASE_SERVICE_FEE = 99;
  private readonly PLATFORM_FEE = 15;
  private readonly SAFETY_FEE = 15;
  private readonly TAX_RATE = 0.18;
  private readonly FUEL_PRICE_PER_LITRE = 96;

  calculate(params: CalculateInstantQuoteParams): InstantPricingSnapshot {
    const issueType = params.requirements.issueType || 'BREAKDOWN';
    const vehicleType = params.requirements.vehicleType || 'BIKE';

    let issueFee = 0;
    let issueDescription = 'Roadside Diagnosis';

    if (issueType === 'FUEL') {
      const fuelQty = params.requirements.fuelQuantityLitres || 1.0;
      if (fuelQty > 1.0) {
        throw new Error('Fuel delivery strictly capped at maximum 1.0 Litre emergency top-up');
      }
      const fuelCost = Math.round(fuelQty * this.FUEL_PRICE_PER_LITRE);
      const fuelDeliverySurcharge = 50;
      issueFee = fuelCost + fuelDeliverySurcharge;
      issueDescription = `Emergency Fuel Delivery (${fuelQty}L ${params.requirements.fuelType || 'PETROL'})`;
    } else if (issueType === 'FLAT_TYRE') {
      issueFee = 120;
      issueDescription = 'Puncture / Tyre Replacement Assistance';
    } else if (issueType === 'BATTERY') {
      issueFee = 140;
      issueDescription = 'Battery Jumpstart Assistance';
    } else {
      issueFee = 150;
      issueDescription = 'Breakdown Inspection & Mini-Diagnosis';
    }

    const vehicleSurcharge = (vehicleType === 'CAR' || vehicleType === 'SUV') ? 50 : 0;
    const baseAmount = this.BASE_SERVICE_FEE + issueFee + vehicleSurcharge;
    const platformAndSafety = this.PLATFORM_FEE + this.SAFETY_FEE;
    const subtotal = baseAmount + platformAndSafety;
    const tax = Math.round(subtotal * this.TAX_RATE * 100) / 100;
    const discount = 0;
    const totalPayable = Math.round((subtotal + tax - discount) * 100) / 100;

    const quoteId = `qte_rh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const lineItems = [
      { description: 'Roadside Base Attendance', amount: this.BASE_SERVICE_FEE },
      { description: issueDescription, amount: issueFee },
    ];
    if (vehicleSurcharge > 0) {
      lineItems.push({ description: `Four-Wheeler Surcharge (${vehicleType})`, amount: vehicleSurcharge });
    }
    lineItems.push({ description: 'Platform & Safety Fee', amount: platformAndSafety });
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
        service: 'ROAD_HELP',
        issueType,
        vehicleType,
        fuelQuantityLitres: params.requirements.fuelQuantityLitres,
        fuelType: params.requirements.fuelType,
        baseAttendanceFee: this.BASE_SERVICE_FEE,
        issueFee,
        vehicleSurcharge,
      },
    };
  }
}
