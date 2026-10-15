import { Injectable, Logger } from '@nestjs/common';
import { PartnerCandidate, PartnerCandidateContext } from '../specifications';
import { ETAService } from './eta.service';

export interface RankedPartnerCandidate {
  candidate: PartnerCandidate;
  score: number;
  distanceKm: number;
  etaMinutes: number;
  breakdown: {
    etaScore: number;
    distanceScore: number;
    capabilityScore: number;
    availabilityScore: number;
    reliabilityScore: number;
  };
}

export interface MatchingWeights {
  etaWeight: number;
  distanceWeight: number;
  capabilityWeight: number;
  availabilityWeight: number;
  reliabilityWeight: number;
}

@Injectable()
export class PartnerMatchingService {
  private readonly logger = new Logger(PartnerMatchingService.name);

  // Configurable ranking model weights summing to 1.0
  private readonly defaultWeights: MatchingWeights = {
    etaWeight: 0.35,
    distanceWeight: 0.25,
    capabilityWeight: 0.20,
    availabilityWeight: 0.10,
    reliabilityWeight: 0.10,
  };

  constructor(private readonly etaService: ETAService) {}

  /**
   * Scores and ranks eligible candidates using the weighted ranking model
   */
  public rankCandidates(
    candidates: PartnerCandidate[],
    context: PartnerCandidateContext,
    customWeights?: Partial<MatchingWeights>
  ): RankedPartnerCandidate[] {
    const weights: MatchingWeights = { ...this.defaultWeights, ...customWeights };

    const scored: RankedPartnerCandidate[] = candidates.map((candidate) => {
      const etaResult = this.etaService.calculateRouteEta(
        { latitude: candidate.lastLatitude, longitude: candidate.lastLongitude },
        { latitude: context.customerLatitude, longitude: context.customerLongitude }
      );

      const distanceKm = etaResult.distanceKm;
      const etaMinutes = etaResult.durationMinutes;

      // 1. Distance Score [0..100]: closer is better
      const distRatio = Math.min(1.0, distanceKm / (context.maxRadiusKm || 10));
      const distanceScore = Math.max(0, (1 - distRatio) * 100);

      // 2. ETA Score [0..100]: faster arrival is better
      const etaRatio = Math.min(1.0, etaMinutes / (context.maxEtaMinutes || 30));
      const etaScore = Math.max(0, (1 - etaRatio) * 100);

      // 3. Capability & Experience Score [0..100]
      const completedJobsFactor = Math.min(1.0, candidate.completedJobCount / 100);
      const capabilityScore = 80 + completedJobsFactor * 20;

      // 4. Availability Score [0..100]
      const availabilityScore = candidate.status === 'AVAILABLE' ? 100 : 50;

      // 5. Reliability Score [0..100]
      const ratingRatio = Math.min(1.0, (candidate.rating || 4.5) / 5.0);
      const reliabilityScore = (candidate.acceptanceRate * 50) + (ratingRatio * 50);

      // Total Weighted Score
      const totalScore =
        etaScore * weights.etaWeight +
        distanceScore * weights.distanceWeight +
        capabilityScore * weights.capabilityWeight +
        availabilityScore * weights.availabilityWeight +
        reliabilityScore * weights.reliabilityWeight;

      return {
        candidate,
        score: Math.round(totalScore * 10) / 10,
        distanceKm,
        etaMinutes,
        breakdown: {
          etaScore: Math.round(etaScore),
          distanceScore: Math.round(distanceScore),
          capabilityScore: Math.round(capabilityScore),
          availabilityScore: Math.round(availabilityScore),
          reliabilityScore: Math.round(reliabilityScore),
        },
      };
    });

    // Rank descending by score
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }
}
