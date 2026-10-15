import { PartnerSpecification, SpecificationResult } from './partner-specification.interface';
import { PartnerCandidate, PartnerCandidateContext } from './partner-candidate.interface';

export class HasCapacitySpecification implements PartnerSpecification {
  readonly code = 'HAS_CAPACITY';

  isSatisfiedBy(
    candidate: PartnerCandidate,
    _context: PartnerCandidateContext
  ): SpecificationResult {
    // For Instant fulfillment, a partner must have zero currently running jobs
    if (candidate.currentActiveJobCount > 0) {
      return {
        isSatisfied: false,
        code: this.code,
        reason: `Partner currently has ${candidate.currentActiveJobCount} active jobs in progress`,
      };
    }
    return { isSatisfied: true, code: this.code };
  }
}
