"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GeofenceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeofenceService = void 0;
const common_1 = require("@nestjs/common");
let GeofenceService = GeofenceService_1 = class GeofenceService {
    constructor() {
        this.logger = new common_1.Logger(GeofenceService_1.name);
        this.ENTRY_RADIUS_METERS = 50.0;
        this.EXIT_RADIUS_METERS = 75.0;
        this.geofenceStates = new Map();
        this.arrivalTriggeredBookings = new Set();
    }
    calculateDistanceMeters(lat1, lon1, lat2, lon2) {
        const R = 6371000;
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
    markArrived(bookingId) {
        this.arrivalTriggeredBookings.add(bookingId);
        this.geofenceStates.set(bookingId, true);
    }
    hasArrived(bookingId) {
        return this.arrivalTriggeredBookings.has(bookingId);
    }
    clearBookingGeofence(bookingId) {
        this.geofenceStates.delete(bookingId);
        this.arrivalTriggeredBookings.delete(bookingId);
    }
    toRadians(degrees) {
        return (degrees * Math.PI) / 180;
    }
};
exports.GeofenceService = GeofenceService;
exports.GeofenceService = GeofenceService = GeofenceService_1 = __decorate([
    (0, common_1.Injectable)()
], GeofenceService);
//# sourceMappingURL=geofence.service.js.map