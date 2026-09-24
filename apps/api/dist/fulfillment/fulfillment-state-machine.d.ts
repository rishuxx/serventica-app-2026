import { FulfillmentAction, FulfillmentActorType } from '@serventica/types';
export interface TransitionRule {
    from: string[];
    to: string;
    allowedActors: FulfillmentActorType[];
    description: string;
}
export declare class FulfillmentStateMachine {
    private readonly logger;
    private readonly rules;
    validateTransition(currentStatus: string, action: FulfillmentAction, actorType: FulfillmentActorType): {
        valid: boolean;
        targetStatus?: string;
        reason?: string;
    };
}
