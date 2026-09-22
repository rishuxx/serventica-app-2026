-- ==============================================================================
-- SERVENTICA MIGRATION 2: HOME CATALOG, PROMOTIONS & FULL-TEXT SEARCH
-- ==============================================================================

-- 1. HOME BANNERS / PROMOTIONS TABLE
CREATE TABLE IF NOT EXISTS public.home_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  badge_text TEXT,
  image_url TEXT NOT NULL,
  cta_label TEXT,
  target_route TEXT NOT NULL DEFAULT 'Category',
  target_id TEXT,
  discount_percentage INTEGER,
  priority INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_banners_active ON public.home_banners(is_active, priority);

-- 2. ADD SEARCH & METADATA COLUMNS TO SERVICES & CATEGORIES
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS short_tagline TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- Ensure foreign key constraint on services table correctly points to categories table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.services'::regclass
      AND contype = 'f'
      AND conname LIKE '%category%'
  ) LOOP
    EXECUTE 'ALTER TABLE public.services DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname) || ' CASCADE';
  END LOOP;
  ALTER TABLE public.services ADD CONSTRAINT services_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;
END $$;

-- 3. FULL-TEXT SEARCH FUNCTION & TRIGGER FOR SERVICES
CREATE OR REPLACE FUNCTION public.services_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.short_tagline, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_services_search_update ON public.services;
CREATE TRIGGER trg_services_search_update
  BEFORE INSERT OR UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.services_search_vector_update();

CREATE INDEX IF NOT EXISTS idx_services_search_vector ON public.services USING GIN (search_vector);

-- 4. ROW LEVEL SECURITY (RLS) FOR HOME & BANNERS
ALTER TABLE public.home_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public active home banners are viewable by all" ON public.home_banners;
CREATE POLICY "Public active home banners are viewable by all"
  ON public.home_banners FOR SELECT
  USING (is_active = TRUE);

-- 5. SEED HOME BANNERS & ACCURATE SERVENTICA CATEGORIES & BASICS
INSERT INTO public.home_banners (id, title, subtitle, badge_text, image_url, target_route, discount_percentage, priority, is_active)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    'Hire us',
    'let your garden bloom with us hire your personal Gardener for monthly',
    'Serventica Originals',
    'banner_gardener',
    'OnDemandGardener',
    40,
    1,
    TRUE
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'Occasional Decors',
    'Get Your Place Ready for Celebrations. Any Time, Any Where with us',
    'Visiting Free',
    'banner_decors',
    'ServenticaOriginals',
    50,
    2,
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  badge_text = EXCLUDED.badge_text,
  is_active = EXCLUDED.is_active;

-- SEED THE 3 CORE PILLARS (Services, Repairs, OnDemand)
INSERT INTO public.categories (id, name, slug, description, image_url, sort_order, is_active)
VALUES
  (
    'c0000000-0000-0000-0000-000000000011',
    'Services',
    'services',
    'Deep cleaning, painting, and professional home services',
    'category_services',
    1,
    TRUE
  ),
  (
    'c0000000-0000-0000-0000-000000000012',
    'Repairs',
    'repairs',
    'AC, appliance, electrical, and plumbing repair specialists',
    'category_repairs',
    2,
    TRUE
  ),
  (
    'c0000000-0000-0000-0000-000000000013',
    'OnDemand',
    'ondemand',
    'Instant gardeners, drivers, and on-demand helper professionals',
    'category_ondemand',
    3,
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  image_url = EXCLUDED.image_url;

-- SEED 8 BASICS SERVICES
INSERT INTO public.services (id, category_id, name, slug, description, short_tagline, base_price, duration_minutes, image_url, pricing_type, rating, reviews_count, is_active)
VALUES
  (
    'e0000000-0000-0000-0000-000000000011',
    'c0000000-0000-0000-0000-000000000012',
    'AC Repair',
    'ac-repair',
    'Expert AC cooling, gas leak check, and compressor diagnosis',
    'Repair',
    499.00,
    60,
    'basic_ac_repair',
    'FIXED',
    4.9,
    180,
    TRUE
  ),
  (
    'e0000000-0000-0000-0000-000000000012',
    'c0000000-0000-0000-0000-000000000012',
    'Fan/Cooler',
    'fan-cooler',
    'Ceiling fan installation, regulator repair, cooler motor service',
    'Service',
    199.00,
    45,
    'basic_fan_cooler',
    'FIXED',
    4.8,
    95,
    TRUE
  ),
  (
    'e0000000-0000-0000-0000-000000000013',
    'c0000000-0000-0000-0000-000000000012',
    'RO/Filter',
    'ro-filter',
    'Water purifier filter replacement, membrane check, and TDS tuning',
    'Purifier',
    349.00,
    45,
    'basic_ro_filter',
    'FIXED',
    4.9,
    210,
    TRUE
  ),
  (
    'e0000000-0000-0000-0000-000000000014',
    'c0000000-0000-0000-0000-000000000012',
    'Invertor',
    'invertor-repair',
    'Inverter wiring check, battery water refill, and backup diagnostics',
    'Battery',
    299.00,
    60,
    'basic_invertor',
    'FIXED',
    4.7,
    88,
    TRUE
  ),
  (
    'e0000000-0000-0000-0000-000000000015',
    'c0000000-0000-0000-0000-000000000012',
    'Electric',
    'electric-service',
    'Short circuit fix, switchboard repair, MCB trip troubleshooting',
    'Wiring',
    149.00,
    30,
    'basic_electric',
    'FIXED',
    4.85,
    340,
    TRUE
  ),
  (
    'e0000000-0000-0000-0000-000000000016',
    'c0000000-0000-0000-0000-000000000011',
    'Cleaning',
    'home-cleaning',
    'Kitchen, bathroom, sofa shampooing, and intense deep scrub',
    'Home',
    499.00,
    90,
    'basic_cleaning',
    'FIXED',
    4.9,
    155,
    TRUE
  ),
  (
    'e0000000-0000-0000-0000-000000000017',
    'c0000000-0000-0000-0000-000000000012',
    'Plumbing',
    'plumbing-service',
    'Pipe leak fix, tap replacement, blockage clearing, and fittings',
    'Fittings',
    199.00,
    45,
    'basic_plumbing',
    'FIXED',
    4.8,
    275,
    TRUE
  ),
  (
    'e0000000-0000-0000-0000-000000000018',
    'c0000000-0000-0000-0000-000000000011',
    'Washing Machine',
    'washing-machine-service',
    'Drum noise fix, drainage repair, motor spin troubleshooting',
    'Repair',
    299.00,
    60,
    'basic_washing_machine',
    'FIXED',
    4.85,
    140,
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  short_tagline = EXCLUDED.short_tagline,
  base_price = EXCLUDED.base_price,
  image_url = EXCLUDED.image_url;
