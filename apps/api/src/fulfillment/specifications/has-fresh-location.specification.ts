import { PartnerSpecification, SpecificationResult } from './partner-specification.interface';
import { PartnerCandidate, PartnerCandidateContext } from './partner-candidate.interface';

export class HasFreshLocationSpecification implements PartnerSpecification {
  readonly code = 'HAS_FRESH_LOCATION';
  private readonly maxStalenessMs: number;

  constructor(maxStalenessMs = 3 * 60 * 1000) {
    // Default 3 minutes
    this.maxStalenessMs = maxStalenessMs;
  }

  isSatisfiedBy(
    candidate: PartnerCandidate,
    _context: PartnerCandidateContext
  ): SpecificationResult {
    if (!candidate.lastHeartbeatAt) {
      return {
        isSatisfied: false,
        code: this.code,
        reason: 'Partner has never reported GPS location',
      };
    }

    const heartbeatTime = new Date(candidate.lastHeartbeatAt).getTime();
    if (isNaN(heartbeatTime)) {
      return {
        isSatisfied: false,
        code: this.code,
        reason: 'Invalid timestamp for partner location',
      };
    }

    const ageMs = Date.now() - heartbeatTime;
    if (ageMs > this.maxStalenessMs) {
      return {
        isSatisfied: false,
        code: this.code,
        reason: `Partner GPS heartbeat is stale (${Math.round(ageMs / 1000)}s old > ${Math.round(this.maxStalenessMs / 1000)}s)`,
      };
    }

    if (
      typeof candidate.lastLatitude !== 'number' ||
      typeof candidate.lastLongitude !== 'number' ||
      isNaN(candidate.lastLatitude) ||
      isNaN(candidate.lastLongitude)
    ) {
      return {
        isSatisfied: false,
        code: this.code,
        reason: 'Partner location coordinates are non-numeric or NaN',
      };
    }

    return { isSatisfied: true, code: this.code };
  }
}
