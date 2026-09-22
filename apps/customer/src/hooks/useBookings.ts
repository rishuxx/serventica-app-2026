import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { bookingRepository } from '../repositories/booking.repository';
import { BookingRecord } from '../../../../packages/types/src';

export function useBookings(filter: 'UPCOMING' | 'COMPLETED' | 'CANCELLED' = 'UPCOMING') {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    const effectiveUserId = user?.id || 'guest_user';
    setIsLoading(true);
    setError(null);
    try {
      const data = await bookingRepository.getBookings(effectiveUserId, filter);
      setBookings(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, filter]);

  useEffect(() => {
    loadBookings();
    
    // 1. Local event listener (intra-app)
    const unsubscribeLocal = bookingRepository.subscribe(() => {
      loadBookings();
    });

    // 2. Supabase Realtime database listener (inter-device / multi-device instant sync)
    const unsubscribeRealtime = user?.id
      ? bookingRepository.subscribeToUserBookings(user.id, () => {
          loadBookings();
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
    refresh: loadBookings,
  };
}

export function useBookingDetail(bookingId?: string) {
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!bookingId) {
      setBooking(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
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
    loadDetail();

    // Local subscription
    const unsubscribeLocal = bookingRepository.subscribe(() => {
      loadDetail();
    });

    // Realtime subscription for multi-device sync
    const unsubscribeRealtime = user?.id
      ? bookingRepository.subscribeToUserBookings(user.id, () => {
          loadDetail();
        })
      : () => {};

    return () => {
      unsubscribeLocal();
      unsubscribeRealtime();
    };
  }, [loadDetail, user?.id]);

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
