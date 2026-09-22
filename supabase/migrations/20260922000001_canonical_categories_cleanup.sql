-- ==============================================================================
-- SERVENTICA: CLEANUP DUPLICATE & LEGACY CATEGORY SLUGS
-- Eliminates duplicate "electrical" vs "electrician", "cleaning" vs "home-cleaning",
-- and ensures exact 10 canonical active categories with zero duplicates.
-- ==============================================================================

DO $$
DECLARE
  v_ac_id UUID := 'c1000000-0000-0000-0000-000000000001';
  v_elec_id UUID := 'c1000000-0000-0000-0000-000000000002';
  v_plumb_id UUID := 'c1000000-0000-0000-0000-000000000003';
  v_clean_id UUID := 'c1000000-0000-0000-0000-000000000004';
  v_paint_id UUID := 'c1000000-0000-0000-0000-000000000005';
  v_ro_id UUID := 'c1000000-0000-0000-0000-000000000006';
  v_carp_id UUID := 'c1000000-0000-0000-0000-000000000007';
  v_pest_id UUID := 'c1000000-0000-0000-0000-000000000008';
  v_decor_id UUID := 'c1000000-0000-0000-0000-000000000009';
  v_laundry_id UUID := 'c1000000-0000-0000-0000-000000000010';
BEGIN
  -- 1. Re-map services referencing legacy categories to canonical IDs
  UPDATE public.services 
  SET category_id = v_elec_id 
  WHERE category_id IN (SELECT id FROM public.service_categories WHERE slug = 'electrical')
     OR slug LIKE '%fan%' OR slug LIKE '%switch%' OR slug LIKE '%mcb%' OR slug LIKE '%inverter%' OR slug LIKE '%electric%';

  UPDATE public.services 
  SET category_id = v_clean_id 
  WHERE category_id IN (SELECT id FROM public.service_categories WHERE slug = 'cleaning')
     OR slug LIKE '%clean%' OR slug LIKE '%sofa%' OR slug LIKE '%scrub%';

  UPDATE public.services 
  SET category_id = v_plumb_id 
  WHERE category_id IN (SELECT id FROM public.service_categories WHERE slug = 'plumber')
     OR slug LIKE '%tap%' OR slug LIKE '%pipe%' OR slug LIKE '%basin%' OR slug LIKE '%toilet%' OR slug LIKE '%flush%' OR slug LIKE '%leak%';

  -- 2. Delete legacy duplicate category entries from service_categories
  DELETE FROM public.service_categories WHERE slug IN ('electrical', 'cleaning', 'home-moving', 'appliance-repair', 'other-services', 'moving-shifting');

  -- 3. Upsert exact canonical 10 service categories
  INSERT INTO public.service_categories (id, slug, name, short_description, description, icon_name, sort_order, is_active)
  VALUES
    (v_ac_id, 'ac-appliances', 'AC & Appliance Services', 'AC, Refrigerator & Washing Machine', 'Certified technicians for air conditioners, refrigerators, washing machines, microwaves, and household appliances.', 'AirVent', 1, TRUE),
    (v_elec_id, 'electrician', 'Electrician', 'Wiring, Fans, MCBs & Switchboards', 'Licensed electricians for switches, fans, lighting, MCB protection, and wiring.', 'Zap', 2, TRUE),
    (v_plumb_id, 'plumbing', 'Plumbing', 'Leaks, Taps, Blocks & Pipe Fittings', 'Expert plumbers for taps, wash basins, toilets, drainage blockages, and water motors.', 'Droplets', 3, TRUE),
    (v_clean_id, 'home-cleaning', 'Home Cleaning', 'Full Home, Sofa & Deep Cleaning', 'Hospital-grade deep cleaning, sofa shampooing, bathroom scrubbing, and kitchen degreasing.', 'Sparkles', 4, TRUE),
    (v_paint_id, 'painting', 'Painting', 'Interior, Exterior & Texture', 'Interior, exterior, texture, and wood finish painting services.', 'Paintbrush', 5, TRUE),
    (v_ro_id, 'ro-water', 'RO & Water Purification', 'Purifier Repair, Filter & TDS Check', 'Purifier servicing, filter replacements, RO membranes, and TDS testing.', 'Waves', 6, TRUE),
    (v_carp_id, 'carpentry', 'Carpentry', 'Furniture Repair, Hinges & Lock Fix', 'Furniture repair, door alignments, locks, and custom woodwork.', 'Hammer', 7, TRUE),
    (v_pest_id, 'pest-control', 'Pest Control', 'Termites, Cockroaches & Bed Bugs', 'Certified chemical sprays, gel baiting, and termite barrier treatments.', 'Bug', 8, TRUE),
    (v_decor_id, 'home-decor', 'Home Decor & Installation', 'False Ceiling, Curtains & CCTV', 'False ceilings, wallpaper, curtains, and lighting setups.', 'Lamp', 9, TRUE),
    (v_laundry_id, 'laundry', 'Laundry & Dry Clean', 'Wash & Fold, Steam Press & Dry Clean', 'Wash & fold, steam pressing, and premium dry cleaning.', 'WashingMachine', 10, TRUE)
  ON CONFLICT (id) DO UPDATE SET
    slug = EXCLUDED.slug,
    name = EXCLUDED.name,
    short_description = EXCLUDED.short_description,
    description = EXCLUDED.description,
    icon_name = EXCLUDED.icon_name,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;

  -- 4. Sync legacy categories table if present
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') THEN
    DELETE FROM public.categories;
    INSERT INTO public.categories (id, slug, name, description, icon, sort_order, is_active)
    SELECT id, slug, name, description, icon_name, sort_order, is_active
    FROM public.service_categories
    WHERE is_active = TRUE;
  END IF;

END $$;
