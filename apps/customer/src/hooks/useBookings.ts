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
    if (!user?.id) {
      setBookings([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await bookingRepository.getBookings(user.id, filter);
      setBookings(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, filter]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  return {
    bookings,
    isLoading,
    error,
    refresh: loadBookings,
  };
}

export function useBookingDetail(bookingId?: string) {
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
  }, [loadDetail]);

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
