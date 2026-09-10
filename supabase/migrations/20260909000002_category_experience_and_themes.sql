-- ==============================================================================
-- SERVENTICA MIGRATION 6: CATEGORY EXPERIENCES, DYNAMIC HERO ASSETS & THEMES
-- ==============================================================================

-- 1. CREATE CATEGORY HERO ASSETS TABLE
CREATE TABLE IF NOT EXISTS public.category_hero_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  storage_path TEXT NOT NULL,
  image_url TEXT NOT NULL,
  mobile_image_url TEXT,
  
  -- Precomputed Visual Color Palette (Zero runtime extraction overhead)
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  tertiary_color TEXT,
  gradient_start TEXT NOT NULL,
  gradient_end TEXT NOT NULL,
  text_color TEXT NOT NULL DEFAULT '#FFFFFF',
  overlay_color TEXT DEFAULT 'rgba(0, 0, 0, 0.22)',
  is_dark BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Category Hero Content
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  cta_label TEXT NOT NULL DEFAULT 'Explore Services',
  
  display_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_category_hero_category
  ON public.category_hero_assets(category_id, is_active, display_order);

-- 2. CREATE CATEGORY THEMES TABLE
CREATE TABLE IF NOT EXISTS public.category_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL UNIQUE REFERENCES public.categories(id) ON DELETE CASCADE,
  
  primary_color TEXT NOT NULL,
  secondary_color TEXT,
  surface_color TEXT DEFAULT '#FFFFFF',
  accent_color TEXT,
  text_color TEXT NOT NULL DEFAULT '#111111',
  muted_text_color TEXT DEFAULT '#666666',
  button_color TEXT NOT NULL,
  button_text_color TEXT NOT NULL DEFAULT '#FFFFFF',
  
  gradient_start TEXT NOT NULL,
  gradient_mid TEXT,
  gradient_end TEXT NOT NULL,
  is_dark BOOLEAN NOT NULL DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ENABLE ROW LEVEL SECURITY AND PERMISSIVE READ POLICIES
ALTER TABLE public.category_hero_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public active category hero assets are viewable by all" ON public.category_hero_assets;
CREATE POLICY "Public active category hero assets are viewable by all"
  ON public.category_hero_assets FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public category themes are viewable by all" ON public.category_themes;
CREATE POLICY "Public category themes are viewable by all"
  ON public.category_themes FOR SELECT
  USING (TRUE);

-- 4. SEED CATEGORY HERO ASSETS (FOR ALL 12 DISCOVERY CATEGORIES)
-- Note: Reusing high-resolution assets already packaged or linked via AssetRegistry
INSERT INTO public.category_hero_assets (
  id, category_id, name, slug, storage_path, image_url, mobile_image_url,
  primary_color, secondary_color, gradient_start, gradient_end, text_color, is_dark,
  title, subtitle, cta_label, display_order, is_active
) VALUES
  (
    'ba000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001', -- AC & Appliances (Light Blue to Sky/Steel Shade Blue)
    'AC & Appliances Hero',
    'ac-appliances-hero',
    'hero-assets/categories/ac/hero.webp',
    'hero_background',
    'hero_background',
    '#0284C7', '#E0F2FE', '#D0EEFE', '#38BDF8', '#0F172A', FALSE,
    'Keep your home cool & efficient',
    'Certified AC technicians and appliance specialists at your doorstep',
    'Book AC Service',
    1, TRUE
  ),
  (
    'ba000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000002', -- Cleaning (Light White-Grey to Smooth Slate Grey)
    'Cleaning Hero',
    'cleaning-hero',
    'hero-assets/categories/cleaning/hero.webp',
    'hero_gardener',
    'hero_gardener',
    '#64748B', '#F1F5F9', '#475569', '#94A3B8', '#FFFFFF', TRUE,
    'Keep your home spotless & fresh',
    'Deep cleaning, sofa sanitization, and intensive kitchen care',
    'Book Cleaning',
    2, TRUE
  ),
  (
    'ba000000-0000-0000-0000-000000000003',
    'c1000000-0000-0000-0000-000000000003', -- Electrical (Fire Yellow to Warm Amber / Soft Gold)
    'Electrical Hero',
    'electrical-hero',
    'hero-assets/categories/electrical/hero.webp',
    'hero_background',
    'hero_background',
    '#F59E0B', '#FEF3C7', '#D97706', '#FBBF24', '#FFFFFF', TRUE,
    'Power your home safely',
    'Verified electricians for short circuits, fans, lights, and wiring',
    'Book Electrician',
    3, TRUE
  ),
  (
    'ba000000-0000-0000-0000-000000000004',
    'c1000000-0000-0000-0000-000000000004', -- Plumbing (Purple Indigo 90deg Linear Gradient)
    'Plumbing Hero',
    'plumbing-hero',
    'hero-assets/categories/plumbing/hero.webp',
    'hero_background',
    'hero_background',
    '#692EB7', '#F3E8FF', '#D9B3E2', '#522CA4', '#FFFFFF', TRUE,
    'Reliable plumbing in 20 minutes',
    'Expert fix for taps, pipes, sanitary fittings, and blockages',
    'Book Plumber',
    4, TRUE
  ),
  (
    'ba000000-0000-0000-0000-000000000005',
    'c1000000-0000-0000-0000-000000000005', -- Painting (Mixed Harmonic 3-Color Smooth Gradient: Sunset Coral to Berry Rose)
    'Painting Hero',
    'painting-hero',
    'hero-assets/categories/painting/hero.webp',
    'hero_gardener',
    'hero_gardener',
    '#E11D48', '#FFE4E6', '#9F1239', '#F43F5E', '#FFFFFF', TRUE,
    'Bring your walls to life',
    'Professional wall painting, waterproof coats, and room refreshes',
    'Explore Painting',
    5, TRUE
  ),
  (
    'ba000000-0000-0000-0000-000000000006',
    'c1000000-0000-0000-0000-000000000006', -- RO & Water (Water Bluish Aqua / Teal Gradient)
    'RO & Water Hero',
    'ro-water-hero',
    'hero-assets/categories/ro-water/hero.webp',
    'hero_background',
    'hero_background',
    '#0EA5E9', '#E0F2FE', '#0284C7', '#06B6D4', '#FFFFFF', TRUE,
    'Pure, safe drinking water always',
    'RO service, sediment filter change, membrane check, and TDS tuning',
    'Book RO Service',
    6, TRUE
  ),
  (
    'ba000000-0000-0000-0000-000000000007',
    'c1000000-0000-0000-0000-000000000007', -- Home Decor (Soft Pastel Pink #FFDDE1 to Coral Rose #EE9CA7)
    'Home Decor Hero',
    'home-decor-hero',
    'hero-assets/categories/decor/hero.webp',
    'hero_homedecors',
    'hero_homedecors',
    '#ffccddff', '#FFF1F2', 'hsla(353, 100%, 93%, 1.00)', '#EE9CA7', '#111111', FALSE,
    'Make your celebrations memorable',
    'Occasional lighting, balloon styling, and theme decoration',
    'Explore Decor',
    7, TRUE
  ),
  (
    'ba000000-0000-0000-0000-000000000008',
    'c1000000-0000-0000-0000-000000000008', -- Carpentry (Smooth Light Brown to Honey Walnut Gradient)
    'Carpentry Hero',
    'carpentry-hero',
    'hero-assets/categories/carpentry/hero.webp',
    'hero_background',
    'hero_background',
    '#A16207', '#FEF9C3', '#78350F', '#CA8A04', '#FFFFFF', TRUE,
    'Precision woodwork & furniture repair',
    'Door lock repairs, hinge fittings, shelves, and custom woodwork',
    'Book Carpenter',
    8, TRUE
  ),
  (
    'ba000000-0000-0000-0000-000000000009',
    'c1000000-0000-0000-0000-000000000009', -- Pest Control (Light Shade of Charcoal Black to Obsidian Gradient)
    'Pest Control Hero',
    'pest-control-hero',
    'hero-assets/categories/pest/hero.webp',
    'hero_gardener',
    'hero_gardener',
    '#334155', '#F8FAFC', '#1E293B', '#475569', '#FFFFFF', TRUE,
    'A cleaner, safer, pest-free home',
    'Odorless certified termite, cockroach, and bed bug protection',
    'Book Pest Control',
    9, TRUE
  ),
  (
    'ba000000-0000-0000-0000-000000000010',
    'c1000000-0000-0000-0000-000000000010', -- Laundry (Purple / Soft Violet Smooth Gradient)
    'Laundry Hero',
    'laundry-hero',
    'hero-assets/categories/laundry/hero.webp',
    'hero_background',
    'hero_background',
    '#7C3AED', '#EDE9FE', '#5B21B6', '#8B5CF6', '#FFFFFF', TRUE,
    'Crisp, sanitized laundry at your door',
    'Wash & fold, steam pressing, and organic dry cleaning',
    'Book Laundry',
    10, TRUE
  ),
  (
    'ba000000-0000-0000-0000-000000000011',
    'c1000000-0000-0000-0000-000000000011', -- Home Moving (Greenish Grey Very Light & Sage Slate Gradient)
    'Home Moving Hero',
    'home-moving-hero',
    'hero-assets/categories/moving/hero.webp',
    'hero_background',
    'hero_background',
    '#4D7C0F', '#ECFCCB', '#365314', '#65A30D', '#FFFFFF', TRUE,
    'Hassle-free relocation & heavy lifting',
    'Verified movers, safe vehicle transport, and zero damage guarantee',
    'Book Moving',
    11, TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  cta_label = EXCLUDED.cta_label,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  gradient_start = EXCLUDED.gradient_start,
  gradient_end = EXCLUDED.gradient_end;

-- 5. SEED CATEGORY THEMES (CONTRAST-SAFE, BRAND-ALIGNED)
INSERT INTO public.category_themes (
  id, category_id, primary_color, secondary_color, button_color, button_text_color,
  gradient_start, gradient_end, is_dark
) VALUES
  (
    'de000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001', -- AC & Appliances (Light Sky Blue #D0EEFE to Soft Cyan #38BDF8)
    '#0284C7', '#E0F2FE', '#0284C7', '#FFFFFF',
    '#D0EEFE', '#38BDF8', FALSE
  ),
  (
    'de000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000002', -- Cleaning (Light White Grey to Grey)
    '#475569', '#F1F5F9', '#475569', '#FFFFFF',
    '#475569', '#94A3B8', TRUE
  ),
  (
    'de000000-0000-0000-0000-000000000003',
    'c1000000-0000-0000-0000-000000000003', -- Electrical (Fire Yellow to Yellow Warm Gold)
    '#D97706', '#FEF3C7', '#D97706', '#FFFFFF',
    '#D97706', '#FBBF24', TRUE
  ),
  (
    'de000000-0000-0000-0000-000000000004',
    'c1000000-0000-0000-0000-000000000004', -- Plumbing (Purple Indigo 90deg Linear Gradient)
    '#692EB7', '#F3E8FF', '#5D2BAE', '#FFFFFF',
    '#D9B3E2', '#522CA4', TRUE
  ),
  (
    'de000000-0000-0000-0000-000000000005',
    'c1000000-0000-0000-0000-000000000005', -- Painting (3-Color Smooth Gradient Sunset Berry)
    '#9F1239', '#FFE4E6', '#BE185D', '#FFFFFF',
    '#9F1239', '#F43F5E', TRUE
  ),
  (
    'de000000-0000-0000-0000-000000000006',
    'c1000000-0000-0000-0000-000000000006', -- RO & Water (Water Bluish Aqua Gradient)
    '#0284C7', '#E0F2FE', '#0284C7', '#FFFFFF',
    '#0284C7', '#06B6D4', TRUE
  ),
  (
    'de000000-0000-0000-0000-000000000007',
    'c1000000-0000-0000-0000-000000000007', -- Home Decor (#FFDDE1 to #EE9CA7)
    '#DB2777', '#FFF1F2', '#DB2777', '#FFFFFF',
    '#FFDDE1', '#EE9CA7', FALSE
  ),
  (
    'de000000-0000-0000-0000-000000000008',
    'c1000000-0000-0000-0000-000000000008', -- Carpentry (Smooth Light Brown Gradients)
    '#78350F', '#FEF9C3', '#78350F', '#FFFFFF',
    '#78350F', '#CA8A04', TRUE
  ),
  (
    'de000000-0000-0000-0000-000000000009',
    'c1000000-0000-0000-0000-000000000009', -- Pest Control (Light Shade of Black to Charcoal Gradients)
    '#1E293B', '#F8FAFC', '#1E293B', '#FFFFFF',
    '#1E293B', '#475569', TRUE
  ),
  (
    'de000000-0000-0000-0000-000000000010',
    'c1000000-0000-0000-0000-000000000010', -- Laundry (Purple Smooth Gradients)
    '#5B21B6', '#EDE9FE', '#6D28D9', '#FFFFFF',
    '#5B21B6', '#8B5CF6', TRUE
  ),
  (
    'de000000-0000-0000-0000-000000000011',
    'c1000000-0000-0000-0000-000000000011', -- Home Moving (Greenish Grey Very Light Gradients)
    '#365314', '#ECFCCB', '#4D7C0F', '#FFFFFF',
    '#365314', '#65A30D', TRUE
  )
ON CONFLICT (category_id) DO UPDATE SET
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  button_color = EXCLUDED.button_color,
  gradient_start = EXCLUDED.gradient_start,
  gradient_end = EXCLUDED.gradient_end;

