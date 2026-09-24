"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalStateTransitionError = exports.SessionNotFoundError = exports.StaleGpsReadingError = exports.SpeedJumpDetectedError = exports.InvalidCoordinateError = exports.RateLimitExceededError = exports.UnauthorizedRoomAccessError = exports.TrackingDomainError = void 0;
class TrackingDomainError extends Error {
    constructor(message, correlationId, isSafeForClient = true, details) {
        super(message);
        this.correlationId = correlationId;
        this.isSafeForClient = isSafeForClient;
        this.details = details;
        this.timestamp = new Date().toISOString();
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
    toSafeClientResponse() {
        return {
            code: this.code,
            message: this.isSafeForClient ? this.message : 'An unexpected tracking error occurred.',
            correlationId: this.correlationId,
            timestamp: this.timestamp,
        };
    }
}
exports.TrackingDomainError = TrackingDomainError;
class UnauthorizedRoomAccessError extends TrackingDomainError {
    constructor() {
        super(...arguments);
        this.code = 'UNAUTHORIZED_ROOM_ACCESS';
        this.httpStatus = 403;
    }
}
exports.UnauthorizedRoomAccessError = UnauthorizedRoomAccessError;
class RateLimitExceededError extends TrackingDomainError {
    constructor() {
        super(...arguments);
        this.code = 'RATE_LIMIT_EXCEEDED';
        this.httpStatus = 429;
    }
}
exports.RateLimitExceededError = RateLimitExceededError;
class InvalidCoordinateError extends TrackingDomainError {
    constructor() {
        super(...arguments);
        this.code = 'INVALID_COORDINATES';
        this.httpStatus = 400;
    }
}
exports.InvalidCoordinateError = InvalidCoordinateError;
class SpeedJumpDetectedError extends TrackingDomainError {
    constructor() {
        super(...arguments);
        this.code = 'IMPOSSIBLE_MOVEMENT_JUMP_DETECTED';
        this.httpStatus = 422;
    }
}
exports.SpeedJumpDetectedError = SpeedJumpDetectedError;
class StaleGpsReadingError extends TrackingDomainError {
    constructor() {
        super(...arguments);
        this.code = 'STALE_GPS_READING';
        this.httpStatus = 422;
    }
}
exports.StaleGpsReadingError = StaleGpsReadingError;
class SessionNotFoundError extends TrackingDomainError {
    constructor() {
        super(...arguments);
        this.code = 'TRACKING_SESSION_NOT_FOUND';
        this.httpStatus = 404;
    }
}
exports.SessionNotFoundError = SessionNotFoundError;
class TerminalStateTransitionError extends TrackingDomainError {
    constructor() {
        super(...arguments);
        this.code = 'BOOKING_IN_TERMINAL_STATE';
        this.httpStatus = 409;
    }
}
exports.TerminalStateTransitionError = TerminalStateTransitionError;
//# sourceMappingURL=tracking-errors.js.map