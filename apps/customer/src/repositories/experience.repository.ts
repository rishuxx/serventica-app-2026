import { supabase } from '../lib/supabase/client';
import { CategoryItem, ServiceDetailItem } from '../types/category.types';
import {
  CategoryExperience,
  CategoryHeroData,
  CategoryThemeData,
  CatalogSectionData,
} from '../types/experience.types';
import { INITIAL_DISCOVERY_CATEGORIES, FALLBACK_CATEGORY_SERVICES } from '../services/category.service';

// In-Memory LRU Experience Cache
class ExperienceCache {
  private cache = new Map<string, { data: CategoryExperience; timestamp: number }>();
  private readonly TTL_MS = 10 * 60 * 1000; // 10 minutes cache

  get(categoryId: string): CategoryExperience | null {
    const entry = this.cache.get(categoryId);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.TTL_MS) {
      this.cache.delete(categoryId);
      return null;
    }
    return entry.data;
  }

  set(categoryId: string, data: CategoryExperience): void {
    if (this.cache.size >= 25) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(categoryId, { data, timestamp: Date.now() });
  }

  has(categoryId: string): boolean {
    return this.cache.has(categoryId);
  }
}

export const experienceCache = new ExperienceCache();

// Fallback Theme Builder
export function getFallbackCategoryTheme(categorySlug: string): CategoryThemeData {
  const slug = (categorySlug || '').toLowerCase().trim();
  switch (slug) {
    case 'ac-appliances':
    case 'ac':
    case 'appliances':
    case 'appliance-repair':
      return {
        primaryColor: '#0284C7',
        secondaryColor: '#E0F2FE',
        buttonColor: '#0284C7',
        buttonTextColor: '#FFFFFF',
        textColor: '#FFFFFF',
        gradientStart: '#0284C7',
        gradientEnd: '#38BDF8',
        gradientColors: ['#0369A1', '#0284C7', '#0EA5E9', '#38BDF8'],
        isDark: true,
      };
    case 'electrician':
    case 'electrical':
      return {
        primaryColor: '#D97706',
        secondaryColor: '#FEF3C7',
        buttonColor: '#D97706',
        buttonTextColor: '#FFFFFF',
        textColor: '#FFFFFF',
        gradientStart: '#D97706',
        gradientEnd: '#FBBF24',
        gradientColors: ['#92400E', '#B45309', '#D97706', '#F59E0B', '#FBBF24'],
        isDark: true,
      };
    case 'plumbing':
      return {
        primaryColor: '#692EB7',
        secondaryColor: '#F3E8FF',
        buttonColor: '#5D2BAE',
        buttonTextColor: '#FFFFFF',
        textColor: '#FFFFFF',
        gradientStart: '#692EB7',
        gradientEnd: '#522CA4',
        gradientColors: [
          '#3B0764',
          '#522CA4',
          '#692EB7',
          '#7C3AED',
          '#8B5CF6',
          '#D9B3E2',
        ],
        isDark: true,
      };
    case 'home-cleaning':
    case 'cleaning':
      return {
        primaryColor: '#475569',
        secondaryColor: '#F1F5F9',
        buttonColor: '#475569',
        buttonTextColor: '#FFFFFF',
        textColor: '#FFFFFF',
        gradientStart: '#475569',
        gradientEnd: '#94A3B8',
        gradientColors: ['#1E293B', '#334155', '#475569', '#64748B', '#94A3B8'],
        isDark: true,
      };
    case 'painting':
      return {
        primaryColor: '#BE185D',
        secondaryColor: '#FFF1F2',
        buttonColor: '#DB2777',
        buttonTextColor: '#FFFFFF',
        textColor: '#FFFFFF',
        gradientStart: '#9F1239',
        gradientEnd: '#F43F5E',
        gradientColors: ['#881337', '#9F1239', '#BE185D', '#E11D48', '#F43F5E'],
        isDark: true,
      };
    case 'ro-water':
    case 'ro':
      return {
        primaryColor: '#0284C7',
        secondaryColor: '#E0F2FE',
        buttonColor: '#0284C7',
        buttonTextColor: '#FFFFFF',
        textColor: '#FFFFFF',
        gradientStart: '#0284C7',
        gradientEnd: '#06B6D4',
        gradientColors: ['#0369A1', '#0284C7', '#0EA5E9', '#06B6D4', '#22D3EE'],
        isDark: true,
      };
    case 'home-decor':
    case 'decor':
      return {
        primaryColor: '#DB2777',
        secondaryColor: '#FFF1F2',
        buttonColor: '#DB2777',
        buttonTextColor: '#FFFFFF',
        textColor: '#1E242B',
        gradientStart: '#FFDDE1',
        gradientEnd: '#EE9CA7',
        gradientColors: ['#FFDDE1', '#F7BCC4', '#EE9CA7'],
        isDark: false,
      };
    case 'carpentry':
      return {
        primaryColor: '#78350F',
        secondaryColor: '#FEF9C3',
        buttonColor: '#78350F',
        buttonTextColor: '#FFFFFF',
        textColor: '#FFFFFF',
        gradientStart: '#78350F',
        gradientEnd: '#CA8A04',
        gradientColors: ['#451A03', '#78350F', '#A16207', '#CA8A04'],
        isDark: true,
      };
    case 'pest-control':
    case 'pest':
      return {
        primaryColor: '#1E293B',
        secondaryColor: '#F8FAFC',
        buttonColor: '#1E293B',
        buttonTextColor: '#FFFFFF',
        textColor: '#FFFFFF',
        gradientStart: '#1E293B',
        gradientEnd: '#475569',
        gradientColors: ['#0F172A', '#1E293B', '#334155', '#475569'],
        isDark: true,
      };
    case 'laundry':
      return {
        primaryColor: '#5B21B6',
        secondaryColor: '#EDE9FE',
        buttonColor: '#6D28D9',
        buttonTextColor: '#FFFFFF',
        textColor: '#FFFFFF',
        gradientStart: '#5B21B6',
        gradientEnd: '#8B5CF6',
        gradientColors: ['#4C1D95', '#5B21B6', '#7C3AED', '#8B5CF6', '#C4B5FD'],
        isDark: true,
      };
    case 'home-moving':
    case 'moving-shifting':
      return {
        primaryColor: '#365314',
        secondaryColor: '#ECFCCB',
        buttonColor: '#4D7C0F',
        buttonTextColor: '#FFFFFF',
        textColor: '#FFFFFF',
        gradientStart: '#365314',
        gradientEnd: '#65A30D',
        gradientColors: ['#1A2E05', '#365314', '#4D7C0F', '#65A30D', '#A3E635'],
        isDark: true,
      };
    case 'beauty':
      return {
        primaryColor: '#BE185D',
        secondaryColor: '#FCE7F3',
        buttonColor: '#BE185D',
        buttonTextColor: '#FFFFFF',
        textColor: '#FFFFFF',
        gradientStart: '#9D174D',
        gradientEnd: '#DB2777',
        gradientColors: ['#831843', '#9D174D', '#BE185D', '#DB2777', '#F472B6'],
        isDark: true,
      };
    default:
      return {
        primaryColor: '#0284C7',
        secondaryColor: '#E0F2FE',
        buttonColor: '#0284C7',
        buttonTextColor: '#FFFFFF',
        textColor: '#FFFFFF',
        gradientStart: '#0284C7',
        gradientEnd: '#38BDF8',
        gradientColors: ['#0369A1', '#0284C7', '#0EA5E9', '#38BDF8'],
        isDark: true,
      };
  }
}

// Fallback Hero Builder
export function getFallbackCategoryHero(category: CategoryItem): CategoryHeroData {
  const theme = getFallbackCategoryTheme(category.slug);
  const defaultImage =
    category.slug === 'home-decor'
      ? 'hero_homedecors'
      : category.slug === 'cleaning' || category.slug === 'home-cleaning'
      ? 'hero_cleaning'
      : category.slug === 'ac-appliances'
      ? 'hero_background'
      : category.slug === 'electrical' || category.slug === 'electrician'
      ? 'hero_electrical'
      : category.slug === 'painting'
      ? 'hero_painting'
      : category.slug === 'plumbing'
      ? 'hero_plumbing'
      : 'hero_gardener';

  const titles: Record<string, { title: string; subtitle: string; cta: string }> = {
    'ac-appliances': {
      title: 'Keep your home cool & efficient',
      subtitle: 'Certified technicians for AC, fridge, and appliances in 20 mins',
      cta: 'Book AC Service',
    },
    'electrician': {
      title: 'Power your home safely',
      subtitle: 'Verified electricians for wiring, MCB faults, and fans in 20 mins',
      cta: 'Book Electrician',
    },
    'electrical': {
      title: 'Power your home safely',
      subtitle: 'Verified electricians for wiring, MCB faults, and fans in 20 mins',
      cta: 'Book Electrician',
    },
    'plumbing': {
      title: 'Reliable plumbing in 20 minutes',
      subtitle: 'Expert fix for pipe leaks, taps, sanitary fittings, and blockages',
      cta: 'Book Plumber',
    },
    'home-cleaning': {
      title: 'Keep your home spotless & fresh',
      subtitle: 'Professional deep cleaning and sofa sanitization at your door',
      cta: 'Book Cleaning',
    },
    'cleaning': {
      title: 'Keep your home spotless & fresh',
      subtitle: 'Professional deep cleaning and sofa sanitization at your door',
      cta: 'Book Cleaning',
    },
    'painting': {
      title: 'Bring your walls to life',
      subtitle: 'Professional wall painting, waterproof coats, and room refreshes',
      cta: 'Explore Painting',
    },
    'ro-water': {
      title: 'Pure, safe drinking water always',
      subtitle: 'RO service, membrane check, sediment filter and TDS tuning',
      cta: 'Book RO Service',
    },
    'home-decor': {
      title: 'Make your celebrations memorable',
      subtitle: 'Occasional lighting, balloon styling, and theme decoration',
      cta: 'Explore Decor',
    },
    'carpentry': {
      title: 'Precision woodwork & repair',
      subtitle: 'Door locks, hinge fittings, furniture fixes, and drill work',
      cta: 'Book Carpenter',
    },
    'pest-control': {
      title: 'A cleaner, safer, pest-free home',
      subtitle: 'Odorless certified termite, cockroach, and bed bug protection',
      cta: 'Book Pest Control',
    },
    'laundry': {
      title: 'Crisp, sanitized laundry at your door',
      subtitle: 'Wash & fold, steam pressing, and organic dry cleaning',
      cta: 'Book Laundry',
    },
    'home-moving': {
      title: 'Hassle-free relocation & heavy lifting',
      subtitle: 'Verified movers, safe transport, and zero damage guarantee',
      cta: 'Book Moving',
    },
    'beauty': {
      title: 'Salon and spa at your comfort',
      subtitle: 'Professional grooming, facials, waxing, and hair styling',
      cta: 'Book Salon',
    },
  };

  const copy = titles[category.slug] || {
    title: `Verified ${category.name} Services`,
    subtitle: category.description || 'On-demand professionals at upfront transparent pricing',
    cta: `Book ${category.short_name || category.name}`,
  };

  return {
    id: `hero_${category.id}`,
    title: copy.title,
    subtitle: copy.subtitle,
    ctaLabel: copy.cta,
    imageUrl: defaultImage,
    palette: {
      primary: theme.primaryColor,
      secondary: theme.secondaryColor,
      gradientStart: theme.gradientStart,
      gradientEnd: theme.gradientEnd,
      gradientColors: theme.gradientColors,
      textColor: theme.textColor,
      isDark: theme.isDark,
    },
  };
}

class ExperienceRepository {
  private activeToken: number = 0;

  async getCategoryExperience(categoryIdOrSlug: string): Promise<CategoryExperience> {
    const APPLIANCE_ALIASES = new Set([
      'ac',
      'refrigerator',
      'washing-machine',
      'television',
      'tv',
      'fridge',
      'appliances',
      'appliance',
      'microwave',
      'chimney',
      'geyser',
    ]);
    const normalizedTarget = APPLIANCE_ALIASES.has(categoryIdOrSlug?.toLowerCase())
      ? 'ac-appliances'
      : categoryIdOrSlug;

    // 1. Check in-memory cache first
    const cached = experienceCache.get(normalizedTarget);
    if (cached) return cached;

    // 2. Identify Category from defaults first
    let category: CategoryItem | undefined = INITIAL_DISCOVERY_CATEGORIES.find(
      (c) => c.id === normalizedTarget || c.slug === normalizedTarget
    );

    // If not found in defaults or to fetch fresh category record, query Supabase service_categories
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalizedTarget);
      const query = supabase
        .from('service_categories')
        .select('*');

      const { data: catData } = isUuid
        ? await query.eq('id', normalizedTarget).maybeSingle()
        : await query.eq('slug', normalizedTarget).maybeSingle();

      if (catData) {
        category = {
          id: catData.id,
          name: catData.name,
          short_name: catData.short_description || catData.name,
          slug: catData.slug,
          description: catData.description,
          icon: catData.icon_name || 'AirVent',
          image_url: catData.image_url,
          sort_order: catData.sort_order || 0,
          is_active: catData.is_active,
        };
      }
    } catch {
      // Continue with fallback
    }

    if (!category) {
      category = INITIAL_DISCOVERY_CATEGORIES[0];
    }

    // 3. Concurrently fetch Hero Asset, Theme & Services
    let hero = getFallbackCategoryHero(category);
    let theme = getFallbackCategoryTheme(category.slug);
    let services: ServiceDetailItem[] = FALLBACK_CATEGORY_SERVICES[category.slug] || [];

    try {
      const [heroRes, themeRes, servicesRes] = await Promise.all([
        supabase
          .from('category_hero_assets')
          .select('*')
          .eq('category_id', category.id)
          .eq('is_active', true)
          .maybeSingle(),
        supabase
          .from('category_themes')
          .select('*')
          .eq('category_id', category.id)
          .maybeSingle(),
        supabase
          .from('services')
          .select('*')
          .eq('category_id', category.id)
          .eq('is_active', true)
          .order('base_price', { ascending: true }),
      ]);

      if (heroRes.data) {
        const heroSlug = (heroRes.data.slug || '').toLowerCase();
        const catSlug = (category.slug || '').toLowerCase();
        const isMatch =
          heroSlug.includes(catSlug) ||
          (catSlug === 'electrician' && heroSlug.includes('electr')) ||
          (catSlug === 'home-cleaning' && heroSlug.includes('clean')) ||
          (catSlug === 'ac-appliances' && (heroSlug.includes('ac') || heroSlug.includes('appliance'))) ||
          (catSlug === 'ro-water' && heroSlug.includes('ro')) ||
          (catSlug === 'pest-control' && heroSlug.includes('pest')) ||
          (catSlug === 'home-decor' && heroSlug.includes('decor')) ||
          (catSlug === 'carpentry' && heroSlug.includes('carpent')) ||
          (catSlug === 'laundry' && heroSlug.includes('laundry')) ||
          (catSlug === 'painting' && heroSlug.includes('paint'));

        if (isMatch) {
          const resolvedImageUrl =
            category.slug === 'home-decor'
              ? 'hero_homedecors'
              : category.slug === 'cleaning' || category.slug === 'home-cleaning'
              ? 'hero_cleaning'
              : category.slug === 'ac-appliances'
              ? 'hero_background'
              : category.slug === 'electrical' || category.slug === 'electrician'
              ? 'hero_electrical'
              : category.slug === 'painting'
              ? 'hero_painting'
              : category.slug === 'plumbing'
              ? 'hero_plumbing'
              : heroRes.data.image_url;

          hero = {
            id: heroRes.data.id,
            title: heroRes.data.title,
            subtitle: heroRes.data.subtitle,
            ctaLabel: heroRes.data.cta_label,
            imageUrl: resolvedImageUrl,
            mobileImageUrl: resolvedImageUrl,
            palette: {
              primary: heroRes.data.primary_color,
              secondary: heroRes.data.secondary_color,
              gradientStart: heroRes.data.gradient_start,
              gradientEnd: heroRes.data.gradient_end,
              gradientColors: theme.gradientColors || [heroRes.data.gradient_start, heroRes.data.gradient_end],
              textColor: heroRes.data.text_color || '#FFFFFF',
              isDark: heroRes.data.is_dark ?? true,
            },
          };
        }
      }

      if (themeRes.data) {
        const catSlug = (category.slug || '').toLowerCase();
        // Fallback theme colors are calibrated to the brand design system
        const fallbackTheme = getFallbackCategoryTheme(category.slug);
        const isAcCategory = category.slug === 'ac-appliances';
        const isDarkTheme = isAcCategory ? true : (themeRes.data.is_dark ?? fallbackTheme.isDark);
        theme = {
          primaryColor: fallbackTheme.primaryColor || themeRes.data.primary_color,
          secondaryColor: fallbackTheme.secondaryColor || themeRes.data.secondary_color,
          surfaceColor: themeRes.data.surface_color || '#FFFFFF',
          accentColor: fallbackTheme.accentColor || themeRes.data.accent_color,
          textColor: fallbackTheme.textColor,
          mutedTextColor: fallbackTheme.mutedTextColor || (isDarkTheme ? 'rgba(255, 255, 255, 0.75)' : '#666666'),
          buttonColor: fallbackTheme.buttonColor || themeRes.data.button_color,
          buttonTextColor: fallbackTheme.buttonTextColor || '#FFFFFF',
          gradientStart: fallbackTheme.gradientStart || themeRes.data.gradient_start,
          gradientEnd: fallbackTheme.gradientEnd || themeRes.data.gradient_end,
          gradientColors: fallbackTheme.gradientColors || [themeRes.data.gradient_start, themeRes.data.gradient_end],
          isDark: isDarkTheme,
        };
      }

      if (servicesRes.data && servicesRes.data.length > 0) {
        services = servicesRes.data.map((srv: any) => ({
          id: srv.id,
          category_id: srv.category_id,
          subcategory_id: srv.subcategory_id,
          name: srv.name,
          slug: srv.slug,
          description: srv.description,
          short_tagline: srv.short_tagline,
          base_price: Number(srv.base_price) || 0,
          duration_minutes: srv.duration_minutes || 60,
          pricing_type: srv.pricing_type || 'FIXED',
          rating: Number(srv.rating) || 5.0,
          reviews_count: srv.reviews_count || 0,
          image_url: srv.image_url,
          is_active: srv.is_active,
        }));
      }
    } catch {
      // Fallback already assigned
    }

    // 4. Organize services into structured domain-specific catalog sections
    const sections: CatalogSectionData[] = [];
    if (category.slug === 'ac-appliances') {
      const acServices = services.filter((s) => {
        const slug = s.slug.toLowerCase();
        return (
          slug.startsWith('ac-') ||
          slug.includes('-ac-') ||
          slug.endsWith('-ac') ||
          slug.includes('foam-jet') ||
          slug.includes('gas-refill') ||
          slug.includes('pcb') ||
          slug.includes('jet-service')
        );
      });

      const fridgeServices = services.filter((s) => {
        const slug = s.slug.toLowerCase();
        return slug.includes('refrigerator') || slug.includes('fridge') || slug.includes('thermostat') || slug.includes('compressor');
      });

      const washerServices = services.filter((s) => {
        const slug = s.slug.toLowerCase();
        return slug.includes('washing') || slug.includes('descaling') || slug.includes('drum-repair');
      });

      const microChimneyServices = services.filter((s) => {
        const slug = s.slug.toLowerCase();
        return slug.includes('microwave') || slug.includes('chimney') || slug.includes('oven') || slug.includes('degreasing') || slug.includes('heating-issue');
      });

      const tvRoServices = services.filter((s) => {
        const slug = s.slug.toLowerCase();
        return (
          slug.includes('purifier') ||
          slug.includes('ro-') ||
          slug.includes('membrane') ||
          slug.includes('television') ||
          slug.includes('wall-mounting') ||
          slug.includes('tv')
        );
      });

      const matchedSlugs = new Set([
        ...acServices.map((s) => s.slug),
        ...fridgeServices.map((s) => s.slug),
        ...washerServices.map((s) => s.slug),
        ...microChimneyServices.map((s) => s.slug),
        ...tvRoServices.map((s) => s.slug),
      ]);
      const otherApplianceServices = services.filter((s) => !matchedSlugs.has(s.slug));

      if (acServices.length > 0) {
        sections.push({
          id: `ac_section_${category.id}`,
          title: 'AC Repair & Servicing',
          services: acServices,
        });
      }
      if (fridgeServices.length > 0) {
        sections.push({
          id: `fridge_section_${category.id}`,
          title: 'Refrigerator Services',
          services: fridgeServices,
        });
      }
      if (washerServices.length > 0) {
        sections.push({
          id: `washer_section_${category.id}`,
          title: 'Washing Machine Repair',
          services: washerServices,
        });
      }
      if (microChimneyServices.length > 0) {
        sections.push({
          id: `micro_chimney_${category.id}`,
          title: 'Microwave & Chimney Care',
          services: microChimneyServices,
        });
      }
      if (tvRoServices.length > 0) {
        sections.push({
          id: `tv_ro_${category.id}`,
          title: 'RO Purifier & TV Mounting',
          services: tvRoServices,
        });
      }
      if (otherApplianceServices.length > 0) {
        sections.push({
          id: `other_appliance_${category.id}`,
          title: 'Other Appliance Services',
          services: otherApplianceServices,
        });
      }
    } else if (category.slug === 'home-cleaning' || category.slug === 'cleaning') {
      const homeCleaning = services.filter((s) => !s.slug.includes('sofa') && !s.slug.includes('carpet') && !s.slug.includes('tank'));
      const upholstery = services.filter((s) => s.slug.includes('sofa') || s.slug.includes('carpet') || s.slug.includes('curtain'));
      const waterTank = services.filter((s) => s.slug.includes('tank'));

      if (homeCleaning.length > 0) {
        sections.push({
          id: `home_clean_${category.id}`,
          title: 'Deep House Cleaning',
          services: homeCleaning,
        });
      }
      if (upholstery.length > 0) {
        sections.push({
          id: `upholstery_${category.id}`,
          title: 'Sofa & Upholstery Care',
          services: upholstery,
        });
      }
      if (waterTank.length > 0) {
        sections.push({
          id: `water_tank_${category.id}`,
          title: 'Water Tank Sanitization',
          services: waterTank,
        });
      }
    } else if (category.slug === 'electrician' || category.slug === 'electrical') {
      const quickFixes = services.filter((s) => !s.slug.includes('fan') && !s.slug.includes('light') && !s.slug.includes('chandelier'));
      const fixtures = services.filter((s) => s.slug.includes('fan') || s.slug.includes('light') || s.slug.includes('chandelier') || s.slug.includes('wiring'));

      if (fixtures.length > 0) {
        sections.push({
          id: `elec_fixtures_${category.id}`,
          title: 'Fans & Fixtures',
          services: fixtures,
        });
      }
      if (quickFixes.length > 0) {
        sections.push({
          id: `elec_quick_${category.id}`,
          title: 'Repairs & Switchboards',
          services: quickFixes,
        });
      }
    } else if (category.slug === 'painting') {
      const interior = services.filter((s) => s.slug.includes('distemper') || s.slug.includes('emulsion') || s.slug.includes('interior') || s.slug.includes('royale'));
      const exteriorTexture = services.filter((s) => s.slug.includes('texture') || s.slug.includes('exterior') || s.slug.includes('weatherproof'));
      const woodMetal = services.filter((s) => s.slug.includes('enamel') || s.slug.includes('polish') || s.slug.includes('wood') || s.slug.includes('metal'));

      if (interior.length > 0) {
        sections.push({
          id: `paint_interior_${category.id}`,
          title: 'Interior Wall Painting',
          services: interior,
        });
      }
      if (exteriorTexture.length > 0) {
        sections.push({
          id: `paint_texture_${category.id}`,
          title: 'Texture & Exterior Painting',
          services: exteriorTexture,
        });
      }
      if (woodMetal.length > 0) {
        sections.push({
          id: `paint_wood_metal_${category.id}`,
          title: 'Wood & Metal Finishes',
          services: woodMetal,
        });
      }
    } else if (category.slug === 'carpentry') {
      const basicCarpentry = services.filter((s) => !s.slug.includes('custom') && !s.slug.includes('modular') && !s.slug.includes('wardrobe') && !s.slug.includes('bed'));
      const customCarpentry = services.filter((s) => s.slug.includes('custom') || s.slug.includes('modular') || s.slug.includes('wardrobe') || s.slug.includes('bed') || s.slug.includes('window'));

      if (basicCarpentry.length > 0) {
        sections.push({
          id: `carpentry_repair_${category.id}`,
          title: 'Assembly & Hardware Repairs',
          services: basicCarpentry,
        });
      }
      if (customCarpentry.length > 0) {
        sections.push({
          id: `carpentry_custom_${category.id}`,
          title: 'Custom Woodwork & Furniture',
          services: customCarpentry,
        });
      }
    } else if (services.length > 0) {
      sections.push({
        id: `primary_${category.id}`,
        title: `${category.name} Services`,
        services: services,
      });
    }

    const experience: CategoryExperience = {
      category,
      hero,
      theme,
      catalog: {
        sections,
        totalServices: services.length,
      },
    };

    // Cache both by id and slug
    experienceCache.set(category.id, experience);
    experienceCache.set(category.slug, experience);
    experienceCache.set(normalizedTarget, experience);

    return experience;
  }

  // Prefetch first N categories in background for instant responsiveness
  prefetchInitialCategories(categories: CategoryItem[]): void {
    const toPrefetch = categories.slice(0, 4);
    toPrefetch.forEach((cat) => {
      if (!experienceCache.has(cat.id)) {
        this.getCategoryExperience(cat.id).catch(() => {});
      }
    });
  }
}

export const experienceRepository = new ExperienceRepository();
