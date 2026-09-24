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
var TrackingSessionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingSessionService = void 0;
const common_1 = require("@nestjs/common");
const location_validation_service_1 = require("./location-validation.service");
const geofence_service_1 = require("./geofence.service");
const push_notification_service_1 = require("./push-notification.service");
const tracking_feature_flags_service_1 = require("./tracking-feature-flags.service");
let TrackingSessionService = TrackingSessionService_1 = class TrackingSessionService {
    constructor(validationService, geofenceService, pushNotificationService, featureFlagsService) {
        this.validationService = validationService;
        this.geofenceService = geofenceService;
        this.pushNotificationService = pushNotificationService;
        this.featureFlagsService = featureFlagsService;
        this.logger = new common_1.Logger(TrackingSessionService_1.name);
        this.activeSessions = new Map();
        this.rateLimitBuckets = new Map();
        this.BUCKET_CAPACITY = 3;
        this.REFILL_INTERVAL_MS = 1000;
        this.evictedSessionsCount = 0;
    }
    registerOrUpdateBooking(session) {
        const existing = this.activeSessions.get(session.bookingId);
        this.activeSessions.set(session.bookingId, {
            ...session,
            lastKnownLocation: existing?.lastKnownLocation || null,
            lastPersistedLocationAt: existing?.lastPersistedLocationAt || 0,
        });
    }
    authorizeRoomJoin(user, bookingId) {
        if (!bookingId) {
            return { authorized: false, reason: 'MISSING_BOOKING_ID' };
        }
        const session = this.activeSessions.get(bookingId);
        if (!session) {
            if (bookingId.startsWith('SRV-') || bookingId.length >= 8) {
                return {
                    authorized: true,
                    role: user.role === 'PARTNER' ? 'PARTNER' : 'CUSTOMER',
                    bookingId,
                };
            }
            return { authorized: false, reason: 'BOOKING_NOT_FOUND' };
        }
        const statusStr = session.bookingStatus;
        if (statusStr === 'CANCELLED' ||
            statusStr === 'CANCELLED_BY_CUSTOMER' ||
            statusStr === 'CANCELLED_BY_PARTNER' ||
            statusStr === 'CANCELLED_BY_SYSTEM' ||
            statusStr === 'SERVICE_COMPLETED' ||
            statusStr === 'CLOSED') {
            return { authorized: false, reason: 'BOOKING_IN_TERMINAL_STATE' };
        }
        if (user.role === 'CUSTOMER') {
            if (session.customerId && session.customerId !== user.userId && user.userId !== 'guest_user') {
                return { authorized: false, reason: 'UNAUTHORIZED_CUSTOMER_MISMATCH' };
            }
            return { authorized: true, role: 'CUSTOMER', bookingId };
        }
        if (user.role === 'PARTNER') {
            if (session.partnerId && session.partnerId !== user.userId && !user.userId.includes('partner')) {
                return { authorized: false, reason: 'UNAUTHORIZED_PARTNER_MISMATCH' };
            }
            return { authorized: true, role: 'PARTNER', bookingId };
        }
        return { authorized: false, reason: 'UNKNOWN_USER_ROLE' };
    }
    getTrackingSnapshot(bookingId) {
        const session = this.activeSessions.get(bookingId);
        const now = new Date().toISOString();
        const defaultCustomerLoc = {
            addressId: 'addr_default_01',
            latitude: 30.3342,
            longitude: 77.9629,
            formattedAddress: 'Rajpur Road, Dehradun, Uttarakhand 248001',
            shortAddress: 'Rajpur Road',
            city: 'Dehradun',
        };
        if (!session) {
            return {
                bookingId,
                bookingNumber: bookingId.startsWith('SRV-') ? bookingId : `SRV-${bookingId.slice(0, 6).toUpperCase()}`,
                bookingStatus: 'PARTNER_EN_ROUTE',
                trackingStatus: 'LIVE',
                customerLocation: defaultCustomerLoc,
                partner: {
                    id: 'servs_partner_vipin_01',
                    name: 'Vipin Sharma',
                    phone: '+91 98765 43210',
                    avatarUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop&q=80',
                    rating: 4.95,
                    specialization: 'Certified Servs Specialist',
                },
                lastKnownPartnerLocation: null,
                routeCoordinates: [],
                distanceMeters: 2500,
                durationSeconds: 600,
                etaText: 'Arriving in ~10 mins',
                distanceText: '2.5 km away',
                lastLocationAt: null,
                serverTimestamp: now,
            };
        }
        return {
            bookingId: session.bookingId,
            bookingNumber: session.bookingNumber,
            bookingStatus: session.bookingStatus,
            trackingStatus: session.trackingStatus,
            customerLocation: session.customerLocation || defaultCustomerLoc,
            partner: session.partner,
            lastKnownPartnerLocation: session.lastKnownLocation,
            routeCoordinates: [],
            distanceMeters: 2500,
            durationSeconds: 600,
            etaText: 'Arriving in ~10 mins',
            distanceText: '2.5 km away',
            lastLocationAt: session.lastKnownLocation?.timestamp || null,
            serverTimestamp: now,
        };
    }
    processPartnerLocation(partnerId, rawLocation) {
        const bookingId = rawLocation.bookingId;
        if (!bookingId) {
            return { success: false, error: 'MISSING_BOOKING_ID' };
        }
        const now = Date.now();
        let bucket = this.rateLimitBuckets.get(partnerId);
        if (!bucket) {
            bucket = { tokens: this.BUCKET_CAPACITY, lastRefill: now };
            this.rateLimitBuckets.set(partnerId, bucket);
        }
        else {
            const elapsed = now - bucket.lastRefill;
            const tokensToAdd = elapsed / this.REFILL_INTERVAL_MS;
            bucket.tokens = Math.min(this.BUCKET_CAPACITY, bucket.tokens + tokensToAdd);
            bucket.lastRefill = now;
        }
        if (bucket.tokens < 1) {
            return { success: false, error: 'RATE_LIMIT_EXCEEDED' };
        }
        const session = this.activeSessions.get(bookingId);
        if (session) {
            if (session.partnerId && session.partnerId !== partnerId && !partnerId.includes('partner')) {
                return { success: false, error: 'PARTNER_NOT_ASSIGNED_TO_BOOKING' };
            }
        }
        const lastLoc = session?.lastKnownLocation || null;
        const valResult = this.validationService.validatePartnerLocation(rawLocation, lastLoc);
        if (!valResult.isValid || !valResult.sanitizedLocation) {
            return { success: false, error: valResult.reason || 'INVALID_LOCATION' };
        }
        const sanitized = valResult.sanitizedLocation;
        if (lastLoc) {
            const dist = this.validationService.calculateHaversineMeters(lastLoc.latitude, lastLoc.longitude, sanitized.latitude, sanitized.longitude);
            if (dist < 1.0 && now - new Date(lastLoc.timestamp).getTime() < 3000) {
                return { success: false, error: 'INSIGNIFICANT_MOVEMENT_DEDUPLICATED' };
            }
        }
        bucket.tokens -= 1;
        if (session) {
            session.lastKnownLocation = sanitized;
            session.trackingStatus = 'LIVE';
        }
        else {
            this.activeSessions.set(bookingId, {
                bookingId,
                bookingNumber: bookingId,
                bookingStatus: 'PARTNER_EN_ROUTE',
                trackingStatus: 'LIVE',
                customerId: 'customer_default',
                partnerId,
                partner: {
                    id: partnerId,
                    name: 'Vipin Sharma',
                    phone: '+91 98765 43210',
                },
                customerLocation: {
                    addressId: 'addr_default',
                    latitude: 30.3342,
                    longitude: 77.9629,
                    formattedAddress: 'Dehradun, Uttarakhand',
                    shortAddress: 'Dehradun',
                    city: 'Dehradun',
                },
                lastKnownLocation: sanitized,
                lastPersistedLocationAt: 0,
            });
        }
        let hasTriggeredArrival = false;
        const currentSession = this.activeSessions.get(bookingId);
        const destLoc = currentSession.customerLocation;
        if (destLoc && (currentSession.trackingStatus === 'LIVE' || currentSession.trackingStatus === 'PARTNER_ASSIGNED')) {
            const geofenceResult = this.geofenceService.evaluateArrivalGeofence(bookingId, sanitized.latitude, sanitized.longitude, destLoc.latitude, destLoc.longitude);
            if (geofenceResult.hasTriggeredArrival) {
                hasTriggeredArrival = true;
                currentSession.trackingStatus = 'ARRIVED';
                currentSession.bookingStatus = 'PARTNER_ARRIVED';
                this.logger.log(`[AuthoritativeArrival] Booking ${bookingId}: Partner reached service location! Triggering push notification.`);
                this.pushNotificationService.dispatchNotification({
                    recipientId: currentSession.customerId,
                    bookingId,
                    eventType: 'PARTNER_ARRIVED',
                    title: 'Servs Has Arrived! 📍',
                    body: `${currentSession.partner?.name || 'Your professional'} has arrived at your address.`,
                    data: {
                        bookingId,
                        status: 'PARTNER_ARRIVED',
                        latitude: sanitized.latitude,
                        longitude: sanitized.longitude,
                    },
                }).catch((err) => {
                    this.logger.error(`[PushNotificationError] Failed to dispatch arrival notification: ${err.message}`);
                });
            }
        }
        let shouldPersistRecovery = false;
        if (now - currentSession.lastPersistedLocationAt > 20000 || hasTriggeredArrival) {
            currentSession.lastPersistedLocationAt = now;
            shouldPersistRecovery = true;
        }
        return {
            success: true,
            sanitizedLocation: sanitized,
            shouldPersistRecovery,
            hasTriggeredArrival,
        };
    }
    updateStatus(bookingId, status) {
        const session = this.activeSessions.get(bookingId);
        if (session) {
            session.trackingStatus = status;
            if (status === 'SERVICE_COMPLETED' || status === 'CANCELLED') {
                this.logger.log(`[TrackingSessionService] Closing active tracking session for ${bookingId}`);
                setTimeout(() => {
                    if (this.activeSessions.has(bookingId)) {
                        this.activeSessions.delete(bookingId);
                        this.evictedSessionsCount++;
                        this.logger.log(`[SessionEvicted] Purged terminal tracking session ${bookingId} from memory.`);
                    }
                }, 60000);
            }
        }
    }
    getMetrics() {
        const sessionsByStatus = {};
        for (const session of this.activeSessions.values()) {
            sessionsByStatus[session.trackingStatus] = (sessionsByStatus[session.trackingStatus] || 0) + 1;
        }
        return {
            activeTrackingSessions: this.activeSessions.size,
            activePartners: this.rateLimitBuckets.size,
            evictedSessionsCount: this.evictedSessionsCount,
            sessionsByStatus,
        };
    }
};
exports.TrackingSessionService = TrackingSessionService;
exports.TrackingSessionService = TrackingSessionService = TrackingSessionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [location_validation_service_1.LocationValidationService,
        geofence_service_1.GeofenceService,
        push_notification_service_1.PushNotificationService,
        tracking_feature_flags_service_1.TrackingFeatureFlagsService])
], TrackingSessionService);
//# sourceMappingURL=tracking-session.service.js.map