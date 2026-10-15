import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { bookingRepository } from '../repositories/booking.repository';
import { liveTrackingService } from '../services/LiveTrackingService';
import { BookingRecord } from '../../../../packages/types/src';

export function useBookings(filter: 'UPCOMING' | 'COMPLETED' | 'CANCELLED' = 'UPCOMING') {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBookings = useCallback(async (showLoading = true) => {
    const effectiveUserId = user?.id || 'guest_user';
    console.log('[useBookings] loadBookings called for userId:', effectiveUserId, 'filter:', filter);
    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await bookingRepository.getBookings(effectiveUserId, filter);
      console.log('[useBookings] returned bookings count:', data.length);
      setBookings(data);
    } catch (err: any) {
      console.error('[useBookings] error loading bookings:', err);
      setError(err.message || 'Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, filter]);

  useEffect(() => {
    loadBookings(true);
    
    // 1. Local event listener (intra-app)
    const unsubscribeLocal = bookingRepository.subscribe(() => {
      loadBookings(false);
    });

    // 2. Supabase Realtime database listener (inter-device / multi-device instant sync)
    const unsubscribeRealtime = user?.id
      ? bookingRepository.subscribeToUserBookings(user.id, () => {
          loadBookings(false);
        })
      : () => {};

    return () => {
      unsubscribeLocal();
      unsubscribeRealtime();
    };
  }, [loadBookings, user?.id]);

  return {
    bookings,
    isLoading,
    error,
    refresh: () => loadBookings(true),
  };
}

export function useBookingDetail(bookingId?: string) {
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadDetail = useCallback(async (isInitial = false) => {
    if (!bookingId) {
      setBooking(null);
      setIsLoading(false);
      return;
    }

    if (isInitial) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await bookingRepository.getBookingDetail(bookingId);
      if (data) {
        setBooking(data);
      } else {
        setError('Booking not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load booking details');
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadDetail(true);

    // 1. Direct realtime subscription for this booking
    const unsubscribeDirect = bookingId
      ? bookingRepository.subscribeToBooking(bookingId, () => {
          loadDetail(false);
        })
      : () => {};

    // 2. Local subscription
    const unsubscribeLocal = bookingRepository.subscribe(() => {
      loadDetail(false);
    });

    // 3. User bookings realtime channel
    const unsubscribeRealtime = user?.id
      ? bookingRepository.subscribeToUserBookings(user.id, () => {
          loadDetail(false);
        })
      : () => {};

    // 4. Live Broadcast tracking room subscription (Subscribes to immediate partner acceptance, en-route, arrived, cancel, completion)
    const unsubscribeBroadcast = bookingId
      ? liveTrackingService.subscribeToBookingTracking(
          bookingId,
          () => {},
          () => {
            loadDetail(false);
          }
        )
      : () => {};

    // 5. Background poll every 3 seconds as a safety net
    const pollInterval = setInterval(() => {
      loadDetail(false);
    }, 3000);

    return () => {
      unsubscribeDirect();
      unsubscribeLocal();
      unsubscribeRealtime();
      unsubscribeBroadcast();
      clearInterval(pollInterval);
    };
  }, [loadDetail, user?.id, bookingId]);

  const cancel = async (reason: string) => {
    if (!bookingId) return { success: false, error: 'No booking selected' };
    setIsCancelling(true);
    try {
      const res = await bookingRepository.cancelBooking(bookingId, reason);
      if (res.success) {
        await loadDetail();
      }
      return res;
    } finally {
      setIsCancelling(false);
    }
  };

  return {
    booking,
    isLoading,
    error,
    isCancelling,
    cancel,
    refresh: loadDetail,
  };
}
