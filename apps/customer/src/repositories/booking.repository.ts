import { supabase } from '../lib/supabase/client';
import { BookingRecord, BookingStatus } from '../../../../packages/types/src';

class BookingRepository {
  /**
   * Fetch user bookings filtered by tab: 'UPCOMING' | 'COMPLETED' | 'CANCELLED'
   */
  async getBookings(
    userId: string,
    filter: 'UPCOMING' | 'COMPLETED' | 'CANCELLED' = 'UPCOMING'
  ): Promise<BookingRecord[]> {
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          addresses(*),
          booking_items(*, services(*)),
          partner:partner_id(id, display_name, avatar_url, phone)
        `)
        .eq('customer_id', userId)
        .order('scheduled_start_time', { ascending: filter === 'UPCOMING' });

      if (filter === 'UPCOMING') {
        query = query.in('status', [
          'CONFIRMED',
          'SEARCHING_PARTNER',
          'PARTNER_ASSIGNED',
          'PARTNER_ACCEPTED',
          'PARTNER_EN_ROUTE',
          'PARTNER_ARRIVED',
          'SERVICE_STARTED',
        ]);
      } else if (filter === 'COMPLETED') {
        query = query.in('status', ['SERVICE_COMPLETED', 'CLOSED']);
      } else if (filter === 'CANCELLED') {
        query = query.in('status', [
          'CANCELLED_BY_CUSTOMER',
          'CANCELLED_BY_PARTNER',
          'CANCELLED_BY_SYSTEM',
          'PAYMENT_FAILED',
        ]);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data.map((b: any) => this.mapDbBookingToModel(b));
      }
    } catch (err) {
      console.warn('[BookingRepository.getBookings] Error:', err);
    }
    return [];
  }

  /**
   * Fetch single detailed booking by ID
   */
  async getBookingDetail(bookingId: string): Promise<BookingRecord | null> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          addresses(*),
          booking_items(*, services(*)),
          partner:partner_id(id, display_name, avatar_url, phone)
        `)
        .eq('id', bookingId)
        .maybeSingle();

      if (!error && data) {
        return this.mapDbBookingToModel(data);
      }
    } catch (err) {
      console.warn('[BookingRepository.getBookingDetail] Error:', err);
    }
    return null;
  }

  /**
   * Cancel booking if permitted by business rules & status
   */
  async cancelBooking(
    bookingId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Check current status
      const { data: current, error: fetchErr } = await supabase
        .from('bookings')
        .select('status')
        .eq('id', bookingId)
        .single();

      if (fetchErr || !current) {
        return { success: false, error: 'Booking not found.' };
      }

      const disallowed: BookingStatus[] = [
        'SERVICE_STARTED',
        'SERVICE_COMPLETED',
        'CLOSED',
        'CANCELLED_BY_CUSTOMER',
        'CANCELLED_BY_PARTNER',
      ];

      if (disallowed.includes(current.status as BookingStatus)) {
        return {
          success: false,
          error: `Cannot cancel booking when status is "${current.status}". Please contact support.`,
        };
      }

      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'CANCELLED_BY_CUSTOMER',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to cancel booking' };
    }
  }

  private mapDbBookingToModel(data: any): BookingRecord {
    const primaryItem = data.booking_items?.[0];
    const service = primaryItem?.services;

    const addressSnapshot = data.addresses
      ? {
          title: data.addresses.title || 'Service Address',
          addressLine1: data.addresses.address_line1 || '',
          addressLine2: data.addresses.address_line2 || null,
          landmark: data.addresses.landmark || null,
          city: data.addresses.city || '',
          state: data.addresses.state || '',
          pincode: data.addresses.pincode || '',
          formattedAddress: [
            data.addresses.address_line1,
            data.addresses.address_line2,
            data.addresses.landmark,
            data.addresses.city,
            data.addresses.pincode,
          ]
            .filter(Boolean)
            .join(', '),
        }
      : {
          title: 'Service Location',
          addressLine1: 'Location not specified',
          city: '',
          state: '',
          pincode: '',
          formattedAddress: 'Customer address',
        };

    const partnerSnapshot = data.partner
      ? {
          id: data.partner.id,
          name: data.partner.display_name || 'Serventica Expert',
          avatarUrl: data.partner.avatar_url || null,
          rating: 4.9,
          phone: data.partner.phone,
          specialization: service?.name || 'Home Service Professional',
        }
      : null;

    const paymentSummary = {
      subtotal: Number(data.subtotal_amount) || 0,
      tax: Number(data.tax_amount) || 0,
      discount: Number(data.discount_amount) || 0,
      platformFee: Number(data.platform_fee) || 0,
      total: Number(data.total_amount) || 0,
      currency: data.currency || 'INR',
      paymentStatus: (data.status === 'PAYMENT_FAILED'
        ? 'FAILED'
        : data.status === 'DRAFT' || data.status === 'PENDING_PAYMENT'
        ? 'PENDING'
        : 'PAID') as any,
    };

    const items = (data.booking_items || []).map((item: any) => ({
      id: item.id,
      bookingId: item.booking_id,
      serviceId: item.service_id,
      serviceName: item.services?.name || 'Home Service',
      serviceSlug: item.services?.slug,
      serviceImageUrl: item.services?.image_url,
      unitPrice: Number(item.unit_price) || 0,
      quantity: Number(item.quantity) || 1,
      totalPrice: Number(item.total_price) || 0,
    }));

    return {
      id: data.id,
      bookingNumber: data.booking_number || `SRV-${data.id.slice(0, 8).toUpperCase()}`,
      customerId: data.customer_id,
      partnerId: data.partner_id || null,
      addressId: data.address_id,
      status: data.status as BookingStatus,
      scheduledDate: data.scheduled_start_time ? data.scheduled_start_time.split('T')[0] : '',
      scheduledStartTime: data.scheduled_start_time || '',
      serviceId: service?.id || primaryItem?.service_id || '',
      serviceName: service?.name || 'Home Service',
      serviceSlug: service?.slug,
      serviceImageUrl: service?.image_url,
      address: addressSnapshot,
      partner: partnerSnapshot,
      payment: paymentSummary,
      items,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const bookingRepository = new BookingRepository();
