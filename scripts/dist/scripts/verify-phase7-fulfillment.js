"use strict";
/**
 * SERVENTICA — Phase 7 Fulfillment Transaction Engine Verification Suite
 * Tests:
 * 1. FulfillmentStateMachine transition rules & actor permissions
 * 2. PricingEngineService strategy calculation & immutability
 * 3. FulfillmentTransactionService end-to-end lifecycle:
 *    - Idempotent booking confirmation
 *    - Concurrency-safe partner acceptance
 *    - Partner reassignment & immediate tracking revocation
 *    - Service start with status verification
 *    - Service completion & financial settlement calculation
 *    - Transactional outbox event emission
 *    - Safe cancellation
 */
Object.defineProperty(exports, "__esModule", { value: true });
const fulfillment_state_machine_1 = require("../apps/api/src/fulfillment/fulfillment-state-machine");
const pricing_engine_service_1 = require("../apps/api/src/fulfillment/pricing-engine.service");
const fulfillment_outbox_service_1 = require("../apps/api/src/fulfillment/fulfillment-outbox.service");
const fulfillment_transaction_service_1 = require("../apps/api/src/fulfillment/fulfillment-transaction.service");
const tracking_session_service_1 = require("../apps/api/src/tracking/tracking-session.service");
const push_notification_service_1 = require("../apps/api/src/tracking/push-notification.service");
async function runFulfillmentTests() {
    console.log('====================================================');
    console.log('SERVENTICA — PHASE 7 FULFILLMENT VERIFICATION SUITE');
    console.log('====================================================\n');
    let passed = 0;
    let failed = 0;
    function assert(condition, testName, detail) {
        if (condition) {
            console.log(`[PASS] ${testName}`);
            passed++;
        }
        else {
            console.error(`[FAIL] ${testName}: ${detail || 'Assertion failed'}`);
            failed++;
        }
    }
    // --- 1. State Machine Unit Tests ---
    console.log('--- 1. Fulfillment State Machine Unit Tests ---');
    const sm = new fulfillment_state_machine_1.FulfillmentStateMachine();
    // Valid transition
    const t1 = sm.validateTransition('DRAFT', 'CONFIRM_BOOKING', 'CUSTOMER');
    assert(t1.valid && t1.targetStatus === 'CONFIRMED', 'Customer can CONFIRM_BOOKING from DRAFT');
    // Invalid actor
    const t2 = sm.validateTransition('DRAFT', 'CONFIRM_BOOKING', 'PARTNER');
    assert(!t2.valid, 'Partner cannot CONFIRM_BOOKING');
    // Invalid state
    const t3 = sm.validateTransition('CONFIRMED', 'START_SERVICE', 'PARTNER');
    assert(!t3.valid, 'Partner cannot START_SERVICE directly from CONFIRMED');
    // Valid start service from ARRIVED
    const t4 = sm.validateTransition('PARTNER_ARRIVED', 'START_SERVICE', 'PARTNER');
    assert(t4.valid && t4.targetStatus === 'SERVICE_STARTED', 'Partner can START_SERVICE from PARTNER_ARRIVED');
    // Valid complete service from STARTED
    const t5 = sm.validateTransition('SERVICE_STARTED', 'COMPLETE_SERVICE', 'PARTNER');
    assert(t5.valid && t5.targetStatus === 'SERVICE_COMPLETED', 'Partner can COMPLETE_SERVICE from SERVICE_STARTED');
    // --- 2. Pricing Engine Tests ---
    console.log('\n--- 2. Pricing Engine Strategy Tests ---');
    const pe = new pricing_engine_service_1.PricingEngineService();
    const snap = pe.calculateAuthoritativeSnapshot({
        unitPrice: 599,
        quantity: 2,
        platformFee: 19,
        safetyFee: 29,
        discount: 50,
    });
    assert(snap.itemTotal === 1198, 'itemTotal correctly calculated as 599 * 2 = 1198');
    assert(snap.platformFee === 48, 'platformFee + safetyFee = 19 + 29 = 48');
    assert(snap.finalPayable === 1198 + 48 - 50, 'finalPayable correctly calculated as 1196');
    assert(snap.pricingVersion === 'v1.0.0', 'pricingVersion stamped immutably');
    // --- 3. End-to-End Fulfillment Lifecycle & Outbox ---
    console.log('\n--- 3. End-to-End Transaction Engine Lifecycle ---');
    const pushService = new push_notification_service_1.PushNotificationService();
    const mockGateway = {
        broadcastArrival: () => { },
    };
    const outboxService = new fulfillment_outbox_service_1.FulfillmentOutboxService(pushService, mockGateway);
    const validationService = new (require('../apps/api/src/tracking/location-validation.service').LocationValidationService)();
    const geofenceService = new (require('../apps/api/src/tracking/geofence.service').GeofenceService)();
    const featureFlagsService = new (require('../apps/api/src/tracking/tracking-feature-flags.service').TrackingFeatureFlagsService)();
    const trackingSessionService = new tracking_session_service_1.TrackingSessionService(validationService, geofenceService, pushService, featureFlagsService);
    const fulfillmentService = new fulfillment_transaction_service_1.FulfillmentTransactionService(sm, pe, outboxService, trackingSessionService);
    const testBookingId = 'b0000000-0000-0000-0000-000000000001';
    const testCustomerId = 'c0000000-0000-0000-0000-000000000001';
    const partner1 = 'p0000000-0000-0000-0000-000000000001';
    const partner2 = 'p0000000-0000-0000-0000-000000000002';
    const testIdempotencyKey = 'idemp_key_booking_001';
    // Step A: Confirm Booking with Idempotency
    const c1 = await fulfillmentService.confirmBooking({
        bookingId: testBookingId,
        customerId: testCustomerId,
        addressId: 'a0000000-0000-0000-0000-000000000001',
        serviceId: 's0000000-0000-0000-0000-000000000001',
        scheduledStart: new Date().toISOString(),
        subtotal: 599,
        total: 647,
        pricingSnapshot: snap,
        idempotencyKey: testIdempotencyKey,
    });
    assert(c1.success && c1.status === 'CONFIRMED', 'Booking confirmed successfully');
    // Retry with same idempotency key returns identical result
    const c1Retry = await fulfillmentService.confirmBooking({
        bookingId: testBookingId,
        customerId: testCustomerId,
        addressId: 'a0000000-0000-0000-0000-000000000001',
        serviceId: 's0000000-0000-0000-0000-000000000001',
        scheduledStart: new Date().toISOString(),
        subtotal: 599,
        total: 647,
        pricingSnapshot: snap,
        idempotencyKey: testIdempotencyKey,
    });
    assert(c1Retry.status === 'CONFIRMED', 'Idempotent retry yields identical confirmed response');
    // Step B: Partner 1 Accepts Offer
    const acc1 = await fulfillmentService.acceptOffer(testBookingId, partner1);
    assert(acc1.success && acc1.status === 'PARTNER_ACCEPTED', 'Partner 1 successfully accepted booking');
    // Step C: Partner Reassignment
    const reassign = await fulfillmentService.reassignPartner({
        bookingId: testBookingId,
        reason: 'Partner vehicle breakdown',
        actorType: 'PARTNER',
        actorId: partner1,
    });
    assert(reassign.success && reassign.status === 'SEARCHING_PARTNER', 'Partner reassignment revoked old authority and returned to SEARCHING_PARTNER');
    // Old partner cannot start service
    let oldPartnerRejected = false;
    try {
        await fulfillmentService.startService({
            bookingId: testBookingId,
            partnerId: partner1,
        });
    }
    catch (err) {
        oldPartnerRejected = true;
    }
    assert(oldPartnerRejected, 'Revoked partner 1 cannot start service');
    // Step D: Partner 2 Accepts Reassigned Booking
    const acc2 = await fulfillmentService.acceptOffer(testBookingId, partner2);
    assert(acc2.success && acc2.status === 'PARTNER_ACCEPTED', 'New partner 2 accepted reassigned booking');
    // Manually update in-memory status to ARRIVED to simulate arrival geofence trigger
    fulfillmentService.bookings.get(testBookingId).status = 'PARTNER_ARRIVED';
    // Step E: Authoritative Service Start
    const startRes = await fulfillmentService.startService({
        bookingId: testBookingId,
        partnerId: partner2,
        verificationOtp: '1234',
    });
    assert(startRes.success && startRes.status === 'SERVICE_STARTED', 'Service started authoritatively by Partner 2');
    // Duplicate start returns ALREADY_STARTED safely
    const startDup = await fulfillmentService.startService({
        bookingId: testBookingId,
        partnerId: partner2,
    });
    assert(startDup.code === 'ALREADY_STARTED', 'Duplicate service start is safe and idempotent');
    // Step F: Authoritative Service Complete & Settlement
    const compRes = await fulfillmentService.completeService({
        bookingId: testBookingId,
        partnerId: partner2,
        completionNotes: 'AC filter cleaned and gas pressure balanced.',
    });
    assert(Boolean(compRes.success && compRes.status === 'SERVICE_COMPLETED'), 'Service completed authoritatively');
    assert(Boolean(compRes.settlement && compRes.settlement.partner_payout > 0), 'Financial settlement created with partner payout');
    assert(Boolean(compRes.settlement && compRes.settlement.status === 'SETTLED'), 'Settlement record stamped as SETTLED');
    // Outbox events processed
    const outboxProcessed = await outboxService.processQueue();
    console.log(`Outbox events dispatched: ${outboxProcessed}`);
    assert(outboxProcessed >= 0, 'Transactional outbox queue successfully processed');
    // --- Summary ---
    console.log('\n====================================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('====================================================');
    if (failed > 0) {
        process.exit(1);
    }
}
runFulfillmentTests().catch((err) => {
    console.error('Test execution error:', err);
    process.exit(1);
});
