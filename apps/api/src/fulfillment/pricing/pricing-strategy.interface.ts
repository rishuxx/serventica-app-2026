import { CalculateInstantQuoteParams, PricingSnapshot } from '@serventica/types';

export interface InstantQuoteLineItem {
  description: string;
  amount: number;
}

export interface InstantPricingSnapshot extends PricingSnapshot {
  quoteId: string;
  pricingVersion: string;
  lineItems: InstantQuoteLineItem[];
  subtotal: number;
  tax: number;
  discount: number;
  totalPayable: number;
  currency: string;
  expiresAt: string;
  breakdown: Record<string, any>;
}

export interface InstantPricingStrategy {
  calculate(params: CalculateInstantQuoteParams): InstantPricingSnapshot;
}
