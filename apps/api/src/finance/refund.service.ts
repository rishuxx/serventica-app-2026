import { Injectable, Logger } from '@nestjs/common';
import {
  AuthoritativeRefundParams,
  AuthoritativeRefundResult,
} from '@serventica/types';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  /**
   * Validates refund constraints
   */
  validateRefundRequest(params: {
    capturedAmountMinor: number;
    alreadyRefundedAmountMinor: number;
    requestedRefundMinor: number;
  }): { valid: boolean; error?: string; remainingRefundableMinor: number } {
    const remaining = params.capturedAmountMinor - params.alreadyRefundedAmountMinor;

    if (params.requestedRefundMinor <= 0) {
      return {
        valid: false,
        error: 'INVALID_REFUND_AMOUNT: Refund amount must be greater than zero.',
        remainingRefundableMinor: remaining,
      };
    }

    if (params.requestedRefundMinor > remaining) {
      return {
        valid: false,
        error: `EXCEEDS_REFUNDABLE_LIMIT: Requested ${params.requestedRefundMinor} paise exceeds remaining ${remaining} paise.`,
        remainingRefundableMinor: remaining,
      };
    }

    return {
      valid: true,
      remainingRefundableMinor: remaining - params.requestedRefundMinor,
    };
  }
}
