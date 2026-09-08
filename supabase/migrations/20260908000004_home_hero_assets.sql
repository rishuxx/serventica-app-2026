-- ==============================================================================
-- SERVENTICA MIGRATION 4: HOME HERO ASSETS & ADAPTIVE PALETTES
-- ==============================================================================

-- 1. CREATE HOME HERO ASSETS TABLE
CREATE TABLE IF NOT EXISTS public.home_hero_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  storage_path TEXT NOT NULL,
  image_url TEXT NOT NULL,
  mobile_image_url TEXT,
  
  -- Precomputed Visual Color Palette (Zero runtime cost)
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  accent_color TEXT,
  gradient_start TEXT NOT NULL,
  gradient_end TEXT NOT NULL,
  text_color TEXT NOT NULL DEFAULT '#FFFFFF',
  overlay_color TEXT DEFAULT 'rgba(0, 0, 0, 0.22)',
  is_dark BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Default Marketing Copy
  headline TEXT NOT NULL,
  subheadline TEXT NOT NULL,
  cta_label TEXT NOT NULL DEFAULT 'Shop Now',
  cta_target_route TEXT DEFAULT 'OnDemandGardener',
  
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ENABLE ROW LEVEL SECURITY AND PERMISSIVE PUBLIC READ
ALTER TABLE public.home_hero_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public active hero assets are viewable by all" ON public.home_hero_assets;
CREATE POLICY "Public active hero assets are viewable by all"
  ON public.home_hero_assets FOR SELECT
  USING (is_active = TRUE);

-- 3. SEED BOTH HERO ASSETS (GARDENER ACTIVE + AC TECHNICIAN FALLBACK)
INSERT INTO public.home_hero_assets (
  id,
  name,
  slug,
  storage_path,
  image_url,
  mobile_image_url,
  primary_color,
  secondary_color,
  accent_color,
  gradient_start,
  gradient_end,
  text_color,
  overlay_color,
  is_dark,
  headline,
  subheadline,
  cta_label,
  cta_target_route,
  is_active,
  display_order
) VALUES
  (
    'a1000000-0000-0000-0000-000000000001',
    'Serventica Master Gardener',
    'gardener-lush',
    'hero-assets/home/serventica-hero-gardener-v1.webp',
    'hero_gardener',
    'hero_gardener',
    '#23532F',
    '#1B4326',
    '#FFCC00',
    '#1E4B29',
    '#2F663C',
    '#FFFFFF',
    'rgba(0, 0, 0, 0.22)',
    TRUE,
    'Hire us',
    'let your garden bloom with us hire your personal Gardener for monthly',
    'Shop Now',
    'OnDemandGardener',
    TRUE,
    1
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    'Serventica AC Technician',
    'ac-technician',
    'hero-assets/home/serventica-ac-hero-v1.webp',
    'hero_background',
    'hero_background',
    '#FFBE1A',
    '#FFA000',
    '#111111',
    '#FFBE1A',
    '#FFA000',
    '#111111',
    'rgba(0, 0, 0, 0.22)',
    FALSE,
    'Sit Back & Relax',
    'We''ll take care of all your home needs',
    'Shop Now',
    'ac-appliances',
    FALSE,
    2
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  storage_path = EXCLUDED.storage_path,
  image_url = EXCLUDED.image_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  gradient_start = EXCLUDED.gradient_start,
  gradient_end = EXCLUDED.gradient_end,
  text_color = EXCLUDED.text_color,
  is_dark = EXCLUDED.is_dark,
  headline = EXCLUDED.headline,
  subheadline = EXCLUDED.subheadline,
  cta_label = EXCLUDED.cta_label,
  is_active = EXCLUDED.is_active;
