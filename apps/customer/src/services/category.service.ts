import { supabase } from '../lib/supabase/client';
import { CategoryItem, CategoryHierarchyPayload, ServiceDetailItem } from '../types/category.types';

// Production Tier 1 & 2 launch categories for side scroll (no 'More' item)
export const INITIAL_DISCOVERY_CATEGORIES: CategoryItem[] = [
  {
    id: 'cat_ac_appliances',
    name: 'AC & Appliances',
    short_name: 'AC & Apps',
    slug: 'ac-appliances',
    description: 'AC, refrigerator, washing machine, and appliance repairs',
    icon: 'AirVent',
    sort_order: 1,
    is_active: true,
    is_featured: true,
    show_on_home: true,
    tier: 1,
  },
  {
    id: 'cat_cleaning',
    name: 'Cleaning',
    short_name: 'Cleaning',
    slug: 'cleaning',
    description: 'Deep home cleaning, sofa, bathroom, and kitchen care',
    icon: 'Sparkles',
    sort_order: 2,
    is_active: true,
    is_featured: true,
    show_on_home: true,
    tier: 1,
  },
  {
    id: 'cat_electrical',
    name: 'Electrical',
    short_name: 'Electrical',
    slug: 'electrical',
    description: 'Electrician for wiring, MCBs, fans, switchboards, and fixtures',
    icon: 'Zap',
    sort_order: 3,
    is_active: true,
    is_featured: true,
    show_on_home: true,
    tier: 1,
  },
  {
    id: 'cat_plumbing',
    name: 'Plumbing',
    short_name: 'Plumbing',
    slug: 'plumbing',
    description: 'Taps, pipes, leakages, fittings, and bathroom drainage',
    icon: 'Droplets',
    sort_order: 4,
    is_active: true,
    is_featured: true,
    show_on_home: true,
    tier: 1,
  },
  {
    id: 'cat_painting',
    name: 'Painting',
    short_name: 'Painting',
    slug: 'painting',
    description: 'Interior & exterior room painting and waterproof coatings',
    icon: 'Paintbrush',
    sort_order: 5,
    is_active: true,
    is_featured: true,
    show_on_home: true,
    tier: 1,
  },
  {
    id: 'cat_ro_water',
    name: 'RO & Water',
    short_name: 'RO & Water',
    slug: 'ro-water',
    description: 'Water purifier service, filter replacement, and TDS balancing',
    icon: 'Waves',
    sort_order: 6,
    is_active: true,
    is_featured: true,
    show_on_home: true,
    tier: 1,
  },
  {
    id: 'cat_carpentry',
    name: 'Carpentry',
    short_name: 'Carpentry',
    slug: 'carpentry',
    description: 'Furniture repair, hinges, locks, door drilling, and woodwork',
    icon: 'Hammer',
    sort_order: 7,
    is_active: true,
    is_featured: true,
    show_on_home: true,
    tier: 2,
  },
  {
    id: 'cat_pest_control',
    name: 'Pest Control',
    short_name: 'Pest Control',
    slug: 'pest-control',
    description: 'Cockroach, termite, bed bug, and mosquito disinfection',
    icon: 'Bug',
    sort_order: 8,
    is_active: true,
    is_featured: true,
    show_on_home: true,
    tier: 2,
  },
  {
    id: 'cat_home_decor',
    name: 'Home Decor',
    short_name: 'Home Decor',
    slug: 'home-decor',
    description: 'Occasional lighting, celebration balloons, and festivity decor',
    icon: 'Lamp',
    sort_order: 9,
    is_active: true,
    is_featured: true,
    show_on_home: true,
    tier: 2,
  },
  {
    id: 'cat_laundry',
    name: 'Laundry',
    short_name: 'Laundry',
    slug: 'laundry',
    description: 'Wash & fold, dry cleaning, ironing, and fabric sanitization',
    icon: 'WashingMachine',
    sort_order: 10,
    is_active: true,
    is_featured: true,
    show_on_home: true,
    tier: 3,
  },
  {
    id: 'cat_home_moving',
    name: 'Home Moving',
    short_name: 'Moving',
    slug: 'home-moving',
    description: 'Packers & movers, household relocation, and heavy loading assistance',
    icon: 'Truck',
    sort_order: 11,
    is_active: true,
    is_featured: true,
    show_on_home: true,
    tier: 3,
  },
  {
    id: 'cat_beauty',
    name: 'Beauty & Salon',
    short_name: 'Beauty',
    slug: 'beauty',
    description: 'Salon at home, waxing, facials, manicure, pedicure and grooming',
    icon: 'Scissors',
    sort_order: 12,
    is_active: true,
    is_featured: true,
    show_on_home: true,
    tier: 3,
  },
];

// Fallback services mapped per category
export const FALLBACK_CATEGORY_SERVICES: Record<string, ServiceDetailItem[]> = {
  'ac-appliances': [
    {
      id: 'srv_ac_repair',
      category_id: 'cat_ac_appliances',
      name: 'AC Repair & Diagnosis',
      slug: 'ac-repair',
      description: 'Comprehensive inspection, coil check, cooling check, and gas leakage diagnosis.',
      short_tagline: 'Most Popular',
      base_price: 499,
      duration_minutes: 60,
      pricing_type: 'FIXED',
      rating: 4.9,
      reviews_count: 320,
      image_url: 'basic_ac_repair',
      is_active: true,
    },
    {
      id: 'srv_ac_service',
      category_id: 'cat_ac_appliances',
      name: 'Power Jet AC Deep Clean',
      slug: 'ac-power-jet-service',
      description: 'Deep high-pressure jet cleaning of indoor and outdoor coils, filters, and trays.',
      short_tagline: 'Save 25% on Power',
      base_price: 599,
      duration_minutes: 45,
      pricing_type: 'FIXED',
      rating: 4.85,
      reviews_count: 510,
      image_url: 'basic_ac_repair',
      is_active: true,
    },
    {
      id: 'srv_fridge_repair',
      category_id: 'cat_ac_appliances',
      name: 'Refrigerator Repair',
      slug: 'refrigerator-repair',
      description: 'Cooling issues, compressor start failure, thermostat calibration, and gas refill.',
      short_tagline: 'All Brands Covered',
      base_price: 349,
      duration_minutes: 60,
      pricing_type: 'FIXED',
      rating: 4.8,
      reviews_count: 140,
      image_url: 'basic_invertor',
      is_active: true,
    },
    {
      id: 'srv_washing_repair',
      category_id: 'cat_ac_appliances',
      name: 'Washing Machine Repair',
      slug: 'washing-machine-repair',
      description: 'Motor drum noise, drainage block, spinning malfunction, and circuit board repair.',
      short_tagline: 'Expert Technicians',
      base_price: 299,
      duration_minutes: 60,
      pricing_type: 'FIXED',
      rating: 4.85,
      reviews_count: 220,
      image_url: 'basic_washing_machine',
      is_active: true,
    },
  ],
  'cleaning': [
    {
      id: 'srv_deep_home_clean',
      category_id: 'cat_cleaning',
      name: 'Complete Home Deep Cleaning',
      slug: 'home-deep-cleaning',
      description: 'Full house disinfection, kitchen grease removal, bathroom descaling, and floor scrubbing.',
      short_tagline: 'Top Rated',
      base_price: 1499,
      duration_minutes: 180,
      pricing_type: 'FIXED',
      rating: 4.92,
      reviews_count: 480,
      image_url: 'basic_cleaning',
      is_active: true,
    },
    {
      id: 'srv_sofa_clean',
      category_id: 'cat_cleaning',
      name: 'Sofa & Fabric Shampooing',
      slug: 'sofa-shampoo-cleaning',
      description: 'Deep injection-extraction shampooing to remove stains, dirt, and allergens.',
      short_tagline: 'Dries in 2 hours',
      base_price: 599,
      duration_minutes: 60,
      pricing_type: 'FIXED',
      rating: 4.88,
      reviews_count: 260,
      image_url: 'basic_cleaning',
      is_active: true,
    },
  ],
  'electrical': [
    {
      id: 'srv_electrician_visit',
      category_id: 'cat_electrical',
      name: 'Electrician General Checkup & Repair',
      slug: 'electrician-checkup',
      description: 'Switchboard repair, short circuits, socket burnt out, and power line troubleshooting.',
      short_tagline: 'Within 20 mins',
      base_price: 149,
      duration_minutes: 30,
      pricing_type: 'FIXED',
      rating: 4.86,
      reviews_count: 640,
      image_url: 'basic_electric',
      is_active: true,
    },
    {
      id: 'srv_fan_installation',
      category_id: 'cat_electrical',
      name: 'Ceiling Fan Installation / Repair',
      slug: 'ceiling-fan-installation',
      description: 'Fast fan installation with balancing, capacitor replacement, and speed regulator tuning.',
      short_tagline: 'Quick Service',
      base_price: 199,
      duration_minutes: 40,
      pricing_type: 'FIXED',
      rating: 4.8,
      reviews_count: 310,
      image_url: 'basic_fan_cooler',
      is_active: true,
    },
  ],
  'plumbing': [
    {
      id: 'srv_plumber_visit',
      category_id: 'cat_plumbing',
      name: 'Tap & Water Leakage Fix',
      slug: 'tap-leakage-repair',
      description: 'Dripping taps, loose angle valves, waste pipe leak resolution, and washer replacements.',
      short_tagline: 'Quick Arrival',
      base_price: 199,
      duration_minutes: 40,
      pricing_type: 'FIXED',
      rating: 4.82,
      reviews_count: 390,
      image_url: 'basic_plumbing',
      is_active: true,
    },
  ],
  'painting': [
    {
      id: 'srv_room_painting',
      category_id: 'cat_painting',
      name: 'Single Room Painting',
      slug: 'room-painting',
      description: 'Wall putty, primer coat, and 2 premium coats of washable acrylic emulsion paint.',
      short_tagline: 'Includes Masking',
      base_price: 2499,
      duration_minutes: 360,
      pricing_type: 'INSPECTION_QUOTE',
      rating: 4.9,
      reviews_count: 115,
      image_url: 'category_services',
      is_active: true,
    },
  ],
  'ro-water': [
    {
      id: 'srv_ro_service',
      category_id: 'cat_ro_water',
      name: 'RO Purifier Complete Service',
      slug: 'ro-complete-service',
      description: 'Sediment, carbon filter change, membrane TDS tuning, and sanitizer flush.',
      short_tagline: 'Pure Drinking Water',
      base_price: 349,
      duration_minutes: 45,
      pricing_type: 'FIXED',
      rating: 4.89,
      reviews_count: 420,
      image_url: 'basic_ro_filter',
      is_active: true,
    },
  ],
  'home-decor': [
    {
      id: 'srv_occasion_decor',
      category_id: 'cat_home_decor',
      name: 'Birthday & Event Decoration',
      slug: 'event-home-decor',
      description: 'Custom balloon arches, backdrop banners, fairy lights, and celebration setup at home.',
      short_tagline: 'Free Visiting Quote',
      base_price: 999,
      duration_minutes: 120,
      pricing_type: 'FIXED',
      rating: 4.95,
      reviews_count: 85,
      image_url: 'banner_decors',
      is_active: true,
    },
  ],
  'carpentry': [
    {
      id: 'srv_carpenter_visit',
      category_id: 'cat_carpentry',
      name: 'Carpenter General Repair',
      slug: 'carpenter-general-repair',
      description: 'Door lock, latch, hinge repair, furniture assembly, and wooden fixture adjustments.',
      short_tagline: 'Within 30 mins',
      base_price: 199,
      duration_minutes: 45,
      pricing_type: 'FIXED',
      rating: 4.84,
      reviews_count: 190,
      image_url: 'category_services',
      is_active: true,
    },
    {
      id: 'srv_furniture_assembly',
      category_id: 'cat_carpentry',
      name: 'Bed & Wardrobe Assembly',
      slug: 'bed-wardrobe-assembly',
      description: 'Precision modular furniture assembly for beds, wardrobes, and study desks.',
      short_tagline: 'Expert Assembly',
      base_price: 499,
      duration_minutes: 90,
      pricing_type: 'FIXED',
      rating: 4.88,
      reviews_count: 135,
      image_url: 'category_services',
      is_active: true,
    },
  ],
  'pest-control': [
    {
      id: 'srv_pest_cockroach',
      category_id: 'cat_pest_control',
      name: 'Cockroach & Ant Control',
      slug: 'cockroach-ant-control',
      description: 'Odorless gel and spray treatment targeting kitchen cabinets and drains.',
      short_tagline: '100% Safe Chemicals',
      base_price: 799,
      duration_minutes: 60,
      pricing_type: 'FIXED',
      rating: 4.87,
      reviews_count: 240,
      image_url: 'category_services',
      is_active: true,
    },
    {
      id: 'srv_termite_treatment',
      category_id: 'cat_pest_control',
      name: 'Termite Drill & Fill Treatment',
      slug: 'termite-treatment',
      description: 'Intense chemical barrier drilling along walls and furniture with 1-year guarantee.',
      short_tagline: '1 Year Warranty',
      base_price: 1499,
      duration_minutes: 120,
      pricing_type: 'INSPECTION_QUOTE',
      rating: 4.91,
      reviews_count: 98,
      image_url: 'category_services',
      is_active: true,
    },
  ],
  'laundry': [
    {
      id: 'srv_wash_fold',
      category_id: 'cat_laundry',
      name: 'Wash, Dry & Steam Press',
      slug: 'wash-dry-steam-press',
      description: 'Hygienic separate wash, premium detergent, tumble dried and crisp steam ironed.',
      short_tagline: 'Pickup & Delivery',
      base_price: 249,
      duration_minutes: 1440,
      pricing_type: 'FIXED',
      rating: 4.82,
      reviews_count: 310,
      image_url: 'category_services',
      is_active: true,
    },
  ],
  'home-moving': [
    {
      id: 'srv_packers_movers',
      category_id: 'cat_home_moving',
      name: 'Local Home Relocation',
      slug: 'local-home-relocation',
      description: 'Bubble wrap packaging, loading, covered truck transit, and safe room unboxing.',
      short_tagline: 'Zero Damage Guarantee',
      base_price: 2999,
      duration_minutes: 300,
      pricing_type: 'INSPECTION_QUOTE',
      rating: 4.89,
      reviews_count: 175,
      image_url: 'category_services',
      is_active: true,
    },
  ],
  'beauty': [
    {
      id: 'srv_salon_facial',
      category_id: 'cat_beauty',
      name: 'Glow Facial & Cleanup',
      slug: 'glow-facial-cleanup',
      description: 'Skin cleansing, gentle exfoliation, fruit mask, and relaxing face massage at home.',
      short_tagline: 'Organic Kits',
      base_price: 699,
      duration_minutes: 60,
      pricing_type: 'FIXED',
      rating: 4.93,
      reviews_count: 280,
      image_url: 'category_services',
      is_active: true,
    },
    {
      id: 'srv_waxing_mani_pedi',
      category_id: 'cat_beauty',
      name: 'Full Arms & Legs Waxing',
      slug: 'full-arms-legs-waxing',
      description: 'Rica peel-off wax for sensitive skin, soothing post-wax gel application.',
      short_tagline: 'Painless Technique',
      base_price: 549,
      duration_minutes: 45,
      pricing_type: 'FIXED',
      rating: 4.9,
      reviews_count: 340,
      image_url: 'category_services',
      is_active: true,
    },
  ],
};

class CategoryService {
  /**
   * Fetch home top-rail categories from Supabase with resilient fallback
   */
  async getHomeCategories(): Promise<CategoryItem[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .eq('show_on_home', true)
        .is('parent_id', null)
        .order('sort_order', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as CategoryItem[];
      }
    } catch {
      // Graceful offline fallback
    }

    return INITIAL_DISCOVERY_CATEGORIES;
  }

  /**
   * Fetch category hierarchy: main category + subcategories + services
   * Supports lookup by UUID id or by slug
   */
  async getCategoryHierarchy(categorySlugOrId: string): Promise<CategoryHierarchyPayload | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categorySlugOrId);

    const fallbackCategory =
      INITIAL_DISCOVERY_CATEGORIES.find((c) => c.slug === categorySlugOrId || c.id === categorySlugOrId) || {
        id: isUuid ? categorySlugOrId : `cat_${categorySlugOrId}`,
        name: categorySlugOrId.replace('-', ' ').toUpperCase(),
        slug: categorySlugOrId,
        sort_order: 1,
        is_active: true,
      };

    try {
      // 1. Fetch category by id or slug
      const catQuery = supabase.from('categories').select('*');
      const { data: catData, error: catError } = isUuid
        ? await catQuery.eq('id', categorySlugOrId).single()
        : await catQuery.eq('slug', categorySlugOrId).single();

      const category = !catError && catData ? (catData as CategoryItem) : fallbackCategory;
      const effectiveSlug = category.slug || categorySlugOrId;

      // 2. Fetch subcategories if any
      const { data: subData } = await supabase
        .from('categories')
        .select('*')
        .eq('parent_id', category.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      // 3. Fetch services under this category
      const { data: srvData } = await supabase
        .from('services')
        .select('*')
        .eq('category_id', category.id)
        .eq('is_active', true);

      const services: ServiceDetailItem[] =
        srvData && srvData.length > 0
          ? (srvData as any)
          : FALLBACK_CATEGORY_SERVICES[effectiveSlug] || [];

      return {
        category,
        subcategories: (subData as CategoryItem[]) || [],
        services,
      };
    } catch {
      const effectiveSlug = fallbackCategory.slug || categorySlugOrId;
      return {
        category: fallbackCategory,
        subcategories: [],
        services: FALLBACK_CATEGORY_SERVICES[effectiveSlug] || [],
      };
    }
  }

  /**
   * Synchronously returns all fallback catalog services across all categories
   */
  getAllFallbackServices(): ServiceDetailItem[] {
    const list: ServiceDetailItem[] = [];
    for (const key of Object.keys(FALLBACK_CATEGORY_SERVICES)) {
      list.push(...FALLBACK_CATEGORY_SERVICES[key]);
    }
    return list;
  }
}

export const categoryService = new CategoryService();
