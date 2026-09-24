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
exports.FulfillmentTransactionService = void 0;
const common_1 = require("@nestjs/common");
let FulfillmentTransactionService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var FulfillmentTransactionService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            FulfillmentTransactionService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        stateMachine;
        pricingEngine;
        outboxService;
        trackingSessionService;
        logger = new common_1.Logger(FulfillmentTransactionService.name);
        // In-memory backing store for local API/monorepo testing
        bookings = new Map();
        idempotencyStore = new Map();
        constructor(stateMachine, pricingEngine, outboxService, trackingSessionService) {
            this.stateMachine = stateMachine;
            this.pricingEngine = pricingEngine;
            this.outboxService = outboxService;
            this.trackingSessionService = trackingSessionService;
        }
        /**
         * 1. Authoritative Confirm Booking
         */
        async confirmBooking(params) {
            const { bookingId, customerId, total, idempotencyKey } = params;
            // Check Idempotency Key
            if (idempotencyKey && this.idempotencyStore.has(idempotencyKey)) {
                return this.idempotencyStore.get(idempotencyKey);
            }
            // Authoritative pricing calculation
            const pricing = this.pricingEngine.calculateAuthoritativeSnapshot({
                unitPrice: params.subtotal,
                quantity: 1,
                platformFee: params.platformFee,
            });
            const bookingNumber = params.bookingNumber || `SRV-${bookingId.slice(0, 8).toUpperCase()}`;
            const record = {
                id: bookingId,
                booking_number: bookingNumber,
                customer_id: customerId,
                partner_id: null,
                status: 'CONFIRMED',
                pricing_snapshot: pricing,
                subtotal: params.subtotal,
                total: pricing.finalPayable,
            };
            this.bookings.set(bookingId, record);
            // Queue outbox event
            this.outboxService.enqueueEvent({
                id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                booking_id: bookingId,
                event_type: 'BOOKING_CONFIRMED',
                payload: {
                    booking_id: bookingId,
                    booking_number: bookingNumber,
                    customer_id: customerId,
                    total: record.total,
                },
            });
            const result = {
                success: true,
                bookingId,
                status: 'CONFIRMED',
                message: 'Booking confirmed with locked pricing snapshot.',
            };
            if (idempotencyKey) {
                this.idempotencyStore.set(idempotencyKey, result);
            }
            return result;
        }
        /**
         * 2. Authoritative Partner Acceptance
         */
        async acceptOffer(bookingId, partnerId) {
            const booking = this.bookings.get(bookingId);
            if (!booking) {
                throw new common_1.BadRequestException('Booking not found');
            }
            const check = this.stateMachine.validateTransition(booking.status, 'ACCEPT_OFFER', 'PARTNER');
            if (!check.valid) {
                throw new common_1.ConflictException(check.reason);
            }
            // Atomic assignment
            booking.partner_id = partnerId;
            booking.status = 'PARTNER_ACCEPTED';
            // Activate tracking session
            this.trackingSessionService.registerOrUpdateBooking({
                bookingId,
                bookingNumber: booking.booking_number,
                bookingStatus: 'PARTNER_ACCEPTED',
                trackingStatus: 'PARTNER_ASSIGNED',
                customerId: booking.customer_id,
                partnerId,
                partner: { id: partnerId, name: 'Specialist Partner', phone: '+91 98765 43210' },
                customerLocation: {
                    addressId: 'addr_default_01',
                    latitude: 28.5729,
                    longitude: 77.3849,
                    formattedAddress: 'Customer Service Location',
                    shortAddress: 'Service Address',
                    city: 'Dehradun',
                },
            });
            this.outboxService.enqueueEvent({
                id: `outbox_${Date.now()}`,
                booking_id: bookingId,
                event_type: 'PARTNER_ASSIGNED',
                payload: {
                    booking_id: bookingId,
                    partner_id: partnerId,
                    customer_id: booking.customer_id,
                },
            });
            return {
                success: true,
                bookingId,
                status: 'PARTNER_ACCEPTED',
            };
        }
        /**
         * 3. Authoritative Reassign Partner
         */
        async reassignPartner(params) {
            const { bookingId, reason, actorType, actorId } = params;
            const booking = this.bookings.get(bookingId);
            if (!booking) {
                throw new common_1.BadRequestException('Booking not found');
            }
            const check = this.stateMachine.validateTransition(booking.status, 'REASSIGN_PARTNER', actorType);
            if (!check.valid) {
                throw new common_1.ConflictException(check.reason);
            }
            const oldPartner = booking.partner_id;
            // Immediately evict old partner's tracking session and authority
            booking.partner_id = null;
            booking.status = 'SEARCHING_PARTNER';
            this.outboxService.enqueueEvent({
                id: `outbox_${Date.now()}`,
                booking_id: bookingId,
                event_type: 'PARTNER_REASSIGNED',
                payload: {
                    booking_id: bookingId,
                    old_partner_id: oldPartner,
                    reason,
                    customer_id: booking.customer_id,
                },
            });
            return {
                success: true,
                bookingId,
                previousStatus: 'PARTNER_ACCEPTED',
                status: 'SEARCHING_PARTNER',
                message: 'Old partner authority revoked and re-dispatch initiated.',
            };
        }
        /**
         * 4. Authoritative Start Service
         */
        async startService(params) {
            const { bookingId, partnerId, verificationOtp } = params;
            const booking = this.bookings.get(bookingId);
            if (!booking) {
                throw new common_1.BadRequestException('Booking not found');
            }
            if (booking.partner_id !== partnerId) {
                throw new common_1.UnauthorizedException('Partner is not assigned to this booking');
            }
            if (booking.status === 'SERVICE_STARTED') {
                return { success: true, bookingId, status: 'SERVICE_STARTED', code: 'ALREADY_STARTED' };
            }
            const check = this.stateMachine.validateTransition(booking.status, 'START_SERVICE', 'PARTNER');
            if (!check.valid) {
                throw new common_1.ConflictException(check.reason);
            }
            booking.status = 'SERVICE_STARTED';
            booking.service_started_at = new Date().toISOString();
            this.outboxService.enqueueEvent({
                id: `outbox_${Date.now()}`,
                booking_id: bookingId,
                event_type: 'SERVICE_STARTED',
                payload: {
                    booking_id: bookingId,
                    partner_id: partnerId,
                    customer_id: booking.customer_id,
                },
            });
            return {
                success: true,
                bookingId,
                status: 'SERVICE_STARTED',
            };
        }
        /**
         * 5. Authoritative Complete Service & Financial Settlement
         */
        async completeService(params) {
            const { bookingId, partnerId, completionNotes } = params;
            const booking = this.bookings.get(bookingId);
            if (!booking) {
                throw new common_1.BadRequestException('Booking not found');
            }
            if (booking.partner_id !== partnerId) {
                throw new common_1.UnauthorizedException('Partner is not assigned to this booking');
            }
            if (booking.status === 'SERVICE_COMPLETED') {
                return { success: true, bookingId, status: 'SERVICE_COMPLETED', code: 'ALREADY_COMPLETED' };
            }
            const check = this.stateMachine.validateTransition(booking.status, 'COMPLETE_SERVICE', 'PARTNER');
            if (!check.valid) {
                throw new common_1.ConflictException(check.reason);
            }
            // Financial Calculation
            const gross = booking.total;
            const tax = 0;
            const platformFee = 29 + Math.round(gross * 0.15);
            const partnerPayout = Math.max(0, gross - platformFee - tax);
            booking.status = 'SERVICE_COMPLETED';
            booking.service_completed_at = new Date().toISOString();
            const settlement = {
                id: `settle_${Date.now()}`,
                booking_id: bookingId,
                partner_id: partnerId,
                gross_amount: gross,
                platform_fee: platformFee,
                tax_amount: tax,
                partner_payout: partnerPayout,
                currency: 'INR',
                status: 'SETTLED',
                metadata: { completionNotes },
                settled_at: new Date().toISOString(),
            };
            // Terminate tracking session deterministically
            this.trackingSessionService.updateStatus(bookingId, 'SERVICE_COMPLETED');
            this.outboxService.enqueueEvent({
                id: `outbox_${Date.now()}`,
                booking_id: bookingId,
                event_type: 'SERVICE_COMPLETED',
                payload: {
                    booking_id: bookingId,
                    partner_id: partnerId,
                    customer_id: booking.customer_id,
                    gross,
                    partnerPayout,
                },
            });
            return {
                success: true,
                bookingId,
                status: 'SERVICE_COMPLETED',
                settlement,
            };
        }
        /**
         * 6. Authoritative Cancel Booking
         */
        async cancelBooking(params) {
            const { bookingId, reason, actorType, actorId } = params;
            const booking = this.bookings.get(bookingId);
            if (!booking) {
                throw new common_1.BadRequestException('Booking not found');
            }
            if (booking.status.includes('CANCEL')) {
                return { success: true, bookingId, status: booking.status, code: 'ALREADY_CANCELLED' };
            }
            const check = this.stateMachine.validateTransition(booking.status, 'CANCEL_BOOKING', actorType);
            if (!check.valid) {
                throw new common_1.ConflictException(check.reason);
            }
            const targetStatus = actorType === 'PARTNER'
                ? 'CANCELLED_BY_PARTNER'
                : actorType === 'ADMIN'
                    ? 'CANCELLED_BY_SYSTEM'
                    : 'CANCELLED_BY_CUSTOMER';
            booking.status = targetStatus;
            booking.cancellation_reason = reason;
            // Evict tracking session if one was created
            this.trackingSessionService.updateStatus(bookingId, 'CANCELLED');
            this.outboxService.enqueueEvent({
                id: `outbox_${Date.now()}`,
                booking_id: bookingId,
                event_type: 'BOOKING_CANCELLED',
                payload: {
                    booking_id: bookingId,
                    actorType,
                    reason,
                    customer_id: booking.customer_id,
                },
            });
            return {
                success: true,
                bookingId,
                status: targetStatus,
            };
        }
    };
    return FulfillmentTransactionService = _classThis;
})();
exports.FulfillmentTransactionService = FulfillmentTransactionService;
