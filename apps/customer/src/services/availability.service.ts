import {
  AvailabilityResponse,
  DateAvailability,
  TimeSlot,
  ReserveSlotParams,
  BookingReservation,
} from '../../../../packages/types/src';
import { availabilityRepository } from '../repositories/availability.repository';

export class AvailabilityService {
  /**
   * Loads available dates for the requested service & area within the next 14 days
   */
  async getBookingDates(params: {
    serviceId: string;
    variantId?: string | null;
    serviceAreaId: string;
    windowDays?: number;
  }): Promise<DateAvailability[]> {
    const today = new Date();
    const window = params.windowDays || 14;

    const fromDateStr = this.formatDateISO(today);
    const toDate = new Date(today);
    toDate.setDate(today.getDate() + window);
    const toDateStr = this.formatDateISO(toDate);

    return availabilityRepository.getAvailableDates({
      serviceId: params.serviceId,
      variantId: params.variantId,
      serviceAreaId: params.serviceAreaId,
      fromDate: fromDateStr,
      toDate: toDateStr,
    });
  }

  /**
   * Loads authoritative slots and groups them into periods (Morning, Afternoon, Evening)
   */
  async getSlotsForDate(params: {
    serviceId: string;
    variantId?: string | null;
    serviceAreaId: string;
    date: string; // YYYY-MM-DD
  }): Promise<{
    rawResponse: AvailabilityResponse;
    groupedSlots: {
      morning: TimeSlot[];
      afternoon: TimeSlot[];
      evening: TimeSlot[];
    };
    hasAvailableSlots: boolean;
  }> {
    const rawResponse = await availabilityRepository.getAvailableSlots(params);

    const groupedSlots = {
      morning: rawResponse.slots.filter((s) => s.period === 'MORNING'),
      afternoon: rawResponse.slots.filter((s) => s.period === 'AFTERNOON'),
      evening: rawResponse.slots.filter((s) => s.period === 'EVENING'),
    };

    const hasAvailableSlots = rawResponse.slots.some((s) => s.available && s.remainingCapacity > 0);

    return {
      rawResponse,
      groupedSlots,
      hasAvailableSlots,
    };
  }

  /**
   * Atomically reserves a slot before payment
   */
  async reserveSlot(params: ReserveSlotParams): Promise<{
    success: boolean;
    reservation?: BookingReservation;
    errorReason?: string;
    errorMessage?: string;
  }> {
    return availabilityRepository.reserveSlot(params);
  }

  private formatDateISO(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}

export const availabilityService = new AvailabilityService();
