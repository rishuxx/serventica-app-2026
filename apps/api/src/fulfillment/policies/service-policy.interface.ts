import { InstantServiceType, PartnerCapabilityCode } from '@serventica/types';

export interface ServiceValidationResult {
  isValid: boolean;
  code?: string;
  reason?: string;
  recommendedService?: string;
}

export interface InstantServicePolicyDefinition {
  readonly serviceType: InstantServiceType;
  readonly defaultTitle: string;
  readonly maxRadiusKm: number;
  readonly maxEtaMinutes: number;
  readonly minDurationMinutes: number;
  readonly maxInitialDurationMinutes: number;
  readonly maxTotalDurationMinutes: number;
  readonly allowsExtensions: boolean;
  readonly extensionSlotMinutes: number;
  readonly minPartnerCount: number;
  readonly maxPartnerCount: number;

  resolveRequiredCapability(requirements: Record<string, any>): PartnerCapabilityCode;
  validateTaskRequirements(requirements: Record<string, any>): ServiceValidationResult;
}
