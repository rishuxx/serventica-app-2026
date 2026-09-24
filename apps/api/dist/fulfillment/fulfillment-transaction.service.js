"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FulfillmentTransactionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FulfillmentTransactionService = void 0;
const common_1 = require("@nestjs/common");
const fulfillment_state_machine_1 = require("./fulfillment-state-machine");
const pricing_engine_service_1 = require("./pricing-engine.service");
const fulfillment_outbox_service_1 = require("./fulfillment-outbox.service");
const tracking_session_service_1 = require("../tracking/tracking-session.service");
let FulfillmentTransactionService = FulfillmentTransactionService_1 = class FulfillmentTransactionService {
    constructor(stateMachine, pricingEngine, outboxService, trackingSessionService) {
        this.stateMachine = stateMachine;
        this.pricingEngine = pricingEngine;
        this.outboxService = outboxService;
        this.trackingSessionService = trackingSessionService;
        this.logger = new common_1.Logger(FulfillmentTransactionService_1.name);
        this.bookings = new Map();
        this.idempotencyStore = new Map();
    }
    async confirmBooking(params) {
        const { bookingId, customerId, total, idempotencyKey } = params;
        if (idempotencyKey && this.idempotencyStore.has(idempotencyKey)) {
            return this.idempotencyStore.get(idempotencyKey);
        }
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
    async acceptOffer(bookingId, partnerId) {
        const booking = this.bookings.get(bookingId);
        if (!booking) {
            throw new common_1.BadRequestException('Booking not found');
        }
        const check = this.stateMachine.validateTransition(booking.status, 'ACCEPT_OFFER', 'PARTNER');
        if (!check.valid) {
            throw new common_1.ConflictException(check.reason);
        }
        booking.partner_id = partnerId;
        booking.status = 'PARTNER_ACCEPTED';
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
exports.FulfillmentTransactionService = FulfillmentTransactionService;
exports.FulfillmentTransactionService = FulfillmentTransactionService = FulfillmentTransactionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [fulfillment_state_machine_1.FulfillmentStateMachine,
        pricing_engine_service_1.PricingEngineService,
        fulfillment_outbox_service_1.FulfillmentOutboxService,
        tracking_session_service_1.TrackingSessionService])
], FulfillmentTransactionService);
//# sourceMappingURL=fulfillment-transaction.service.js.map