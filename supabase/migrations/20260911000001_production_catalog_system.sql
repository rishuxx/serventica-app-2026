-- ==============================================================================
-- SERVENTICA MIGRATION: PRODUCTION CATALOG SYSTEM, VARIANTS, CONTENT & SAVED SERVICES
-- ==============================================================================

-- 1. SERVICE CATEGORIES TABLE (Canonical Table & Aliasing)
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

CREATE INDEX IF NOT EXISTS idx_service_categories_slug ON public.service_categories(slug);
CREATE INDEX IF NOT EXISTS idx_service_categories_active_order ON public.service_categories(is_active, sort_order);

DROP TRIGGER IF EXISTS set_service_categories_updated_at ON public.service_categories;
CREATE TRIGGER set_service_categories_updated_at
  BEFORE UPDATE ON public.service_categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

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

CREATE INDEX IF NOT EXISTS idx_service_subcategories_cat_active ON public.service_subcategories(category_id, is_active, sort_order);

DROP TRIGGER IF EXISTS set_service_subcategories_updated_at ON public.service_subcategories;
CREATE TRIGGER set_service_subcategories_updated_at
  BEFORE UPDATE ON public.service_subcategories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. UPGRADE SERVICES TABLE WITH NEW COLUMNS & CONSTRAINTS
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.service_subcategories(id) ON DELETE SET NULL;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS hero_image_url TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Constraints for services table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_services_base_price_non_negative'
  ) THEN
    ALTER TABLE public.services ADD CONSTRAINT chk_services_base_price_non_negative CHECK (base_price >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_services_duration_positive'
  ) THEN
    ALTER TABLE public.services ADD CONSTRAINT chk_services_duration_positive CHECK (duration_minutes > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_services_category_active ON public.services(category_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_services_subcategory_active ON public.services(subcategory_id, is_active);
CREATE INDEX IF NOT EXISTS idx_services_slug_active ON public.services(slug, is_active);

-- 4. SERVICE VARIANTS / PACKAGES TABLE
CREATE TABLE IF NOT EXISTS public.service_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price NUMERIC(10, 2) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_variant_service_slug UNIQUE(service_id, slug),
  CONSTRAINT chk_variant_price_non_negative CHECK (price >= 0),
  CONSTRAINT chk_variant_duration_positive CHECK (duration_minutes > 0)
);

ALTER TABLE public.service_variants ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.service_variants ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.service_variants ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.service_variants ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.service_variants ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.service_variants ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.service_variants ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.service_variants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_service_variants_service_active ON public.service_variants(service_id, is_active, sort_order);

DROP TRIGGER IF EXISTS set_service_variants_updated_at ON public.service_variants;
CREATE TRIGGER set_service_variants_updated_at
  BEFORE UPDATE ON public.service_variants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. SERVICE ADD-ONS TABLE
CREATE TABLE IF NOT EXISTS public.service_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  duration_minutes INTEGER NOT NULL DEFAULT 15 CHECK (duration_minutes >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.service_addons ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.service_addons ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.service_addons ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.service_addons ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.service_addons ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.service_addons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_service_addons_service_active ON public.service_addons(service_id, is_active, sort_order);

DROP TRIGGER IF EXISTS set_service_addons_updated_at ON public.service_addons;
CREATE TRIGGER set_service_addons_updated_at
  BEFORE UPDATE ON public.service_addons
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. SERVICE MEDIA TABLE (Supabase Storage references)
CREATE TABLE IF NOT EXISTS public.service_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'IMAGE' CHECK (media_type IN ('IMAGE', 'VIDEO', 'DOCUMENT')),
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.service_media ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.service_media ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_service_media_service_active ON public.service_media(service_id, is_active, sort_order);

-- 7. SERVICE INCLUSIONS TABLE
CREATE TABLE IF NOT EXISTS public.service_inclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.service_inclusions ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.service_inclusions ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_service_inclusions_service_active ON public.service_inclusions(service_id, is_active, sort_order);

DROP TRIGGER IF EXISTS set_service_inclusions_updated_at ON public.service_inclusions;
CREATE TRIGGER set_service_inclusions_updated_at
  BEFORE UPDATE ON public.service_inclusions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 8. SERVICE EXCLUSIONS TABLE
CREATE TABLE IF NOT EXISTS public.service_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.service_exclusions ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.service_exclusions ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_service_exclusions_service_active ON public.service_exclusions(service_id, is_active, sort_order);

DROP TRIGGER IF EXISTS set_service_exclusions_updated_at ON public.service_exclusions;
CREATE TRIGGER set_service_exclusions_updated_at
  BEFORE UPDATE ON public.service_exclusions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 9. SERVICE FAQS TABLE
CREATE TABLE IF NOT EXISTS public.service_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.service_faqs ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.service_faqs ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_service_faqs_service_active ON public.service_faqs(service_id, is_active, sort_order);

DROP TRIGGER IF EXISTS set_service_faqs_updated_at ON public.service_faqs;
CREATE TRIGGER set_service_faqs_updated_at
  BEFORE UPDATE ON public.service_faqs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 10. SAVED SERVICES TABLE (Customer Wishlist / Bookmarks)
CREATE TABLE IF NOT EXISTS public.saved_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_saved_services_user_service UNIQUE(user_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_services_user ON public.saved_services(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_services_service ON public.saved_services(service_id);

-- 11. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_inclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_exclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_services ENABLE ROW LEVEL SECURITY;

-- Public Read-Only Policies for Catalog
DROP POLICY IF EXISTS "Public can view active service categories" ON public.service_categories;
CREATE POLICY "Public can view active service categories"
  ON public.service_categories FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public can view active service subcategories" ON public.service_subcategories;
CREATE POLICY "Public can view active service subcategories"
  ON public.service_subcategories FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public can view active services" ON public.services;
CREATE POLICY "Public can view active services"
  ON public.services FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public can view active variants" ON public.service_variants;
CREATE POLICY "Public can view active variants"
  ON public.service_variants FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public can view active addons" ON public.service_addons;
CREATE POLICY "Public can view active addons"
  ON public.service_addons FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public can view active media" ON public.service_media;
CREATE POLICY "Public can view active media"
  ON public.service_media FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public can view active inclusions" ON public.service_inclusions;
CREATE POLICY "Public can view active inclusions"
  ON public.service_inclusions FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public can view active exclusions" ON public.service_exclusions;
CREATE POLICY "Public can view active exclusions"
  ON public.service_exclusions FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public can view active faqs" ON public.service_faqs;
CREATE POLICY "Public can view active faqs"
  ON public.service_faqs FOR SELECT USING (is_active = TRUE);

-- Strict User Isolation for Saved Services
DROP POLICY IF EXISTS "Users can view own saved services" ON public.saved_services;
CREATE POLICY "Users can view own saved services"
  ON public.saved_services FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own saved services" ON public.saved_services;
CREATE POLICY "Users can insert own saved services"
  ON public.saved_services FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own saved services" ON public.saved_services;
CREATE POLICY "Users can delete own saved services"
  ON public.saved_services FOR DELETE USING (auth.uid() = user_id);

-- ==============================================================================
-- 12. SEED REAL PRODUCTION CATALOG DATA
-- ==============================================================================

-- Sync/Seed service_categories
INSERT INTO public.service_categories (id, slug, name, short_description, description, icon_name, sort_order, is_active)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'ac-appliances', 'AC & Appliance Repair', 'AC, Refrigerator & Washing Machine', 'Certified technicians for air conditioners, refrigerators, washing machines, and household appliances.', 'AirVent', 1, TRUE),
  ('c1000000-0000-0000-0000-000000000002', 'cleaning', 'Cleaning Services', 'Full Home, Sofa & Deep Cleaning', 'Hospital-grade deep cleaning, upholstery shampooing, bathroom scrubbing, and kitchen grease removal.', 'Sparkles', 2, TRUE),
  ('c1000000-0000-0000-0000-000000000003', 'electrical', 'Electrician', 'Wiring, Fans, MCBs & Switchboards', 'Licensed electricians for precision troubleshooting, fan installation, switch replacement, and load balancing.', 'Zap', 3, TRUE),
  ('c1000000-0000-0000-0000-000000000004', 'plumbing', 'Plumbing', 'Leaks, Taps, Blocks & Pipe Fittings', 'Expert plumbers for tap repair, drain unclogging, water tank repair, and sanitary installations.', 'Droplets', 4, TRUE),
  ('c1000000-0000-0000-0000-000000000005', 'painting', 'Painting', 'Interior, Exterior & Waterproofing', 'Laser-smooth wall painting, waterproof coats, primer finish, and festival touchups with zero mess.', 'Paintbrush', 5, TRUE),
  ('c1000000-0000-0000-0000-000000000006', 'ro-water', 'RO & Water Services', 'Purifier Repair, Filter & TDS Check', 'Water purifier maintenance, sediment & carbon filter changes, RO membrane renewal, and mineral balancing.', 'Waves', 6, TRUE),
  ('c1000000-0000-0000-0000-000000000007', 'carpentry', 'Carpentry', 'Furniture Repair, Hinges & Lock Fix', 'Skilled carpenters for door realignment, wardrobe lock repairs, modular drilling, and wood restoration.', 'Hammer', 7, TRUE),
  ('c1000000-0000-0000-0000-000000000008', 'pest-control', 'Pest Control', 'Termites, Cockroaches & Bed Bugs', 'Odorless certified chemical sprays, gel baiting, and termite barrier treatments with warranty.', 'Bug', 8, TRUE),
  ('c1000000-0000-0000-0000-000000000009', 'home-decor', 'Home Decor', 'Lighting, Wall Hangings & Setup', 'Aesthetic wall styling, ambient lighting mounting, curtain fixtures, and celebratory home decor.', 'Lamp', 9, TRUE),
  ('c1000000-0000-0000-0000-000000000010', 'laundry', 'Laundry & Ironing', 'Wash, Dry Clean & Steam Press', 'Fabric-safe laundry, crisp steam pressing, stain treatment, and doorstep garment delivery.', 'WashingMachine', 10, TRUE),
  ('c1000000-0000-0000-0000-000000000011', 'home-moving', 'Packers & Movers', 'Local Home Relocation & Shifting', 'Heavy furniture wrapping, secure truck transport, zero-scratch shifting, and room placement.', 'Truck', 11, TRUE)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- Seed service_subcategories
INSERT INTO public.service_subcategories (id, category_id, slug, name, description, sort_order, is_active)
VALUES
  ('e1000000-0000-0000-0001-000000000001', 'c1000000-0000-0000-0000-000000000001', 'ac-service-repair', 'AC Service & Repair', 'Split and window AC maintenance, repair, and gas refilling', 1, TRUE),
  ('e1000000-0000-0000-0001-000000000002', 'c1000000-0000-0000-0000-000000000001', 'refrigerator', 'Refrigerator', 'Single and double door fridge cooling and gas check', 2, TRUE),
  ('e1000000-0000-0000-0001-000000000003', 'c1000000-0000-0000-0000-000000000001', 'washing-machine', 'Washing Machine', 'Front load, top load, and semi-automatic drum repair', 3, TRUE),
  ('e1000000-0000-0000-0002-000000000001', 'c1000000-0000-0000-0000-000000000002', 'full-home-cleaning', 'Full Home Cleaning', 'Deep scrubbing and sanitization of whole houses', 1, TRUE),
  ('e1000000-0000-0000-0002-000000000002', 'c1000000-0000-0000-0000-000000000002', 'sofa-carpet', 'Sofa & Carpet', 'Injection-extraction fabric and leather shampooing', 2, TRUE),
  ('e1000000-0000-0000-0003-000000000001', 'c1000000-0000-0000-0000-000000000003', 'fans-lighting', 'Fans & Lighting', 'Ceiling fans, chandeliers, and decorative lights', 1, TRUE),
  ('e1000000-0000-0000-0003-000000000002', 'c1000000-0000-0000-0000-000000000003', 'wiring-mcb', 'Wiring & MCB', 'Short circuit tracing, main fuse box, and earthing', 2, TRUE),
  ('e1000000-0000-0000-0004-000000000001', 'c1000000-0000-0000-0000-000000000004', 'taps-mixers', 'Taps & Mixers', 'Dripping taps, shower mixers, and cartridge repair', 1, TRUE),
  ('e1000000-0000-0000-0004-000000000002', 'c1000000-0000-0000-0000-000000000004', 'drainage-blocks', 'Drainage & Blocks', 'Sink, bathroom drain, and pipeline unclogging', 2, TRUE)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- Seed services
INSERT INTO public.services (
  id, category_id, subcategory_id, slug, name, short_description, description,
  thumbnail_url, hero_image_url, duration_minutes, base_price, pricing_type,
  rating, reviews_count, is_active, sort_order
)
VALUES
  (
    'e1000000-0000-0000-0001-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0001-000000000001',
    'ac-general-service',
    'AC General Service',
    'Cooling inspection, filter cleanup & basic efficiency diagnostic',
    'Comprehensive standard AC servicing including air filter wash, indoor blower cleaning, drain tray flushing, and operating temperature diagnostic by certified technicians.',
    'basic_ac_repair',
    'basic_ac_repair',
    45,
    499.00,
    'VARIANT',
    4.88,
    342,
    TRUE,
    1
  ),
  (
    'e1000000-0000-0000-0001-000000000002',
    'c1000000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0001-000000000001',
    'ac-deep-clean-jet',
    'Power Jet AC Deep Cleaning',
    'High-pressure water jet coil wash, indoor & outdoor deep wash',
    'Deep restorative cleaning using specialized high-pressure power jets to blast stubborn dirt from condenser and evaporator coils. Boosts cooling efficiency up to 30%.',
    'basic_ac_repair',
    'basic_ac_repair',
    60,
    799.00,
    'VARIANT',
    4.92,
    512,
    TRUE,
    2
  ),
  (
    'e1000000-0000-0000-0001-000000000003',
    'c1000000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0001-000000000002',
    'refrigerator-repair',
    'Refrigerator Repair & Gas Check',
    'Cooling failure, compressor noise, thermostat & gas refill',
    'Expert diagnosis of single door, double door, and side-by-side refrigerators. Includes compressor load check, relay testing, thermostat calibration, and leak inspection.',
    'basic_invertor',
    'basic_invertor',
    60,
    349.00,
    'FIXED',
    4.82,
    188,
    TRUE,
    3
  ),
  (
    'e1000000-0000-0000-0002-000000000001',
    'c1000000-0000-0000-0000-000000000002',
    'e1000000-0000-0000-0002-000000000001',
    'full-home-deep-cleaning',
    'Full Home Deep Cleaning',
    'Complete house sanitization, kitchen degreasing & floor scrubbing',
    'Rigorous room-by-room deep sanitization including kitchen grease degreasing, bathroom calcium descaling, balcony washing, dry vacuuming, and mechanized floor polishing.',
    'basic_cleaning',
    'basic_cleaning',
    180,
    1499.00,
    'VARIANT',
    4.94,
    620,
    TRUE,
    1
  ),
  (
    'e1000000-0000-0000-0002-000000000002',
    'c1000000-0000-0000-0000-000000000002',
    'e1000000-0000-0000-0002-000000000002',
    'sofa-shampooing',
    'Sofa & Upholstery Shampooing',
    'Stain removal, deep injection-extraction vacuuming',
    'Professional 3-step fabric conditioning, enzyme foam scrubbing, and high-suction extraction that eliminates stubborn spots, food spills, dust mites, and odors.',
    'basic_cleaning',
    'basic_cleaning',
    60,
    599.00,
    'VARIANT',
    4.87,
    295,
    TRUE,
    2
  ),
  (
    'e1000000-0000-0000-0003-000000000001',
    'c1000000-0000-0000-0000-000000000003',
    'e1000000-0000-0000-0003-000000000001',
    'ceiling-fan-installation',
    'Ceiling Fan Installation & Repair',
    'Secure mounting, regulator setup, wobble fix & speed repair',
    'Standard and decorative ceiling fan installation, balance alignment, capacitor replacement, regulator troubleshooting, and safety hook anchoring.',
    'basic_wiring',
    'basic_wiring',
    30,
    149.00,
    'FIXED',
    4.85,
    410,
    TRUE,
    1
  ),
  (
    'e1000000-0000-0000-0004-000000000001',
    'c1000000-0000-0000-0000-000000000004',
    'e1000000-0000-0000-0004-000000000001',
    'tap-leak-repair',
    'Tap & Mixer Leak Repair',
    'Spindle replacement, washer change, cartridge & sealant fix',
    'Fast fix for dripping taps, loose handles, leaky mixer cartridges, low water pressure, and wall flange sealing.',
    'basic_plumbing',
    'basic_plumbing',
    30,
    129.00,
    'FIXED',
    4.86,
    380,
    TRUE,
    1
  )
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  subcategory_id = EXCLUDED.subcategory_id,
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  thumbnail_url = EXCLUDED.thumbnail_url,
  hero_image_url = EXCLUDED.hero_image_url,
  duration_minutes = EXCLUDED.duration_minutes,
  base_price = EXCLUDED.base_price,
  pricing_type = EXCLUDED.pricing_type,
  rating = EXCLUDED.rating,
  reviews_count = EXCLUDED.reviews_count,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- Seed service_variants (e.g., packages)
INSERT INTO public.service_variants (
  id, service_id, slug, name, description, duration_minutes, price, sort_order, is_default, is_active
)
VALUES
  -- AC General Service Variants
  (
    'd1000000-0000-0000-0001-000000000001',
    'e1000000-0000-0000-0001-000000000001',
    'single-split-ac',
    'Single Split AC (1 Unit)',
    'Standard service for 1 Split or Window AC unit',
    45,
    499.00,
    1,
    TRUE,
    TRUE
  ),
  (
    'd1000000-0000-0000-0001-000000000002',
    'e1000000-0000-0000-0001-000000000001',
    'twin-split-ac-pack',
    '2 ACs Combo Pack (Save ₹100)',
    'Full inspection & service for 2 AC units',
    80,
    899.00,
    2,
    FALSE,
    TRUE
  ),
  (
    'd1000000-0000-0000-0001-000000000003',
    'e1000000-0000-0000-0001-000000000001',
    'triple-split-ac-pack',
    '3 ACs Master Pack (Save ₹300)',
    'Complete full-home 3 AC units maintenance',
    120,
    1199.00,
    3,
    FALSE,
    TRUE
  ),

  -- Power Jet Deep Clean Variants
  (
    'd1000000-0000-0000-0001-000000000004',
    'e1000000-0000-0000-0001-000000000002',
    'standard-jet-clean',
    'Standard Power Jet Clean',
    'Coil pressure wash, filter scrub, and drainage tray clearing',
    60,
    799.00,
    1,
    TRUE,
    TRUE
  ),
  (
    'd1000000-0000-0000-0001-000000000005',
    'e1000000-0000-0000-0001-000000000002',
    'premium-foam-jet-clean',
    'Premium Anti-Bacterial Foam Jet',
    'High-pressure wash + German antimicrobial foam jacket + gas check',
    90,
    999.00,
    2,
    FALSE,
    TRUE
  ),

  -- Full Home Cleaning Variants
  (
    'd1000000-0000-0000-0002-000000000001',
    'e1000000-0000-0000-0002-000000000001',
    '1bhk-deep-cleaning',
    '1 BHK Apartment',
    'Full apartment scrubbing, 1 bathroom, kitchen & living room',
    120,
    1499.00,
    1,
    FALSE,
    TRUE
  ),
  (
    'd1000000-0000-0000-0002-000000000002',
    'e1000000-0000-0000-0002-000000000001',
    '2bhk-deep-cleaning',
    '2 BHK Apartment',
    'Complete deep clean of 2 bedrooms, 2 bathrooms, kitchen & hall',
    180,
    2299.00,
    2,
    TRUE,
    TRUE
  ),
  (
    'd1000000-0000-0000-0002-000000000003',
    'e1000000-0000-0000-0002-000000000001',
    '3bhk-deep-cleaning',
    '3 BHK Apartment / Villa',
    'Intensive cleaning of 3 bedrooms, 3 bathrooms, kitchen, balcony & living area',
    240,
    2999.00,
    3,
    FALSE,
    TRUE
  ),

  -- Sofa Shampooing Variants
  (
    'd1000000-0000-0000-0002-000000000004',
    'e1000000-0000-0000-0002-000000000002',
    '3-seater-sofa',
    '3-Seater Sofa',
    'Deep wet foam shampooing and high-suction extraction for 3 seats',
    45,
    599.00,
    1,
    TRUE,
    TRUE
  ),
  (
    'd1000000-0000-0000-0002-000000000005',
    'e1000000-0000-0000-0002-000000000002',
    '5-seater-sofa-set',
    '5-Seater Sofa Set (3+1+1 or L-Shape)',
    'Complete dry & wet shampooing with fabric brightening agent',
    75,
    899.00,
    2,
    FALSE,
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  service_id = EXCLUDED.service_id,
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  duration_minutes = EXCLUDED.duration_minutes,
  price = EXCLUDED.price,
  sort_order = EXCLUDED.sort_order,
  is_default = EXCLUDED.is_default,
  is_active = EXCLUDED.is_active;

-- Seed service_inclusions
INSERT INTO public.service_inclusions (id, service_id, title, description, sort_order, is_active)
VALUES
  ('b1000000-0000-0000-0001-000000000001', 'e1000000-0000-0000-0001-000000000001', 'Indoor unit coil & filter wash', 'Deep wash of dust filters and internal coil fins', 1, TRUE),
  ('b1000000-0000-0000-0001-000000000002', 'e1000000-0000-0000-0001-000000000001', 'Drainage line flushing', 'Clear water blockage to prevent indoor water dripping', 2, TRUE),
  ('b1000000-0000-0000-0001-000000000003', 'e1000000-0000-0000-0001-000000000001', 'Refrigerant pressure & amp check', 'Precision digital gauge measurement for gas level', 3, TRUE),
  ('b1000000-0000-0000-0001-000000000004', 'e1000000-0000-0000-0001-000000000001', 'Post-service cooling verification', 'Thermostat airflow and delta-T verification report', 4, TRUE),

  ('b1000000-0000-0000-0001-000000000005', 'e1000000-0000-0000-0001-000000000002', 'High-pressure jet wash of indoor & outdoor coils', 'Blasts away deep grime without fin damage', 1, TRUE),
  ('b1000000-0000-0000-0001-000000000006', 'e1000000-0000-0000-0001-000000000002', 'Protective waterproof service jacket setup', 'Zero wall spillage with specialized catch bags', 2, TRUE),
  ('b1000000-0000-0000-0001-000000000007', 'e1000000-0000-0000-0001-000000000002', 'Outdoor unit condenser deep rinse', 'Removes caked dust for maximum heat dissipation', 3, TRUE),

  ('b1000000-0000-0000-0002-000000000001', 'e1000000-0000-0000-0002-000000000001', 'Kitchen degreasing & chimney exterior cleaning', 'Non-toxic degreasing on tiles, slabs and exhaust fans', 1, TRUE),
  ('b1000000-0000-0000-0002-000000000002', 'e1000000-0000-0000-0002-000000000001', 'Bathroom descaling & sanitization', 'Hard water stain removal from tiles, taps and commodes', 2, TRUE),
  ('b1000000-0000-0000-0002-000000000003', 'e1000000-0000-0000-0002-000000000001', 'Single-disc mechanized floor scrubbing', 'Restores natural shine across marble and vitrified tiles', 3, TRUE)
ON CONFLICT (id) DO UPDATE SET
  service_id = EXCLUDED.service_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- Seed service_exclusions
INSERT INTO public.service_exclusions (id, service_id, title, description, sort_order, is_active)
VALUES
  ('c1000000-0000-0000-0001-000000000001', 'e1000000-0000-0000-0001-000000000001', 'Gas refill & spare parts', 'Available as standard add-on or quoted separately if required', 1, TRUE),
  ('c1000000-0000-0000-0001-000000000002', 'e1000000-0000-0000-0001-000000000001', 'Major copper pipe alterations or masonry drilling', 'Civil repairs not included', 2, TRUE),

  ('c1000000-0000-0000-0002-000000000001', 'e1000000-0000-0000-0002-000000000001', 'Inside locked wardrobes with personal belongings', 'Personal cabinets left untouched for privacy and security', 1, TRUE),
  ('c1000000-0000-0000-0002-000000000002', 'e1000000-0000-0000-0002-000000000001', 'Permanent paint stain removal or regrouting', 'Restoration services require separate carpentry/painting booking', 2, TRUE)
ON CONFLICT (id) DO UPDATE SET
  service_id = EXCLUDED.service_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- Seed service_faqs
INSERT INTO public.service_faqs (id, service_id, question, answer, sort_order, is_active)
VALUES
  ('f1000000-0000-0000-0001-000000000001', 'e1000000-0000-0000-0001-000000000001', 'How often should I get my AC serviced?', 'We recommend a standard service every 3 to 6 months to maintain optimal cooling, prevent coil corrosion, and reduce electricity bills by up to 20%.', 1, TRUE),
  ('f1000000-0000-0000-0001-000000000002', 'e1000000-0000-0000-0001-000000000001', 'Will water spill onto my wall during servicing?', 'No. Our professionals use a dedicated waterproof catch jacket that directs all rinse water into an enclosed container, keeping walls and furniture dry.', 2, TRUE),
  ('f1000000-0000-0000-0001-000000000003', 'e1000000-0000-0000-0001-000000000002', 'What is the difference between General Service and Power Jet Clean?', 'General service cleans filters and drain lines with brush and spray. Power Jet Deep Cleaning uses high-pressure jet streams that penetrate deep through multi-layer condenser fins to dislodge cemented dirt.', 1, TRUE),
  ('f1000000-0000-0000-0002-000000000001', 'e1000000-0000-0000-0002-000000000001', 'Do I need to supply cleaning liquids or equipment?', 'No. Our team arrives fully equipped with commercial-grade single-disc scrubbing machines, HEPA vacuum extractors, microfibre pads, and certified biodegradable cleaning agents.', 1, TRUE)
ON CONFLICT (id) DO UPDATE SET
  service_id = EXCLUDED.service_id,
  question = EXCLUDED.question,
  answer = EXCLUDED.answer,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;
