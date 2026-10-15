import { PartnerSpecification, SpecificationResult } from './partner-specification.interface';
import { PartnerCandidate, PartnerCandidateContext } from './partner-candidate.interface';
import { IsApprovedPartnerSpecification } from './is-approved-partner.specification';
import { HasRequiredSkillSpecification } from './has-required-skill.specification';
import { IsOnlineSpecification } from './is-online.specification';
import { IsAvailableSpecification } from './is-available.specification';
import { HasFreshLocationSpecification } from './has-fresh-location.specification';
import { IsWithinRadiusSpecification } from './is-within-radius.specification';
import { CanReachWithinEtaSpecification } from './can-reach-within-eta.specification';
import { HasCapacitySpecification } from './has-capacity.specification';
import { HasRequiredVehicleSpecification } from './has-required-vehicle.specification';
import { HasNoScheduleConflictSpecification } from './has-no-schedule-conflict.specification';

export interface EligibilityEvaluation {
  isEligible: boolean;
  failedSpecifications: SpecificationResult[];
  passedSpecifications: string[];
}

export class EligiblePartnerSpecification implements PartnerSpecification {
  readonly code = 'ELIGIBLE_PARTNER';

  private readonly specifications: PartnerSpecification[];

  constructor(customSpecs?: PartnerSpecification[]) {
    this.specifications = customSpecs || [
      new IsApprovedPartnerSpecification(),
      new HasRequiredSkillSpecification(),
      new IsOnlineSpecification(),
      new IsAvailableSpecification(),
      new HasFreshLocationSpecification(),
      new IsWithinRadiusSpecification(),
      new CanReachWithinEtaSpecification(),
      new HasCapacitySpecification(),
      new HasRequiredVehicleSpecification(),
      new HasNoScheduleConflictSpecification(),
    ];
  }

  isSatisfiedBy(
    candidate: PartnerCandidate,
    context: PartnerCandidateContext
  ): SpecificationResult {
    const evaluation = this.evaluate(candidate, context);
    if (!evaluation.isEligible) {
      const firstFailure = evaluation.failedSpecifications[0];
      return {
        isSatisfied: false,
        code: firstFailure.code,
        reason: firstFailure.reason,
      };
    }
    return { isSatisfied: true, code: this.code };
  }

  evaluate(
    candidate: PartnerCandidate,
    context: PartnerCandidateContext
  ): EligibilityEvaluation {
    const failedSpecifications: SpecificationResult[] = [];
    const passedSpecifications: string[] = [];

    for (const spec of this.specifications) {
      const res = spec.isSatisfiedBy(candidate, context);
      if (!res.isSatisfied) {
        failedSpecifications.push(res);
      } else {
        passedSpecifications.push(spec.code);
      }
    }

    return {
      isEligible: failedSpecifications.length === 0,
      failedSpecifications,
      passedSpecifications,
    };
  }
}
