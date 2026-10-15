import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CalculateInstantQuoteParams } from '@serventica/types';
import { PricingStrategyFactory, InstantPricingSnapshot } from '../pricing';
import { ServicePolicyFactory } from '../policies';

@Injectable()
export class QuoteService {
  private readonly logger = new Logger(QuoteService.name);
  private readonly cachedQuotes = new Map<string, InstantPricingSnapshot>();

  constructor(
    private readonly pricingFactory: PricingStrategyFactory,
    private readonly policyFactory: ServicePolicyFactory
  ) {}

  /**
   * Generates authoritative, snapshotted price quote for an instant service request
   */
  public generateQuote(params: CalculateInstantQuoteParams): InstantPricingSnapshot {
    const policy = this.policyFactory.getPolicy(params.serviceSlug);

    // Validate requirements against service policy (e.g. specialist boundary, fuel limits)
    const validation = policy.validateTaskRequirements(params.requirements);
    if (!validation.isValid) {
      throw new BadRequestException({
        code: validation.code || 'INVALID_REQUIREMENTS',
        message: validation.reason || 'Requirements violated service policy',
        recommendedService: validation.recommendedService,
      });
    }

    const strategy = this.pricingFactory.getStrategy(params.serviceSlug);
    const quote = strategy.calculate(params);

    this.cachedQuotes.set(quote.quoteId, quote);
    this.logger.log(`Generated quote ${quote.quoteId} for ${params.serviceSlug}: INR ${quote.totalPayable}`);
    return quote;
  }

  /**
   * Retrieves and verifies that a quote exists and is not expired
   */
  public getValidQuote(quoteId: string): InstantPricingSnapshot {
    const quote = this.cachedQuotes.get(quoteId);
    if (!quote) {
      throw new BadRequestException(`Quote ${quoteId} not found or expired`);
    }

    const expiryTime = new Date(quote.expiresAt).getTime();
    if (Date.now() > expiryTime) {
      this.cachedQuotes.delete(quoteId);
      throw new BadRequestException(`Quote ${quoteId} has expired. Please recalculate.`);
    }

    return quote;
  }
}
