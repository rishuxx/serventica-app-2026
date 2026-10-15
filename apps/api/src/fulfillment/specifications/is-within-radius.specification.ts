import { PartnerSpecification, SpecificationResult } from './partner-specification.interface';
import { PartnerCandidate, PartnerCandidateContext } from './partner-candidate.interface';

export class IsWithinRadiusSpecification implements PartnerSpecification {
  readonly code = 'IS_WITHIN_RADIUS';

  private calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  isSatisfiedBy(
    candidate: PartnerCandidate,
    context: PartnerCandidateContext
  ): SpecificationResult {
    const distKm = this.calculateDistanceKm(
      candidate.lastLatitude,
      candidate.lastLongitude,
      context.customerLatitude,
      context.customerLongitude
    );

    if (distKm > context.maxRadiusKm) {
      return {
        isSatisfied: false,
        code: this.code,
        reason: `Partner distance ${distKm.toFixed(2)} km exceeds operational radius ${context.maxRadiusKm} km`,
      };
    }

    return { isSatisfied: true, code: this.code };
  }
}
