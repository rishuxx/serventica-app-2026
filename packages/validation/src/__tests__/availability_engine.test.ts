import { AvailabilityEngine } from '../availability_engine';

describe('Phase 5 — Availability Engine & Concurrency Protection', () => {
  const baseDate = new Date('2026-09-18T10:00:00Z');
  const slotStart = new Date('2026-09-18T10:00:00Z');
  const slotEnd = new Date('2026-09-18T11:00:00Z');

  describe('Capacity and Buffer Calculation', () => {
    it('calculates capacity accurately with qualified partners and travel buffers', () => {
      const qualifiedPros = [
        {
          id: 'pro_1',
          workingHours: [{ start: '09:00:00', end: '18:00:00' }],
          timeOff: [],
          existingBookings: [],
        },
        {
          id: 'pro_2',
          workingHours: [{ start: '09:00:00', end: '18:00:00' }],
          timeOff: [],
          existingBookings: [],
        },
      ];

      const res = AvailabilityEngine.calculateSlotCapacity({
        slotStart,
        slotEnd,
        serviceDurationMinutes: 60,
        bufferMinutes: 20,
        qualifiedProfessionals: qualifiedPros,
        activeReservations: [],
      });

      expect(res.available).toBe(true);
      expect(res.totalCapacity).toBe(2);
      expect(res.remainingCapacity).toBe(2);
    });

    it('excludes partner on approved time off from available capacity', () => {
      const qualifiedPros = [
        {
          id: 'pro_1',
          workingHours: [{ start: '09:00:00', end: '18:00:00' }],
          timeOff: [
            {
              start: new Date('2026-09-18T09:30:00Z'),
              end: new Date('2026-09-18T12:00:00Z'),
            },
          ],
          existingBookings: [],
        },
        {
          id: 'pro_2',
          workingHours: [{ start: '09:00:00', end: '18:00:00' }],
          timeOff: [],
          existingBookings: [],
        },
      ];

      const res = AvailabilityEngine.calculateSlotCapacity({
        slotStart,
        slotEnd,
        serviceDurationMinutes: 60,
        bufferMinutes: 20,
        qualifiedProfessionals: qualifiedPros,
        activeReservations: [],
      });

      expect(res.totalCapacity).toBe(1);
      expect(res.remainingCapacity).toBe(1);
    });

    it('excludes partner with overlapping existing booking including travel buffer', () => {
      const qualifiedPros = [
        {
          id: 'pro_1',
          workingHours: [{ start: '09:00:00', end: '18:00:00' }],
          timeOff: [],
          existingBookings: [
            {
              start: new Date('2026-09-18T10:30:00Z'),
              end: new Date('2026-09-18T11:30:00Z'),
            },
          ],
        },
      ];

      const res = AvailabilityEngine.calculateSlotCapacity({
        slotStart,
        slotEnd,
        serviceDurationMinutes: 60,
        bufferMinutes: 20,
        qualifiedProfessionals: qualifiedPros,
        activeReservations: [],
      });

      expect(res.available).toBe(false);
      expect(res.remainingCapacity).toBe(0);
    });
  });

  describe('Concurrency & Race Condition Protection (Section 158 Required Test)', () => {
    it('CAPACITY = 1: Two simultaneous requests -> Exactly 1 succeeds, 1 safely rejected with SLOT_NO_LONGER_AVAILABLE', () => {
      const storage = {
        reservations: new Map(),
        idempotencyIndex: new Map(),
      };

      // Request A
      const reqA = AvailabilityEngine.reserveSlotAtomic(storage, {
        userId: 'user_111',
        serviceId: 'srv_ac_repair',
        serviceAreaId: 'area_prem_nagar',
        slotStart,
        slotEnd,
        idempotencyKey: 'idem_key_userA_1',
        capacity: 1,
      });

      // Request B (Simultaneous attempt on same slot and capacity=1)
      const reqB = AvailabilityEngine.reserveSlotAtomic(storage, {
        userId: 'user_222',
        serviceId: 'srv_ac_repair',
        serviceAreaId: 'area_prem_nagar',
        slotStart,
        slotEnd,
        idempotencyKey: 'idem_key_userB_1',
        capacity: 1,
      });

      expect(reqA.success).toBe(true);
      expect(reqA.reservation).toBeDefined();
      expect(reqA.reservation?.status).toBe('HELD');

      expect(reqB.success).toBe(false);
      expect(reqB.errorReason).toBe('SLOT_NO_LONGER_AVAILABLE');
      expect(reqB.reservation).toBeUndefined();

      // Ensure storage has exactly 1 reservation
      expect(storage.reservations.size).toBe(1);
    });

    it('Idempotency: Same user submitting same idempotency key returns identical reservation without duplicating', () => {
      const storage = {
        reservations: new Map(),
        idempotencyIndex: new Map(),
      };

      const firstAttempt = AvailabilityEngine.reserveSlotAtomic(storage, {
        userId: 'user_111',
        serviceId: 'srv_ac_repair',
        serviceAreaId: 'area_prem_nagar',
        slotStart,
        slotEnd,
        idempotencyKey: 'idem_retry_101',
        capacity: 2,
      });

      const retryAttempt = AvailabilityEngine.reserveSlotAtomic(storage, {
        userId: 'user_111',
        serviceId: 'srv_ac_repair',
        serviceAreaId: 'area_prem_nagar',
        slotStart,
        slotEnd,
        idempotencyKey: 'idem_retry_101',
        capacity: 2,
      });

      expect(firstAttempt.success).toBe(true);
      expect(retryAttempt.success).toBe(true);
      expect(firstAttempt.reservation?.id).toBe(retryAttempt.reservation?.id);
      expect(storage.reservations.size).toBe(1);
    });
  });
});
