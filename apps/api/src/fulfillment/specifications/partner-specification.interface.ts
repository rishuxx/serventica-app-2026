import { PartnerCandidate, PartnerCandidateContext } from './partner-candidate.interface';

export interface SpecificationResult {
  isSatisfied: boolean;
  code: string;
  reason?: string;
}

export interface PartnerSpecification {
  readonly code: string;
  isSatisfiedBy(
    candidate: PartnerCandidate,
    context: PartnerCandidateContext
  ): SpecificationResult;
}
