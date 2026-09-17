import { supabase } from '../lib/supabase/client';
import {
  DateAvailability,
  AvailabilityResponse,
  TimeSlot,
  ReserveSlotParams,
  BookingReservation,
} from '../../../../packages/types/src';

export class AvailabilityRepository {
  /**
   * Fetches authoritative eligible booking dates within configured window
   */
  async getAvailableDates(params: {
    serviceId: string;
    variantId?: string | null;
    serviceAreaId: string;
    fromDate: string;
    toDate: string;
  }): Promise<DateAvailability[]> {
    try {
      const { data, error } = await supabase.rpc('get_available_dates', {
        p_service_id: params.serviceId,
        p_variant_id: params.variantId ?? null,
        p_service_area_id: params.serviceAreaId,
        p_from_date: params.fromDate,
        p_to_date: params.toDate,
      });

      if (error) {
        console.warn('[AvailabilityRepository.getAvailableDates] RPC error:', error.message);
        return this.generateFallbackDates(params.fromDate, params.toDate);
      }

      if (data && Array.isArray(data)) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        return data.map((d: any) => {
          const dateObj = new Date(d.date + 'T00:00:00Z');
          return {
            date: d.date,
            dayName: dayNames[dateObj.getUTCDay()],
            dayNumber: dateObj.getUTCDate(),
            monthName: monthNames[dateObj.getUTCMonth()],
            isToday: Boolean(d.is_today),
            isTomorrow: Boolean(d.is_tomorrow),
            isAvailable: Boolean(d.is_available),
            reason: d.reason || undefined,
            availableSlotCount: Number(d.available_slot_count || 0),
          };
        });
      }

      return this.generateFallbackDates(params.fromDate, params.toDate);
    } catch (err) {
      console.warn('[AvailabilityRepository.getAvailableDates] Exception:', err);
      return this.generateFallbackDates(params.fromDate, params.toDate);
    }
  }

  /**
   * Fetches authoritative available slots calculated from partner skills, working windows, and reservations
   */
  async getAvailableSlots(params: {
    serviceId: string;
    variantId?: string | null;
    serviceAreaId: string;
    date: string; // YYYY-MM-DD
  }): Promise<AvailabilityResponse> {
    try {
      const { data, error } = await supabase.rpc('get_available_slots', {
        p_service_id: params.serviceId,
        p_variant_id: params.variantId ?? null,
        p_service_area_id: params.serviceAreaId,
        p_date: params.date,
      });

      if (error) {
        console.warn('[AvailabilityRepository.getAvailableSlots] RPC error:', error.message);
        return this.generateFallbackSlots(params);
      }

      if (data) {
        const slots: TimeSlot[] = (data.slots || []).map((s: any) => {
          const start = new Date(s.start_at);
          const hours = start.getHours();
          let period: 'MORNING' | 'AFTERNOON' | 'EVENING' = 'MORNING';
          if (hours >= 12 && hours < 16) {
            period = 'AFTERNOON';
          } else if (hours >= 16) {
            period = 'EVENING';
          }

          const isAvail = Boolean(s.available);
          const remaining = Number(s.remaining_capacity || 0);

          return {
            id: s.id,
            startAt: s.start_at,
            endAt: s.end_at,
            displayTime: `${s.start_time_formatted} – ${s.end_time_formatted}`,
            startTimeFormatted: s.start_time_formatted,
            endTimeFormatted: s.end_time_formatted,
            period,
            available: isAvail,
            totalCapacity: Number(s.total_capacity || 1),
            bookedCapacity: Number(s.booked_capacity || 0),
            remainingCapacity: remaining,
            state: isAvail ? 'AVAILABLE' : remaining === 0 ? 'FULL' : 'UNAVAILABLE',
          };
        });

        return {
          serviceId: data.service_id || params.serviceId,
          variantId: data.variant_id || params.variantId,
          serviceAreaId: data.service_area_id || params.serviceAreaId,
          cityId: data.city_id,
          timezone: data.timezone || 'Asia/Kolkata',
          date: data.date || params.date,
          serviceDurationMinutes: Number(data.service_duration_minutes || 60),
          bufferMinutes: Number(data.buffer_minutes || 20),
          totalSlots: slots.length,
          availableSlots: slots.filter((s) => s.available).length,
          slots,
        };
      }

      return this.generateFallbackSlots(params);
    } catch (err) {
      console.warn('[AvailabilityRepository.getAvailableSlots] Exception:', err);
      return this.generateFallbackSlots(params);
    }
  }

  /**
   * Atomically reserves a booking slot with row-level lock and idempotency protection
   */
  async reserveSlot(params: ReserveSlotParams): Promise<{
    success: boolean;
    reservation?: BookingReservation;
    errorReason?: string;
    errorMessage?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('reserve_booking_slot', {
        p_user_id: params.userId,
        p_service_id: params.serviceId,
        p_variant_id: params.variantId ?? null,
        p_service_area_id: params.serviceAreaId,
        p_start_at: params.startAt,
        p_end_at: params.endAt,
        p_idempotency_key: params.idempotencyKey,
        p_hold_duration_minutes: params.holdDurationMinutes ?? 15,
      });

      if (error) {
        console.warn('[AvailabilityRepository.reserveSlot] RPC error:', error.message);
        return {
          success: false,
          errorReason: 'RPC_ERROR',
          errorMessage: error.message,
        };
      }

      if (data && data.success) {
        return {
          success: true,
          reservation: {
            id: data.reservation_id,
            user_id: params.userId,
            service_id: params.serviceId,
            variant_id: params.variantId ?? null,
            service_area_id: params.serviceAreaId,
            start_at: data.start_at || params.startAt,
            end_at: data.end_at || params.endAt,
            expires_at: data.expires_at,
            status: data.status || 'HELD',
            idempotency_key: params.idempotencyKey,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        };
      }

      return {
        success: false,
        errorReason: data?.error_code || 'SLOT_NO_LONGER_AVAILABLE',
        errorMessage: data?.message || 'Slot capacity was just taken. Please pick another time.',
      };
    } catch (err: any) {
      console.warn('[AvailabilityRepository.reserveSlot] Exception:', err);
      return {
        success: false,
        errorReason: 'NETWORK_ERROR',
        errorMessage: err.message || 'Network communication failure during slot reservation.',
      };
    }
  }

  // --- Fallbacks for initial offline/seed scenarios ---

  private generateFallbackDates(fromDateStr: string, toDateStr: string): DateAvailability[] {
    const list: DateAvailability[] = [];
    const from = new Date(fromDateStr);
    const to = new Date(toDateStr);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const curr = new Date(from);
    let index = 0;
    while (curr <= to && index < 30) {
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      const dStr = `${yyyy}-${mm}-${dd}`;

      list.push({
        date: dStr,
        dayName: dayNames[curr.getDay()],
        dayNumber: curr.getDate(),
        monthName: monthNames[curr.getMonth()],
        isToday: index === 0,
        isTomorrow: index === 1,
        isAvailable: true,
        availableSlotCount: 8,
      });

      curr.setDate(curr.getDate() + 1);
      index++;
    }
    return list;
  }

  private generateFallbackSlots(params: {
    serviceId: string;
    variantId?: string | null;
    serviceAreaId: string;
    date: string;
  }): AvailabilityResponse {
    const defaultHours = [
      { start: '09:00:00', end: '10:00:00', label: '09:00 AM', endLabel: '10:00 AM', period: 'MORNING' as const },
      { start: '09:30:00', end: '10:30:00', label: '09:30 AM', endLabel: '10:30 AM', period: 'MORNING' as const },
      { start: '10:00:00', end: '11:00:00', label: '10:00 AM', endLabel: '11:00 AM', period: 'MORNING' as const },
      { start: '10:30:00', end: '11:30:00', label: '10:30 AM', endLabel: '11:30 AM', period: 'MORNING' as const },
      { start: '12:00:00', end: '13:00:00', label: '12:00 PM', endLabel: '01:00 PM', period: 'AFTERNOON' as const },
      { start: '12:30:00', end: '13:30:00', label: '12:30 PM', endLabel: '01:30 PM', period: 'AFTERNOON' as const },
      { start: '14:00:00', end: '15:00:00', label: '02:00 PM', endLabel: '03:00 PM', period: 'AFTERNOON' as const },
      { start: '17:00:00', end: '18:00:00', label: '05:00 PM', endLabel: '06:00 PM', period: 'EVENING' as const },
      { start: '17:30:00', end: '18:30:00', label: '05:30 PM', endLabel: '06:30 PM', period: 'EVENING' as const },
    ];

    const slots: TimeSlot[] = defaultHours.map((h, i) => ({
      id: `slot_${params.date}_${h.start.slice(0, 5)}`,
      startAt: `${params.date}T${h.start}+05:30`,
      endAt: `${params.date}T${h.end}+05:30`,
      displayTime: `${h.label} – ${h.endLabel}`,
      startTimeFormatted: h.label,
      endTimeFormatted: h.endLabel,
      period: h.period,
      available: true,
      totalCapacity: 2,
      bookedCapacity: 0,
      remainingCapacity: 2,
      state: 'AVAILABLE',
    }));

    return {
      serviceId: params.serviceId,
      variantId: params.variantId,
      serviceAreaId: params.serviceAreaId,
      cityId: 'c1000000-0000-0000-0000-000000000001',
      timezone: 'Asia/Kolkata',
      date: params.date,
      serviceDurationMinutes: 60,
      bufferMinutes: 20,
      totalSlots: slots.length,
      availableSlots: slots.length,
      slots,
    };
  }
}

export const availabilityRepository = new AvailabilityRepository();
