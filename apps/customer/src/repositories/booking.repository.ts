import { SafeAsyncStorage as AsyncStorage } from '../../../../packages/utils/src/storage/safe-storage';
import { supabase } from '../lib/supabase/client';
import { BookingRecord, BookingStatus } from '../../../../packages/types/src';
import { isUuid, ensureUuid } from '../lib/uuid.utils';

const LOCAL_BOOKINGS_STORAGE_KEY = '@serventica_customer_bookings_v1';

type BookingChangeListener = () => void;

class BookingRepository {
  private listeners: Set<BookingChangeListener> = new Set();
  private realtimeCallbacks: Set<() => void> = new Set();
  private activeChannel: any = null;
  private currentSubscribedUserId: string | null = null;
  private deviceId: string = `bdev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  /**
   * Subscribe to local booking changes (created, updated, cancelled)
   */
  subscribe(listener: BookingChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.warn('[BookingRepository] Listener notification error:', e);
      }
    });

    this.realtimeCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.warn('[BookingRepository] Realtime callback notification error:', e);
      }
    });
  }

  /**
   * Broadcast booking events directly across all logged-in devices via Realtime WebSockets
   */
  private broadcastBookingUpdate(userId: string, booking?: BookingRecord) {
    if (!userId || userId === 'guest_user') return;
    try {
      const channelName = `realtime_bookings_v2_${userId}`;
      const channel = this.activeChannel || supabase.channel(channelName);
      channel.send({
        type: 'broadcast',
        event: 'BOOKING_SYNC',
        payload: {
          booking,
          userId,
          deviceOrigin: this.deviceId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (e) {
      console.warn('[BookingRepository] broadcast error:', e);
    }
  }

  /**
   * Subscribe to Supabase Realtime changes for the authenticated customer.
   * Uses both WebSocket Broadcast (for 100% instant peer-to-peer sync) and
   * Postgres Changes (for authoritative database sync).
   * Multiple UI components (BookingsScreen, UpcomingBookingCard, BookingDetailScreen)
   * can register callbacks simultaneously on the shared user channel.
   */
  subscribeToUserBookings(userId: string, callback?: () => void): () => void {
    if (!userId || userId === 'guest_user') {
      return () => {};
    }

    if (callback) {
      this.realtimeCallbacks.add(callback);
    }

    // If channel already active for this user, return unregister function for this callback
    if (this.currentSubscribedUserId === userId && this.activeChannel) {
      return () => {
        if (callback) {
          this.realtimeCallbacks.delete(callback);
        }
      };
    }

    if (this.activeChannel) {
      supabase.removeChannel(this.activeChannel);
      this.activeChannel = null;
    }

    this.currentSubscribedUserId = userId;
    const channelName = `realtime_bookings_v2_${userId}`;

    this.activeChannel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false, ack: true },
      },
    });

    this.activeChannel
      // 1. Direct WebSocket broadcast sync across multiple devices
      .on('broadcast', { event: 'BOOKING_SYNC' }, async (eventPayload: any) => {
        const payload = eventPayload?.payload;
        if (payload?.action === 'CLEAR_ALL' && payload.deviceOrigin !== this.deviceId) {
          try {
            await AsyncStorage.removeItem(LOCAL_BOOKINGS_STORAGE_KEY);
          } catch (e) {}
        } else if (payload?.booking && payload.deviceOrigin !== this.deviceId) {
          try {
            // Save incoming booking from other device to local storage immediately
            const raw = await AsyncStorage.getItem(LOCAL_BOOKINGS_STORAGE_KEY);
            let list: BookingRecord[] = raw ? JSON.parse(raw) : [];
            const idx = list.findIndex(
              (b) => b.id === payload.booking.id || (b.bookingNumber && b.bookingNumber === payload.booking.bookingNumber)
            );
            if (idx >= 0) {
              list[idx] = { ...list[idx], ...payload.booking, updatedAt: new Date().toISOString() };
            } else {
              list.unshift(payload.booking);
            }
            await AsyncStorage.setItem(LOCAL_BOOKINGS_STORAGE_KEY, JSON.stringify(list));
          } catch (storageErr) {}
        }
        this.notifyListeners();
      })
      // 2. Direct Postgres database changes sync
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `customer_id=eq.${userId}`,
        },
        async (changePayload: any) => {
          // If a new or updated record comes in from Postgres, refresh local cache
          if (changePayload?.new) {
            try {
              const mapped = this.mapDbBookingToModel(changePayload.new);
              const raw = await AsyncStorage.getItem(LOCAL_BOOKINGS_STORAGE_KEY);
              let list: BookingRecord[] = raw ? JSON.parse(raw) : [];
              const idx = list.findIndex(
                (b) => b.id === mapped.id || (b.bookingNumber && b.bookingNumber === mapped.bookingNumber)
              );
              if (idx >= 0) {
                list[idx] = { ...list[idx], ...mapped, updatedAt: new Date().toISOString() };
              } else {
                list.unshift(mapped);
              }
              await AsyncStorage.setItem(LOCAL_BOOKINGS_STORAGE_KEY, JSON.stringify(list));
            } catch (e) {}
          }
          this.notifyListeners();
        }
      )
      .subscribe();

    return () => {
      if (callback) {
        this.realtimeCallbacks.delete(callback);
      }
      // Only tear down channel if all subscribers have unmounted
      if (this.realtimeCallbacks.size === 0 && this.listeners.size === 0) {
        if (this.activeChannel) {
          supabase.removeChannel(this.activeChannel);
          this.activeChannel = null;
        }
        this.currentSubscribedUserId = null;
      }
    };
  }

  /**
   * Save a booking record to local storage and sync with Supabase and all logged-in devices
   */
  async saveBooking(booking: BookingRecord): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_BOOKINGS_STORAGE_KEY);
      const list: BookingRecord[] = raw ? JSON.parse(raw) : [];
      const index = list.findIndex(
        (b) => b.id === booking.id || (b.bookingNumber && b.bookingNumber === booking.bookingNumber)
      );

      if (index >= 0) {
        list[index] = { ...list[index], ...booking, updatedAt: new Date().toISOString() };
      } else {
        list.unshift(booking);
      }

      await AsyncStorage.setItem(LOCAL_BOOKINGS_STORAGE_KEY, JSON.stringify(list));
      this.notifyListeners();

      // 1. Broadcast immediately to any other active device logged into the same account
      if (booking.customerId && booking.customerId !== 'guest_user') {
        this.broadcastBookingUpdate(booking.customerId, booking);
      }
    } catch (e) {
      console.warn('[BookingRepository] saveBooking local write error:', e);
    }

    // 2. Remote sync to Supabase if valid UUID customer
    try {
      const customerIsUuid = isUuid(booking.customerId);
      if (customerIsUuid && booking.customerId) {
        // Ensure booking.id is a valid UUID
        const safeBookingId = ensureUuid(booking.id);

        // Ensure valid ISO timestamp for scheduled_start_time
        let startIso = booking.scheduledStartTime;
        if (!startIso || !startIso.includes('T')) {
          startIso = new Date().toISOString();
        }

        // Ensure address exists in public.addresses for foreign key constraint
        let effectiveAddressId = booking.addressId;
        if (!isUuid(effectiveAddressId)) {
          effectiveAddressId = ensureUuid();
        }

        // Always upsert the real selected address into public.addresses
        try {
          const addrPayload = {
            id: effectiveAddressId,
            user_id: booking.customerId,
            title: booking.address?.title || booking.address?.shortAddress || 'Service Address',
            address_line1: booking.address?.addressLine1 || booking.address?.formattedAddress || 'Main Service Location',
            address_line2: booking.address?.addressLine2 || null,
            landmark: booking.address?.landmark || null,
            city: booking.address?.city || 'Dehradun',
            state: booking.address?.state || 'Uttarakhand',
            pincode: booking.address?.pincode || '248007',
            formatted_address: booking.address?.formattedAddress || null,
            latitude: booking.address?.latitude || null,
            longitude: booking.address?.longitude || null,
            is_default: true,
            updated_at: new Date().toISOString(),
          };

          const { error: addrError } = await supabase.from('addresses').upsert(addrPayload);
          if (addrError) {
            console.warn('[BookingRepository.saveBooking] Address upsert note:', addrError.message);
          }
        } catch (addrErr) {
          console.warn('[BookingRepository.saveBooking] Address resolution note:', addrErr);
        }

        const partnerUuid = isUuid(booking.partnerId)
          ? booking.partnerId
          : booking.partner?.id && isUuid(booking.partner.id)
          ? booking.partner.id
          : null;

        const { error } = await supabase.from('bookings').upsert({
          id: safeBookingId,
          booking_number: booking.bookingNumber,
          customer_id: booking.customerId,
          partner_id: partnerUuid,
          address_id: effectiveAddressId,
          status: booking.status,
          scheduled_start_time: startIso,
          subtotal_amount: booking.payment?.subtotal || 0,
          total_amount: booking.payment?.total || 0,
          discount_amount: booking.payment?.discount || 0,
          platform_fee: booking.payment?.platformFee || 0,
          tax_amount: booking.payment?.tax || 0,
          currency: booking.payment?.currency || 'INR',
          created_at: booking.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) {
          console.warn('[BookingRepository.saveBooking] Supabase upsert note:', error.message);
        } else if (booking.items && booking.items.length > 0) {
          // Sync booking items
          const itemsPayload = booking.items.map((item) => ({
            id: ensureUuid(item.id),
            booking_id: safeBookingId,
            service_id: isUuid(item.serviceId) ? item.serviceId : 'e1000000-0000-0001-0001-000000000001',
            quantity: item.quantity || 1,
            unit_price: item.unitPrice || 0,
            total_price: item.totalPrice || item.unitPrice || 0,
          }));

          const { error: itemsErr } = await supabase.from('booking_items').upsert(itemsPayload);
          if (itemsErr) {
            console.warn('[BookingRepository.saveBooking] Items upsert note:', itemsErr.message);
          }
        }
      }
    } catch (err) {
      // Ignored for offline resilience
    }
  }

  /**
   * Fetch user bookings filtered by tab: 'UPCOMING' | 'COMPLETED' | 'CANCELLED'
   */
  async getBookings(
    userId?: string,
    filter: 'UPCOMING' | 'COMPLETED' | 'CANCELLED' = 'UPCOMING'
  ): Promise<BookingRecord[]> {
    let localList: BookingRecord[] = [];
    try {
      const raw = await AsyncStorage.getItem(LOCAL_BOOKINGS_STORAGE_KEY);
      if (raw) {
        const parsed: BookingRecord[] = JSON.parse(raw);
        if (filter === 'UPCOMING') {
          localList = parsed.filter(
            (b) => !b.status?.includes('CANCEL') && b.status !== 'SERVICE_COMPLETED' && b.status !== 'CLOSED'
          );
        } else if (filter === 'COMPLETED') {
          localList = parsed.filter((b) => b.status === 'SERVICE_COMPLETED' || b.status === 'CLOSED');
        } else if (filter === 'CANCELLED') {
          localList = parsed.filter((b) => b.status?.includes('CANCEL') || b.status === 'PAYMENT_FAILED');
        }
      }
    } catch (e) {
      console.warn('[BookingRepository] Local read failed:', e);
    }

    if (!userId || userId === 'guest_user') {
      return localList;
    }

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
        const remoteList = data.map((b: any) => this.mapDbBookingToModel(b));
        
        // Remote server is authoritative: update local cache with latest server records
        try {
          const raw = await AsyncStorage.getItem(LOCAL_BOOKINGS_STORAGE_KEY);
          let allStored: BookingRecord[] = raw ? JSON.parse(raw) : [];
          
          for (const remote of remoteList) {
            const idx = allStored.findIndex((b) => b.id === remote.id || b.bookingNumber === remote.bookingNumber);
            if (idx >= 0) {
              allStored[idx] = remote;
            } else {
              allStored.unshift(remote);
            }
          }
          await AsyncStorage.setItem(LOCAL_BOOKINGS_STORAGE_KEY, JSON.stringify(allStored));
        } catch (storageErr) {}

        // Prioritize remote items over local-only fallback items
        const seenIds = new Set<string>();
        const merged: BookingRecord[] = [];

        // Remote first
        for (const item of remoteList) {
          const key = item.id || item.bookingNumber;
          if (key && !seenIds.has(key)) {
            seenIds.add(key);
            merged.push(item);
          }
        }

        // Add any offline/local-only items not yet on server
        for (const item of localList) {
          const key = item.id || item.bookingNumber;
          if (key && !seenIds.has(key)) {
            seenIds.add(key);
            merged.push(item);
          }
        }

        return merged;
      }
    } catch (err) {
      console.warn('[BookingRepository.getBookings] Supabase error:', err);
    }
    return localList;
  }

  /**
   * Fetch single detailed booking by ID or Booking Number
   */
  async getBookingDetail(bookingId: string): Promise<BookingRecord | null> {
    if (!bookingId) {
      return null;
    }

    const cleanId = String(bookingId).trim();
    const cleanIdLower = cleanId.toLowerCase();

    // 1. Read local storage first (instant response)
    try {
      const raw = await AsyncStorage.getItem(LOCAL_BOOKINGS_STORAGE_KEY);
      if (raw) {
        const parsed: BookingRecord[] = JSON.parse(raw);
        if (parsed.length > 0) {
          // Exact or flexible match
          const match = parsed.find((b) => {
            const bId = String(b.id || '').trim().toLowerCase();
            const bNum = String(b.bookingNumber || '').trim().toLowerCase();
            return (
              bId === cleanIdLower ||
              bNum === cleanIdLower ||
              bNum === cleanIdLower.replace('#', '') ||
              cleanIdLower === 'latest' ||
              cleanIdLower === 'active'
            );
          });
          if (match) return match;
        }
      }
    } catch (e) {
      console.warn('[BookingRepository] Local detail read failed:', e);
    }

    // 2. Fetch from Supabase by UUID ID or booking_number
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          addresses(*),
          booking_items(*, services(*)),
          partner:partner_id(id, display_name, avatar_url, phone)
        `);

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
      if (isUuid) {
        query = query.eq('id', cleanId);
      } else {
        query = query.or(`id.eq.${cleanId},booking_number.eq.${cleanId},booking_number.eq.${cleanId.replace('#', '')}`);
      }

      const { data, error } = await query.maybeSingle();

      if (!error && data) {
        const mapped = this.mapDbBookingToModel(data);
        // Cache locally for instant next loads
        await this.saveBooking(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[BookingRepository.getBookingDetail] Error:', err);
    }

    // 3. Fallback: If still not found and local storage has any bookings, return first active
    try {
      const raw = await AsyncStorage.getItem(LOCAL_BOOKINGS_STORAGE_KEY);
      if (raw) {
        const parsed: BookingRecord[] = JSON.parse(raw);
        if (parsed.length > 0) {
          return parsed[0];
        }
      }
    } catch (e) {}

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
      // 1. Read local storage first
      const raw = await AsyncStorage.getItem(LOCAL_BOOKINGS_STORAGE_KEY);
      const list: BookingRecord[] = raw ? JSON.parse(raw) : [];
      const index = list.findIndex(
        (b) => b.id === bookingId || b.bookingNumber === bookingId
      );

      let targetBooking: BookingRecord | null = index >= 0 ? list[index] : null;

      // 2. If not found locally, try fetching from Supabase
      if (!targetBooking) {
        try {
          const { data: remoteData } = await supabase
            .from('bookings')
            .select(`
              *,
              addresses(*),
              booking_items(*, services(*)),
              partner:partner_id(id, display_name, avatar_url, phone)
            `)
            .eq('id', bookingId)
            .maybeSingle();

          if (remoteData) {
            targetBooking = this.mapDbBookingToModel(remoteData);
          }
        } catch (e) {
          // ignore
        }
      }

      if (!targetBooking) {
        return { success: false, error: 'Booking record could not be found.' };
      }

      // 3. Business Rules Validation (Zepto / Blinkit model)
      const disallowedStatuses: BookingStatus[] = [
        'SERVICE_STARTED',
        'SERVICE_COMPLETED',
        'CLOSED',
        'CANCELLED_BY_CUSTOMER',
        'CANCELLED_BY_PARTNER',
      ];

      if (disallowedStatuses.includes(targetBooking.status)) {
        if (targetBooking.status === 'SERVICE_STARTED') {
          return {
            success: false,
            error: 'Servs has already started your service. Please contact customer support.',
          };
        }
        if (targetBooking.status === 'SERVICE_COMPLETED' || targetBooking.status === 'CLOSED') {
          return {
            success: false,
            error: 'This service has already been completed.',
          };
        }
        return {
          success: false,
          error: 'This booking is already cancelled.',
        };
      }

      const isPaidOnline = targetBooking.payment?.paymentStatus === 'PAID';
      const nowIso = new Date().toISOString();

      // 4. Update local record
      const updatedBooking: BookingRecord = {
        ...targetBooking,
        status: 'CANCELLED_BY_CUSTOMER',
        cancellationReason: reason,
        cancelledAt: nowIso,
        refundStatus: isPaidOnline ? 'REFUND_INITIATED' : 'NOT_APPLICABLE',
        updatedAt: nowIso,
      };

      if (index >= 0) {
        list[index] = updatedBooking;
      } else {
        list.unshift(updatedBooking);
      }

      await AsyncStorage.setItem(LOCAL_BOOKINGS_STORAGE_KEY, JSON.stringify(list));

      // 5. Background sync with Supabase (using atomic RPC or direct table update)
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetBooking.id);
        if (isUuid) {
          const { error: rpcError } = await supabase.rpc('cancel_booking_order', {
            p_booking_id: targetBooking.id,
            p_reason: reason,
            p_cancelled_by: 'CUSTOMER',
          });
          if (rpcError) {
            await supabase
              .from('bookings')
              .update({
                status: 'CANCELLED_BY_CUSTOMER',
                cancellation_reason: reason,
                cancelled_at: nowIso,
                refund_status: isPaidOnline ? 'REFUND_INITIATED' : 'NOT_APPLICABLE',
                updated_at: nowIso,
              })
              .eq('id', targetBooking.id);
          }
        } else {
          await supabase
            .from('bookings')
            .update({
              status: 'CANCELLED_BY_CUSTOMER',
              cancellation_reason: reason,
              cancelled_at: nowIso,
              refund_status: isPaidOnline ? 'REFUND_INITIATED' : 'NOT_APPLICABLE',
              updated_at: nowIso,
            })
            .or(`id.eq.${targetBooking.id},booking_number.eq.${targetBooking.bookingNumber}`);
        }
      } catch (syncErr) {
        console.warn('[BookingRepository.cancelBooking] Supabase sync note:', syncErr);
      }

      // 6. Notify active UI listeners across the app & broadcast to other devices
      this.notifyListeners();
      if (updatedBooking.customerId && updatedBooking.customerId !== 'guest_user') {
        this.broadcastBookingUpdate(updatedBooking.customerId, updatedBooking);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to process cancellation' };
    }
  }

  private mapDbBookingToModel(data: any): BookingRecord {
    const primaryItem = data.booking_items?.[0];
    const service = primaryItem?.services;

    const addressSnapshot = data.addresses
      ? {
          title: data.addresses.title || 'Service Address',
          shortAddress:
            data.addresses.short_address ||
            data.addresses.title ||
            data.addresses.address_line1 ||
            data.addresses.city ||
            'Service Address',
          addressLine1: data.addresses.address_line1 || '',
          addressLine2: data.addresses.address_line2 || null,
          landmark: data.addresses.landmark || null,
          city: data.addresses.city || '',
          state: data.addresses.state || '',
          pincode: data.addresses.pincode || '',
          formattedAddress:
            data.addresses.formatted_address ||
            [
              data.addresses.address_line1,
              data.addresses.address_line2,
              data.addresses.landmark,
              data.addresses.city,
              data.addresses.pincode,
            ]
              .filter(Boolean)
              .join(', '),
          latitude: data.addresses.latitude != null ? Number(data.addresses.latitude) : undefined,
          longitude: data.addresses.longitude != null ? Number(data.addresses.longitude) : undefined,
        }
      : {
          title: 'Service Location',
          shortAddress: 'Service Location',
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
      cancellationReason: data.cancellation_reason || undefined,
      cancelledAt: data.cancelled_at || undefined,
      refundStatus: data.refund_status || undefined,
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

  /**
   * Delete all bookings for the customer from both Supabase and Local Storage (Fresh start)
   */
  async clearAllUserBookings(userId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Clear local cache
      await AsyncStorage.removeItem(LOCAL_BOOKINGS_STORAGE_KEY);

      // 2. Clear remote database if valid user
      if (userId && isUuid(userId)) {
        // Delete all bookings where customer_id matches
        const { error } = await supabase.from('bookings').delete().eq('customer_id', userId);
        if (error) {
          console.warn('[BookingRepository.clearAllUserBookings] Remote error:', error.message);
        }
      }

      // 3. Notify all screens & broadcast to other devices
      this.notifyListeners();
      if (userId && userId !== 'guest_user') {
        try {
          if (this.activeChannel) {
            this.activeChannel.send({
              type: 'broadcast',
              event: 'BOOKING_SYNC',
              payload: {
                action: 'CLEAR_ALL',
                userId,
                deviceOrigin: this.deviceId,
                timestamp: new Date().toISOString(),
              },
            });
          }
        } catch (e) {}
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to clear booking history.' };
    }
  }
}

export const bookingRepository = new BookingRepository();
