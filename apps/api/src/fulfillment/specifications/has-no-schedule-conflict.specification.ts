import { PartnerSpecification, SpecificationResult } from './partner-specification.interface';
import { PartnerCandidate, PartnerCandidateContext } from './partner-candidate.interface';

export class HasNoScheduleConflictSpecification implements PartnerSpecification {
  readonly code = 'HAS_NO_SCHEDULE_CONFLICT';

  isSatisfiedBy(
    candidate: PartnerCandidate,
    _context: PartnerCandidateContext
  ): SpecificationResult {
    if (candidate.hasConflictingFutureBooking) {
      return {
        isSatisfied: false,
        code: this.code,
        reason: 'Partner has an overlapping scheduled booking during this fulfillment window',
      };
    }

    return { isSatisfied: true, code: this.code };
  }
}
