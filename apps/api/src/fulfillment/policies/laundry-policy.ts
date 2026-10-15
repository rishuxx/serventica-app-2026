import { InstantServiceType, PartnerCapabilityCode } from '@serventica/types';
import {
  InstantServicePolicyDefinition,
  ServiceValidationResult,
} from './service-policy.interface';

export class LaundryPolicy implements InstantServicePolicyDefinition {
  readonly serviceType: InstantServiceType = 'LAUNDRY';
  readonly defaultTitle = 'Laundry Pickup';
  readonly maxRadiusKm = 8.0;
  readonly maxEtaMinutes = 30;
  readonly minDurationMinutes = 20;
  readonly maxInitialDurationMinutes = 45;
  readonly maxTotalDurationMinutes = 45;
  readonly allowsExtensions = false;
  readonly extensionSlotMinutes = 0;
  readonly minPartnerCount = 1;
  readonly maxPartnerCount = 1;

  resolveRequiredCapability(_requirements: Record<string, any>): PartnerCapabilityCode {
    return 'LAUNDRY_PICKUP';
  }

  validateTaskRequirements(requirements: Record<string, any>): ServiceValidationResult {
    const approxWeight = requirements.approxLoadKg;
    if (approxWeight !== undefined && approxWeight <= 0) {
      return {
        isValid: false,
        code: 'INVALID_WEIGHT',
        reason: 'Approximate laundry load must be greater than 0 kg',
      };
    }
    return { isValid: true };
  }
}
