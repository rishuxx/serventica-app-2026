import { supabase } from '../lib/supabase/client';
import { HomePayload, HomeBannerItem, HomeCategoryItem, HomeBasicServiceItem } from '../types/home.types';

// Asset map resolving backend identifiers to local crisp assets or storage URLs
export const AssetRegistry: Record<string, any> = {
  // Hero Background
  hero_background: require('../assets/images/lights.jpg'),
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
  { id: 's1', name: 'AC Repair', slug: 'ac-repair', short_tagline: 'Repair', description: 'Expert AC repair', base_price: 499, image_url: 'basic_ac_repair', rating: 4.9 },
  { id: 's2', name: 'Fan/Cooler', slug: 'fan-cooler', short_tagline: 'Service', description: 'Fan repair', base_price: 199, image_url: 'basic_fan_cooler', rating: 4.8 },
  { id: 's3', name: 'RO/Filter', slug: 'ro-filter', short_tagline: 'Purifier', description: 'Purifier repair', base_price: 349, image_url: 'basic_ro_filter', rating: 4.9 },
  { id: 's4', name: 'Invertor', slug: 'invertor', short_tagline: 'Battery', description: 'Inverter check', base_price: 299, image_url: 'basic_invertor', rating: 4.7 },
  { id: 's5', name: 'Electric', slug: 'electric', short_tagline: 'Wiring', description: 'Electrical fix', base_price: 149, image_url: 'basic_electric', rating: 4.85 },
  { id: 's6', name: 'Cleaning', slug: 'cleaning', short_tagline: 'Home', description: 'Deep cleaning', base_price: 499, image_url: 'basic_cleaning', rating: 4.9 },
  { id: 's7', name: 'Plumbing', slug: 'plumbing', short_tagline: 'Fittings', description: 'Plumbing repair', base_price: 199, image_url: 'basic_plumbing', rating: 4.8 },
  { id: 's8', name: 'Essentials', slug: 'essentials', short_tagline: 'Repair', description: 'Appliance check', base_price: 299, image_url: 'basic_washing_machine', rating: 4.85 },
];

export class HomeService {
  async getHomePayload(): Promise<HomePayload> {
    try {
      const [bannersRes, categoriesRes, basicsRes] = await Promise.all([
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

      return { banners, categories, basics };
    } catch {
      return {
        banners: FALLBACK_BANNERS,
        categories: FALLBACK_CATEGORIES,
        basics: FALLBACK_BASICS,
      };
    }
  }

  async searchServices(query: string): Promise<HomeBasicServiceItem[]> {
    if (!query || query.trim().length === 0) return [];
    const cleanQ = query.trim().toLowerCase();

    try {
      // 1. Primary path: Query Supabase services table directly
      const { data, error } = await supabase
        .from('services')
        .select('id, name, slug, short_tagline, description, base_price, image_url, rating')
        .or(`name.ilike.%${cleanQ}%,description.ilike.%${cleanQ}%,short_tagline.ilike.%${cleanQ}%`)
        .eq('is_active', true)
        .limit(10);

      if (!error && data && data.length > 0) {
        return data as any;
      }
    } catch {
      // Fall through to catalog search
    }

    // 2. High-speed resilient catalog search across all indexed Serventica services
    // Supports partial match ("elec" -> Electrician), case-insensitivity, acronyms ("ac" -> AC Repair), and tagline matches
    const matched = FALLBACK_BASICS.filter((service) => {
      const name = (service.name || '').toLowerCase();
      const tagline = (service.short_tagline || '').toLowerCase();
      const desc = (service.description || '').toLowerCase();
      const slug = (service.slug || '').toLowerCase();

      // Exact, prefix, or substring match
      if (name.includes(cleanQ) || tagline.includes(cleanQ) || desc.includes(cleanQ) || slug.includes(cleanQ)) {
        return true;
      }

      // Fuzzy/variant matching (e.g. "electrician" matches "Electric", "ac" matches "AC Repair")
      if (cleanQ.includes('electr') && name.includes('electric')) return true;
      if (cleanQ === 'ac' && name.includes('ac')) return true;
      if (cleanQ.includes('plumb') && name.includes('plumb')) return true;
      if (cleanQ.includes('clean') && name.includes('clean')) return true;
      if (cleanQ.includes('ro') && name.includes('ro')) return true;

      return false;
    });

    return matched;
  }
}

export const homeService = new HomeService();
