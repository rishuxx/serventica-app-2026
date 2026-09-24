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
exports.LocationValidationService = void 0;
const common_1 = require("@nestjs/common");
let LocationValidationService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var LocationValidationService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            LocationValidationService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        logger = new common_1.Logger(LocationValidationService.name);
        // Maximum allowed speed: 50 m/s (~180 km/h)
        MAX_SPEED_MPS = 50;
        // Maximum allowed GPS error margin: 100 meters
        MAX_ACCURACY_METERS = 100;
        // Maximum allowed GPS reading age: 15 seconds
        MAX_STALENESS_MS = 15000;
        /**
         * Validates partner coordinates, accuracy, staleness, and impossible physical teleportation.
         */
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
            // Latitude [-90, 90], Longitude [-180, 180]
            if (latitude < -90 || latitude > 90) {
                return { isValid: false, reason: 'LATITUDE_OUT_OF_BOUNDS' };
            }
            if (longitude < -180 || longitude > 180) {
                return { isValid: false, reason: 'LONGITUDE_OUT_OF_BOUNDS' };
            }
            // Check accuracy margin
            if (raw.accuracy != null && (raw.accuracy < 0 || raw.accuracy > this.MAX_ACCURACY_METERS)) {
                return { isValid: false, reason: `INACCURATE_GPS_MARGIN_${raw.accuracy}m` };
            }
            // Check timestamp freshness
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
            // Future timestamp protection (> 5s in future)
            if (pointTime - now > 5000) {
                return { isValid: false, reason: 'FUTURE_TIMESTAMP_DETECTED' };
            }
            // Jump / Teleportation detection against previous accepted location
            if (lastKnown && lastKnown.latitude != null && lastKnown.longitude != null) {
                const distMeters = this.calculateHaversineMeters(lastKnown.latitude, lastKnown.longitude, latitude, longitude);
                const lastTime = new Date(lastKnown.timestamp).getTime();
                const timeDiffSec = Math.max(0.5, (pointTime - lastTime) / 1000);
                const computedSpeed = distMeters / timeDiffSec;
                if (computedSpeed > this.MAX_SPEED_MPS && distMeters > 200) {
                    this.logger.warn(`[JumpDetected] Booking ${bookingId}: jumped ${distMeters.toFixed(1)}m in ${timeDiffSec}s (${computedSpeed.toFixed(1)} m/s)`);
                    return { isValid: false, reason: 'IMPOSSIBLE_MOVEMENT_JUMP_DETECTED' };
                }
            }
            // Sanitize and normalize heading [0, 360]
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
    return LocationValidationService = _classThis;
})();
exports.LocationValidationService = LocationValidationService;
