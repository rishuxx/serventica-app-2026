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
exports.GeofenceService = void 0;
const common_1 = require("@nestjs/common");
let GeofenceService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var GeofenceService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            GeofenceService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        logger = new common_1.Logger(GeofenceService.name);
        // Arrival entry radius: <= 50 meters
        ENTRY_RADIUS_METERS = 50.0;
        // Hysteresis exit radius: > 75 meters (prevents oscillation on boundary)
        EXIT_RADIUS_METERS = 75.0;
        // In-memory geofence state tracker per booking: bookingId -> boolean (isCurrentlyInside)
        geofenceStates = new Map();
        // Arrival recorded set to guarantee idempotency in-memory
        arrivalTriggeredBookings = new Set();
        /**
         * Calculates precise geographic distance between two coordinates using the Haversine formula
         */
        calculateDistanceMeters(lat1, lon1, lat2, lon2) {
            const R = 6371000; // Earth radius in meters
            const dLat = this.toRadians(lat2 - lat1);
            const dLon = this.toRadians(lon2 - lon1);
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(this.toRadians(lat1)) *
                    Math.cos(this.toRadians(lat2)) *
                    Math.sin(dLon / 2) *
                    Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        }
        /**
         * Evaluates partner position against customer service location with hysteresis.
         */
        evaluateArrivalGeofence(bookingId, partnerLat, partnerLon, customerLat, customerLon) {
            const distanceMeters = this.calculateDistanceMeters(partnerLat, partnerLon, customerLat, customerLon);
            const isCurrentlyInside = this.geofenceStates.get(bookingId) || false;
            let newInsideState = isCurrentlyInside;
            let state = 'APPROACHING';
            if (!isCurrentlyInside && distanceMeters <= this.ENTRY_RADIUS_METERS) {
                newInsideState = true;
                state = 'ENTERED';
                this.logger.log(`[GeofenceEntry] Booking ${bookingId}: Partner entered arrival geofence (${distanceMeters.toFixed(1)}m <= ${this.ENTRY_RADIUS_METERS}m)`);
            }
            else if (isCurrentlyInside && distanceMeters > this.EXIT_RADIUS_METERS) {
                newInsideState = false;
                state = 'OUTSIDE';
                this.logger.log(`[GeofenceExit] Booking ${bookingId}: Partner exited geofence boundary (${distanceMeters.toFixed(1)}m > ${this.EXIT_RADIUS_METERS}m)`);
            }
            else if (isCurrentlyInside) {
                state = 'ENTERED';
            }
            this.geofenceStates.set(bookingId, newInsideState);
            // Determine if arrival should be triggered
            let hasTriggeredArrival = false;
            if (newInsideState && !this.arrivalTriggeredBookings.has(bookingId)) {
                this.arrivalTriggeredBookings.add(bookingId);
                hasTriggeredArrival = true;
            }
            return {
                isWithinGeofence: newInsideState,
                distanceMeters,
                hasTriggeredArrival,
                state,
            };
        }
        /**
         * Marks booking as arrived (idempotent)
         */
        markArrived(bookingId) {
            this.arrivalTriggeredBookings.add(bookingId);
            this.geofenceStates.set(bookingId, true);
        }
        /**
         * Checks if booking has already triggered arrival
         */
        hasArrived(bookingId) {
            return this.arrivalTriggeredBookings.has(bookingId);
        }
        /**
         * Cleans up geofence state when a session completes or cancels
         */
        clearBookingGeofence(bookingId) {
            this.geofenceStates.delete(bookingId);
            this.arrivalTriggeredBookings.delete(bookingId);
        }
        toRadians(degrees) {
            return (degrees * Math.PI) / 180;
        }
    };
    return GeofenceService = _classThis;
})();
exports.GeofenceService = GeofenceService;
