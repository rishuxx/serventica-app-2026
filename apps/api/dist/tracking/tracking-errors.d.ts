export declare abstract class TrackingDomainError extends Error {
    readonly correlationId?: string;
    readonly isSafeForClient: boolean;
    readonly details?: unknown;
    abstract readonly code: string;
    abstract readonly httpStatus: number;
    readonly timestamp: string;
    constructor(message: string, correlationId?: string, isSafeForClient?: boolean, details?: unknown);
    toSafeClientResponse(): {
        code: string;
        message: string;
        correlationId?: string;
        timestamp: string;
    };
}
export declare class UnauthorizedRoomAccessError extends TrackingDomainError {
    readonly code = "UNAUTHORIZED_ROOM_ACCESS";
    readonly httpStatus = 403;
}
export declare class RateLimitExceededError extends TrackingDomainError {
    readonly code = "RATE_LIMIT_EXCEEDED";
    readonly httpStatus = 429;
}
export declare class InvalidCoordinateError extends TrackingDomainError {
    readonly code = "INVALID_COORDINATES";
    readonly httpStatus = 400;
}
export declare class SpeedJumpDetectedError extends TrackingDomainError {
    readonly code = "IMPOSSIBLE_MOVEMENT_JUMP_DETECTED";
    readonly httpStatus = 422;
}
export declare class StaleGpsReadingError extends TrackingDomainError {
    readonly code = "STALE_GPS_READING";
    readonly httpStatus = 422;
}
export declare class SessionNotFoundError extends TrackingDomainError {
    readonly code = "TRACKING_SESSION_NOT_FOUND";
    readonly httpStatus = 404;
}
export declare class TerminalStateTransitionError extends TrackingDomainError {
    readonly code = "BOOKING_IN_TERMINAL_STATE";
    readonly httpStatus = 409;
}
