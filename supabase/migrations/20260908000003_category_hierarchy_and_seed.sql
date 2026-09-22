-- ==============================================================================
-- SERVENTICA MIGRATION 3: CATEGORY HIERARCHY, TIERING & PRODUCTION SEED
-- ==============================================================================

-- 1. ENRICH CATEGORIES TABLE WITH DISCOVERY ATTRIBUTES
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS short_name TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS tier INTEGER NOT NULL DEFAULT 1;

-- 2. CREATE SERVICE PACKAGES TABLE (FOR BUNDLED VALUE OFFERS)
CREATE TABLE IF NOT EXISTS public.service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  package_price NUMERIC(10, 2) NOT NULL,
  original_price NUMERIC(10, 2),
  services_included JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ENSURE RLS POLICIES ON CATEGORIES & PACKAGES
DROP POLICY IF EXISTS "Public active categories are viewable by all" ON public.categories;
CREATE POLICY "Public active categories are viewable by all"
  ON public.categories FOR SELECT
  USING (is_active = TRUE);

ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public active packages are viewable by all" ON public.service_packages;
CREATE POLICY "Public active packages are viewable by all"
  ON public.service_packages FOR SELECT
  USING (is_active = TRUE);

-- 4. SEED INITIAL TOP-LEVEL DISCOVERY CATEGORIES (TIER 1 CORE LAUNCH)
DO $$
DECLARE
  cat RECORD;
  sub RECORD;
BEGIN
  -- Top level categories
  FOR cat IN 
    SELECT * FROM (VALUES
      ('c1000000-0000-0000-0000-000000000001'::uuid, 'AC & Appliances', 'AC & Appliances', 'ac-appliances', 'Expert AC cooling, refrigerator, washing machine and home appliance repair', 'AirVent', 1, TRUE, TRUE, TRUE, 1),
      ('c1000000-0000-0000-0000-000000000002'::uuid, 'Cleaning', 'Cleaning', 'cleaning', 'Professional deep cleaning, sofa shampoo, bathroom scrub, and kitchen care', 'Sparkles', 2, TRUE, TRUE, TRUE, 1),
      ('c1000000-0000-0000-0000-000000000003'::uuid, 'Electrical', 'Electrical', 'electrical', 'Licensed electricians for wiring, MCB tripping, fan installation, and fixtures', 'Zap', 3, TRUE, TRUE, TRUE, 1),
      ('c1000000-0000-0000-0000-000000000004'::uuid, 'Plumbing', 'Plumbing', 'plumbing', 'Leak resolution, tap and sanitary fitting, pipeline unclogging, and pump repair', 'Droplets', 4, TRUE, TRUE, TRUE, 1),
      ('c1000000-0000-0000-0000-000000000005'::uuid, 'Painting', 'Painting', 'painting', 'Interior, exterior, waterproof wall coats, and festival room repaints', 'Paintbrush', 5, TRUE, TRUE, TRUE, 1),
      ('c1000000-0000-0000-0000-000000000006'::uuid, 'RO & Water', 'RO & Water', 'ro-water', 'Purifier maintenance, membrane replacement, filter change, and TDS balancing', 'Waves', 6, TRUE, TRUE, TRUE, 1),
      ('c1000000-0000-0000-0000-000000000007'::uuid, 'Home Decor', 'Home Decor', 'home-decor', 'Occasional lighting, balloon arch decoration, flower setups, and festivity staging', 'Lamp', 7, TRUE, TRUE, TRUE, 1),
      ('c1000000-0000-0000-0000-000000000008'::uuid, 'Carpentry', 'Carpentry', 'carpentry', 'Furniture repair, lock replacement, door hinges, and custom woodwork', 'Hammer', 8, TRUE, TRUE, TRUE, 2),
      ('c1000000-0000-0000-0000-000000000009'::uuid, 'Pest Control', 'Pest Control', 'pest-control', 'Termite, cockroach, and bed bug treatment using odorless certified sprays', 'Bug', 9, TRUE, TRUE, TRUE, 2),
      ('c1000000-0000-0000-0000-000000000010'::uuid, 'Laundry', 'Laundry', 'laundry', 'Wash & fold, dry cleaning, ironing, and fabric sanitization', 'WashingMachine', 10, TRUE, TRUE, TRUE, 3),
      ('c1000000-0000-0000-0000-000000000011'::uuid, 'Home Moving', 'Moving', 'home-moving', 'Packers & movers, household relocation, and heavy loading assistance', 'Truck', 11, TRUE, TRUE, TRUE, 3)
    ) AS t(id, name, short_name, slug, description, icon, sort_order, is_active, is_featured, show_on_home, tier)
  LOOP
    IF EXISTS (SELECT 1 FROM public.categories WHERE slug = cat.slug) THEN
      UPDATE public.categories SET
        name = cat.name,
        short_name = cat.short_name,
        description = cat.description,
        icon = cat.icon,
        sort_order = cat.sort_order,
        is_active = cat.is_active,
        is_featured = cat.is_featured,
        show_on_home = cat.show_on_home,
        tier = cat.tier
      WHERE slug = cat.slug;
    ELSE
      INSERT INTO public.categories (id, name, short_name, slug, description, icon, sort_order, is_active, is_featured, show_on_home, tier)
      VALUES (cat.id, cat.name, cat.short_name, cat.slug, cat.description, cat.icon, cat.sort_order, cat.is_active, cat.is_featured, cat.show_on_home, cat.tier)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        short_name = EXCLUDED.short_name,
        slug = EXCLUDED.slug,
        description = EXCLUDED.description,
        icon = EXCLUDED.icon,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active,
        is_featured = EXCLUDED.is_featured,
        show_on_home = EXCLUDED.show_on_home,
        tier = EXCLUDED.tier;
    END IF;
  END LOOP;

  -- Subcategories for AC & Appliances
  FOR sub IN
    SELECT * FROM (VALUES
      ('c1000000-0000-0001-0000-000000000001'::uuid, 'AC', 'AC', 'ac-sub', 'c1000000-0000-0000-0000-000000000001'::uuid, 1, TRUE, FALSE, 1),
      ('c1000000-0000-0001-0000-000000000002'::uuid, 'Refrigerator', 'Fridge', 'refrigerator-sub', 'c1000000-0000-0000-0000-000000000001'::uuid, 2, TRUE, FALSE, 1),
      ('c1000000-0000-0001-0000-000000000003'::uuid, 'Washing Machine', 'Washing', 'washing-machine-sub', 'c1000000-0000-0000-0000-000000000001'::uuid, 3, TRUE, FALSE, 1),
      ('c1000000-0000-0001-0000-000000000004'::uuid, 'Television', 'TV', 'tv-sub', 'c1000000-0000-0000-0000-000000000001'::uuid, 4, TRUE, FALSE, 1)
    ) AS t(id, name, short_name, slug, parent_id, sort_order, is_active, show_on_home, tier)
  LOOP
    IF EXISTS (SELECT 1 FROM public.categories WHERE slug = sub.slug) THEN
      UPDATE public.categories SET
        name = sub.name,
        short_name = sub.short_name,
        parent_id = sub.parent_id,
        sort_order = sub.sort_order,
        is_active = sub.is_active,
        show_on_home = sub.show_on_home,
        tier = sub.tier
      WHERE slug = sub.slug;
    ELSE
      INSERT INTO public.categories (id, name, short_name, slug, parent_id, sort_order, is_active, show_on_home, tier)
      VALUES (sub.id, sub.name, sub.short_name, sub.slug, sub.parent_id, sub.sort_order, sub.is_active, sub.show_on_home, sub.tier)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        short_name = EXCLUDED.short_name,
        slug = EXCLUDED.slug,
        parent_id = EXCLUDED.parent_id;
    END IF;
  END LOOP;
END $$;
