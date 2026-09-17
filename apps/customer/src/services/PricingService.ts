import { pricingRepository, IPricingRepository } from '../repositories/pricing.repository';
import { PriceResolutionContext, ResolvedPrice } from '../../../../packages/types/src';

export class PricingService {
  constructor(private repo: IPricingRepository = pricingRepository) {}

  /**
   * Resolves the authoritative final price for a service given location context.
   */
  async getPrice(context: PriceResolutionContext): Promise<ResolvedPrice> {
    return this.repo.getApplicablePrice(context);
  }

  /**
   * Bulk resolves prices for a list of service IDs.
   */
  async getPricesForServices(
    serviceIds: string[],
    cityId?: string | null
  ): Promise<Map<string, ResolvedPrice>> {
    return this.repo.getPricesForServices(serviceIds, cityId);
  }

  /**
   * Formats a resolved price or number into human-readable INR string.
   */
  formatPrice(amount: number, prefix: string = '₹'): string {
    return `${prefix}${Math.round(amount).toLocaleString('en-IN')}`;
  }

  /**
   * Formats starting price string (e.g. "Starting from ₹549" or "₹549")
   */
  formatStartingPrice(price: ResolvedPrice): string {
    const formatted = this.formatPrice(price.amount);
    if (price.priceType === 'STARTING_FROM') {
      return `Starts from ${formatted}`;
    }
    return formatted;
  }
}

export const pricingService = new PricingService();
