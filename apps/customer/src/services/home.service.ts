import { supabase } from '../lib/supabase/client';
import {
  HomePayload,
  HomeBannerItem,
  HomeCategoryItem,
  HomeBasicServiceItem,
  HomeHeroAsset,
} from '../types/home.types';

// Asset map resolving backend identifiers to local crisp assets or storage URLs
export const AssetRegistry: Record<string, any> = {
  // Hero Banners (Organized under assets/hero)
  hero_gardener: require('../assets/hero/hero-cleaning-gardener.png'),
  hero_cleaning: require('../assets/hero/hero-cleaning.webp'),
  hero_ac_appliances: require('../assets/hero/hero-ac-appliances.webp'),
  hero_background: require('../assets/hero/hero-ac-appliances.webp'),
  hero_electrical: require('../assets/hero/hero-electrical.webp'),
  hero_painting: require('../assets/hero/hero-painting.webp'),
  hero_plumbing: require('../assets/hero/hero-plumbing.webp'),
  hero_homedecors: require('../assets/hero/hero-home-decor.png'),
  hero_services_general: require('../assets/hero/hero-services-general.jpg'),
  top_logo: require('../assets/images/TopLogo.png'),

  // Banners / Serventica Originals
  banner_gardener: require('../assets/products/c6.png'),
  banner_decors: require('../assets/products/c7.png'),

  // Categories (3 Pillars)
  category_services: require('../assets/category/1a.png'),
  category_repairs: require('../assets/category/2a.png'),
  category_ondemand: require('../assets/category/3a.png'),

  // Basics
  basic_ac_repair: require('../assets/category/Basic1.png'),
  basic_fan_cooler: require('../assets/category/Basic2.png'),
  basic_ro_filter: require('../assets/category/Basic3.png'),
  basic_invertor: require('../assets/category/Basic4.png'),
  basic_electric: require('../assets/category/Basic5.png'),
  basic_cleaning: require('../assets/category/Basic6.png'),
  basic_plumbing: require('../assets/category/Basic7.png'),
  basic_washing_machine: require('../assets/category/Basic8.png'),
};

// Production precomputed Hero asset with verified dominant color palette
export const FALLBACK_HERO_ASSET: HomeHeroAsset = {
  id: 'a1000000-0000-0000-0000-000000000001',
  name: 'Serventica Master Gardener',
  slug: 'gardener-lush',
  storage_path: 'hero-assets/home/serventica-hero-gardener-v1.webp',
  image_url: 'hero_gardener',
  mobile_image_url: 'hero_gardener',
  primary_color: '#23532F',
  secondary_color: '#1B4326',
  accent_color: '#FFCC00',
  gradient_start: '#1E4B29',
  gradient_end: '#2F663C',
  text_color: '#FFFFFF',
  overlay_color: 'rgba(0, 0, 0, 0.22)',
  is_dark: true,
  headline: 'Hire us',
  subheadline: 'let your garden bloom with us hire your personal Gardener for monthly',
  cta_label: 'Shop Now',
  cta_target_route: 'OnDemandGardener',
};

// Clean fallback catalog in case network/device is offline
const FALLBACK_BANNERS: HomeBannerItem[] = [
  {
    id: 'b1',
    title: 'Hire us',
    subtitle: 'let your garden bloom with us hire your personal Gardener for monthly',
    badge_text: 'Serventica Originals',
    image_url: 'banner_gardener',
    target_route: 'OnDemandGardener',
    discount_percentage: 40,
  },
  {
    id: 'b2',
    title: 'Occasional Decors',
    subtitle: 'Get Your Place Ready for Celebrations. Any Time, Any Where with us',
    badge_text: 'Visiting Free',
    image_url: 'banner_decors',
    target_route: 'ServenticaOriginals',
    discount_percentage: 50,
  },
];

const FALLBACK_CATEGORIES: HomeCategoryItem[] = [
  {
    id: 'c1',
    name: 'Services',
    slug: 'services',
    description: 'Deep cleaning, painting, and professional home services',
    image_url: 'category_services',
    sort_order: 1,
  },
  {
    id: 'c2',
    name: 'Repairs',
    slug: 'repairs',
    description: 'AC, appliance, electrical, and plumbing repair specialists',
    image_url: 'category_repairs',
    sort_order: 2,
  },
  {
    id: 'c3',
    name: 'OnDemand',
    slug: 'ondemand',
    description: 'Instant gardeners, drivers, and on-demand helper professionals',
    image_url: 'category_ondemand',
    sort_order: 3,
  },
];

const FALLBACK_BASICS: HomeBasicServiceItem[] = [
  { id: 's1', name: 'AC Repair & Diagnosis', slug: 'ac-repair', short_tagline: 'Cooling & Gas Check', description: 'Expert AC repair, cooling issue, coil check, and gas leakage diagnosis', base_price: 499, image_url: 'basic_ac_repair', rating: 4.9, category_id: 'c1000000-0000-0000-0000-000000000001', category_name: 'AC & Appliances' },
  { id: 's2', name: 'Power Jet AC Deep Clean', slug: 'ac-power-jet-service', short_tagline: 'High-Pressure Jet Wash', description: 'Deep high-pressure jet cleaning of indoor and outdoor coils and filters', base_price: 599, image_url: 'basic_ac_repair', rating: 4.85, category_id: 'c1000000-0000-0000-0000-000000000001', category_name: 'AC & Appliances' },
  { id: 's3', name: 'Electrician Quick Visit', slug: 'electrician-checkup', short_tagline: 'Within 20 mins', description: 'Switchboard repair, short circuits, socket burnt out, and power line troubleshooting', base_price: 149, image_url: 'basic_electric', rating: 4.86, category_id: 'c1000000-0000-0000-0000-000000000003', category_name: 'Electrical' },
  { id: 's4', name: 'Ceiling Fan Installation & Repair', slug: 'ceiling-fan-installation', short_tagline: 'Quick Service', description: 'Fast fan installation with balancing, capacitor replacement, and speed regulator tuning', base_price: 199, image_url: 'basic_fan_cooler', rating: 4.8, category_id: 'c1000000-0000-0000-0000-000000000003', category_name: 'Electrical' },
  { id: 's5', name: 'Tap & Water Leakage Repair', slug: 'tap-leakage-repair', short_tagline: 'Quick Plumber Arrival', description: 'Dripping taps, loose angle valves, waste pipe leak resolution, and washer replacements', base_price: 199, image_url: 'basic_plumbing', rating: 4.82, category_id: 'c1000000-0000-0000-0000-000000000004', category_name: 'Plumbing' },
  { id: 's6', name: 'Complete Home Deep Cleaning', slug: 'home-deep-cleaning', short_tagline: 'Top Rated Disinfection', description: 'Full house disinfection, kitchen grease removal, bathroom descaling, and floor scrubbing', base_price: 1499, image_url: 'basic_cleaning', rating: 4.92, category_id: 'c1000000-0000-0000-0000-000000000002', category_name: 'Cleaning' },
  { id: 's7', name: 'RO Purifier Complete Service', slug: 'ro-complete-service', short_tagline: 'Pure Drinking Water', description: 'Sediment, carbon filter change, membrane TDS tuning, and sanitizer flush', base_price: 349, image_url: 'basic_ro_filter', rating: 4.89, category_id: 'c1000000-0000-0000-0000-000000000006', category_name: 'RO & Water' },
  { id: 's8', name: 'Single Room Painting', slug: 'room-painting', short_tagline: 'Includes Wall Putty & Primer', description: 'Wall putty, primer coat, and 2 premium coats of washable acrylic emulsion paint', base_price: 2499, image_url: 'category_services', rating: 4.9, category_id: 'c1000000-0000-0000-0000-000000000005', category_name: 'Painting' },
  { id: 's9', name: 'Carpenter General Repair', slug: 'carpenter-general-repair', short_tagline: 'Lock, Hinge & Assembly', description: 'Door lock, latch, hinge repair, furniture assembly, and wooden fixture adjustments', base_price: 199, image_url: 'category_services', rating: 4.84, category_id: 'c1000000-0000-0000-0000-000000000008', category_name: 'Carpentry' },
  { id: 's10', name: 'Cockroach & Ant Control', slug: 'cockroach-ant-control', short_tagline: 'Odorless Gel Treatment', description: 'Odorless gel and spray treatment targeting kitchen cabinets, cracks and drains', base_price: 799, image_url: 'category_services', rating: 4.87, category_id: 'c1000000-0000-0000-0000-000000000009', category_name: 'Pest Control' },
  { id: 's11', name: 'Glow Facial & Salon Cleanup', slug: 'glow-facial-cleanup', short_tagline: 'Salon at Home', description: 'Skin cleansing, gentle exfoliation, fruit mask, and relaxing face massage at home', base_price: 699, image_url: 'category_services', rating: 4.93, category_id: 'c1000000-0000-0000-0000-000000000012', category_name: 'Beauty & Salon' },
  { id: 's12', name: 'Birthday & Event Decoration', slug: 'event-home-decor', short_tagline: 'Celebration Staging', description: 'Custom balloon arches, backdrop banners, fairy lights, and celebration setup at home', base_price: 999, image_url: 'banner_decors', rating: 4.95, category_id: 'c1000000-0000-0000-0000-000000000007', category_name: 'Home Decor' },
];

export class HomeService {
  async getHomePayload(): Promise<HomePayload> {
    try {
      const [heroRes, bannersRes, categoriesRes, basicsRes] = await Promise.all([
        supabase
          .from('home_hero_assets')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('home_banners')
          .select('id, title, subtitle, badge_text, image_url, cta_label, target_route, discount_percentage')
          .eq('is_active', true)
          .order('priority', { ascending: true }),
        supabase
          .from('categories')
          .select('id, name, slug, description, image_url, sort_order')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('services')
          .select('id, name, slug, short_tagline, description, base_price, image_url, rating')
          .eq('is_active', true)
          .limit(8),
      ]);

      const heroAsset: HomeHeroAsset = heroRes.data || FALLBACK_HERO_ASSET;

      const banners: HomeBannerItem[] =
        bannersRes.data && bannersRes.data.length > 0
          ? bannersRes.data
          : FALLBACK_BANNERS;

      const categories: HomeCategoryItem[] =
        categoriesRes.data && categoriesRes.data.length > 0
          ? categoriesRes.data
          : FALLBACK_CATEGORIES;

      const basics: HomeBasicServiceItem[] =
        basicsRes.data && basicsRes.data.length > 0
          ? (basicsRes.data as any)
          : FALLBACK_BASICS;

      return { heroAsset, banners, categories, basics };
    } catch {
      return {
        heroAsset: FALLBACK_HERO_ASSET,
        banners: FALLBACK_BANNERS,
        categories: FALLBACK_CATEGORIES,
        basics: FALLBACK_BASICS,
      };
    }
  }

  async searchServices(query: string): Promise<HomeBasicServiceItem[]> {
    if (!query || query.trim().length === 0) return [];
    // Normalize: lowercase, trim leading/trailing, collapse repeated spaces
    const cleanQ = query.trim().toLowerCase().replace(/\s+/g, ' ');

    try {
      // 1. Primary path: Query Supabase services table directly with category join
      const { data, error } = await supabase
        .from('services')
        .select('id, name, slug, short_tagline, description, base_price, image_url, rating, category_id, categories(name)')
        .or(`name.ilike.%${cleanQ}%,description.ilike.%${cleanQ}%,short_tagline.ilike.%${cleanQ}%`)
        .eq('is_active', true)
        .limit(12);

      if (!error && data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          short_tagline: item.short_tagline,
          description: item.description,
          base_price: Number(item.base_price) || 199,
          image_url: item.image_url || 'basic_ac_repair',
          rating: Number(item.rating) || 4.8,
          category_id: item.category_id,
          category_name: item.categories?.name || undefined,
        }));
      }
    } catch {
      // Fall through to catalog search
    }

    // 2. High-speed resilient catalog search across all indexed Serventica services
    // Supports partial match, acronyms, category name, keywords
    const matched = FALLBACK_BASICS.filter((service) => {
      const name = (service.name || '').toLowerCase();
      const tagline = (service.short_tagline || '').toLowerCase();
      const desc = (service.description || '').toLowerCase();
      const slug = (service.slug || '').toLowerCase();
      const catName = (service.category_name || '').toLowerCase();

      // For short queries (<= 3 chars, e.g. "ac", "ro"), match on word boundaries so "ac" doesn't match "packers" or "surface"
      if (cleanQ.length <= 3) {
        const wordRegex = new RegExp(`\\b${cleanQ}\\b`, 'i');
        if (wordRegex.test(name) || wordRegex.test(tagline) || wordRegex.test(catName) || wordRegex.test(slug)) {
          return true;
        }
        if (cleanQ === 'ac' && (name.includes('ac ') || name.startsWith('ac') || catName.includes('ac'))) return true;
        if (cleanQ === 'ro' && (name.includes('ro ') || name.startsWith('ro') || catName.includes('ro'))) return true;
        return false;
      }

      // Exact, prefix, or substring match for regular terms
      if (
        name.includes(cleanQ) ||
        tagline.includes(cleanQ) ||
        desc.includes(cleanQ) ||
        slug.includes(cleanQ) ||
        catName.includes(cleanQ)
      ) {
        return true;
      }

      // Keyword / intent matching:
      if (cleanQ.includes('electr') && (name.includes('electr') || catName.includes('electr'))) return true;
      if (cleanQ.includes('cool') && (name.includes('ac') || tagline.includes('cooling'))) return true;
      if (cleanQ.includes('plumb') && (name.includes('plumb') || catName.includes('plumb') || name.includes('tap'))) return true;
      if (cleanQ.includes('clean') && (name.includes('clean') || catName.includes('clean'))) return true;
      if (cleanQ.includes('water') && (name.includes('ro') || catName.includes('water'))) return true;
      if (cleanQ.includes('purif') && (name.includes('ro') || desc.includes('purifier'))) return true;
      if (cleanQ.includes('paint') && (name.includes('paint') || catName.includes('paint'))) return true;
      if (cleanQ.includes('carpent') && (name.includes('carpent') || catName.includes('carpent'))) return true;
      if (cleanQ.includes('pest') && (name.includes('pest') || catName.includes('pest') || name.includes('ant'))) return true;
      if (cleanQ.includes('decor') && (name.includes('decor') || catName.includes('decor'))) return true;
      if (cleanQ.includes('salon') || cleanQ.includes('beauty') || cleanQ.includes('facial')) {
        if (name.includes('facial') || catName.includes('beauty')) return true;
      }

      return false;
    });

    return matched;
  }
}

export const homeService = new HomeService();
