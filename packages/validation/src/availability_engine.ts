import {
  AvailabilityResponse,
  TimeSlot,
  DateAvailability,
  ServiceabilityResult,
  BookingReservation,
} from '@serventica/types';

/**
 * Pure domain logic simulator for Phase 5 Authoritative Availability Engine
 * Validates business rules, constraints, buffer calculation, concurrency locks, and idempotency
 */
export class AvailabilityEngine {
  /**
   * Evaluates slot capacity against overlapping active reservations and partner skills
   */
  static calculateSlotCapacity(params: {
    slotStart: Date;
    slotEnd: Date;
    serviceDurationMinutes: number;
    bufferMinutes: number;
    qualifiedProfessionals: {
      id: string;
      workingHours: { start: string; end: string }[];
      timeOff: { start: Date; end: Date }[];
      existingBookings: { start: Date; end: Date }[];
    }[];
    activeReservations: {
      id: string;
      slotStart: Date;
      slotEnd: Date;
      expiresAt: Date;
      status: 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'RELEASED';
    }[];
  }): {
    available: boolean;
    totalCapacity: number;
    bookedCapacity: number;
    remainingCapacity: number;
  } {
    const requiredEndWithBuffer = new Date(
      params.slotStart.getTime() + (params.serviceDurationMinutes + params.bufferMinutes) * 60000
    );

    // 1. Identify professionals who are working and have NO conflicts during this window
    const availablePros = params.qualifiedProfessionals.filter((pro) => {
      // Check time off overlap
      const hasTimeOff = pro.timeOff.some(
        (to) => to.start < requiredEndWithBuffer && to.end > params.slotStart
      );
      if (hasTimeOff) return false;

      // Check existing bookings overlap
      const hasBookingConflict = pro.existingBookings.some(
        (b) => b.start < requiredEndWithBuffer && b.end > params.slotStart
      );
      if (hasBookingConflict) return false;

      return true;
    });

    const totalCapacity = availablePros.length;

    // 2. Count active HELD or CONFIRMED reservations that overlap this slot
    const now = new Date();
    const activeReservationsCount = params.activeReservations.filter((r) => {
      if (r.status === 'EXPIRED' || r.status === 'RELEASED') return false;
      if (r.status === 'HELD' && r.expiresAt < now) return false;
      return r.slotStart < requiredEndWithBuffer && r.slotEnd > params.slotStart;
    }).length;

    const remainingCapacity = Math.max(0, totalCapacity - activeReservationsCount);

    return {
      available: remainingCapacity > 0,
      totalCapacity,
      bookedCapacity: activeReservationsCount,
      remainingCapacity,
    };
  }

  /**
   * Simulates PostgreSQL atomic slot reservation with row lock & idempotency check
   */
  static reserveSlotAtomic(
    storage: {
      reservations: Map<string, BookingReservation>;
      idempotencyIndex: Map<string, string>; // userId:idempotencyKey -> reservationId
    },
    params: {
      userId: string;
      serviceId: string;
      serviceAreaId: string;
      slotStart: Date;
      slotEnd: Date;
      idempotencyKey: string;
      capacity: number;
      holdDurationMinutes?: number;
    }
  ): {
    success: boolean;
    reservation?: BookingReservation;
    errorReason?: string;
  } {
    // 1. Idempotency Check: if identical request is submitted again, return existing reservation
    const idemKey = `${params.userId}:${params.idempotencyKey}`;
    if (storage.idempotencyIndex.has(idemKey)) {
      const existingId = storage.idempotencyIndex.get(idemKey)!;
      const existing = storage.reservations.get(existingId);
      if (existing && existing.status !== 'EXPIRED') {
        return { success: true, reservation: existing };
      }
    }

    // 2. Atomic Capacity Validation
    const now = new Date();
    const currentOverlapping = Array.from(storage.reservations.values()).filter((r) => {
      if (r.service_area_id !== params.serviceAreaId) return false;
      if (r.status === 'EXPIRED' || r.status === 'RELEASED') return false;
      if (new Date(r.expires_at) < now) return false;

      const rStart = new Date(r.start_at);
      const rEnd = new Date(r.end_at);
      return rStart < params.slotEnd && rEnd > params.slotStart;
    });

    if (currentOverlapping.length >= params.capacity) {
      return {
        success: false,
        errorReason: 'SLOT_NO_LONGER_AVAILABLE',
      };
    }

    // 3. Create Reservation
    const holdMins = params.holdDurationMinutes || 15;
    const expiresAt = new Date(now.getTime() + holdMins * 60000).toISOString();
    const reservationId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const reservation: BookingReservation = {
      id: reservationId,
      user_id: params.userId,
      service_id: params.serviceId,
      service_area_id: params.serviceAreaId,
      start_at: params.slotStart.toISOString(),
      end_at: params.slotEnd.toISOString(),
      expires_at: expiresAt,
      status: 'HELD',
      idempotency_key: params.idempotencyKey,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    storage.reservations.set(reservationId, reservation);
    storage.idempotencyIndex.set(idemKey, reservationId);

    return {
      success: true,
      reservation,
    };
  }
}
