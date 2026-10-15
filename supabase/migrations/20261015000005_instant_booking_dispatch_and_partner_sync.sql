-- ==============================================================================
-- SERVENTICA — PHASE 8: INSTANT BOOKING DISPATCH & PARTNER SYNC FIXES
-- 1. Ensure created_at on booking_items
-- 2. Enhanced place_instant_order_and_dispatch with 300s window & INSTANT fulfillment mode
-- 3. Enhanced get_customer_bookings to return fulfillmentMode and Instant schedule label
-- 4. Exclude cancelled bookings from get_partner_live_offers
-- ==============================================================================

-- 1. Ensure created_at column on public.booking_items
ALTER TABLE public.booking_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Authoritative place_instant_order_and_dispatch RPC
CREATE OR REPLACE FUNCTION public.place_instant_order_and_dispatch(
  p_customer_id UUID DEFAULT NULL,
  p_service_id_or_slug TEXT DEFAULT NULL,
  p_service_name TEXT DEFAULT NULL,
  p_pickup_lat NUMERIC DEFAULT 30.343866,
  p_pickup_lng NUMERIC DEFAULT 77.953231,
  p_address_text TEXT DEFAULT 'Customer Location, Dehradun',
  p_total_amount NUMERIC DEFAULT 499.00,
  p_payment_method TEXT DEFAULT 'ONLINE',
  p_booking_id UUID DEFAULT NULL,
  p_booking_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id UUID := p_customer_id;
  v_booking_id UUID := COALESCE(p_booking_id, gen_random_uuid());
  v_booking_number TEXT := COALESCE(p_booking_number, 'SRV-' || UPPER(SUBSTRING(v_booking_id::text, 1, 8)));
  v_service_id UUID;
  v_service_name TEXT := p_service_name;
  v_service_price NUMERIC := p_total_amount;
  v_address_id UUID := gen_random_uuid();
  v_dispatch_result JSONB;
BEGIN
  -- 1. Ensure valid customer user ID from public.users
  IF v_customer_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_customer_id) THEN
    SELECT id INTO v_customer_id FROM public.users WHERE phone IS NOT NULL ORDER BY created_at DESC LIMIT 1;
    IF v_customer_id IS NULL THEN
      SELECT id INTO v_customer_id FROM public.users LIMIT 1;
    END IF;
  END IF;

  -- 2. Resolve target service_id
  IF p_service_id_or_slug IS NOT NULL THEN
    BEGIN
      SELECT id, name, base_price INTO v_service_id, v_service_name, v_service_price
      FROM public.services
      WHERE id = p_service_id_or_slug::uuid AND is_active = TRUE;
    EXCEPTION WHEN OTHERS THEN
      v_service_id := NULL;
    END;

    IF v_service_id IS NULL THEN
      SELECT id, name, base_price INTO v_service_id, v_service_name, v_service_price
      FROM public.services
      WHERE (slug = p_service_id_or_slug
         OR slug ILIKE '%' || p_service_id_or_slug || '%' 
         OR name ILIKE '%' || p_service_id_or_slug || '%')
        AND is_active = TRUE
      ORDER BY 
        CASE WHEN slug = p_service_id_or_slug THEN 1 ELSE 2 END,
        created_at DESC
      LIMIT 1;
    END IF;
  END IF;

  -- Fallback to helping-hand or first active service
  IF v_service_id IS NULL THEN
    SELECT id, name, base_price INTO v_service_id, v_service_name, v_service_price
    FROM public.services
    WHERE slug IN ('helping-hand', 'instant-helping-hand', 'ac-general-service')
      AND is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_service_id IS NULL THEN
    SELECT id, name, base_price INTO v_service_id, v_service_name, v_service_price
    FROM public.services
    WHERE is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_service_name IS NULL THEN
    v_service_name := 'Instant Service';
  END IF;

  -- 3. Upsert address
  INSERT INTO public.addresses (
    id, user_id, title, address_line1, city, state, pincode, is_default, latitude, longitude
  ) VALUES (
    v_address_id, v_customer_id, 'Service Location',
    COALESCE(p_address_text, 'Rajpur Road, Clock Tower'),
    'Dehradun', 'Uttarakhand', '248001', TRUE,
    p_pickup_lat, p_pickup_lng
  );

  -- 4. Upsert booking with INSTANT fulfillment mode
  INSERT INTO public.bookings (
    id,
    booking_number,
    customer_id,
    partner_id,
    address_id,
    status,
    scheduled_start_time,
    subtotal_amount,
    tax_amount,
    discount_amount,
    platform_fee,
    total_amount,
    currency,
    fulfillment_mode,
    created_at,
    updated_at
  ) VALUES (
    v_booking_id,
    v_booking_number,
    v_customer_id,
    NULL,
    v_address_id,
    'SEARCHING_PARTNER',
    NOW(),
    v_service_price,
    0.00,
    0.00,
    0.00,
    v_service_price,
    'INR',
    'INSTANT',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    customer_id = EXCLUDED.customer_id,
    status = 'SEARCHING_PARTNER',
    fulfillment_mode = 'INSTANT',
    updated_at = NOW();

  -- 5. Upsert booking item safely
  INSERT INTO public.booking_items (
    id, booking_id, service_id, quantity, unit_price, total_price, created_at
  ) VALUES (
    gen_random_uuid(), v_booking_id, v_service_id, 1, v_service_price, v_service_price, NOW()
  )
  ON CONFLICT DO NOTHING;

  -- 6. Trigger instant dispatch wave to notify nearby online partners (300s window)
  v_dispatch_result := public.create_instant_dispatch_wave(
    p_booking_id := v_booking_id,
    p_service_id := v_service_id,
    p_pickup_lat := p_pickup_lat,
    p_pickup_lng := p_pickup_lng,
    p_max_candidates := 5,
    p_timeout_seconds := 300
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', v_booking_id,
    'booking_number', v_booking_number,
    'customer_id', v_customer_id,
    'service_id', v_service_id,
    'service_name', v_service_name,
    'status', 'SEARCHING_PARTNER',
    'dispatch', v_dispatch_result
  );
END;
$$;

-- 3. Authoritative get_customer_bookings RPC returning fulfillmentMode & Instant schedule label
CREATE OR REPLACE FUNCTION public.get_customer_bookings(
  p_customer_id UUID DEFAULT NULL,
  p_filter TEXT DEFAULT 'UPCOMING'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
        'fulfillmentMode', COALESCE(b.fulfillment_mode, 'SCHEDULED'),
        'cancellationReason', b.cancellation_reason,
        'scheduledDate', TO_CHAR(b.scheduled_start_time, 'YYYY-MM-DD'),
        'scheduledStartTime', CASE 
          WHEN b.fulfillment_mode = 'INSTANT' THEN 'Instant (~9-15 mins)' 
          ELSE TO_CHAR(b.scheduled_start_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') 
        END,
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

-- 4. Exclude cancelled bookings from get_partner_live_offers
CREATE OR REPLACE FUNCTION public.get_partner_live_offers(p_partner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offers JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'dispatch_request_id', o.dispatch_request_id,
        'booking_id', dr.booking_id,
        'partner_id', o.partner_id,
        'wave_number', o.wave_number,
        'status', o.status,
        'estimated_eta_minutes', o.estimated_eta_minutes,
        'straight_line_distance_km', o.straight_line_distance_km,
        'offered_at', o.offered_at,
        'expires_at', o.expires_at,
        'booking', jsonb_build_object(
          'id', b.id,
          'booking_number', b.booking_number,
          'total_amount', b.total_amount,
          'scheduled_start_time', b.scheduled_start_time,
          'status', b.status,
          'customer_name', COALESCE(u.display_name, 'Verified Customer'),
          'service_name', COALESCE(s.name, 'Instant Home Service'),
          'address_snippet', COALESCE(a.formatted_address, a.address_line1, 'Customer Location'),
          'latitude', COALESCE(a.latitude, dr.pickup_latitude),
          'longitude', COALESCE(a.longitude, dr.pickup_longitude)
        )
      ) ORDER BY o.offered_at DESC
    ),
    '[]'::jsonb
  ) INTO v_offers
  FROM public.dispatch_offers o
  JOIN public.dispatch_requests dr ON dr.id = o.dispatch_request_id
  JOIN public.bookings b ON b.id = dr.booking_id
  LEFT JOIN public.services s ON s.id = dr.service_id
  LEFT JOIN public.addresses a ON a.id = b.address_id
  LEFT JOIN public.users u ON u.id = b.customer_id
  WHERE o.partner_id = p_partner_id
    AND o.status = 'OFFERED'
    AND o.expires_at > NOW()
    AND b.status IN ('CONFIRMED', 'SEARCHING_PARTNER');

  RETURN v_offers;
END;
$$;
