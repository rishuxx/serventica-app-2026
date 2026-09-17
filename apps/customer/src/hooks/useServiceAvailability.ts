import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DateAvailability,
  TimeSlot,
  AvailabilityResponse,
  ServiceabilityResult,
  BookingReservation,
} from '../../../../packages/types/src';
import { serviceabilityRepository } from '../repositories/serviceability.repository';
import { availabilityService } from '../services/availability.service';

interface UseServiceAvailabilityProps {
  serviceId?: string;
  variantId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  cityId?: string | null;
  enabled?: boolean;
}

export function useServiceAvailability({
  serviceId,
  variantId,
  latitude,
  longitude,
  cityId,
  enabled = true,
}: UseServiceAvailabilityProps) {
  // Serviceability state
  const [serviceability, setServiceability] = useState<ServiceabilityResult | null>(null);
  const [isCheckingServiceability, setIsCheckingServiceability] = useState<boolean>(false);

  // Dates state
  const [dates, setDates] = useState<DateAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isLoadingDates, setIsLoadingDates] = useState<boolean>(false);

  // Slots state
  const [availabilityData, setAvailabilityData] = useState<AvailabilityResponse | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // 1. Resolve Serviceability when location or service changes
  const checkServiceability = useCallback(async () => {
    if (!enabled || !serviceId) return;

    setIsCheckingServiceability(true);
    setError(null);

    try {
      const result = await serviceabilityRepository.resolveServiceability({
        latitude,
        longitude,
        cityId,
        serviceId,
      });

      setServiceability(result);
    } catch (err: any) {
      setError(err.message || 'Failed to verify location serviceability');
    } finally {
      setIsCheckingServiceability(false);
    }
  }, [enabled, serviceId, latitude, longitude, cityId]);

  useEffect(() => {
    checkServiceability();
  }, [checkServiceability]);

  // 2. Fetch Eligible Dates when serviceability is confirmed
  const fetchDates = useCallback(async () => {
    if (!enabled || !serviceId || !serviceability?.serviceable || !serviceability.serviceAreaId) {
      return;
    }

    setIsLoadingDates(true);
    try {
      const dateList = await availabilityService.getBookingDates({
        serviceId,
        variantId,
        serviceAreaId: serviceability.serviceAreaId,
      });

      setDates(dateList);

      // Auto-select first available date if none selected or if old selection is invalid
      const firstAvail = dateList.find((d) => d.isAvailable);
      if (firstAvail && (!selectedDate || !dateList.some((d) => d.date === selectedDate))) {
        setSelectedDate(firstAvail.date);
      }
    } catch (err: any) {
      console.warn('[useServiceAvailability] Error fetching dates:', err);
    } finally {
      setIsLoadingDates(false);
    }
  }, [enabled, serviceId, variantId, serviceability, selectedDate]);

  useEffect(() => {
    fetchDates();
  }, [fetchDates]);

  // 3. Fetch Slots when Date is selected
  const fetchSlots = useCallback(async () => {
    if (!enabled || !serviceId || !serviceability?.serviceAreaId || !selectedDate) {
      return;
    }

    setIsLoadingSlots(true);
    setSelectedSlot(null); // Clear previously selected slot on date change

    try {
      const { rawResponse } = await availabilityService.getSlotsForDate({
        serviceId,
        variantId,
        serviceAreaId: serviceability.serviceAreaId,
        date: selectedDate,
      });

      setAvailabilityData(rawResponse);
    } catch (err: any) {
      console.warn('[useServiceAvailability] Error fetching slots:', err);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [enabled, serviceId, variantId, serviceability, selectedDate]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Grouped slots memo
  const groupedSlots = useMemo(() => {
    if (!availabilityData) {
      return { morning: [], afternoon: [], evening: [] };
    }
    return {
      morning: availabilityData.slots.filter((s) => s.period === 'MORNING'),
      afternoon: availabilityData.slots.filter((s) => s.period === 'AFTERNOON'),
      evening: availabilityData.slots.filter((s) => s.period === 'EVENING'),
    };
  }, [availabilityData]);

  // Reservation action
  const reserveSelectedSlot = useCallback(
    async (userId: string, idempotencyKey: string): Promise<{
      success: boolean;
      reservation?: BookingReservation;
      errorMessage?: string;
    }> => {
      if (!selectedSlot || !serviceId || !serviceability?.serviceAreaId) {
        return { success: false, errorMessage: 'No slot or service area selected' };
      }

      return availabilityService.reserveSlot({
        userId,
        serviceId,
        variantId,
        serviceAreaId: serviceability.serviceAreaId,
        startAt: selectedSlot.startAt,
        endAt: selectedSlot.endAt,
        idempotencyKey,
      });
    },
    [selectedSlot, serviceId, variantId, serviceability]
  );

  return {
    // Serviceability
    isCheckingServiceability,
    isServiceable: Boolean(serviceability?.serviceable),
    serviceability,
    refreshServiceability: checkServiceability,

    // Dates
    dates,
    selectedDate,
    setSelectedDate,
    isLoadingDates,
    refreshDates: fetchDates,

    // Slots
    slots: availabilityData?.slots || [],
    groupedSlots,
    selectedSlot,
    setSelectedSlot,
    isLoadingSlots,
    refreshSlots: fetchSlots,

    // Booking actions & states
    reserveSelectedSlot,
    error,
  };
}
