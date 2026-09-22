-- ==============================================================================
-- SERVENTICA MASTER PRODUCTION CATALOG DATASET & ADMIN-CONTROLLED PRICING
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. SERVICE CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  icon_name TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist on pre-existing service_categories table
ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS icon_name TEXT;
ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_service_categories_slug ON public.service_categories(slug);
CREATE INDEX IF NOT EXISTS idx_service_categories_active_order ON public.service_categories(is_active, sort_order);

-- 2. SERVICE SUBCATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.service_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_subcat_category_slug UNIQUE(category_id, slug)
);

-- Ensure all columns exist on pre-existing service_subcategories table
ALTER TABLE public.service_subcategories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.service_subcategories ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.service_subcategories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_subcat_category_slug'
  ) THEN
    ALTER TABLE public.service_subcategories ADD CONSTRAINT uq_subcat_category_slug UNIQUE(category_id, slug);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_service_subcategories_cat_active ON public.service_subcategories(category_id, is_active, sort_order);

-- 3. SERVICES TABLE
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
  subcategory_id UUID REFERENCES public.service_subcategories(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  thumbnail_url TEXT,
  hero_image_url TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  base_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  pricing_type TEXT NOT NULL DEFAULT 'FIXED',
  rating NUMERIC(3, 2) NOT NULL DEFAULT 4.80,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  is_bookable BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist on pre-existing services table
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.service_subcategories(id) ON DELETE SET NULL;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS hero_image_url TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 60;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS base_price NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS pricing_type TEXT NOT NULL DEFAULT 'FIXED';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) NOT NULL DEFAULT 4.80;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS reviews_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS is_bookable BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_services_cat_active ON public.services(category_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_services_subcat_active ON public.services(subcategory_id, is_active);
CREATE INDEX IF NOT EXISTS idx_services_slug_lookup ON public.services(slug);

-- 4. SERVICE VARIANTS TABLE
CREATE TABLE IF NOT EXISTS public.service_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_variant_service_slug UNIQUE(service_id, slug)
);

-- Ensure all columns exist on pre-existing service_variants table
ALTER TABLE public.service_variants ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.service_variants ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 60;
ALTER TABLE public.service_variants ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.service_variants ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.service_variants ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.service_variants ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.service_variants ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_service_variants_service ON public.service_variants(service_id, is_active, sort_order);

-- 5. CITIES TABLE
CREATE TABLE IF NOT EXISTS public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  country_code TEXT NOT NULL DEFAULT 'IN',
  latitude NUMERIC(10, 6),
  longitude NUMERIC(10, 6),
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist on pre-existing cities table
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'India';
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'IN';
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 6);
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 6);
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata';
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_cities_slug ON public.cities(slug);
CREATE INDEX IF NOT EXISTS idx_cities_active_sort ON public.cities(is_active, sort_order);

-- 6. SERVICE AREAS TABLE
CREATE TABLE IF NOT EXISTS public.service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  postal_code TEXT,
  latitude NUMERIC(10, 6),
  longitude NUMERIC(10, 6),
  radius_km NUMERIC(5, 2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_areas_city ON public.service_areas(city_id, is_active);

-- 7. SERVICE CITY AVAILABILITY TABLE
CREATE TABLE IF NOT EXISTS public.service_city_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  minimum_notice_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_service_city_availability UNIQUE (service_id, city_id)
);

CREATE INDEX IF NOT EXISTS idx_service_city_avail_service ON public.service_city_availability(service_id, city_id);

-- 8. SERVICE PRICES TABLE (Multi-Tier Location-Aware Pricing Engine)
CREATE TABLE IF NOT EXISTS public.service_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.service_variants(id) ON DELETE CASCADE,
  city_id UUID REFERENCES public.cities(id) ON DELETE CASCADE,
  service_area_id UUID REFERENCES public.service_areas(id) ON DELETE CASCADE,
  price_type TEXT NOT NULL DEFAULT 'FIXED' CHECK (price_type IN ('FIXED', 'STARTING_FROM', 'HOURLY', 'INSPECTION', 'UNIT')),
  base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
  labour_price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (labour_price >= 0),
  material_price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (material_price >= 0),
  platform_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  tax_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00 CHECK (tax_rate >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_prices_lookup ON public.service_prices(service_id, city_id, is_active);
CREATE INDEX IF NOT EXISTS idx_service_prices_variant_city ON public.service_prices(service_id, variant_id, city_id, is_active);

-- 5. CATALOG IMPORT AUDIT TABLES
CREATE TABLE IF NOT EXISTS public.catalog_import_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  import_batch_id UUID NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_hash TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.catalog_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id UUID NOT NULL,
  source_row_number INTEGER NOT NULL,
  raw_service TEXT,
  raw_subservice_name TEXT,
  raw_charge TEXT,
  raw_city TEXT,
  normalized_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  mapping_status TEXT NOT NULL DEFAULT 'MAPPED',
  mapping_notes TEXT,
  needs_review BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_rows_batch ON public.catalog_import_rows(import_batch_id);

-- 6. ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_entity ON public.admin_audit_logs(entity_type, entity_id);

-- 7. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_city_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_import_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Public read-only policies
DROP POLICY IF EXISTS "Public can view active cities" ON public.cities;
CREATE POLICY "Public can view active cities" ON public.cities FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public can view active service areas" ON public.service_areas;
CREATE POLICY "Public can view active service areas" ON public.service_areas FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public can view service availability" ON public.service_city_availability;
CREATE POLICY "Public can view service availability" ON public.service_city_availability FOR SELECT USING (is_available = TRUE);

DROP POLICY IF EXISTS "Public can view active prices" ON public.service_prices;
CREATE POLICY "Public can view active prices" ON public.service_prices FOR SELECT USING (is_active = TRUE);

-- ==============================================================================
-- 8. SEED DATA: 43 CANONICAL CITIES
-- ==============================================================================
INSERT INTO public.cities (id, slug, name, state, latitude, longitude, sort_order, is_active)
VALUES
  (gen_random_uuid(), 'ahmedabad', 'Ahmedabad', 'Gujarat', 23.0225, 72.5714, 1, TRUE),
  (gen_random_uuid(), 'bangalore', 'Bangalore', 'Karnataka', 12.9716, 77.5946, 2, TRUE),
  (gen_random_uuid(), 'chennai', 'Chennai', 'Tamil Nadu', 13.0827, 80.2707, 3, TRUE),
  (gen_random_uuid(), 'jaipur', 'Jaipur', 'Rajasthan', 26.9124, 75.7873, 4, TRUE),
  (gen_random_uuid(), 'udaipur', 'Udaipur', 'Rajasthan', 24.5854, 73.7125, 5, TRUE),
  (gen_random_uuid(), 'hyderabad', 'Hyderabad', 'Telangana', 17.385, 78.4867, 6, TRUE),
  (gen_random_uuid(), 'kolkata', 'Kolkata', 'West Bengal', 22.5726, 88.3639, 7, TRUE),
  (gen_random_uuid(), 'mumbai', 'Mumbai', 'Maharashtra', 19.076, 72.8777, 8, TRUE),
  (gen_random_uuid(), 'pune', 'Pune', 'Maharashtra', 18.5204, 73.8567, 9, TRUE),
  (gen_random_uuid(), 'nagpur', 'Nagpur', 'Maharashtra', 21.1458, 79.0882, 10, TRUE),
  (gen_random_uuid(), 'ludhiana', 'Ludhiana', 'Punjab', 30.901, 75.8573, 11, TRUE),
  (gen_random_uuid(), 'vadodara', 'Vadodara', 'Gujarat', 22.3072, 73.1812, 12, TRUE),
  (gen_random_uuid(), 'lucknow', 'Lucknow', 'Uttar Pradesh', 26.8467, 80.9462, 13, TRUE),
  (gen_random_uuid(), 'kochi', 'Kochi', 'Kerala', 9.9312, 76.2673, 14, TRUE),
  (gen_random_uuid(), 'bhubaneswar', 'Bhubaneswar', 'Odisha', 20.2961, 85.8245, 15, TRUE),
  (gen_random_uuid(), 'kanpur', 'Kanpur', 'Uttar Pradesh', 26.4499, 80.3319, 16, TRUE),
  (gen_random_uuid(), 'surat', 'Surat', 'Gujarat', 21.1702, 72.8311, 17, TRUE),
  (gen_random_uuid(), 'indore', 'Indore', 'Madhya Pradesh', 22.7196, 75.8577, 18, TRUE),
  (gen_random_uuid(), 'agra', 'Agra', 'Uttar Pradesh', 27.1767, 78.0081, 19, TRUE),
  (gen_random_uuid(), 'bhopal', 'Bhopal', 'Madhya Pradesh', 23.2599, 77.4126, 20, TRUE),
  (gen_random_uuid(), 'guwahati', 'Guwahati', 'Assam', 26.1445, 91.7362, 21, TRUE),
  (gen_random_uuid(), 'vijayawada', 'Vijayawada', 'Andhra Pradesh', 16.5062, 80.648, 22, TRUE),
  (gen_random_uuid(), 'varanasi', 'Varanasi', 'Uttar Pradesh', 25.3176, 82.9739, 23, TRUE),
  (gen_random_uuid(), 'coimbatore', 'Coimbatore', 'Tamil Nadu', 11.0168, 76.9558, 24, TRUE),
  (gen_random_uuid(), 'thiruvananthapuram', 'Thiruvananthapuram', 'Kerala', 8.5241, 76.9366, 25, TRUE),
  (gen_random_uuid(), 'patna', 'Patna', 'Bihar', 25.5941, 85.1376, 26, TRUE),
  (gen_random_uuid(), 'raipur', 'Raipur', 'Chhattisgarh', 21.2514, 81.6296, 27, TRUE),
  (gen_random_uuid(), 'nashik', 'Nashik', 'Maharashtra', 19.9975, 73.7898, 28, TRUE),
  (gen_random_uuid(), 'jabalpur', 'Jabalpur', 'Madhya Pradesh', 23.1815, 79.9864, 29, TRUE),
  (gen_random_uuid(), 'jamshedpur', 'Jamshedpur', 'Jharkhand', 22.8046, 86.2029, 30, TRUE),
  (gen_random_uuid(), 'dehradun', 'Dehradun', 'Uttarakhand', 30.3165, 78.0322, 31, TRUE),
  (gen_random_uuid(), 'meerut', 'Meerut', 'Uttar Pradesh', 28.9845, 77.7064, 32, TRUE),
  (gen_random_uuid(), 'ranchi', 'Ranchi', 'Jharkhand', 23.3441, 85.3096, 33, TRUE),
  (gen_random_uuid(), 'prayagraj', 'Prayagraj', 'Uttar Pradesh', 25.4358, 81.8463, 34, TRUE),
  (gen_random_uuid(), 'amritsar', 'Amritsar', 'Punjab', 31.634, 74.8723, 35, TRUE),
  (gen_random_uuid(), 'gwalior', 'Gwalior', 'Madhya Pradesh', 26.2183, 78.1828, 36, TRUE),
  (gen_random_uuid(), 'kota', 'Kota', 'Rajasthan', 25.2138, 75.8648, 37, TRUE),
  (gen_random_uuid(), 'aurangabad', 'Aurangabad', 'Maharashtra', 19.8762, 75.3433, 38, TRUE),
  (gen_random_uuid(), 'mysore', 'Mysore', 'Karnataka', 12.2958, 76.6394, 39, TRUE),
  (gen_random_uuid(), 'guntur', 'Guntur', 'Andhra Pradesh', 16.3067, 80.4365, 40, TRUE),
  (gen_random_uuid(), 'rajahmundry', 'Rajahmundry', 'Andhra Pradesh', 17.0005, 81.804, 41, TRUE),
  (gen_random_uuid(), 'cuttack', 'Cuttack', 'Odisha', 20.4625, 85.883, 42, TRUE),
  (gen_random_uuid(), 'madurai', 'Madurai', 'Tamil Nadu', 9.9252, 78.1198, 43, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  state = EXCLUDED.state,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  is_active = EXCLUDED.is_active;

-- ==============================================================================
-- 9. SEED DATA: 13 MASTER CATEGORIES
-- ==============================================================================
DO $$
DECLARE
  cat RECORD;
BEGIN
  FOR cat IN 
    SELECT * FROM (VALUES
      ('c1000000-0000-0000-0000-000000000001'::uuid, 'ac-appliances', 'AC & Appliance Services', 'Certified technicians for air conditioners, refrigerators, washing machines, microwaves, and household appliances.', 'AirVent', 1, TRUE),
      ('c1000000-0000-0000-0000-000000000002'::uuid, 'electrician', 'Electrician', 'Licensed electricians for switches, fans, lighting, MCB protection, and wiring.', 'Zap', 2, TRUE),
      ('c1000000-0000-0000-0000-000000000003'::uuid, 'plumbing', 'Plumbing', 'Expert plumbers for taps, wash basins, toilets, drainage blockages, and water motors.', 'Droplets', 3, TRUE),
      ('c1000000-0000-0000-0000-000000000004'::uuid, 'home-cleaning', 'Home Cleaning', 'Hospital-grade deep cleaning, sofa shampooing, bathroom scrubbing, and kitchen degreasing.', 'Sparkles', 4, TRUE),
      ('c1000000-0000-0000-0000-000000000005'::uuid, 'painting', 'Painting', 'Interior, exterior, texture, and wood finish painting services.', 'Paintbrush', 5, TRUE),
      ('c1000000-0000-0000-0000-000000000006'::uuid, 'ro-water', 'RO & Water Purification', 'Purifier servicing, filter replacements, RO membranes, and TDS testing.', 'Waves', 6, TRUE),
      ('c1000000-0000-0000-0000-000000000007'::uuid, 'carpentry', 'Carpentry', 'Furniture repair, door alignments, locks, and custom woodwork.', 'Hammer', 7, TRUE),
      ('c1000000-0000-0000-0000-000000000008'::uuid, 'pest-control', 'Pest Control', 'Certified chemical sprays, gel baiting, and termite barrier treatments.', 'Bug', 8, TRUE),
      ('c1000000-0000-0000-0000-000000000009'::uuid, 'home-decor', 'Home Decor & Installation', 'False ceilings, wallpaper, curtains, and lighting setups.', 'Lamp', 9, TRUE),
      ('c1000000-0000-0000-0000-000000000010'::uuid, 'laundry', 'Laundry', 'Wash & fold, steam pressing, and premium dry cleaning.', 'WashingMachine', 10, TRUE),
      ('c1000000-0000-0000-0000-000000000011'::uuid, 'moving-shifting', 'Moving & Shifting', 'Local and intercity packers and movers.', 'Truck', 11, FALSE),
      ('c1000000-0000-0000-0000-000000000012'::uuid, 'appliance-repair', 'Appliance Repair', 'Consolidated under AC & Appliance Services.', 'Cpu', 12, FALSE),
      ('c1000000-0000-0000-0000-000000000013'::uuid, 'other-services', 'Other Home Services', 'Specialized and on-demand home tasks.', 'Grid', 13, FALSE)
    ) AS t(id, slug, name, description, icon_name, sort_order, is_active)
  LOOP
    IF EXISTS (SELECT 1 FROM public.service_categories WHERE slug = cat.slug) THEN
      UPDATE public.service_categories SET
        name = cat.name,
        description = cat.description,
        icon_name = cat.icon_name,
        sort_order = cat.sort_order,
        is_active = cat.is_active
      WHERE slug = cat.slug;
    ELSE
      INSERT INTO public.service_categories (id, slug, name, description, icon_name, sort_order, is_active)
      VALUES (cat.id, cat.slug, cat.name, cat.description, cat.icon_name, cat.sort_order, cat.is_active)
      ON CONFLICT (id) DO UPDATE SET
        slug = EXCLUDED.slug,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        icon_name = EXCLUDED.icon_name,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active;
    END IF;
  END LOOP;
END $$;

-- Drop any legacy foreign keys on services table and re-bind to canonical service_categories
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Allow category_id to be nullable
  ALTER TABLE public.services ALTER COLUMN category_id DROP NOT NULL;

  FOR r IN (
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.services'::regclass
      AND contype = 'f'
      AND conname LIKE '%category%'
  ) LOOP
    EXECUTE 'ALTER TABLE public.services DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname) || ' CASCADE';
  END LOOP;

  -- Clean up or remap any orphan category_id references on services
  UPDATE public.services
  SET category_id = NULL
  WHERE category_id IS NOT NULL 
    AND category_id NOT IN (SELECT id FROM public.service_categories);

  ALTER TABLE public.services ADD CONSTRAINT services_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.service_categories(id) ON DELETE SET NULL;
END $$;

-- Sync legacy categories table if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') THEN
    DELETE FROM public.categories;
    INSERT INTO public.categories (id, slug, name, description, icon, sort_order, is_active)
    SELECT id, slug, name, description, icon_name, sort_order, is_active
    FROM public.service_categories;
  END IF;
END $$;

-- ==============================================================================
-- 10. SEED DATA: CANONICAL SUBCATEGORIES
-- ==============================================================================
DO $$
BEGIN
  -- Clear dependent catalog tables if present before re-seeding canonical dataset
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_faqs') THEN
    DELETE FROM public.service_faqs;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_reviews') THEN
    DELETE FROM public.service_reviews;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_addons') THEN
    DELETE FROM public.service_addons;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_variants') THEN
    DELETE FROM public.service_variants;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_media') THEN
    DELETE FROM public.service_media;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_specifications') THEN
    DELETE FROM public.service_specifications;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_inclusions') THEN
    DELETE FROM public.service_inclusions;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_exclusions') THEN
    DELETE FROM public.service_exclusions;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_prices') THEN
    DELETE FROM public.service_prices;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_city_availability') THEN
    DELETE FROM public.service_city_availability;
  END IF;

  UPDATE public.services SET subcategory_id = NULL;
  DELETE FROM public.service_subcategories;
  DELETE FROM public.services;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

INSERT INTO public.service_subcategories (id, category_id, slug, name, description, sort_order, is_active)
VALUES
  ('a2000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'ac-cleaning-maintenance', 'AC Cleaning & Maintenance', 'Power foam jet, outdoor condenser, and deep cleaning', 1, TRUE),
  ('a2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'ac-gas-cooling', 'AC Gas & Cooling', 'Nitrogen leak test, brazing, and gas recharging', 2, TRUE),
  ('a2000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'ac-repair-diagnostics', 'AC Repair & Diagnostics', 'PCB, capacitors, sensors, and motherboard circuit repair', 3, TRUE),
  ('a2000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000001', 'ac-installation', 'AC Installation & Uninstallation', 'Split and window AC installation and dismounting', 4, TRUE),
  ('a2000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000001', 'washing-machine-repair', 'Washing Machine Repair', 'Front & top load chemical descaling, motor, and drum repair', 5, TRUE),
  ('a2000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000001', 'refrigerator-repair', 'Refrigerator Repair', 'Single & double door compressor repair, thermostat, and relay fix', 6, TRUE),
  ('a2000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000001', 'water-purifier-ro', 'RO & Water Purifier Service', 'Pre-filter service, RO membrane replacement, and TDS check', 7, TRUE),
  ('a2000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000001', 'kitchen-chimney-repair', 'Kitchen Chimney Service', 'Deep degreasing, motor cover, and baffle filter cleaning', 8, TRUE),
  ('a2000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000001', 'microwave-repair', 'Microwave & Oven Repair', 'Magnetron, high-voltage fuse, heating, and PCB repair', 9, TRUE),
  ('a2000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000001', 'television-mounting', 'Television Wall Mounting', 'Heavy-duty spirit-level drilling and LED/LCD TV bracket mounting', 10, TRUE),
  ('a2000000-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-000000000002', 'switches-switchboards', 'Switches & Switchboards', 'Switch, socket, switchboard installation and repair', 11, TRUE),
  ('a2000000-0000-0000-0000-000000000012', 'c1000000-0000-0000-0000-000000000002', 'fans', 'Fans', 'Ceiling fan, exhaust fan installation and repair', 12, TRUE),
  ('a2000000-0000-0000-0000-000000000013', 'c1000000-0000-0000-0000-000000000002', 'mcb-protection', 'MCB & Electrical Protection', 'Miniature circuit breakers, sub-meters, and distribution boards', 13, TRUE),
  ('a2000000-0000-0000-0000-000000000014', 'c1000000-0000-0000-0000-000000000002', 'inverter-power', 'Inverter & Power Backup', 'Inverter setup, battery servicing, and fuses', 14, TRUE),
  ('a2000000-0000-0000-0000-000000000015', 'c1000000-0000-0000-0000-000000000002', 'lighting', 'Lighting & Fixtures', 'LED lights, tubelight, and chandeliers', 15, TRUE),
  ('a2000000-0000-0000-0000-000000000016', 'c1000000-0000-0000-0000-000000000003', 'taps-faucets', 'Taps & Faucets', 'Tap installation, leakage repair, mixer cartridges', 16, TRUE),
  ('a2000000-0000-0000-0000-000000000017', 'c1000000-0000-0000-0000-000000000003', 'toilets-fixtures', 'Toilet & Bathroom Fixtures', 'Western commode, flush tank, jet spray', 17, TRUE),
  ('a2000000-0000-0000-0000-000000000018', 'c1000000-0000-0000-0000-000000000003', 'wash-basin', 'Wash Basin', 'Basin installation, bottle trap, blockage removal', 18, TRUE),
  ('a2000000-0000-0000-0000-000000000019', 'c1000000-0000-0000-0000-000000000003', 'water-motors-pumps', 'Water Motors & Pumps', 'Surface and submersible motor installation', 19, TRUE),
  ('a2000000-0000-0000-0000-000000000020', 'c1000000-0000-0000-0000-000000000003', 'water-pipeline-leakage', 'Water Pipeline & Leakage', 'Concealed leak tracing and pipe repair', 20, TRUE),
  ('a2000000-0000-0000-0000-000000000021', 'c1000000-0000-0000-0000-000000000004', 'full-home-cleaning', 'Full Home Cleaning', 'Furnished & unfurnished deep home scrubbing', 21, TRUE),
  ('a2000000-0000-0000-0000-000000000022', 'c1000000-0000-0000-0000-000000000004', 'bathroom-cleaning', 'Bathroom Cleaning', 'Hard water scale removal and tile scrubbing', 22, TRUE),
  ('a2000000-0000-0000-0000-000000000023', 'c1000000-0000-0000-0000-000000000004', 'kitchen-cleaning', 'Kitchen Cleaning', 'Exhaust, cabinet, and slab intense degreasing', 23, TRUE),
  ('a2000000-0000-0000-0000-000000000024', 'c1000000-0000-0000-0000-000000000004', 'sofa-carpet-cleaning', 'Sofa & Carpet Cleaning', 'Wet vacuum extraction and foam shampooing', 24, TRUE),
  ('a2000000-0000-0000-0000-000000000025', 'c1000000-0000-0000-0000-000000000004', 'water-tank-cleaning', 'Water Tank Cleaning', 'Mechanized UV & sludge removal', 25, TRUE),
  ('a2000000-0000-0000-0000-000000000026', 'c1000000-0000-0000-0000-000000000007', 'furniture-assembly', 'Furniture Assembly & Repair', 'Flat-pack assembly and minor woodwork', 26, TRUE),
  ('a2000000-0000-0000-0000-000000000027', 'c1000000-0000-0000-0000-000000000007', 'doors-hardware', 'Doors & Hardware', 'Lock installation, door shaving, and hinge alignment', 27, TRUE),
  ('a2000000-0000-0000-0000-000000000028', 'c1000000-0000-0000-0000-000000000007', 'custom-woodwork', 'Custom Carpentry & Cabinetry', 'Custom flush doors, teak doors, wardrobes, modular kitchens, beds, and window frames', 28, TRUE),
  ('a2000000-0000-0000-0000-000000000029', 'c1000000-0000-0000-0000-000000000005', 'interior-painting', 'Interior Painting', 'Distemper, tractor emulsion, and luxury royale painting', 29, TRUE),
  ('a2000000-0000-0000-0000-000000000030', 'c1000000-0000-0000-0000-000000000005', 'texture-painting', 'Texture Painting', 'Accent wall texture and metallic stencil designs', 30, TRUE),
  ('a2000000-0000-0000-0000-000000000031', 'c1000000-0000-0000-0000-000000000005', 'exterior-painting', 'Exterior Painting', 'Weatherproof exterior primer and anti-algae paint', 31, TRUE),
  ('a2000000-0000-0000-0000-000000000032', 'c1000000-0000-0000-0000-000000000005', 'wood-metal-painting', 'Wood & Metal Painting', 'Enamel coating and PU wood polishing', 32, TRUE),
  ('a2000000-0000-0000-0000-000000000033', 'c1000000-0000-0000-0000-000000000008', 'general-pest-control', 'General Pest Control', 'Ants, cockroaches, and general insect treatment', 33, TRUE),
  ('a2000000-0000-0000-0000-000000000034', 'c1000000-0000-0000-0000-000000000008', 'termite-control', 'Termite Control', 'Perimeter drilling and chemical barrier injection', 34, TRUE),
  ('a2000000-0000-0000-0000-000000000035', 'c1000000-0000-0000-0000-000000000008', 'bed-bug-control', 'Bed Bug Eradication', '2-step chemical spray and heat treatment', 35, TRUE),
  ('a2000000-0000-0000-0000-000000000036', 'c1000000-0000-0000-0000-000000000009', 'false-ceiling', 'False Ceiling & Treatments', 'Gypsum and POP punched ceilings', 36, TRUE),
  ('a2000000-0000-0000-0000-000000000037', 'c1000000-0000-0000-0000-000000000009', 'wallpapers-curtains', 'Wallpapers & Curtains', 'Wallpaper, PVC louvers, curtain rods, and custom stitching', 37, TRUE),
  ('a2000000-0000-0000-0000-000000000038', 'c1000000-0000-0000-0000-000000000009', 'home-security-cctv', 'Home Security & Smart Locks', 'CCTV camera installation and smart biometric locks', 38, TRUE),
  ('a2000000-0000-0000-0000-000000000039', 'c1000000-0000-0000-0000-000000000009', 'interior-consultation', 'Interior Design & Consultation', '2D layout consultation and 3D visual rendering', 39, TRUE),
  ('a2000000-0000-0000-0000-000000000040', 'c1000000-0000-0000-0000-000000000010', 'daily-wear-laundry', 'Daily Wear Laundry', 'Wash & fold, steam pressing', 40, TRUE),
  ('a2000000-0000-0000-0000-000000000041', 'c1000000-0000-0000-0000-000000000010', 'premium-dry-cleaning', 'Premium Dry Cleaning', 'Suits, sarees, and bridal wear', 41, TRUE),
  ('a2000000-0000-0000-0000-000000000042', 'c1000000-0000-0000-0000-000000000010', 'home-linen-care', 'Home Linen & Curtain Care', 'Blanket, quilt, and curtain dry cleaning', 42, TRUE),
  ('a2000000-0000-0000-0000-000000000043', 'c1000000-0000-0000-0000-000000000010', 'shoes-leather-care', 'Shoes & Leather Care', 'Sneaker wash, suede and leather restoration', 43, TRUE)
ON CONFLICT (category_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- ==============================================================================
-- 11. SEED DATA: CANONICAL SERVICES
-- ==============================================================================
INSERT INTO public.services (id, category_id, subcategory_id, slug, name, short_description, description, thumbnail_url, hero_image_url, duration_minutes, base_price, pricing_type, rating, reviews_count, is_active, sort_order)
VALUES
  ('0d5dda28-fc98-42ff-81f6-109a4ff7d1c3', 'c1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'foam-jet-service', 'Foam-Jet Service', 'Indoor & outdoor unit deep cleaning with foam and high-pressure jet spray....', 'Indoor & outdoor unit deep cleaning with foam and high-pressure jet spray.', 'basic_ac_repair', 'basic_ac_repair', 60, 549, 'FIXED', 4.80, 120, TRUE, 1),
  ('e22a92e0-882e-44a2-a9b9-6fa3d0196193', 'c1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'gas-refill-leak-fix', 'Gas Refill & Leak Fix', 'Nitrogen leak test, brazing minor leaks, and complete refrigerant gas recharge....', 'Nitrogen leak test, brazing minor leaks, and complete refrigerant gas recharge.', 'basic_ac_repair', 'basic_ac_repair', 60, 2500, 'FIXED', 4.81, 143, TRUE, 2),
  ('256eead4-4926-4cc1-9ebd-6a5555ff2bc6', 'c1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000003', 'pcb-motherboard-repair', 'PCB / Motherboard Repair', 'Inverter/Non-inverter main board circuit diagnosis, repair, and testing....', 'Inverter/Non-inverter main board circuit diagnosis, repair, and testing.', 'basic_ac_repair', 'basic_ac_repair', 60, 1500, 'FIXED', 4.82, 166, TRUE, 3),
  ('c567fc5d-2fad-4c31-b39d-240735e1b4ba', 'c1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000004', 'installation-uninstallation', 'Installation / Uninstallation', 'Standard wall mounting/dismounting of split AC units (excludes core cutting)....', 'Standard wall mounting/dismounting of split AC units (excludes core cutting).', 'basic_ac_repair', 'basic_ac_repair', 60, 699, 'FIXED', 4.83, 189, TRUE, 4),
  ('818c7128-67bd-4ac8-b1f8-2e6fd1c93a8e', 'c1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'deep-cleaning-descaling', 'Deep Cleaning / Descaling', 'Chemical descaling and drum deep clean for Front/Top load machines....', 'Chemical descaling and drum deep clean for Front/Top load machines.', 'basic_ac_repair', 'basic_ac_repair', 60, 499, 'FIXED', 4.84, 212, TRUE, 5),
  ('5eb63271-2885-4914-ab64-07a1b9ae91df', 'c1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000003', 'motor-drum-repair', 'Motor / Drum Repair', 'Diagnosis and replacement of main motor, suspension rods, or drum belts....', 'Diagnosis and replacement of main motor, suspension rods, or drum belts.', 'basic_ac_repair', 'basic_ac_repair', 60, 1200, 'FIXED', 4.85, 235, TRUE, 6),
  ('c724c740-27dc-4c9b-abdd-01cdf97807c3', 'c1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000006', 'compressor-repair', 'Compressor Repair', 'Diagnosis of cooling failures, gas check, and compressor repair/replacement....', 'Diagnosis of cooling failures, gas check, and compressor repair/replacement.', 'basic_fridge', 'basic_fridge', 60, 1500, 'FIXED', 4.86, 258, TRUE, 7),
  ('36185588-fb6c-420c-ae46-e8d67ea8bcc7', 'c1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000006', 'thermostat-relay-fix', 'Thermostat / Relay Fix', 'Fixing overcooling or no-cooling issues via thermostat/relay replacements....', 'Fixing overcooling or no-cooling issues via thermostat/relay replacements.', 'basic_fridge', 'basic_fridge', 60, 599, 'FIXED', 4.87, 281, TRUE, 8),
  ('fc3df1f5-6cf3-4104-85c5-946792c8a55b', 'c1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000007', 'standard-service', 'Standard Service', 'Pre-filter replacement, internal tank cleaning, and output TDS check....', 'Pre-filter replacement, internal tank cleaning, and output TDS check.', 'basic_ro', 'basic_ro', 60, 449, 'FIXED', 4.88, 304, TRUE, 9),
  ('35ff44c9-5edb-4380-8f8e-9887764e2621', 'c1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000007', 'membrane-replacement', 'Membrane Replacement', 'Replacing primary RO membrane and carbon filters for hard water issues....', 'Replacing primary RO membrane and carbon filters for hard water issues.', 'basic_ro', 'basic_ro', 60, 1200, 'FIXED', 4.89, 327, TRUE, 10),
  ('007c5500-9aaf-4d89-8d01-443d0baa3c68', 'c1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000008', 'deep-degreasing', 'Deep Degreasing', 'Dismantling baffles, motor cover, and intense chemical degreasing of sticky oil....', 'Dismantling baffles, motor cover, and intense chemical degreasing of sticky oil.', 'basic_chimney', 'basic_chimney', 60, 799, 'FIXED', 4.90, 350, TRUE, 11),
  ('40627567-d73e-4657-8326-c31086e2e822', 'c1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000007', 'heating-issue-fix', 'Heating Issue Fix', 'Diagnosis and replacement of magnetron, high-voltage fuse, or keypad....', 'Diagnosis and replacement of magnetron, high-voltage fuse, or keypad.', 'basic_ro', 'basic_ro', 60, 599, 'FIXED', 4.91, 373, TRUE, 12),
  ('ff7d0317-169f-4441-9c4b-f311580ca331', 'c1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000010', 'wall-mounting', 'Wall Mounting', 'Drilling and heavy-duty mounting for LED/LCD TVs (up to 55 inches)....', 'Drilling and heavy-duty mounting for LED/LCD TVs (up to 55 inches).', 'basic_television', 'basic_television', 60, 399, 'FIXED', 4.92, 396, TRUE, 13),
  ('f6302e15-1d68-4c85-9b11-c9c49f682f54', 'c1000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000021', '1-bhk-deep-clean-furnished', '1 BHK Deep Clean (Furnished)', 'Machine floor scrubbing, dry vacuuming, complete kitchen & bath deep clean....', 'Machine floor scrubbing, dry vacuuming, complete kitchen & bath deep clean.', 'basic_cleaning', 'basic_cleaning', 60, 2899, 'FIXED', 4.93, 419, TRUE, 14),
  ('2fdd14e0-e481-41eb-b578-59e9e7c1150a', 'c1000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000021', '2-bhk-deep-clean-furnished', '2 BHK Deep Clean (Furnished)', 'Machine floor scrubbing, dry vacuuming, complete kitchen & bath deep clean....', 'Machine floor scrubbing, dry vacuuming, complete kitchen & bath deep clean.', 'basic_cleaning', 'basic_cleaning', 60, 3899, 'FIXED', 4.94, 442, TRUE, 15),
  ('97e26df2-d631-42c3-934e-c4479b67adc9', 'c1000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000021', '3-bhk-deep-clean-furnished', '3 BHK Deep Clean (Furnished)', 'Machine floor scrubbing, dry vacuuming, complete kitchen & bath deep clean....', 'Machine floor scrubbing, dry vacuuming, complete kitchen & bath deep clean.', 'basic_cleaning', 'basic_cleaning', 60, 5199, 'FIXED', 4.80, 465, TRUE, 16),
  ('53baa129-441e-4237-a8b4-4f52cf35332c', 'c1000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000022', 'intense-cleaning', 'Intense Cleaning', 'Machine scrubbing of floor/tiles, hard water stain & scale removal....', 'Machine scrubbing of floor/tiles, hard water stain & scale removal.', 'basic_cleaning', 'basic_cleaning', 60, 499, 'FIXED', 4.81, 488, TRUE, 17),
  ('99facbad-117f-4365-b29c-7b46fe2713e5', 'c1000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000022', 'move-in-deep-cleaning', 'Move-in Deep Cleaning', 'Extra 30 mins machine scrubbing; meant for unused or newly constructed baths....', 'Extra 30 mins machine scrubbing; meant for unused or newly constructed baths.', 'basic_cleaning', 'basic_cleaning', 60, 629, 'FIXED', 4.82, 511, TRUE, 18),
  ('40e6b660-8ec8-4412-97de-956d03d4f4af', 'c1000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000023', 'intense-kitchen-deep-clean', 'Intense Kitchen Deep Clean', 'Exhaust/chimney exterior, slab, cabinet degreasing, and floor scrubbing....', 'Exhaust/chimney exterior, slab, cabinet degreasing, and floor scrubbing.', 'basic_cleaning', 'basic_cleaning', 60, 1399, 'FIXED', 4.83, 134, TRUE, 19),
  ('0c333b72-f9b0-45d8-ad35-ebda9f0a9e12', 'c1000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000024', 'fabric-sofa-shampooing', 'Fabric Sofa Shampooing', 'Wet vacuuming, stain treatment, and mechanical shampooing of fabric seats....', 'Wet vacuuming, stain treatment, and mechanical shampooing of fabric seats.', 'basic_cleaning', 'basic_cleaning', 60, 250, 'FIXED', 4.84, 157, TRUE, 20),
  ('667d5948-f77a-4100-a39b-2a06d989f3c2', 'c1000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000025', 'mechanized-tank-cleaning', 'Mechanized Tank Cleaning', 'Dewatering, sludge removal, scrubbing, and UV/anti-bacterial spray....', 'Dewatering, sludge removal, scrubbing, and UV/anti-bacterial spray.', 'basic_cleaning', 'basic_cleaning', 60, 799, 'FIXED', 4.85, 180, TRUE, 21),
  ('10edf4ca-a4cd-4b2d-9c13-4ad624325b03', 'c1000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000016', 'tap-installation-repair', 'Tap Installation / Repair', 'Replacing internal cartridges, washers, or installing brand new taps....', 'Replacing internal cartridges, washers, or installing brand new taps.', 'basic_plumb', 'basic_plumb', 60, 129, 'FIXED', 4.86, 203, TRUE, 22),
  ('3c325132-5710-438b-a8ab-4f377f041883', 'c1000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000017', 'flush-tank-repair', 'Flush Tank Repair', 'Fixing internal siphon mechanisms, flapper valves, or dual-push buttons....', 'Fixing internal siphon mechanisms, flapper valves, or dual-push buttons.', 'basic_plumb', 'basic_plumb', 60, 199, 'FIXED', 4.87, 226, TRUE, 23),
  ('430bfb21-6bc0-49f9-ae78-44cfd227bab2', 'c1000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000017', 'western-pot-blockage', 'Western Pot Blockage', 'Using high-pressure air or spring augers to clear heavy commode blockages....', 'Using high-pressure air or spring augers to clear heavy commode blockages.', 'basic_plumb', 'basic_plumb', 60, 1299, 'FIXED', 4.88, 249, TRUE, 24),
  ('ebb02a9b-3c22-4625-8328-c95857e95b84', 'c1000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000018', 'basin-blockage-removal', 'Basin Blockage Removal', 'Opening the P-trap and physically clearing hair, grease, and debris blockages....', 'Opening the P-trap and physically clearing hair, grease, and debris blockages.', 'basic_plumb', 'basic_plumb', 60, 149, 'FIXED', 4.89, 272, TRUE, 25),
  ('d4c8114f-79b4-4da2-802c-4450fa7eafe5', 'c1000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000019', 'surface-motor-installation', 'Surface Motor Installation', 'Installing surface water pumps (0.5 to 1.5 HP) and removing air cavities....', 'Installing surface water pumps (0.5 to 1.5 HP) and removing air cavities.', 'basic_plumb', 'basic_plumb', 60, 449, 'FIXED', 4.90, 295, TRUE, 26),
  ('ffc910bb-948c-4a07-a428-477df9f7b733', 'c1000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000016', 'inletoutlet-pipe-setup', 'Inlet/Outlet Pipe Setup', 'Connecting washing machines, dishwashers, or RO systems to main water lines....', 'Connecting washing machines, dishwashers, or RO systems to main water lines.', 'basic_plumb', 'basic_plumb', 60, 149, 'FIXED', 4.91, 318, TRUE, 27),
  ('2b191d45-a770-47ae-80c1-303f87e19934', 'c1000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000020', 'concealed-leak-tracing', 'Concealed Leak Tracing', 'Identifying internal wall pipe leaks using thermal/pressure checks (civil work extra)....', 'Identifying internal wall pipe leaks using thermal/pressure checks (civil work extra).', 'basic_plumb', 'basic_plumb', 60, 1200, 'FIXED', 4.92, 341, TRUE, 28),
  ('d8560b8d-064f-4ae8-abe4-d0c37152c27c', 'c1000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000011', 'switchsocket-replacement', 'Switch/Socket Replacement', 'Changing burnt or faulty electrical switches, plug points, and regulator dials....', 'Changing burnt or faulty electrical switches, plug points, and regulator dials.', 'basic_electric', 'basic_electric', 60, 99, 'FIXED', 4.93, 364, TRUE, 29),
  ('abac3d28-d0b4-4494-860e-7c6091640cfe', 'c1000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000012', 'ceiling-fan-repair', 'Ceiling Fan Repair', 'Changing capacitors, rewinding coils, or replacing noisy ball bearings....', 'Changing capacitors, rewinding coils, or replacing noisy ball bearings.', 'basic_electric', 'basic_electric', 60, 199, 'FIXED', 4.94, 387, TRUE, 30),
  ('e8c1eb65-a855-41ed-b95d-84f447707512', 'c1000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000013', 'mcb-replacement', 'MCB Replacement', 'Changing faulty Miniature Circuit Breakers (MCB/RCCB) in the main distribution board....', 'Changing faulty Miniature Circuit Breakers (MCB/RCCB) in the main distribution board.', 'basic_electric', 'basic_electric', 60, 199, 'FIXED', 4.80, 410, TRUE, 31),
  ('7a505521-06c2-44e0-bf2c-d06e5c63c1c7', 'c1000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000014', 'inverter-installation', 'Inverter Installation', 'Connecting a new inverter to the battery and the home''s main electrical circuit....', 'Connecting a new inverter to the battery and the home''s main electrical circuit.', 'basic_electric', 'basic_electric', 60, 499, 'FIXED', 4.81, 433, TRUE, 32),
  ('b4a22a90-cb8a-4751-921c-b54f5c4c8a79', 'c1000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000015', 'chandelier-installation', 'Chandelier Installation', 'Assembling, wiring, and hanging heavy decorative ceiling lighting fixtures....', 'Assembling, wiring, and hanging heavy decorative ceiling lighting fixtures.', 'basic_electric', 'basic_electric', 60, 599, 'FIXED', 4.82, 456, TRUE, 33),
  ('b8d4bcf1-98dc-470f-86d3-cf903a01cd78', 'c1000000-0000-0000-0000-000000000007', 'a2000000-0000-0000-0000-000000000026', 'flat-pack-assembly', 'Flat-pack Assembly', 'Unboxing and assembling online-bought beds, wardrobes, or complex tables....', 'Unboxing and assembling online-bought beds, wardrobes, or complex tables.', 'basic_carpentry', 'basic_carpentry', 60, 449, 'FIXED', 4.83, 479, TRUE, 34),
  ('c1112c6a-32df-410c-9fe0-f141254e276d', 'c1000000-0000-0000-0000-000000000007', 'a2000000-0000-0000-0000-000000000027', 'lock-installation', 'Lock Installation', 'Drilling wood and installing mortise locks, night latches, or cylindrical locks....', 'Drilling wood and installing mortise locks, night latches, or cylindrical locks.', 'basic_carpentry', 'basic_carpentry', 60, 349, 'FIXED', 4.84, 502, TRUE, 35),
  ('278c8706-c510-4587-b249-db70dec661d0', 'c1000000-0000-0000-0000-000000000007', 'a2000000-0000-0000-0000-000000000027', 'door-shaving-alignment', 'Door Shaving / Alignment', 'Planing swollen wooden doors or fixing hinge alignments for smooth closing....', 'Planing swollen wooden doors or fixing hinge alignments for smooth closing.', 'basic_carpentry', 'basic_carpentry', 60, 399, 'FIXED', 4.85, 125, TRUE, 36),
  ('737d2f82-6c10-4961-8202-7334e410abf9', 'c1000000-0000-0000-0000-000000000007', 'a2000000-0000-0000-0000-000000000028', 'minor-woodwork-repair', 'Minor Woodwork Repair', 'Fixing broken drawer channels, replacing loose hinges, or patching damaged ply....', 'Fixing broken drawer channels, replacing loose hinges, or patching damaged ply.', 'basic_carpentry', 'basic_carpentry', 60, 299, 'FIXED', 4.86, 148, TRUE, 37),
  ('27aa450f-127b-4a45-9522-fa5e54551f97', 'c1000000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000029', 'distemper-economy', 'Distemper (Economy)', 'Surface scraping, 1 coat primer, and 2 coats distemper (highly rental friendly)....', 'Surface scraping, 1 coat primer, and 2 coats distemper (highly rental friendly).', 'basic_decor', 'basic_decor', 60, 9, 'FIXED', 4.87, 171, TRUE, 38),
  ('7f7d36a0-7569-44d8-b660-bd75ccb174b5', 'c1000000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000029', 'tractor-emulsion-standard', 'Tractor Emulsion (Standard)', 'Putty touch-ups, 1 coat primer, and 2 coats standard matte emulsion paint....', 'Putty touch-ups, 1 coat primer, and 2 coats standard matte emulsion paint.', 'basic_decor', 'basic_decor', 60, 15, 'FIXED', 4.88, 194, TRUE, 39),
  ('a77b6e0a-0a83-4aaa-b110-3f87fe38fc46', 'c1000000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000029', 'royale-luxury-emulsion', 'Royale / Luxury Emulsion', 'Full wall putty application, 1 coat primer, and 2 coats washable luxury emulsion....', 'Full wall putty application, 1 coat primer, and 2 coats washable luxury emulsion.', 'basic_decor', 'basic_decor', 60, 25, 'FIXED', 4.89, 217, TRUE, 40),
  ('1c36dbcb-6274-43d1-9bdf-0d5b02564371', 'c1000000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000030', 'accent-wall-texture', 'Accent Wall Texture', 'Specialized metallic, stucco, ragging, or geometric textured wall designs....', 'Specialized metallic, stucco, ragging, or geometric textured wall designs.', 'basic_decor', 'basic_decor', 60, 70, 'FIXED', 4.90, 240, TRUE, 41),
  ('14958d9f-9e90-4afd-bb2c-f1a075161f5a', 'c1000000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000031', 'weatherproof-exterior', 'Weatherproof Exterior', 'Anti-algae exterior primer plus 2 coats of weatherproof exterior paint....', 'Anti-algae exterior primer plus 2 coats of weatherproof exterior paint.', 'basic_decor', 'basic_decor', 60, 12, 'FIXED', 4.91, 263, TRUE, 42),
  ('c3739c5c-5695-490b-bd4a-80b53ec057c2', 'c1000000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000032', 'enamel-painting', 'Enamel Painting', 'Sanding, anti-rust prep, and oil-based enamel coating for doors, windows, grilles....', 'Sanding, anti-rust prep, and oil-based enamel coating for doors, windows, grilles.', 'basic_decor', 'basic_decor', 60, 15, 'FIXED', 4.92, 286, TRUE, 43),
  ('fdd78f07-b00c-4d23-9150-f37d8b25a7bd', 'c1000000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000032', 'pu-wood-polish', 'PU Wood Polish', 'Polyurethane high-gloss or matte polishing for premium wooden furniture and doors....', 'Polyurethane high-gloss or matte polishing for premium wooden furniture and doors.', 'basic_decor', 'basic_decor', 60, 60, 'FIXED', 4.93, 309, TRUE, 44),
  ('d0a78250-cf0c-4517-891d-46f9380c57ec', 'c1000000-0000-0000-0000-000000000008', 'a2000000-0000-0000-0000-000000000033', 'ant-cockroach-control', 'Ant & Cockroach Control', 'Gel baiting in kitchen hinges/cabinets and targeted chemical spray for ants....', 'Gel baiting in kitchen hinges/cabinets and targeted chemical spray for ants.', 'basic_pest', 'basic_pest', 60, 799, 'FIXED', 4.94, 332, TRUE, 45),
  ('10e06b71-78a0-42c5-a2c7-64f8486b6490', 'c1000000-0000-0000-0000-000000000008', 'a2000000-0000-0000-0000-000000000034', 'termite-treatment-drill', 'Termite Treatment (Drill)', 'Drilling floor perimeters, injecting termiticide, and sealing with white cement....', 'Drilling floor perimeters, injecting termiticide, and sealing with white cement.', 'basic_pest', 'basic_pest', 60, 3500, 'FIXED', 4.80, 355, TRUE, 46),
  ('4430c0b8-61d0-4b82-bddb-74eacd7a294b', 'c1000000-0000-0000-0000-000000000008', 'a2000000-0000-0000-0000-000000000035', 'bed-bug-eradication', 'Bed Bug Eradication', '2-step chemical spray process (requires vacating the premises for 4-6 hours)....', '2-step chemical spray process (requires vacating the premises for 4-6 hours).', 'basic_pest', 'basic_pest', 60, 1500, 'FIXED', 4.81, 378, TRUE, 47),
  ('f62f550f-6b86-4d74-98ea-5c11fe6df45a', 'c1000000-0000-0000-0000-000000000009', 'a2000000-0000-0000-0000-000000000038', 'camera-installation', 'Camera Installation', 'Routing wires, mounting camera, and configuring DVR/NVR for online mobile viewing....', 'Routing wires, mounting camera, and configuring DVR/NVR for online mobile viewing.', 'basic_decor', 'basic_decor', 60, 499, 'FIXED', 4.82, 401, TRUE, 48),
  ('eedb2ee6-0294-4cf0-9eb7-a93a27a0b5aa', 'c1000000-0000-0000-0000-000000000009', 'a2000000-0000-0000-0000-000000000038', 'smart-lock-setup', 'Smart Lock Setup', 'Core mortise wood cutting, installing biometric/RFID lock, and mobile app setup....', 'Core mortise wood cutting, installing biometric/RFID lock, and mobile app setup.', 'basic_decor', 'basic_decor', 60, 999, 'FIXED', 4.83, 424, TRUE, 49),
  ('475a54b7-2b4a-4218-b107-0a96d074fa45', 'c1000000-0000-0000-0000-000000000007', 'a2000000-0000-0000-0000-000000000028', 'custom-flush-door-making', 'Custom Flush Door Making', 'Measuring, cutting, and assembling a standard flush door (material extra)....', 'Measuring, cutting, and assembling a standard flush door (material extra).', 'basic_carpentry', 'basic_carpentry', 60, 1500, 'FIXED', 4.84, 447, TRUE, 50),
  ('46872a0c-1931-4f2d-a5bb-ad32db3e87e9', 'c1000000-0000-0000-0000-000000000007', 'a2000000-0000-0000-0000-000000000028', 'premium-teak-door-making', 'Premium Teak Door Making', 'Specialized carving and framing for solid teak wood main doors....', 'Specialized carving and framing for solid teak wood main doors.', 'basic_carpentry', 'basic_carpentry', 60, 4500, 'FIXED', 4.85, 470, TRUE, 51),
  ('97851bfe-178d-411d-9053-017bb5836e6d', 'c1000000-0000-0000-0000-000000000007', 'a2000000-0000-0000-0000-000000000028', 'custom-wardrobe-ply-laminate', 'Custom Wardrobe (Ply + Laminate)', 'Building full-height wardrobes using commercial ply, standard laminate, and basic hardware....', 'Building full-height wardrobes using commercial ply, standard laminate, and basic hardware.', 'basic_carpentry', 'basic_carpentry', 60, 1200, 'FIXED', 4.86, 493, TRUE, 52),
  ('f22cc290-32d8-4244-a5d8-2f512773fa14', 'c1000000-0000-0000-0000-000000000007', 'a2000000-0000-0000-0000-000000000028', 'modular-kitchen-cabinetry', 'Modular Kitchen Cabinetry', 'Construction of base and wall cabinets, including BWR ply and acrylic/laminate finish....', 'Construction of base and wall cabinets, including BWR ply and acrylic/laminate finish.', 'basic_carpentry', 'basic_carpentry', 60, 1600, 'FIXED', 4.87, 516, TRUE, 53),
  ('6605f133-94d4-48c1-bd57-31fd33aedbbf', 'c1000000-0000-0000-0000-000000000007', 'a2000000-0000-0000-0000-000000000028', 'custom-queenking-bed', 'Custom Queen/King Bed', 'Structuring a custom wooden bed with box storage (plywood/wood provided by client)....', 'Structuring a custom wooden bed with box storage (plywood/wood provided by client).', 'basic_carpentry', 'basic_carpentry', 60, 4000, 'FIXED', 4.88, 139, TRUE, 54),
  ('c4f845d5-b146-4723-b0f7-f326eacaf42f', 'c1000000-0000-0000-0000-000000000007', 'a2000000-0000-0000-0000-000000000028', 'wooden-window-framing', 'Wooden Window Framing', 'Making and fitting wooden window frames and shutter panels....', 'Making and fitting wooden window frames and shutter panels.', 'basic_carpentry', 'basic_carpentry', 60, 1200, 'FIXED', 4.89, 162, TRUE, 55),
  ('69304711-dc0e-4435-a2d2-51807c977efd', 'c1000000-0000-0000-0000-000000000009', 'a2000000-0000-0000-0000-000000000036', 'gypsum-false-ceiling', 'Gypsum False Ceiling', 'Standard GI framing and Gypsum board installation with joint finishing (excluding lights)....', 'Standard GI framing and Gypsum board installation with joint finishing (excluding lights).', 'basic_decor', 'basic_decor', 60, 80, 'FIXED', 4.90, 185, TRUE, 56),
  ('ec4354b1-8b65-463a-8926-f5b52d33a83c', 'c1000000-0000-0000-0000-000000000009', 'a2000000-0000-0000-0000-000000000036', 'pop-punched-ceiling', 'POP Punched Ceiling', 'Plaster of Paris ceiling with custom cornices or multi-level hidden cove lighting designs....', 'Plaster of Paris ceiling with custom cornices or multi-level hidden cove lighting designs.', 'basic_decor', 'basic_decor', 60, 95, 'FIXED', 4.91, 208, TRUE, 57),
  ('80c43fbf-97d7-4f10-9419-8589d7971b44', 'c1000000-0000-0000-0000-000000000009', 'a2000000-0000-0000-0000-000000000037', 'wallpaper-installation', 'Wallpaper Installation', 'Applying adhesive and aligning patterns for standard 57 sq.ft. wallpaper rolls....', 'Applying adhesive and aligning patterns for standard 57 sq.ft. wallpaper rolls.', 'basic_decor', 'basic_decor', 60, 350, 'FIXED', 4.92, 231, TRUE, 58),
  ('1397abae-aef7-40a9-93f5-c991d6d54f5e', 'c1000000-0000-0000-0000-000000000009', 'a2000000-0000-0000-0000-000000000037', 'pvc-louver-paneling', 'PVC / Louver Paneling', 'Supplying and installing fluted wooden/PVC louvers for TV units or accent walls....', 'Supplying and installing fluted wooden/PVC louvers for TV units or accent walls.', 'basic_decor', 'basic_decor', 60, 150, 'FIXED', 4.93, 254, TRUE, 59),
  ('ff2f0f6a-7ded-4938-b3fd-4e6d3b639a2e', 'c1000000-0000-0000-0000-000000000009', 'a2000000-0000-0000-0000-000000000037', 'curtain-rod-blinds-setup', 'Curtain Rod / Blinds Setup', 'Drilling and mounting curtain tracks, poles, or roller/zebra blinds....', 'Drilling and mounting curtain tracks, poles, or roller/zebra blinds.', 'basic_decor', 'basic_decor', 60, 250, 'FIXED', 4.94, 277, TRUE, 60),
  ('2c49d901-e9e5-4421-b69e-0e89154ae9ad', 'c1000000-0000-0000-0000-000000000009', 'a2000000-0000-0000-0000-000000000037', 'custom-curtain-stitching', 'Custom Curtain Stitching', 'Tailoring raw fabric into pleated, eyelet, or Roman blind curtains....', 'Tailoring raw fabric into pleated, eyelet, or Roman blind curtains.', 'basic_decor', 'basic_decor', 60, 300, 'FIXED', 4.80, 300, TRUE, 61),
  ('5357ad80-7764-4ba4-a006-af6af89135cf', 'c1000000-0000-0000-0000-000000000009', 'a2000000-0000-0000-0000-000000000039', 'interior-consult-basic', 'Interior Consult (Basic)', '2D layout planning and basic color/furniture consultation with a designer....', '2D layout planning and basic color/furniture consultation with a designer.', 'basic_decor', 'basic_decor', 60, 2500, 'FIXED', 4.81, 323, TRUE, 62),
  ('d34c3ac3-875e-4c5a-8103-40ffc8b6277f', 'c1000000-0000-0000-0000-000000000009', 'a2000000-0000-0000-0000-000000000039', '3d-interior-rendering', '3D Interior Rendering', 'High-quality 3D visual mockups of proposed interior layouts and lighting....', 'High-quality 3D visual mockups of proposed interior layouts and lighting.', 'basic_decor', 'basic_decor', 60, 4000, 'FIXED', 4.82, 346, TRUE, 63),
  ('bf3b7f63-5bc2-4f2f-beb8-fde297f5e503', 'c1000000-0000-0000-0000-000000000010', 'a2000000-0000-0000-0000-000000000040', 'wash-fold', 'Wash & Fold', 'Standard machine wash, tumble dry, and folding (min order usually 3-5 kg)....', 'Standard machine wash, tumble dry, and folding (min order usually 3-5 kg).', 'basic_laundry', 'basic_laundry', 60, 80, 'FIXED', 4.83, 369, TRUE, 64),
  ('3fc90a63-e9bf-4fde-a3ec-fcaa7c8936df', 'c1000000-0000-0000-0000-000000000010', 'a2000000-0000-0000-0000-000000000040', 'wash-iron', 'Wash & Iron', 'Standard machine wash, tumble dry, and steam pressing....', 'Standard machine wash, tumble dry, and steam pressing.', 'basic_laundry', 'basic_laundry', 60, 120, 'FIXED', 4.84, 392, TRUE, 65),
  ('2b5f77e0-1f32-48de-826e-700995f41665', 'c1000000-0000-0000-0000-000000000010', 'a2000000-0000-0000-0000-000000000041', '2-piece-suit-dry-clean', '2-Piece Suit Dry Clean', 'Chemical dry cleaning, stain removal, and steam pressing for men''s suits....', 'Chemical dry cleaning, stain removal, and steam pressing for men''s suits.', 'basic_laundry', 'basic_laundry', 60, 350, 'FIXED', 4.85, 415, TRUE, 66),
  ('7beba188-103f-467c-9d8c-f7d6ba7c0e4d', 'c1000000-0000-0000-0000-000000000010', 'a2000000-0000-0000-0000-000000000041', 'saree-dry-clean-normal', 'Saree Dry Clean (Normal)', 'Dry cleaning for silk, chiffon, or cotton sarees without heavy embroidery....', 'Dry cleaning for silk, chiffon, or cotton sarees without heavy embroidery.', 'basic_laundry', 'basic_laundry', 60, 250, 'FIXED', 4.86, 438, TRUE, 67),
  ('e3dc4259-6c4b-4e58-ab0b-f95b1b1e5eb8', 'c1000000-0000-0000-0000-000000000010', 'a2000000-0000-0000-0000-000000000041', 'bridal-wear-dry-clean', 'Bridal Wear Dry Clean', 'Specialized gentle cleaning for heavy zari, mirror work, or bridal outfits....', 'Specialized gentle cleaning for heavy zari, mirror work, or bridal outfits.', 'basic_laundry', 'basic_laundry', 60, 900, 'FIXED', 4.87, 461, TRUE, 68),
  ('a33c4ca9-bb05-4826-9516-4661a81846bc', 'c1000000-0000-0000-0000-000000000010', 'a2000000-0000-0000-0000-000000000042', 'blanket-quilt-dry-clean', 'Blanket / Quilt Dry Clean', 'Deep extraction cleaning for heavy single/double winter blankets....', 'Deep extraction cleaning for heavy single/double winter blankets.', 'basic_laundry', 'basic_laundry', 60, 350, 'FIXED', 4.88, 484, TRUE, 69),
  ('4d139b02-a4aa-4e04-8268-20826d591b00', 'c1000000-0000-0000-0000-000000000010', 'a2000000-0000-0000-0000-000000000042', 'curtain-dry-cleaning', 'Curtain Dry Cleaning', 'Removing dust, washing/dry-cleaning, and pressing heavy drapes....', 'Removing dust, washing/dry-cleaning, and pressing heavy drapes.', 'basic_laundry', 'basic_laundry', 60, 150, 'FIXED', 4.89, 507, TRUE, 70),
  ('c69259ac-86cd-4407-8bbc-3d3b1a178523', 'c1000000-0000-0000-0000-000000000010', 'a2000000-0000-0000-0000-000000000043', 'sneaker-canvas-wash', 'Sneaker / Canvas Wash', 'Deep cleaning of soles, upper fabric, and laces using sneaker-safe chemicals....', 'Deep cleaning of soles, upper fabric, and laces using sneaker-safe chemicals.', 'basic_laundry', 'basic_laundry', 60, 300, 'FIXED', 4.90, 130, TRUE, 71),
  ('11926c9b-550a-4128-84ab-52e32306dcba', 'c1000000-0000-0000-0000-000000000010', 'a2000000-0000-0000-0000-000000000043', 'suede-leather-care', 'Suede / Leather Care', 'Specialized dry brushing, conditioning, and polishing for premium leather/suede....', 'Specialized dry brushing, conditioning, and polishing for premium leather/suede.', 'basic_laundry', 'basic_laundry', 60, 600, 'FIXED', 4.91, 153, TRUE, 72)
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  subcategory_id = EXCLUDED.subcategory_id,
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  base_price = EXCLUDED.base_price,
  thumbnail_url = EXCLUDED.thumbnail_url,
  hero_image_url = EXCLUDED.hero_image_url,
  is_active = EXCLUDED.is_active;

-- ==============================================================================
-- 12. SEED DATA: NATIONAL DEFAULT & CITY PRICING OVERRIDES
-- ==============================================================================
INSERT INTO public.service_prices (id, service_id, city_id, price_type, base_price, labour_price, material_price, tax_inclusive, tax_rate, currency, is_active)
VALUES
  (gen_random_uuid(), '0d5dda28-fc98-42ff-81f6-109a4ff7d1c3', NULL, 'FIXED', 549, 549, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'e22a92e0-882e-44a2-a9b9-6fa3d0196193', NULL, 'FIXED', 2500, 2500, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '256eead4-4926-4cc1-9ebd-6a5555ff2bc6', NULL, 'FIXED', 1500, 1500, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'c567fc5d-2fad-4c31-b39d-240735e1b4ba', NULL, 'FIXED', 699, 699, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '818c7128-67bd-4ac8-b1f8-2e6fd1c93a8e', NULL, 'FIXED', 499, 499, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '5eb63271-2885-4914-ab64-07a1b9ae91df', NULL, 'FIXED', 1200, 1200, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'c724c740-27dc-4c9b-abdd-01cdf97807c3', NULL, 'FIXED', 1500, 1500, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '36185588-fb6c-420c-ae46-e8d67ea8bcc7', NULL, 'FIXED', 599, 599, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'fc3df1f5-6cf3-4104-85c5-946792c8a55b', NULL, 'FIXED', 449, 449, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '35ff44c9-5edb-4380-8f8e-9887764e2621', NULL, 'FIXED', 1200, 1200, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '007c5500-9aaf-4d89-8d01-443d0baa3c68', NULL, 'FIXED', 799, 799, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '40627567-d73e-4657-8326-c31086e2e822', NULL, 'FIXED', 599, 599, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'ff7d0317-169f-4441-9c4b-f311580ca331', NULL, 'FIXED', 399, 399, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'f6302e15-1d68-4c85-9b11-c9c49f682f54', NULL, 'FIXED', 2899, 2899, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '2fdd14e0-e481-41eb-b578-59e9e7c1150a', NULL, 'FIXED', 3899, 3899, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '97e26df2-d631-42c3-934e-c4479b67adc9', NULL, 'FIXED', 5199, 5199, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '53baa129-441e-4237-a8b4-4f52cf35332c', NULL, 'FIXED', 499, 499, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '99facbad-117f-4365-b29c-7b46fe2713e5', NULL, 'FIXED', 629, 629, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '40e6b660-8ec8-4412-97de-956d03d4f4af', NULL, 'FIXED', 1399, 1399, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '0c333b72-f9b0-45d8-ad35-ebda9f0a9e12', NULL, 'FIXED', 250, 250, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '667d5948-f77a-4100-a39b-2a06d989f3c2', NULL, 'FIXED', 799, 799, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '10edf4ca-a4cd-4b2d-9c13-4ad624325b03', NULL, 'FIXED', 129, 129, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '3c325132-5710-438b-a8ab-4f377f041883', NULL, 'FIXED', 199, 199, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '430bfb21-6bc0-49f9-ae78-44cfd227bab2', NULL, 'FIXED', 1299, 1299, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'ebb02a9b-3c22-4625-8328-c95857e95b84', NULL, 'FIXED', 149, 149, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'd4c8114f-79b4-4da2-802c-4450fa7eafe5', NULL, 'FIXED', 449, 449, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'ffc910bb-948c-4a07-a428-477df9f7b733', NULL, 'FIXED', 149, 149, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '2b191d45-a770-47ae-80c1-303f87e19934', NULL, 'FIXED', 1200, 1200, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'd8560b8d-064f-4ae8-abe4-d0c37152c27c', NULL, 'FIXED', 99, 99, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'abac3d28-d0b4-4494-860e-7c6091640cfe', NULL, 'FIXED', 199, 199, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'e8c1eb65-a855-41ed-b95d-84f447707512', NULL, 'FIXED', 199, 199, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '7a505521-06c2-44e0-bf2c-d06e5c63c1c7', NULL, 'FIXED', 499, 499, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'b4a22a90-cb8a-4751-921c-b54f5c4c8a79', NULL, 'FIXED', 599, 599, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'b8d4bcf1-98dc-470f-86d3-cf903a01cd78', NULL, 'FIXED', 449, 449, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'c1112c6a-32df-410c-9fe0-f141254e276d', NULL, 'FIXED', 349, 349, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '278c8706-c510-4587-b249-db70dec661d0', NULL, 'FIXED', 399, 399, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '737d2f82-6c10-4961-8202-7334e410abf9', NULL, 'FIXED', 299, 299, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '27aa450f-127b-4a45-9522-fa5e54551f97', NULL, 'FIXED', 9, 9, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '7f7d36a0-7569-44d8-b660-bd75ccb174b5', NULL, 'FIXED', 15, 15, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'a77b6e0a-0a83-4aaa-b110-3f87fe38fc46', NULL, 'FIXED', 25, 25, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '1c36dbcb-6274-43d1-9bdf-0d5b02564371', NULL, 'FIXED', 70, 70, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '14958d9f-9e90-4afd-bb2c-f1a075161f5a', NULL, 'FIXED', 12, 12, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'c3739c5c-5695-490b-bd4a-80b53ec057c2', NULL, 'FIXED', 15, 15, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'fdd78f07-b00c-4d23-9150-f37d8b25a7bd', NULL, 'FIXED', 60, 60, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'd0a78250-cf0c-4517-891d-46f9380c57ec', NULL, 'FIXED', 799, 799, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '10e06b71-78a0-42c5-a2c7-64f8486b6490', NULL, 'FIXED', 3500, 3500, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '4430c0b8-61d0-4b82-bddb-74eacd7a294b', NULL, 'FIXED', 1500, 1500, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'f62f550f-6b86-4d74-98ea-5c11fe6df45a', NULL, 'FIXED', 499, 499, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'eedb2ee6-0294-4cf0-9eb7-a93a27a0b5aa', NULL, 'FIXED', 999, 999, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '475a54b7-2b4a-4218-b107-0a96d074fa45', NULL, 'FIXED', 1500, 1500, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '46872a0c-1931-4f2d-a5bb-ad32db3e87e9', NULL, 'FIXED', 4500, 4500, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '97851bfe-178d-411d-9053-017bb5836e6d', NULL, 'FIXED', 1200, 1200, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'f22cc290-32d8-4244-a5d8-2f512773fa14', NULL, 'FIXED', 1600, 1600, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '6605f133-94d4-48c1-bd57-31fd33aedbbf', NULL, 'FIXED', 4000, 4000, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'c4f845d5-b146-4723-b0f7-f326eacaf42f', NULL, 'FIXED', 1200, 1200, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '69304711-dc0e-4435-a2d2-51807c977efd', NULL, 'FIXED', 80, 80, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'ec4354b1-8b65-463a-8926-f5b52d33a83c', NULL, 'FIXED', 95, 95, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '80c43fbf-97d7-4f10-9419-8589d7971b44', NULL, 'FIXED', 350, 350, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '1397abae-aef7-40a9-93f5-c991d6d54f5e', NULL, 'FIXED', 150, 150, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'ff2f0f6a-7ded-4938-b3fd-4e6d3b639a2e', NULL, 'FIXED', 250, 250, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '2c49d901-e9e5-4421-b69e-0e89154ae9ad', NULL, 'FIXED', 300, 300, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '5357ad80-7764-4ba4-a006-af6af89135cf', NULL, 'FIXED', 2500, 2500, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'd34c3ac3-875e-4c5a-8103-40ffc8b6277f', NULL, 'FIXED', 4000, 4000, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'bf3b7f63-5bc2-4f2f-beb8-fde297f5e503', NULL, 'FIXED', 80, 80, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '3fc90a63-e9bf-4fde-a3ec-fcaa7c8936df', NULL, 'FIXED', 120, 120, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '2b5f77e0-1f32-48de-826e-700995f41665', NULL, 'FIXED', 350, 350, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '7beba188-103f-467c-9d8c-f7d6ba7c0e4d', NULL, 'FIXED', 250, 250, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'e3dc4259-6c4b-4e58-ab0b-f95b1b1e5eb8', NULL, 'FIXED', 900, 900, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'a33c4ca9-bb05-4826-9516-4661a81846bc', NULL, 'FIXED', 350, 350, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '4d139b02-a4aa-4e04-8268-20826d591b00', NULL, 'FIXED', 150, 150, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), 'c69259ac-86cd-4407-8bbc-3d3b1a178523', NULL, 'FIXED', 300, 300, 0, FALSE, 18.00, 'INR', TRUE),
  (gen_random_uuid(), '11926c9b-550a-4128-84ab-52e32306dcba', NULL, 'FIXED', 600, 600, 0, FALSE, 18.00, 'INR', TRUE);

-- ==============================================================================
-- 13. SEED DATA: CANONICAL HERO ASSETS & THEMES (100% CATEGORY-ALIGNED)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.category_hero_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  storage_path TEXT,
  image_url TEXT,
  mobile_image_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  gradient_start TEXT,
  gradient_end TEXT,
  text_color TEXT,
  is_dark BOOLEAN NOT NULL DEFAULT TRUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  cta_label TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.category_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE UNIQUE,
  primary_color TEXT,
  secondary_color TEXT,
  surface_color TEXT,
  accent_color TEXT,
  text_color TEXT,
  muted_text_color TEXT,
  button_color TEXT,
  button_text_color TEXT,
  gradient_start TEXT,
  gradient_end TEXT,
  is_dark BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Delete any legacy/mismatched hero assets and themes
DELETE FROM public.category_hero_assets;
DELETE FROM public.category_themes;

INSERT INTO public.category_hero_assets (
  id, category_id, name, slug, storage_path, image_url, mobile_image_url,
  primary_color, secondary_color, gradient_start, gradient_end, text_color, is_dark,
  title, subtitle, cta_label, display_order, is_active
) VALUES
  ('ba000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'AC & Appliances Hero', 'ac-appliances-hero', 'hero-assets/categories/ac/hero.webp', 'hero_background', 'hero_background', '#0284C7', '#E0F2FE', '#D0EEFE', '#38BDF8', '#0F172A', FALSE, 'Keep your home cool & efficient', 'Certified AC technicians and appliance specialists at your doorstep', 'Book AC Service', 1, TRUE),
  ('ba000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'Electrician Hero', 'electrician-hero', 'hero-assets/categories/electrical/hero.webp', 'hero_background', 'hero_background', '#D97706', '#FEF3C7', '#D97706', '#FBBF24', '#FFFFFF', TRUE, 'Power your home safely', 'Verified electricians for wiring, MCB faults, and fans in 20 mins', 'Book Electrician', 2, TRUE),
  ('ba000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 'Plumbing Hero', 'plumbing-hero', 'hero-assets/categories/plumbing/hero.webp', 'hero_background', 'hero_background', '#692EB7', '#F3E8FF', '#D9B3E2', '#522CA4', '#FFFFFF', TRUE, 'Reliable plumbing in 20 minutes', 'Expert fix for pipe leaks, taps, sanitary fittings, and blockages', 'Book Plumber', 3, TRUE),
  ('ba000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000004', 'Home Cleaning Hero', 'home-cleaning-hero', 'hero-assets/categories/cleaning/hero.webp', 'hero_gardener', 'hero_gardener', '#475569', '#F1F5F9', '#475569', '#94A3B8', '#FFFFFF', TRUE, 'Keep your home spotless & fresh', 'Professional deep cleaning and sofa sanitization at your door', 'Book Cleaning', 4, TRUE),
  ('ba000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000005', 'Painting Hero', 'painting-hero', 'hero-assets/categories/painting/hero.webp', 'hero_gardener', 'hero_gardener', '#9F1239', '#FFE4E6', '#9F1239', '#F43F5E', '#FFFFFF', TRUE, 'Bring your walls to life', 'Professional wall painting, waterproof coats, and room refreshes', 'Explore Painting', 5, TRUE),
  ('ba000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000006', 'RO & Water Hero', 'ro-water-hero', 'hero-assets/categories/ro-water/hero.webp', 'hero_background', 'hero_background', '#0284C7', '#E0F2FE', '#0284C7', '#06B6D4', '#FFFFFF', TRUE, 'Pure, safe drinking water always', 'RO service, sediment filter change, membrane check, and TDS tuning', 'Book RO Service', 6, TRUE),
  ('ba000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000007', 'Carpentry Hero', 'carpentry-hero', 'hero-assets/categories/carpentry/hero.webp', 'hero_background', 'hero_background', '#78350F', '#FEF9C3', '#78350F', '#CA8A04', '#FFFFFF', TRUE, 'Precision woodwork & furniture repair', 'Door lock repairs, hinge fittings, shelves, and custom woodwork', 'Book Carpenter', 7, TRUE),
  ('ba000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000008', 'Pest Control Hero', 'pest-control-hero', 'hero-assets/categories/pest/hero.webp', 'hero_gardener', 'hero_gardener', '#1E293B', '#F8FAFC', '#1E293B', '#475569', '#FFFFFF', TRUE, 'A cleaner, safer, pest-free home', 'Odorless certified termite, cockroach, and bed bug protection', 'Book Pest Control', 8, TRUE),
  ('ba000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000009', 'Home Decor Hero', 'home-decor-hero', 'hero-assets/categories/decor/hero.webp', 'hero_homedecors', 'hero_homedecors', '#DB2777', '#FFF1F2', 'hsla(353, 100%, 93%, 1.00)', '#EE9CA7', '#111111', FALSE, 'Make your celebrations memorable', 'Occasional lighting, balloon styling, and theme decoration', 'Explore Decor', 9, TRUE),
  ('ba000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000010', 'Laundry Hero', 'laundry-hero', 'hero-assets/categories/laundry/hero.webp', 'hero_background', 'hero_background', '#5B21B6', '#EDE9FE', '#5B21B6', '#8B5CF6', '#FFFFFF', TRUE, 'Crisp, sanitized laundry at your door', 'Wash & fold, steam pressing, and organic dry cleaning', 'Book Laundry', 10, TRUE);

INSERT INTO public.category_themes (
  id, category_id, primary_color, secondary_color, button_color, button_text_color,
  gradient_start, gradient_end, is_dark
) VALUES
  ('de000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', '#0284C7', '#E0F2FE', '#0284C7', '#FFFFFF', '#D0EEFE', '#38BDF8', FALSE),
  ('de000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', '#D97706', '#FEF3C7', '#D97706', '#FFFFFF', '#D97706', '#FBBF24', TRUE),
  ('de000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', '#692EB7', '#F3E8FF', '#5D2BAE', '#FFFFFF', '#D9B3E2', '#522CA4', TRUE),
  ('de000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000004', '#475569', '#F1F5F9', '#475569', '#FFFFFF', '#475569', '#94A3B8', TRUE),
  ('de000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000005', '#9F1239', '#FFE4E6', '#BE185D', '#FFFFFF', '#9F1239', '#F43F5E', TRUE),
  ('de000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000006', '#0284C7', '#E0F2FE', '#0284C7', '#FFFFFF', '#0284C7', '#06B6D4', TRUE),
  ('de000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000007', '#78350F', '#FEF9C3', '#78350F', '#FFFFFF', '#78350F', '#CA8A04', TRUE),
  ('de000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000008', '#1E293B', '#F8FAFC', '#1E293B', '#FFFFFF', '#1E293B', '#475569', TRUE),
  ('de000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000009', '#DB2777', '#FFF1F2', '#DB2777', '#FFFFFF', '#FFDDE1', '#EE9CA7', FALSE),
  ('de000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000010', '#5B21B6', '#EDE9FE', '#6D28D9', '#FFFFFF', '#5B21B6', '#8B5CF6', TRUE);

-- Seed Import Source Record
-- ==============================================================================
-- 14. SEED DATA: AUDIT TRACEABILITY
-- ==============================================================================
INSERT INTO public.catalog_import_sources (id, source_file_name, source_type, import_batch_id, status)
VALUES (gen_random_uuid(), 'Serventica_Service_Pricing_Data.csv', 'BENCHMARK_SHEET_EXPORT', 'ce01c6d0-a061-4425-894e-5db9781384cf', 'COMPLETED');
