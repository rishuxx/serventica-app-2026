import { InstantServiceType, PartnerCapabilityCode } from '@serventica/types';
import {
  InstantServicePolicyDefinition,
  ServiceValidationResult,
} from './service-policy.interface';

export class PackMovePolicy implements InstantServicePolicyDefinition {
  readonly serviceType: InstantServiceType = 'PACK_MOVE';
  readonly defaultTitle = 'Pack & Move';
  readonly maxRadiusKm = 12.0;
  readonly maxEtaMinutes = 35;
  readonly minDurationMinutes = 60;
  readonly maxInitialDurationMinutes = 360; // 6 hours
  readonly maxTotalDurationMinutes = 480; // 8 hours
  readonly allowsExtensions = true;
  readonly extensionSlotMinutes = 30;
  readonly minPartnerCount = 1;
  readonly maxPartnerCount = 4;

  resolveRequiredCapability(_requirements: Record<string, any>): PartnerCapabilityCode {
    return 'MOVING_ASSISTANCE';
  }

  validateTaskRequirements(requirements: Record<string, any>): ServiceValidationResult {
    const helperCount = requirements.requiredPartnerCount || 1;
    if (helperCount < this.minPartnerCount || helperCount > this.maxPartnerCount) {
      return {
        isValid: false,
        code: 'INVALID_PARTNER_COUNT',
        reason: `Pack & Move helper count must be between ${this.minPartnerCount} and ${this.maxPartnerCount}`,
      };
    }

    const duration = requirements.durationMinutes || 120;
    if (duration < this.minDurationMinutes || duration > this.maxInitialDurationMinutes) {
      return {
        isValid: false,
        code: 'INVALID_DURATION',
        reason: `Pack & Move duration must be between ${this.minDurationMinutes} and ${this.maxInitialDurationMinutes} minutes`,
      };
    }

    return { isValid: true };
  }
}
