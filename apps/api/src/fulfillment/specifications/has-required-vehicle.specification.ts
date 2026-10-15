import { PartnerSpecification, SpecificationResult } from './partner-specification.interface';
import { PartnerCandidate, PartnerCandidateContext } from './partner-candidate.interface';

export class HasRequiredVehicleSpecification implements PartnerSpecification {
  readonly code = 'HAS_REQUIRED_VEHICLE';

  isSatisfiedBy(
    candidate: PartnerCandidate,
    context: PartnerCandidateContext
  ): SpecificationResult {
    if (!context.requiredVehicle || context.requiredVehicle === 'NONE') {
      return { isSatisfied: true, code: this.code };
    }

    if (!candidate.vehicleType || candidate.vehicleType === 'NONE') {
      return {
        isSatisfied: false,
        code: this.code,
        reason: `Service requires vehicle ${context.requiredVehicle}, but partner has no registered vehicle`,
      };
    }

    // Vehicle compatibility rules:
    // CAR or SUV can fulfill BIKE or SCOOTER requirements, but not vice versa
    if (context.requiredVehicle === 'CAR' && candidate.vehicleType !== 'CAR' && candidate.vehicleType !== 'SUV') {
      return {
        isSatisfied: false,
        code: this.code,
        reason: `Service requires a four-wheeler (CAR/SUV), partner operates ${candidate.vehicleType}`,
      };
    }

    if (context.requiredVehicle === 'TRUCK' && candidate.vehicleType !== 'TRUCK') {
      return {
        isSatisfied: false,
        code: this.code,
        reason: `Service requires a TRUCK, partner operates ${candidate.vehicleType}`,
      };
    }

    return { isSatisfied: true, code: this.code };
  }
}
