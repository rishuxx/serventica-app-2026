-- ==============================================================================
-- SERVENTICA HYPERLOCAL REALTIME DISPATCH & TRACKING PLATFORM
-- MIGRATION: 20261015000003_customer_booking_and_partner_live_tracking.sql
-- DESCRIPTION:
--   1. get_customer_booking_detail: Authoritative RPC for customer app order tracking,
--      joining booking, professional profile, presence GPS coordinates, and items.
--   2. get_customer_bookings: Authoritative RPC for customer orders tab listings.
--   3. Grant access to authenticated, anon, and service_role.
-- ==============================================================================

-- 1. RPC: get_customer_booking_detail
CREATE OR REPLACE FUNCTION public.get_customer_booking_detail(
  p_booking_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking RECORD;
  v_partner RECORD;
  v_presence RECORD;
  v_address RECORD;
  v_items JSONB;
  v_clean_id TEXT;
  v_clean_num TEXT;
BEGIN
  v_clean_id := TRIM(p_booking_id);
  v_clean_num := UPPER(REPLACE(v_clean_id, '#', ''));

  -- 1. Find booking by UUID or booking_number
  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id::TEXT = v_clean_id
     OR UPPER(booking_number) = v_clean_num
     OR UPPER(booking_number) = 'SRV-' || v_clean_num
     OR UPPER(booking_number) = REPLACE(v_clean_num, 'SRV-', '')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_booking IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2. Partner profile
  IF v_booking.partner_id IS NOT NULL THEN
    SELECT id, full_name, phone, avatar_url, rating, total_jobs
    INTO v_partner
    FROM public.professionals
    WHERE id = v_booking.partner_id;

    -- Partner live coordinates from presence session
    SELECT current_latitude, current_longitude, status, last_heartbeat_at
    INTO v_presence
    FROM public.partner_presence_sessions
    WHERE partner_id = v_booking.partner_id
    ORDER BY COALESCE(last_heartbeat_at, created_at) DESC NULLS LAST
    LIMIT 1;
  END IF;

  -- 3. Address
  IF v_booking.address_id IS NOT NULL THEN
    SELECT *
    INTO v_address
    FROM public.addresses
    WHERE id = v_booking.address_id;
  END IF;

  -- 4. Items
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', bi.id,
        'bookingId', bi.booking_id,
        'serviceId', bi.service_id,
        'serviceName', COALESCE(s.name, 'Home Service'),
        'serviceSlug', s.slug,
        'serviceImageUrl', s.image_url,
        'unitPrice', bi.unit_price,
        'quantity', bi.quantity,
        'totalPrice', bi.total_price
      )
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM public.booking_items bi
  LEFT JOIN public.services s ON bi.service_id = s.id
  WHERE bi.booking_id = v_booking.id;

  RETURN jsonb_build_object(
    'id', v_booking.id,
    'bookingNumber', v_booking.booking_number,
    'customerId', v_booking.customer_id,
    'partnerId', v_booking.partner_id,
    'addressId', v_booking.address_id,
    'status', v_booking.status,
    'cancellationReason', v_booking.cancellation_reason,
    'scheduledDate', TO_CHAR(v_booking.scheduled_start_time, 'YYYY-MM-DD'),
    'scheduledStartTime', TO_CHAR(v_booking.scheduled_start_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'serviceId', (SELECT bi.service_id FROM public.booking_items bi WHERE bi.booking_id = v_booking.id LIMIT 1),
    'serviceName', COALESCE(
      (SELECT s.name FROM public.booking_items bi JOIN public.services s ON bi.service_id = s.id WHERE bi.booking_id = v_booking.id LIMIT 1),
      'Home Service'
    ),
    'partner', CASE
      WHEN v_partner.id IS NOT NULL THEN jsonb_build_object(
        'id', v_partner.id,
        'name', COALESCE(v_partner.full_name, 'Serventica Expert'),
        'phone', v_partner.phone,
        'avatarUrl', v_partner.avatar_url,
        'rating', COALESCE(v_partner.rating, 4.90),
        'totalJobs', COALESCE(v_partner.total_jobs, 0),
        'specialization', 'Certified Servs Specialist',
        'currentLatitude', v_presence.current_latitude,
        'currentLongitude', v_presence.current_longitude
      )
      ELSE NULL
    END,
    'address', CASE
      WHEN v_address.id IS NOT NULL THEN jsonb_build_object(
        'title', COALESCE(v_address.title, 'Service Address'),
        'shortAddress', COALESCE(v_address.city, v_address.title, 'Service Address'),
        'addressLine1', COALESCE(v_address.address_line1, ''),
        'addressLine2', v_address.address_line2,
        'landmark', v_address.landmark,
        'city', COALESCE(v_address.city, ''),
        'state', COALESCE(v_address.state, ''),
        'pincode', COALESCE(v_address.pincode, ''),
        'formattedAddress', COALESCE(v_address.formatted_address, v_address.address_line1, 'Customer Location'),
        'latitude', v_address.latitude,
        'longitude', v_address.longitude
      )
      ELSE NULL
    END,
    'payment', jsonb_build_object(
      'subtotal', v_booking.subtotal_amount,
      'tax', v_booking.tax_amount,
      'discount', v_booking.discount_amount,
      'platformFee', v_booking.platform_fee,
      'total', v_booking.total_amount,
      'currency', COALESCE(v_booking.currency, 'INR'),
      'paymentStatus', CASE WHEN v_booking.status = 'PAYMENT_FAILED' THEN 'FAILED' ELSE 'PAID' END
    ),
    'items', v_items,
    'createdAt', TO_CHAR(v_booking.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'updatedAt', TO_CHAR(v_booking.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_booking_detail(TEXT) TO authenticated, anon, service_role;

-- 2. RPC: get_customer_bookings
CREATE OR REPLACE FUNCTION public.get_customer_bookings(
  p_customer_id UUID,
  p_filter TEXT DEFAULT 'UPCOMING'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bookings JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'bookingNumber', b.booking_number,
        'customerId', b.customer_id,
        'partnerId', b.partner_id,
        'addressId', b.address_id,
        'status', b.status,
        'cancellationReason', b.cancellation_reason,
        'scheduledDate', TO_CHAR(b.scheduled_start_time, 'YYYY-MM-DD'),
        'scheduledStartTime', TO_CHAR(b.scheduled_start_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'serviceId', (SELECT bi.service_id FROM public.booking_items bi WHERE bi.booking_id = b.id LIMIT 1),
        'serviceName', COALESCE(
          (SELECT s.name FROM public.booking_items bi JOIN public.services s ON bi.service_id = s.id WHERE bi.booking_id = b.id LIMIT 1),
          'Home Service'
        ),
        'partner', CASE
          WHEN p.id IS NOT NULL THEN jsonb_build_object(
            'id', p.id,
            'name', COALESCE(p.full_name, 'Serventica Expert'),
            'phone', p.phone,
            'avatarUrl', p.avatar_url,
            'rating', COALESCE(p.rating, 4.90),
            'specialization', 'Certified Servs Specialist',
            'currentLatitude', ps.current_latitude,
            'currentLongitude', ps.current_longitude
          )
          ELSE NULL
        END,
        'address', CASE
          WHEN a.id IS NOT NULL THEN jsonb_build_object(
            'title', COALESCE(a.title, 'Service Address'),
            'shortAddress', COALESCE(a.city, a.title, 'Service Address'),
            'addressLine1', COALESCE(a.address_line1, ''),
            'city', COALESCE(a.city, ''),
            'state', COALESCE(a.state, ''),
            'pincode', COALESCE(a.pincode, ''),
            'formattedAddress', COALESCE(a.formatted_address, a.address_line1, 'Customer Location'),
            'latitude', a.latitude,
            'longitude', a.longitude
          )
          ELSE NULL
        END,
        'payment', jsonb_build_object(
          'subtotal', b.subtotal_amount,
          'tax', b.tax_amount,
          'discount', b.discount_amount,
          'platformFee', b.platform_fee,
          'total', b.total_amount,
          'currency', COALESCE(b.currency, 'INR'),
          'paymentStatus', CASE WHEN b.status = 'PAYMENT_FAILED' THEN 'FAILED' ELSE 'PAID' END
        ),
        'createdAt', TO_CHAR(b.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'updatedAt', TO_CHAR(b.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
      ORDER BY b.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_bookings
  FROM public.bookings b
  LEFT JOIN public.professionals p ON b.partner_id = p.id
  LEFT JOIN LATERAL (
    SELECT current_latitude, current_longitude, status, last_heartbeat_at
    FROM public.partner_presence_sessions
    WHERE partner_id = p.id
    ORDER BY COALESCE(last_heartbeat_at, created_at) DESC NULLS LAST
    LIMIT 1
  ) ps ON TRUE
  LEFT JOIN public.addresses a ON b.address_id = a.id
  WHERE (p_customer_id IS NULL OR b.customer_id = p_customer_id)
    AND (
      (p_filter = 'UPCOMING' AND b.status IN (
        'CONFIRMED', 'SEARCHING_PARTNER', 'PARTNER_ASSIGNED', 'PARTNER_ACCEPTED',
        'PARTNER_EN_ROUTE', 'PARTNER_ARRIVED', 'SERVICE_STARTED'
      ))
      OR (p_filter = 'COMPLETED' AND b.status IN ('SERVICE_COMPLETED', 'CLOSED'))
      OR (p_filter = 'CANCELLED' AND b.status IN (
        'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_PARTNER', 'CANCELLED_BY_SYSTEM', 'PAYMENT_FAILED'
      ))
    );

  RETURN v_bookings;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_bookings(UUID, TEXT) TO authenticated, anon, service_role;
