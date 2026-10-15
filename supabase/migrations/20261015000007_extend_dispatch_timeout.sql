-- Migration 20261015000007_extend_dispatch_timeout.sql
-- Extends the instant booking dispatch offer timeout from 120 seconds to 300 seconds (5 minutes)
-- so partners have ample time to receive, review, and accept incoming dispatch requests without premature expiration.

CREATE OR REPLACE FUNCTION public.place_instant_order_and_dispatch(
  p_customer_id UUID DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL,
  p_booking_number TEXT DEFAULT NULL,
  p_service_id_or_slug TEXT DEFAULT NULL,
  p_service_name TEXT DEFAULT NULL,
  p_total_amount NUMERIC DEFAULT NULL,
  p_pickup_lat NUMERIC DEFAULT 30.343866,
  p_pickup_lng NUMERIC DEFAULT 77.953231,
  p_address_text TEXT DEFAULT 'Customer Location'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
    SELECT id INTO v_customer_id FROM public.users LIMIT 1;
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
      WHERE (slug ILIKE '%' || p_service_id_or_slug || '%' 
         OR name ILIKE '%' || p_service_id_or_slug || '%')
        AND is_active = TRUE
      LIMIT 1;
    END IF;
  END IF;

  IF v_service_id IS NULL THEN
    SELECT id, name, base_price INTO v_service_id, v_service_name, v_service_price
    FROM public.services
    WHERE is_active = TRUE
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_service_name IS NULL THEN
    v_service_name := 'Instant Professional Service';
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

  -- 4. Upsert booking
  INSERT INTO public.bookings (
    id,
    booking_number,
    customer_id,
    address_id,
    status,
    fulfillment_mode,
    scheduled_start_time,
    subtotal_amount,
    tax_amount,
    discount_amount,
    platform_fee,
    total_amount,
    currency,
    created_at,
    updated_at
  ) VALUES (
    v_booking_id,
    v_booking_number,
    v_customer_id,
    v_address_id,
    'SEARCHING_PARTNER',
    'INSTANT',
    NOW(),
    COALESCE(p_total_amount, v_service_price),
    0,
    0,
    29.00,
    COALESCE(p_total_amount, v_service_price),
    'INR',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE
    SET status = 'SEARCHING_PARTNER',
        fulfillment_mode = 'INSTANT',
        updated_at = NOW();

  -- 5. Insert booking items
  INSERT INTO public.booking_items (
    id, booking_id, service_id, quantity, unit_price, total_price
  ) VALUES (
    gen_random_uuid(),
    v_booking_id,
    v_service_id,
    1,
    COALESCE(p_total_amount, v_service_price),
    COALESCE(p_total_amount, v_service_price)
  ) ON CONFLICT DO NOTHING;

  -- 6. Execute Dispatch Scan Wave with 300 second (5 min) window
  v_dispatch_result := public.scan_and_dispatch_partners(
    p_booking_id => v_booking_id,
    p_service_id => v_service_id,
    p_pickup_lat => p_pickup_lat,
    p_pickup_lng => p_pickup_lng,
    p_initial_radius_km => 8.0,
    p_max_radius_km => 25.0,
    p_max_candidates => 5,
    p_timeout_seconds => 300
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', v_booking_id,
    'booking_number', v_booking_number,
    'service_id', v_service_id,
    'service_name', v_service_name,
    'total_amount', COALESCE(p_total_amount, v_service_price),
    'dispatch', v_dispatch_result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_instant_order_and_dispatch(
  UUID, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT
) TO authenticated, anon, service_role;
