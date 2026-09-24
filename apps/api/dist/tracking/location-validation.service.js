"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var LocationValidationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationValidationService = void 0;
const common_1 = require("@nestjs/common");
let LocationValidationService = LocationValidationService_1 = class LocationValidationService {
    constructor() {
        this.logger = new common_1.Logger(LocationValidationService_1.name);
        this.MAX_SPEED_MPS = 50;
        this.MAX_ACCURACY_METERS = 100;
        this.MAX_STALENESS_MS = 15000;
    }
    validatePartnerLocation(raw, lastKnown) {
        if (!raw) {
            return { isValid: false, reason: 'PAYLOAD_EMPTY' };
        }
        const { latitude, longitude, bookingId, partnerId } = raw;
        if (!bookingId || typeof bookingId !== 'string') {
            return { isValid: false, reason: 'MISSING_OR_INVALID_BOOKING_ID' };
        }
        if (!partnerId || typeof partnerId !== 'string') {
            return { isValid: false, reason: 'MISSING_OR_INVALID_PARTNER_ID' };
        }
        if (typeof latitude !== 'number' ||
            typeof longitude !== 'number' ||
            isNaN(latitude) ||
            isNaN(longitude)) {
            return { isValid: false, reason: 'INVALID_NUMERIC_COORDINATES' };
        }
        if (latitude < -90 || latitude > 90) {
            return { isValid: false, reason: 'LATITUDE_OUT_OF_BOUNDS' };
        }
        if (longitude < -180 || longitude > 180) {
            return { isValid: false, reason: 'LONGITUDE_OUT_OF_BOUNDS' };
        }
        if (raw.accuracy != null && (raw.accuracy < 0 || raw.accuracy > this.MAX_ACCURACY_METERS)) {
            return { isValid: false, reason: `INACCURATE_GPS_MARGIN_${raw.accuracy}m` };
        }
        const now = Date.now();
        let pointTime = now;
        if (raw.timestamp) {
            const parsedTime = new Date(raw.timestamp).getTime();
            if (!isNaN(parsedTime)) {
                pointTime = parsedTime;
            }
        }
        if (now - pointTime > this.MAX_STALENESS_MS) {
            return { isValid: false, reason: 'STALE_GPS_READING' };
        }
        if (pointTime - now > 5000) {
            return { isValid: false, reason: 'FUTURE_TIMESTAMP_DETECTED' };
        }
        if (lastKnown && lastKnown.latitude != null && lastKnown.longitude != null) {
            const lastTime = new Date(lastKnown.timestamp).getTime();
            const timeDiffSec = (pointTime - lastTime) / 1000;
            if (timeDiffSec <= 30 && timeDiffSec >= 0) {
                const distMeters = this.calculateHaversineMeters(lastKnown.latitude, lastKnown.longitude, latitude, longitude);
                const safeTimeDiffSec = Math.max(0.5, timeDiffSec);
                const computedSpeed = distMeters / safeTimeDiffSec;
                if (computedSpeed > this.MAX_SPEED_MPS && distMeters > 200) {
                    this.logger.warn(`[JumpDetected] Booking ${bookingId}: jumped ${distMeters.toFixed(1)}m in ${safeTimeDiffSec}s (${computedSpeed.toFixed(1)} m/s)`);
                    return { isValid: false, reason: 'IMPOSSIBLE_MOVEMENT_JUMP_DETECTED' };
                }
            }
            else {
                this.logger.log(`[AuthoritativeFixEstablished] Booking ${bookingId}: established new GPS anchor (${latitude.toFixed(6)}, ${longitude.toFixed(6)}) after ${timeDiffSec.toFixed(1)}s elapsed.`);
            }
        }
        let sanitizedHeading = undefined;
        if (raw.heading != null && typeof raw.heading === 'number' && !isNaN(raw.heading)) {
            sanitizedHeading = Math.round(((raw.heading % 360) + 360) % 360);
        }
        else if (lastKnown && lastKnown.latitude != null && lastKnown.longitude != null) {
            const dist = this.calculateHaversineMeters(lastKnown.latitude, lastKnown.longitude, latitude, longitude);
            if (dist >= 3) {
                sanitizedHeading = Math.round(this.calculateBearing(lastKnown.latitude, lastKnown.longitude, latitude, longitude));
            }
            else {
                sanitizedHeading = lastKnown.heading;
            }
        }
        const sanitizedLocation = {
            bookingId,
            partnerId,
            latitude: Number(latitude.toFixed(7)),
            longitude: Number(longitude.toFixed(7)),
            accuracy: raw.accuracy != null ? Number(raw.accuracy.toFixed(1)) : undefined,
            heading: sanitizedHeading,
            speed: raw.speed != null ? Math.max(0, Number(raw.speed.toFixed(1))) : undefined,
            altitude: raw.altitude != null ? Number(raw.altitude.toFixed(1)) : undefined,
            timestamp: new Date(pointTime).toISOString(),
            isMocked: Boolean(raw.isMocked),
        };
        return {
            isValid: true,
            sanitizedLocation,
        };
    }
    calculateHaversineMeters(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    calculateBearing(lat1, lon1, lat2, lon2) {
        const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
        const x = Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
            Math.sin((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.cos(((lon2 - lon1) * Math.PI) / 180);
        const brng = (Math.atan2(y, x) * 180) / Math.PI;
        return (brng + 360) % 360;
    }
};
exports.LocationValidationService = LocationValidationService;
exports.LocationValidationService = LocationValidationService = LocationValidationService_1 = __decorate([
    (0, common_1.Injectable)()
], LocationValidationService);
//# sourceMappingURL=location-validation.service.js.map