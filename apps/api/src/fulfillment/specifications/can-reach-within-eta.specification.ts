import { PartnerSpecification, SpecificationResult } from './partner-specification.interface';
import { PartnerCandidate, PartnerCandidateContext } from './partner-candidate.interface';

export class CanReachWithinEtaSpecification implements PartnerSpecification {
  readonly code = 'CAN_REACH_WITHIN_ETA';

  private estimateEtaMinutes(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Urban routing factor 1.35x + average city speed 25 km/h + 3 min buffer
    const routeDistanceKm = distKm * 1.35;
    const travelMinutes = (routeDistanceKm / 25) * 60;
    return Math.ceil(travelMinutes + 3);
  }

  isSatisfiedBy(
    candidate: PartnerCandidate,
    context: PartnerCandidateContext
  ): SpecificationResult {
    const etaMinutes = this.estimateEtaMinutes(
      candidate.lastLatitude,
      candidate.lastLongitude,
      context.customerLatitude,
      context.customerLongitude
    );

    if (etaMinutes > context.maxEtaMinutes) {
      return {
        isSatisfied: false,
        code: this.code,
        reason: `Estimated ETA ${etaMinutes} mins exceeds maximum allowed arrival window of ${context.maxEtaMinutes} mins`,
      };
    }

    return { isSatisfied: true, code: this.code };
  }
}
