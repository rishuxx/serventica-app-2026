import { Injectable, Logger } from '@nestjs/common';
import {
  FulfillmentAction,
  FulfillmentActorType,
  FulfillmentTransitionResult,
  PricingSnapshot,
} from '@serventica/types';

export interface TransitionRule {
  from: string[];
  to: string;
  allowedActors: FulfillmentActorType[];
  description: string;
}

/**
 * SERVENTICA — Fulfillment State Machine (Phase 7)
 * Authoritative, in-memory validation of business state machine transitions.
 * Guarantees transitions conform to canonical rules before invoking atomic DBMS transactions.
 */
@Injectable()
export class FulfillmentStateMachine {
  private readonly logger = new Logger(FulfillmentStateMachine.name);

  private readonly rules: Record<FulfillmentAction, TransitionRule> = {
    CONFIRM_BOOKING: {
      from: ['DRAFT', 'PENDING_PAYMENT'],
      to: 'CONFIRMED',
      allowedActors: ['CUSTOMER', 'SYSTEM'],
      description: 'Customer confirms booking with locked pricing snapshot.',
    },
    START_DISPATCH: {
      from: ['CONFIRMED'],
      to: 'SEARCHING_PARTNER',
      allowedActors: ['SYSTEM', 'OPERATIONS'],
      description: 'System opens dispatch window for matching partners.',
    },
    OFFER_PARTNER: {
      from: ['SEARCHING_PARTNER'],
      to: 'SEARCHING_PARTNER', // state stays searching while offers are dispatched
      allowedActors: ['SYSTEM'],
      description: 'System emits waves of offers to candidate partners.',
    },
    ACCEPT_OFFER: {
      from: ['SEARCHING_PARTNER', 'CONFIRMED'],
      to: 'PARTNER_ACCEPTED',
      allowedActors: ['PARTNER'],
      description: 'Single-winner atomic partner acceptance.',
    },
    START_EN_ROUTE: {
      from: ['PARTNER_ACCEPTED', 'CONFIRMED'],
      to: 'PARTNER_EN_ROUTE',
      allowedActors: ['PARTNER'],
      description: 'Partner begins navigation towards service location.',
    },
    MARK_ARRIVED: {
      from: ['PARTNER_EN_ROUTE'],
      to: 'PARTNER_ARRIVED',
      allowedActors: ['SYSTEM', 'PARTNER'],
      description: 'Geofence verification or manual arrival report.',
    },
    START_SERVICE: {
      from: ['PARTNER_ARRIVED'],
      to: 'SERVICE_STARTED',
      allowedActors: ['PARTNER'],
      description: 'Partner starts on-site service work.',
    },
    COMPLETE_SERVICE: {
      from: ['SERVICE_STARTED'],
      to: 'SERVICE_COMPLETED',
      allowedActors: ['PARTNER'],
      description: 'Partner completes service work and initiates financial settlement.',
    },
    FINALIZE_SETTLEMENT: {
      from: ['SERVICE_COMPLETED'],
      to: 'CLOSED',
      allowedActors: ['SYSTEM', 'ADMIN'],
      description: 'Ledger financial clearance.',
    },
    REASSIGN_PARTNER: {
      from: ['PARTNER_ACCEPTED', 'PARTNER_EN_ROUTE', 'PARTNER_ARRIVED'],
      to: 'SEARCHING_PARTNER',
      allowedActors: ['SYSTEM', 'ADMIN', 'PARTNER'],
      description: 'Atomic revocation of partner assignment and re-dispatch.',
    },
    CANCEL_BOOKING: {
      from: [
        'DRAFT',
        'CONFIRMED',
        'SEARCHING_PARTNER',
        'PARTNER_ACCEPTED',
        'PARTNER_EN_ROUTE',
        'PARTNER_ARRIVED',
      ],
      to: 'CANCELLED_BY_CUSTOMER', // or CANCELLED_BY_PARTNER / CANCELLED_BY_SYSTEM
      allowedActors: ['CUSTOMER', 'PARTNER', 'ADMIN', 'SYSTEM'],
      description: 'Cancellation before service start.',
    },
  };

  /**
   * Validates if the action is permitted from the current state by the actor.
   */
  validateTransition(
    currentStatus: string,
    action: FulfillmentAction,
    actorType: FulfillmentActorType
  ): { valid: boolean; targetStatus?: string; reason?: string } {
    const rule = this.rules[action];
    if (!rule) {
      return { valid: false, reason: `Unknown fulfillment action: ${action}` };
    }

    if (!rule.allowedActors.includes(actorType)) {
      return {
        valid: false,
        reason: `Actor ${actorType} is not authorized for action ${action}. Allowed: ${rule.allowedActors.join(', ')}`,
      };
    }

    if (!rule.from.includes(currentStatus)) {
      return {
        valid: false,
        reason: `Cannot execute ${action} from status ${currentStatus}. Expected one of: ${rule.from.join(', ')}`,
      };
    }

    return {
      valid: true,
      targetStatus: rule.to,
    };
  }
}
