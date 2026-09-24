"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var FulfillmentStateMachine_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FulfillmentStateMachine = void 0;
const common_1 = require("@nestjs/common");
let FulfillmentStateMachine = FulfillmentStateMachine_1 = class FulfillmentStateMachine {
    constructor() {
        this.logger = new common_1.Logger(FulfillmentStateMachine_1.name);
        this.rules = {
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
                to: 'SEARCHING_PARTNER',
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
                to: 'CANCELLED_BY_CUSTOMER',
                allowedActors: ['CUSTOMER', 'PARTNER', 'ADMIN', 'SYSTEM'],
                description: 'Cancellation before service start.',
            },
        };
    }
    validateTransition(currentStatus, action, actorType) {
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
};
exports.FulfillmentStateMachine = FulfillmentStateMachine;
exports.FulfillmentStateMachine = FulfillmentStateMachine = FulfillmentStateMachine_1 = __decorate([
    (0, common_1.Injectable)()
], FulfillmentStateMachine);
//# sourceMappingURL=fulfillment-state-machine.js.map