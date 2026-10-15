import { PartnerSpecification, SpecificationResult } from './partner-specification.interface';
import { PartnerCandidate, PartnerCandidateContext } from './partner-candidate.interface';

export class IsOnlineSpecification implements PartnerSpecification {
  readonly code = 'IS_ONLINE';

  isSatisfiedBy(
    candidate: PartnerCandidate,
    _context: PartnerCandidateContext
  ): SpecificationResult {
    if (candidate.status === 'OFFLINE') {
      return {
        isSatisfied: false,
        code: this.code,
        reason: 'Partner is currently OFFLINE',
      };
    }
    return { isSatisfied: true, code: this.code };
  }
}
