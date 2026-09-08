-- ==============================================================================
-- SERVENTICA DEVELOPMENT SEED DATA
-- Test categories, services, variants, addons, and initial service zone.
-- NOTE: Never seed fake customer identities or fake payments.
-- ==============================================================================

-- 1. SEED SERVICE ZONE
INSERT INTO public.service_zones (id, name, city, state, country, pincodes, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Primary Service Zone',
  'Prayagraj',
  'Uttar Pradesh',
  'IN',
  ARRAY['211001', '211002', '211003', '211004', '211005'],
  TRUE
) ON CONFLICT (id) DO NOTHING;

-- 2. SEED CATEGORIES
INSERT INTO public.categories (id, name, slug, description, sort_order, is_active)
VALUES 
  ('c0000000-0000-0000-0000-000000000001', 'Cleaning & Pest Control', 'cleaning-pest-control', 'Deep home cleaning, bathroom, and kitchen sanitization', 1, TRUE),
  ('c0000000-0000-0000-0000-000000000002', 'AC & Appliance Repair', 'appliance-repair', 'Expert repair & servicing for air conditioners, washing machines, and refrigerators', 2, TRUE),
  ('c0000000-0000-0000-0000-000000000003', 'Electrician, Plumber & Carpenter', 'home-repairs', 'Reliable home repair and maintenance technicians', 3, TRUE),
  ('c0000000-0000-0000-0000-000000000004', 'Gardening & Plant Care', 'gardening-plant-care', 'Lawn mowing, pruning, repotting, and landscape maintenance', 4, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. SEED SERVICES
INSERT INTO public.services (id, category_id, name, slug, description, base_price, duration_minutes, pricing_type, rating, reviews_count, is_active)
VALUES
  (
    's0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'Full Home Deep Cleaning',
    'full-home-deep-cleaning',
    'Complete deep cleaning of living room, bedrooms, bathrooms, and balcony',
    1999.00,
    180,
    'VARIANT',
    4.85,
    124,
    TRUE
  ),
  (
    's0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000002',
    'AC Power Jet Service',
    'ac-power-jet-service',
    'Deep coil and filter cleaning using high-pressure jet wash technology',
    499.00,
    45,
    'FIXED',
    4.92,
    310,
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- 4. SEED VARIANTS
INSERT INTO public.service_variants (id, service_id, name, price, duration_minutes, is_active)
VALUES
  ('v0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', '1 BHK Full Home', 1499.00, 120, TRUE),
  ('v0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000001', '2 BHK Full Home', 1999.00, 180, TRUE),
  ('v0000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000001', '3 BHK Full Home', 2699.00, 240, TRUE)
ON CONFLICT (id) DO NOTHING;
