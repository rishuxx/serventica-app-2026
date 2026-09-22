-- ==============================================================================
-- SERVENTICA — FIX: RLS POLICIES FOR REALTIME BOOKING MULTI-DEVICE SYNCHRONIZATION
-- Allows authenticated customers to INSERT, UPDATE, and DELETE their own bookings
-- and booking items, ensuring seamless cross-device order placement and synchronization.
-- ==============================================================================

-- 1. BOOKINGS POLICIES
DROP POLICY IF EXISTS "Customers can insert own bookings" ON public.bookings;
CREATE POLICY "Customers can insert own bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can update own bookings" ON public.bookings;
CREATE POLICY "Customers can update own bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can delete own bookings" ON public.bookings;
CREATE POLICY "Customers can delete own bookings" ON public.bookings
  FOR DELETE USING (auth.uid() = customer_id);

-- 2. BOOKING ITEMS POLICIES
DROP POLICY IF EXISTS "Customers can insert own booking items" ON public.booking_items;
CREATE POLICY "Customers can insert own booking items" ON public.booking_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_items.booking_id
      AND bookings.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Customers can update own booking items" ON public.booking_items;
CREATE POLICY "Customers can update own booking items" ON public.booking_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_items.booking_id
      AND bookings.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Customers can delete own booking items" ON public.booking_items;
CREATE POLICY "Customers can delete own booking items" ON public.booking_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_items.booking_id
      AND bookings.customer_id = auth.uid()
    )
  );

-- 3. ENABLE REALTIME PUBLICATION ON BOOKINGS & BOOKING_ITEMS TABLES
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_items;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;
