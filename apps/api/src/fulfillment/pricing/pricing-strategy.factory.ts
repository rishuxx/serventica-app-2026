import { Injectable, BadRequestException } from '@nestjs/common';
import { InstantServiceType } from '@serventica/types';
import { InstantPricingStrategy } from './pricing-strategy.interface';
import { HelpingHandPricingStrategy } from './helping-hand-pricing.strategy';
import { RoadHelpPricingStrategy } from './road-help-pricing.strategy';
import { LaundryPricingStrategy } from './laundry-pricing.strategy';
import { PackMovePricingStrategy } from './pack-move-pricing.strategy';

@Injectable()
export class PricingStrategyFactory {
  private readonly strategies: Map<string, InstantPricingStrategy> = new Map();

  constructor() {
    const hh = new HelpingHandPricingStrategy();
    const rh = new RoadHelpPricingStrategy();
    const lnd = new LaundryPricingStrategy();
    const pm = new PackMovePricingStrategy();

    this.strategies.set('HELPING_HAND', hh);
    this.strategies.set('helping-hand', hh);
    this.strategies.set('ROAD_HELP', rh);
    this.strategies.set('road-help', rh);
    this.strategies.set('LAUNDRY', lnd);
    this.strategies.set('laundry', lnd);
    this.strategies.set('PACK_MOVE', pm);
    this.strategies.set('pack-move', pm);
  }

  getStrategy(serviceTypeOrSlug: string): InstantPricingStrategy {
    const strategy = this.strategies.get(serviceTypeOrSlug);
    if (!strategy) {
      throw new BadRequestException(
        `Unsupported service for instant pricing: ${serviceTypeOrSlug}. Supported: helping-hand, road-help, laundry, pack-move`
      );
    }
    return strategy;
  }
}
