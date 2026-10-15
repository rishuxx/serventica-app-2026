import { PartnerSpecification, SpecificationResult } from './partner-specification.interface';
import { PartnerCandidate, PartnerCandidateContext } from './partner-candidate.interface';

export class IsAvailableSpecification implements PartnerSpecification {
  readonly code = 'IS_AVAILABLE';

  isSatisfiedBy(
    candidate: PartnerCandidate,
    _context: PartnerCandidateContext
  ): SpecificationResult {
    if (candidate.status !== 'AVAILABLE') {
      return {
        isSatisfied: false,
        code: this.code,
        reason: `Partner status is ${candidate.status}, not AVAILABLE`,
      };
    }
    return { isSatisfied: true, code: this.code };
  }
}
