import { InstantServiceType, PartnerCapabilityCode } from '@serventica/types';
import {
  InstantServicePolicyDefinition,
  ServiceValidationResult,
} from './service-policy.interface';

export class RoadHelpPolicy implements InstantServicePolicyDefinition {
  readonly serviceType: InstantServiceType = 'ROAD_HELP';
  readonly defaultTitle = 'Road Help';
  readonly maxRadiusKm = 10.0;
  readonly maxEtaMinutes = 30;
  readonly minDurationMinutes = 30;
  readonly maxInitialDurationMinutes = 60;
  readonly maxTotalDurationMinutes = 60;
  readonly allowsExtensions = false;
  readonly extensionSlotMinutes = 0;
  readonly minPartnerCount = 1;
  readonly maxPartnerCount = 1;

  resolveRequiredCapability(requirements: Record<string, any>): PartnerCapabilityCode {
    const issueType = requirements.issueType || 'BREAKDOWN';
    switch (issueType) {
      case 'FUEL':
        return 'FUEL_TRANSPORT';
      case 'FLAT_TYRE':
        return 'FLAT_TYRE';
      case 'BATTERY':
        return 'BATTERY_START';
      case 'BREAKDOWN':
      default:
        return 'ROADSIDE_ASSISTANCE';
    }
  }

  validateTaskRequirements(requirements: Record<string, any>): ServiceValidationResult {
    const issueType = requirements.issueType || 'BREAKDOWN';

    if (issueType === 'FUEL') {
      const fuelQty = requirements.fuelQuantityLitres;
      if (fuelQty === undefined || fuelQty === null) {
        return {
          isValid: false,
          code: 'FUEL_QUANTITY_REQUIRED',
          reason: 'Emergency fuel delivery requires specifying quantity (max 1.0 Litre)',
        };
      }
      if (fuelQty > 1.0) {
        return {
          isValid: false,
          code: 'FUEL_LIMIT_EXCEEDED',
          reason: `Emergency fuel top-up strictly capped at 1.0 Litre. Requested: ${fuelQty}L`,
        };
      }
      if (!requirements.fuelType || !['PETROL', 'DIESEL'].includes(requirements.fuelType)) {
        return {
          isValid: false,
          code: 'FUEL_TYPE_REQUIRED',
          reason: 'Emergency fuel delivery requires fuel type (PETROL or DIESEL)',
        };
      }
    }

    return { isValid: true };
  }
}
