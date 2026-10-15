import { PartnerSpecification, SpecificationResult } from './partner-specification.interface';
import { PartnerCandidate, PartnerCandidateContext } from './partner-candidate.interface';

export class IsApprovedPartnerSpecification implements PartnerSpecification {
  readonly code = 'IS_APPROVED_PARTNER';

  isSatisfiedBy(
    candidate: PartnerCandidate,
    _context: PartnerCandidateContext
  ): SpecificationResult {
    if (!candidate.isApproved || !candidate.isActive) {
      return {
        isSatisfied: false,
        code: this.code,
        reason: 'Partner is not approved or account is inactive',
      };
    }
    return { isSatisfied: true, code: this.code };
  }
}
