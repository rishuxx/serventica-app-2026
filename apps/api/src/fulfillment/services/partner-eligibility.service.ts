import { Injectable, Logger } from '@nestjs/common';
import {
  PartnerCandidate,
  PartnerCandidateContext,
  EligiblePartnerSpecification,
  EligibilityEvaluation,
} from '../specifications';

@Injectable()
export class PartnerEligibilityService {
  private readonly logger = new Logger(PartnerEligibilityService.name);
  private readonly specification = new EligiblePartnerSpecification();

  /**
   * Filters a list of candidates, returning only those who satisfy all specifications
   */
  public filterEligibleCandidates(
    candidates: PartnerCandidate[],
    context: PartnerCandidateContext
  ): {
    eligible: PartnerCandidate[];
    rejected: Array<{ candidate: PartnerCandidate; evaluation: EligibilityEvaluation }>;
  } {
    const eligible: PartnerCandidate[] = [];
    const rejected: Array<{ candidate: PartnerCandidate; evaluation: EligibilityEvaluation }> = [];

    for (const candidate of candidates) {
      const evaluation = this.specification.evaluate(candidate, context);
      if (evaluation.isEligible) {
        eligible.push(candidate);
      } else {
        rejected.push({ candidate, evaluation });
      }
    }

    return { eligible, rejected };
  }

  /**
   * Evaluates a single candidate
   */
  public evaluateCandidate(
    candidate: PartnerCandidate,
    context: PartnerCandidateContext
  ): EligibilityEvaluation {
    return this.specification.evaluate(candidate, context);
  }
}
