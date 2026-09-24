"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FulfillmentStateMachine = void 0;
const common_1 = require("@nestjs/common");
/**
 * SERVENTICA — Fulfillment State Machine (Phase 7)
 * Authoritative, in-memory validation of business state machine transitions.
 * Guarantees transitions conform to canonical rules before invoking atomic DBMS transactions.
 */
let FulfillmentStateMachine = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var FulfillmentStateMachine = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            FulfillmentStateMachine = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        logger = new common_1.Logger(FulfillmentStateMachine.name);
        rules = {
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
    return FulfillmentStateMachine = _classThis;
})();
exports.FulfillmentStateMachine = FulfillmentStateMachine;
