/**
 * SERVENTICA — Standardized Tracking Error Taxonomy (Phase 6)
 * Consistent domain error models with correlation IDs and safe client messages.
 */

export abstract class TrackingDomainError extends Error {
  public abstract readonly code: string;
  public abstract readonly httpStatus: number;
  public readonly timestamp: string = new Date().toISOString();

  constructor(
    message: string,
    public readonly correlationId?: string,
    public readonly isSafeForClient: boolean = true,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Sanitized payload for safe client transmission (no stack traces, tokens, or SQL)
   */
  public toSafeClientResponse(): {
    code: string;
    message: string;
    correlationId?: string;
    timestamp: string;
  } {
    return {
      code: this.code,
      message: this.isSafeForClient ? this.message : 'An unexpected tracking error occurred.',
      correlationId: this.correlationId,
      timestamp: this.timestamp,
    };
  }
}

export class UnauthorizedRoomAccessError extends TrackingDomainError {
  public readonly code = 'UNAUTHORIZED_ROOM_ACCESS';
  public readonly httpStatus = 403;
}

export class RateLimitExceededError extends TrackingDomainError {
  public readonly code = 'RATE_LIMIT_EXCEEDED';
  public readonly httpStatus = 429;
}

export class InvalidCoordinateError extends TrackingDomainError {
  public readonly code = 'INVALID_COORDINATES';
  public readonly httpStatus = 400;
}

export class SpeedJumpDetectedError extends TrackingDomainError {
  public readonly code = 'IMPOSSIBLE_MOVEMENT_JUMP_DETECTED';
  public readonly httpStatus = 422;
}

export class StaleGpsReadingError extends TrackingDomainError {
  public readonly code = 'STALE_GPS_READING';
  public readonly httpStatus = 422;
}

export class SessionNotFoundError extends TrackingDomainError {
  public readonly code = 'TRACKING_SESSION_NOT_FOUND';
  public readonly httpStatus = 404;
}

export class TerminalStateTransitionError extends TrackingDomainError {
  public readonly code = 'BOOKING_IN_TERMINAL_STATE';
  public readonly httpStatus = 409;
}
