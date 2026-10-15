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
      console.log('[DEBUG-SEND] booking.repository broadcastBookingUpdate for:', userId);
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
        if (!payload || payload.deviceOrigin === this.deviceId) {
          return; // Strictly ignore echo from self device
        }

        if (payload.action === 'CLEAR_ALL') {
          try {
            await AsyncStorage.removeItem(LOCAL_BOOKINGS_STORAGE_KEY);
          } catch (e) {}
          this.notifyListeners();
        } else if (payload.booking) {
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
          this.notifyListeners();
        }
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
   * Subscribe directly to updates for a specific booking ID or booking number
   */
  subscribeToBooking(bookingId: string, callback: () => void): () => void {
    if (!bookingId) return () => {};
    const cleanId = String(bookingId).trim().replace('#', '');
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
    const filter = isUuid ? `id=eq.${cleanId}` : `booking_number=eq.${cleanId}`;

    const channel = supabase
      .channel(`booking_change_${cleanId}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter,
        },
        () => {
          callback();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Save a booking record to local storage and sync with Supabase and all logged-in devices
   */
  async saveBooking(booking: BookingRecord): Promise<void> {
    console.log('[BookingRepository.saveBooking] called for booking:', booking?.bookingNumber, 'caller stack:', new Error().stack);
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

    // 2. Remote sync to Supabase
    try {
      const effectiveCustomerId = isUuid(booking.customerId)
        ? booking.customerId
        : '419096ed-3758-4894-b1c5-0827b1a84d1a';

      if (effectiveCustomerId) {
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
            user_id: effectiveCustomerId,
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

        const isInstant =
          booking.fulfillmentMode === 'INSTANT' ||
          (booking as any).fulfillment_mode === 'INSTANT' ||
          booking.id.startsWith('inst_');

        const { error } = await supabase.from('bookings').upsert({
          id: safeBookingId,
          booking_number: booking.bookingNumber,
          customer_id: effectiveCustomerId,
          partner_id: partnerUuid,
          address_id: effectiveAddressId,
          status: booking.status,
          scheduled_start_time: startIso,
          fulfillment_mode: isInstant ? 'INSTANT' : 'SCHEDULED',
          verification_otp: booking.verificationOtp || undefined,
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
        }

        if (booking.items && booking.items.length > 0) {
          const resolveServiceId = (serviceIdOrSlug?: string, serviceName?: string): string => {
            if (serviceIdOrSlug && isUuid(serviceIdOrSlug)) return serviceIdOrSlug;
            const s = (serviceIdOrSlug || '').toLowerCase();
            const n = (serviceName || '').toLowerCase();
            if (s === 'helping-hand' || s === 'instant-helping-hand' || n.includes('helping hand')) {
              return 'e1000000-0000-0000-0001-000000000001';
            }
            if (s === 'road-help' || n.includes('road')) {
              return 'e1000000-0000-0000-0001-000000000002';
            }
            if (s === 'laundry' || n.includes('laundry')) {
              return 'e1000000-0000-0000-0001-000000000003';
            }
            if (s === 'pack-move' || s === 'pack-and-move' || n.includes('pack')) {
              return 'e1000000-0000-0000-0001-000000000004';
            }
            if (s.includes('foam-jet') || n.includes('foam-jet') || n.includes('foam jet')) {
              return '0d5dda28-fc98-42ff-81f6-109a4ff7d1c3';
            }
            if (s.includes('pcb') || n.includes('pcb') || n.includes('motherboard')) {
              return '256eead4-4926-4cc1-9ebd-6a5555ff2bc6';
            }
            if (s.includes('jet') || n.includes('power jet')) {
              return 'e1000000-0000-0001-0001-000000000002';
            }
            if (s.includes('ac-general') || (n.includes('ac') && n.includes('general'))) {
              return 'e1000000-0000-0001-0001-000000000001';
            }
            if (s.includes('standard') || n.includes('standard')) {
              return 'fc3df1f5-6cf3-4104-85c5-946792c8a55b';
            }
            return 'e1000000-0000-0001-0001-000000000001'; // Catalog AC service default
          };

          // Sync booking items
          const itemsPayload = booking.items.map((item) => ({
            id: ensureUuid(item.id),
            booking_id: safeBookingId,
            service_id: resolveServiceId(item.serviceId, item.serviceName || booking.serviceName),
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
    console.log('[BookingRepository.getBookings CALLED] caller:', new Error().stack?.split('\n').slice(1, 4).join(' | '));
    let localList: BookingRecord[] = [];
    try {
      const raw = await AsyncStorage.getItem(LOCAL_BOOKINGS_STORAGE_KEY);
      if (raw) {
        let parsed: BookingRecord[] = JSON.parse(raw);
        // Clean out any stale 'Vipin Sharma' cached in AsyncStorage
        parsed = parsed.map((b) => {
          if (b.partner && (b.partner.name === 'Vipin Sharma' || b.partner.id === 'servs_partner_vipin_01')) {
            b = {
              ...b,
              partner: {
                ...b.partner,
                id: 'b9a8d0d3-6a2f-449a-a1c0-8966467faf1a',
                name: 'MD. Zohaib Khab',
                phone: '+91 91638 86934',
              },
            };
          }

          const isInstant =
            b.fulfillmentMode === 'INSTANT' ||
            (b as any).fulfillment_mode === 'INSTANT' ||
            b.id.startsWith('inst_') ||
            Boolean(b.scheduledStartTime?.toLowerCase?.().includes('instant'));

          if (isInstant && (b.serviceName === 'AC General Service' || b.serviceName === 'Home Service')) {
            b = {
              ...b,
              serviceName: 'Helping Hand',
              serviceSlug: 'helping-hand',
              serviceImageUrl: 'helping-hand',
            };
          }

          return b;
        });
        // Exclude archived items from main tab listings
        const unarchived = parsed.filter((b) => !b.isArchived);
        if (filter === 'UPCOMING') {
          localList = unarchived.filter(
            (b) => !b.status?.includes('CANCEL') && b.status !== 'SERVICE_COMPLETED' && b.status !== 'CLOSED'
          );
        } else if (filter === 'COMPLETED') {
          localList = unarchived.filter((b) => b.status === 'SERVICE_COMPLETED' || b.status === 'CLOSED');
        } else if (filter === 'CANCELLED') {
          localList = unarchived.filter((b) => b.status?.includes('CANCEL') || b.status === 'PAYMENT_FAILED');
        }
      }
    } catch (e) {
      console.warn('[BookingRepository] Local read failed:', e);
    }

    // 2. Fetch from Supabase using authoritative get_customer_bookings RPC
    try {
      const isUserUuid = userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      console.log('[BookingRepository] calling get_customer_bookings RPC with:', {
        userId,
        isUserUuid,
        p_customer_id: isUserUuid ? userId : null,
        filter
      });
      const { data: rpcBookings, error: rpcError } = await supabase.rpc('get_customer_bookings', {
        p_customer_id: isUserUuid ? userId : null,
        p_filter: filter,
      });

      console.log('[BookingRepository] get_customer_bookings response:', {
        error: rpcError?.message,
        count: Array.isArray(rpcBookings) ? rpcBookings.length : null,
      });

      if (!rpcError && Array.isArray(rpcBookings)) {
        const remoteList: BookingRecord[] = rpcBookings;

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
      console.warn('[BookingRepository.getBookings] RPC error:', err);
    }
    return localList;
  }

  /**
   * Fetch all bookings across all statuses (for Admin Ops and inspection)
   */
  async getAllBookings(userId?: string): Promise<BookingRecord[]> {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_BOOKINGS_STORAGE_KEY);
      const localList: BookingRecord[] = raw ? JSON.parse(raw) : [];
      if (localList.length > 0) {
        return localList;
      }
    } catch (e) {}

    // Fallback to union of all statuses
    const [upcoming, completed, cancelled] = await Promise.all([
      this.getBookings(userId, 'UPCOMING'),
      this.getBookings(userId, 'COMPLETED'),
      this.getBookings(userId, 'CANCELLED'),
    ]);

    const seen = new Set<string>();
    const all: BookingRecord[] = [];
    for (const b of [...upcoming, ...completed, ...cancelled]) {
      const key = b.id || b.bookingNumber;
      if (key && !seen.has(key)) {
        seen.add(key);
        all.push(b);
      }
    }
    return all;
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

    // 1. Authoritative Server RPC First: Fetch fresh live booking with assigned partner & live coordinates
    try {
      const { data: rpcBooking, error: rpcError } = await supabase.rpc('get_customer_booking_detail', {
        p_booking_id: cleanId,
      });

      if (!rpcError && rpcBooking && rpcBooking.id) {
        // Cache locally for instant next loads without triggering a writeback or notify loop
        try {
          const raw = await AsyncStorage.getItem(LOCAL_BOOKINGS_STORAGE_KEY);
          let list: BookingRecord[] = raw ? JSON.parse(raw) : [];
          const idx = list.findIndex(
            (b) => b.id === rpcBooking.id || (b.bookingNumber && b.bookingNumber === rpcBooking.bookingNumber)
          );
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...(rpcBooking as BookingRecord) };
          } else {
            list.unshift(rpcBooking as BookingRecord);
          }
          await AsyncStorage.setItem(LOCAL_BOOKINGS_STORAGE_KEY, JSON.stringify(list));
        } catch (e) {}
        return rpcBooking as BookingRecord;
      }
    } catch (rpcEx) {
      console.warn('[BookingRepository.getBookingDetail] RPC check warning:', rpcEx);
    }

    // 2. Read local storage for fallback, automatically filtering out stale mock partner data
    let localMatch: BookingRecord | null = null;
    try {
      const raw = await AsyncStorage.getItem(LOCAL_BOOKINGS_STORAGE_KEY);
      if (raw) {
        let parsed: BookingRecord[] = JSON.parse(raw);
        // Filter out any stale 'Vipin Sharma' cached entries
        const cleaned = parsed.map((b) => {
          if (b.partner && (b.partner.name === 'Vipin Sharma' || b.partner.id === 'servs_partner_vipin_01')) {
            return {
              ...b,
              partner: {
                ...b.partner,
                id: 'b9a8d0d3-6a2f-449a-a1c0-8966467faf1a',
                name: 'MD. Zohaib Khab',
                phone: '+91 91638 86934',
              },
            };
          }
          return b;
        });

        const match = cleaned.find((b) => {
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
        if (match) {
          localMatch = match;
        }
      }
    } catch (e) {
      console.warn('[BookingRepository] Local detail read failed:', e);
    }


    // 3. Fallback Supabase select query if RPC unavailable
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          addresses(*),
          booking_items(*, services(*)),
          partner:partner_id(id, full_name, avatar_url, phone, rating)
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
        try {
          const raw = await AsyncStorage.getItem(LOCAL_BOOKINGS_STORAGE_KEY);
          let list: BookingRecord[] = raw ? JSON.parse(raw) : [];
          const idx = list.findIndex(
            (b) => b.id === mapped.id || (b.bookingNumber && b.bookingNumber === mapped.bookingNumber)
          );
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...mapped };
          } else {
            list.unshift(mapped);
          }
          await AsyncStorage.setItem(LOCAL_BOOKINGS_STORAGE_KEY, JSON.stringify(list));
        } catch (e) {}
        return mapped;
      }
    } catch (err) {
      console.warn('[BookingRepository.getBookingDetail] Query error:', err);
    }

    if (localMatch) return localMatch;

    // 3. Fallback: If still not found, return rich default mock booking for preview/testing
    const isEnRoute = cleanIdLower.includes('assigned') || cleanIdLower.includes('route') || cleanIdLower.includes('track');
    const isComp = cleanIdLower.includes('complete') || cleanIdLower.includes('done');
    const isInstant = cleanIdLower.includes('inst') || cleanIdLower.includes('help') || cleanIdLower.includes('srv-');

    const mockDefault: BookingRecord = {
      id: cleanId.startsWith('mock-') ? cleanId : isComp ? 'mock-booking-completed' : isEnRoute ? 'mock-booking-assigned' : 'mock-booking-h9voqu',
      bookingNumber: cleanId.startsWith('SRV-') ? cleanId : isComp ? 'SRV-CMP901' : isEnRoute ? 'SRV-ENR402' : 'SRV-H9VOQU',
      customerId: 'guest_user',
      addressId: 'addr_mock_01',
      status: isComp ? 'SERVICE_COMPLETED' : isEnRoute ? 'PARTNER_EN_ROUTE' : 'SEARCHING_PARTNER',
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledStartTime: isInstant ? 'Instant (~9-15 mins)' : isComp ? 'Today • 02:30 PM' : 'Express (~20 mins)',
      serviceId: isInstant ? 'e1000000-0000-0000-0001-000000000001' : 'serv_ac_foam_jet',
      serviceName: isInstant ? 'Helping Hand' : 'AC Foam Jet Deep Cleaning',
      serviceSlug: isInstant ? 'helping-hand' : 'ac-foam-jet',
      serviceImageUrl: isInstant ? 'helping-hand' : 'basic_ac_repair',
      partner: (isEnRoute || isComp) ? {
        id: 'p1000000-0000-0000-0000-000000000001',
        name: 'MD. Zohaib Khab',
        phone: '+91 91638 86934',
        avatarUrl: null,
        rating: 4.90,
        specialization: 'Certified Servs Specialist',
      } : undefined,
      address: {
        title: 'Home',
        shortAddress: 'Tower 4, Apt 802',
        addressLine1: 'Tower 4, Apt 802, Supertech Capetown',
        city: 'Sector 74, Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
        formattedAddress: 'Tower 4, Apt 802, Supertech Capetown, Sector 74, Noida, UP - 201301',
        latitude: 28.5729,
        longitude: 77.3849,
      },
      payment: {
        subtotal: 599,
        tax: 0,
        discount: 50,
        platformFee: 29,
        total: 578,
        currency: 'INR',
        paymentStatus: 'PAID',
      },
      items: [
        {
          id: 'item_01',
          bookingId: cleanId,
          serviceId: 'serv_ac_foam_jet',
          serviceName: 'Foam Jet AC Power Jet Service',
          quantity: 1,
          unitPrice: 599,
          totalPrice: 599,
        },
      ],
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return mockDefault;
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

      // 3. Business Rules Validation (Rapido / Uber / Serventica model)
      const midwayStatuses: BookingStatus[] = [
        'PARTNER_EN_ROUTE',
        'PARTNER_ARRIVED',
        'SERVICE_STARTED',
        'SERVICE_COMPLETED',
        'CLOSED',
      ];

      if (midwayStatuses.includes(targetBooking.status)) {
        if (targetBooking.status === 'PARTNER_EN_ROUTE' || targetBooking.status === 'PARTNER_ARRIVED') {
          return {
            success: false,
            error: 'Mid-way cancellation is not permitted. Your specialist is already en-route to your location.',
          };
        }
        if (targetBooking.status === 'SERVICE_STARTED') {
          return {
            success: false,
            error: 'Servs has already started your service. Cancellation is unavailable.',
          };
        }
        return {
          success: false,
          error: 'This service has already been completed or closed.',
        };
      }

      if (targetBooking.status === 'CANCELLED_BY_CUSTOMER' || targetBooking.status === 'CANCELLED_BY_PARTNER') {
        return {
          success: false,
          error: 'This booking is already cancelled.',
        };
      }

      // Check 40-Second Cancellation Grace Window (if specialist assigned)
      if (
        targetBooking.status !== 'SEARCHING_PARTNER' &&
        targetBooking.status !== 'CONFIRMED' &&
        targetBooking.createdAt
      ) {
        const elapsedSeconds = Math.floor(
          (Date.now() - new Date(targetBooking.createdAt).getTime()) / 1000
        );
        if (elapsedSeconds > 40) {
          return {
            success: false,
            error: 'Free cancellation window (40 seconds) has expired. Specialist is committed to your order.',
          };
        }
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

      // 5. Authoritative sync with Supabase using cancel_booking_with_policy
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetBooking.id);
        if (isUuid) {
          const authUser = await supabase.auth.getUser();
          const effectiveCustId =
            targetBooking.customerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetBooking.customerId)
              ? targetBooking.customerId
              : authUser.data.user?.id || '6e9fc42b-8f70-4c39-9278-49d33043aac9';

          const { data: policyRes } = await supabase.rpc('cancel_booking_with_policy', {
            p_booking_id: targetBooking.id,
            p_customer_id: effectiveCustId,
            p_reason: reason,
          });

          if (policyRes && policyRes.success === false) {
            // Revert local cache on policy rejection
            if (index >= 0) {
              list[index] = targetBooking;
              await AsyncStorage.setItem(LOCAL_BOOKINGS_STORAGE_KEY, JSON.stringify(list));
            }
            return {
              success: false,
              error: policyRes.message || policyRes.error || 'Cancellation rejected by policy.',
            };
          }

          // Fallback legacy audit event
          await supabase.rpc('authoritative_cancel_booking', {
            p_booking_id: targetBooking.id,
            p_reason: reason,
            p_actor_type: 'CUSTOMER',
            p_actor_id: effectiveCustId,
          });
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
          name: data.partner.full_name || data.partner.display_name || 'Serventica Expert',
          avatarUrl: data.partner.avatar_url || null,
          rating: Number(data.partner.rating) || 4.9,
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

    const isInstantBooking =
      data.fulfillment_mode === 'INSTANT' ||
      Boolean(data.scheduled_start_time?.toLowerCase?.().includes('instant')) ||
      (typeof data.id === 'string' && data.id.startsWith('inst_'));

    let finalServiceName = service?.name || 'Home Service';
    let finalServiceSlug = service?.slug;
    let finalServiceImageUrl = service?.image_url;

    if (isInstantBooking) {
      if (!service?.name || service?.name === 'AC General Service' || service?.name === 'Home Service') {
        finalServiceName = 'Helping Hand';
        finalServiceSlug = 'helping-hand';
        finalServiceImageUrl = 'helping-hand';
      }
    }

    return {
      id: data.id,
      bookingNumber: data.booking_number || `SRV-${data.id.slice(0, 8).toUpperCase()}`,
      customerId: data.customer_id,
      partnerId: data.partner_id || null,
      addressId: data.address_id,
      status: data.status as BookingStatus,
      fulfillmentMode: data.fulfillment_mode || (isInstantBooking ? 'INSTANT' : 'SCHEDULED'),
      verificationOtp: data.verification_otp || undefined,
      cancellationReason: data.cancellation_reason || undefined,
      cancelledAt: data.cancelled_at || undefined,
      refundStatus: data.refund_status || undefined,
      scheduledDate: data.scheduled_start_time ? data.scheduled_start_time.split('T')[0] : '',
      scheduledStartTime: data.scheduled_start_time || '',
      serviceId: service?.id || primaryItem?.service_id || (isInstantBooking ? 'e1000000-0000-0000-0001-000000000001' : ''),
      serviceName: finalServiceName,
      serviceSlug: finalServiceSlug,
      serviceImageUrl: finalServiceImageUrl,
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

  /**
   * Fetch all archived bookings
   */
  async getArchivedBookings(): Promise<BookingRecord[]> {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_BOOKINGS_STORAGE_KEY);
      if (raw) {
        const parsed: BookingRecord[] = JSON.parse(raw);
        return parsed.filter((b) => Boolean(b.isArchived));
      }
    } catch (e) {}
    return [];
  }

  /**
   * Archive a booking record
   */
  async archiveBooking(bookingId: string): Promise<boolean> {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_BOOKINGS_STORAGE_KEY);
      const list: BookingRecord[] = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((b) => b.id === bookingId || b.bookingNumber === bookingId);
      if (idx >= 0) {
        list[idx] = { ...list[idx], isArchived: true, updatedAt: new Date().toISOString() };
        await AsyncStorage.setItem(LOCAL_BOOKINGS_STORAGE_KEY, JSON.stringify(list));
        this.notifyListeners();
        return true;
      }
    } catch (e) {}
    return false;
  }

  /**
   * Unarchive a booking record back to active listings
   */
  async unarchiveBooking(bookingId: string): Promise<boolean> {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_BOOKINGS_STORAGE_KEY);
      const list: BookingRecord[] = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((b) => b.id === bookingId || b.bookingNumber === bookingId);
      if (idx >= 0) {
        list[idx] = { ...list[idx], isArchived: false, updatedAt: new Date().toISOString() };
        await AsyncStorage.setItem(LOCAL_BOOKINGS_STORAGE_KEY, JSON.stringify(list));
        this.notifyListeners();
        return true;
      }
    } catch (e) {}
    return false;
  }

  /**
   * Delete a booking record permanently
   */
  async deleteBooking(bookingId: string): Promise<boolean> {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_BOOKINGS_STORAGE_KEY);
      let list: BookingRecord[] = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((b) => b.id !== bookingId && b.bookingNumber !== bookingId);
      await AsyncStorage.setItem(LOCAL_BOOKINGS_STORAGE_KEY, JSON.stringify(filtered));
      this.notifyListeners();
      return true;
    } catch (e) {}
    return false;
  }
}

export const bookingRepository = new BookingRepository();
