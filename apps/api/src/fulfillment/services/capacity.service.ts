import { Injectable, Logger } from '@nestjs/common';
import { PartnerCandidate } from '../specifications/partner-candidate.interface';

export interface CapacityCheckResult {
  hasCapacity: boolean;
  activeJobCount: number;
  hasScheduleConflict: boolean;
  reason?: string;
}

@Injectable()
export class CapacityService {
  private readonly logger = new Logger(CapacityService.name);

  // Buffer between consecutive jobs in minutes
  private readonly TRAVEL_BUFFER_MINUTES = 15;

  /**
   * Evaluates if partner has capacity to accept a new job right now
   */
  public validateInstantCapacity(
    partner: PartnerCandidate,
    jobDurationMinutes: number
  ): CapacityCheckResult {
    if (partner.status === 'BUSY' || partner.currentActiveJobCount > 0) {
      return {
        hasCapacity: false,
        activeJobCount: partner.currentActiveJobCount,
        hasScheduleConflict: false,
        reason: `Partner is currently BUSY with ${partner.currentActiveJobCount} active job`,
      };
    }

    if (partner.hasConflictingFutureBooking) {
      return {
        hasCapacity: false,
        activeJobCount: partner.currentActiveJobCount,
        hasScheduleConflict: true,
        reason: `Partner has an overlapping scheduled booking within the ${jobDurationMinutes + this.TRAVEL_BUFFER_MINUTES}m window`,
      };
    }

    return {
      hasCapacity: true,
      activeJobCount: partner.currentActiveJobCount,
      hasScheduleConflict: false,
    };
  }

  /**
   * Evaluates if partner can accept an extension on an active booking
   */
  public validateExtensionCapacity(
    partner: PartnerCandidate,
    additionalMinutes: number
  ): CapacityCheckResult {
    if (partner.hasConflictingFutureBooking) {
      return {
        hasCapacity: false,
        activeJobCount: partner.currentActiveJobCount,
        hasScheduleConflict: true,
        reason: `Extension of +${additionalMinutes}m conflicts with partner's upcoming scheduled commitment`,
      };
    }

    return {
      hasCapacity: true,
      activeJobCount: partner.currentActiveJobCount,
      hasScheduleConflict: false,
    };
  }
}
