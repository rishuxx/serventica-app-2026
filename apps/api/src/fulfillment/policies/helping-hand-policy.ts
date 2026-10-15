import { InstantServiceType, PartnerCapabilityCode } from '@serventica/types';
import {
  InstantServicePolicyDefinition,
  ServiceValidationResult,
} from './service-policy.interface';

export class HelpingHandPolicy implements InstantServicePolicyDefinition {
  readonly serviceType: InstantServiceType = 'HELPING_HAND';
  readonly defaultTitle = 'Helping Hand';
  readonly maxRadiusKm = 7.0;
  readonly maxEtaMinutes = 25;
  readonly minDurationMinutes = 30;
  readonly maxInitialDurationMinutes = 240; // 4 hours maximum initial duration
  readonly maxTotalDurationMinutes = 240; // 4 hours absolute cap with extensions
  readonly allowsExtensions = true;
  readonly extensionSlotMinutes = 30;
  readonly minPartnerCount = 1;
  readonly maxPartnerCount = 2;

  private readonly prohibitedKeywords = [
    'electric',
    'wiring',
    'switchboard',
    'circuit',
    'meter',
    'high voltage',
    'gas',
    'cylinder',
    'leakage',
    'pipe burst',
    'demolition',
    'drilling wall',
    'roofing',
    'pest',
    'cockroach',
    'termite',
  ];

  resolveRequiredCapability(_requirements: Record<string, any>): PartnerCapabilityCode {
    return 'GENERAL_HELP';
  }

  validateTaskRequirements(requirements: Record<string, any>): ServiceValidationResult {
    const duration = requirements.durationMinutes || 60;
    if (duration < this.minDurationMinutes || duration > this.maxInitialDurationMinutes) {
      return {
        isValid: false,
        code: 'INVALID_DURATION',
        reason: `Helping Hand initial duration must be between ${this.minDurationMinutes} and ${this.maxInitialDurationMinutes} minutes`,
      };
    }

    const taskText = `${requirements.taskCategory || ''} ${requirements.specialInstructions || ''} ${requirements.customerNotes || ''}`.toLowerCase();

    for (const keyword of this.prohibitedKeywords) {
      if (taskText.includes(keyword)) {
        return {
          isValid: false,
          code: 'SPECIALIST_REQUIRED',
          reason: `Task involves specialized or hazardous work ('${keyword}') which cannot be performed by General Help`,
          recommendedService: keyword.includes('electric')
            ? 'AC_ELECTRICAL_REPAIR'
            : keyword.includes('gas')
            ? 'GAS_APPLIANCE_REPAIR'
            : 'SPECIALIST_SERVICE',
        };
      }
    }

    return { isValid: true };
  }
}
