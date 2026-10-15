import { PartnerSpecification, SpecificationResult } from './partner-specification.interface';
import { PartnerCandidate, PartnerCandidateContext } from './partner-candidate.interface';

export class HasRequiredSkillSpecification implements PartnerSpecification {
  readonly code = 'HAS_REQUIRED_SKILL';

  isSatisfiedBy(
    candidate: PartnerCandidate,
    context: PartnerCandidateContext
  ): SpecificationResult {
    if (!context.requiredCapability) {
      return { isSatisfied: true, code: this.code };
    }

    const hasSkill = candidate.capabilities.includes(context.requiredCapability);
    if (!hasSkill) {
      return {
        isSatisfied: false,
        code: this.code,
        reason: `Partner does not possess required capability: ${context.requiredCapability}`,
      };
    }

    return { isSatisfied: true, code: this.code };
  }
}
