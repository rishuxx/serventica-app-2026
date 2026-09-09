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
  switch (categorySlug) {
    case 'ac-appliances':
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
    case 'cleaning':
      return {
        primaryColor: '#475569',
        secondaryColor: '#F1F5F9',
        buttonColor: '#475569',
        buttonTextColor: '#FFFFFF',
        textColor: '#FFFFFF',
        gradientStart: '#475569',
        gradientEnd: '#94A3B8',
        gradientColors: ['#334155', '#475569', '#64748B', '#94A3B8'],
        isDark: true,
      };
    case 'electrical':
      return {
        primaryColor: '#D97706',
        secondaryColor: '#FEF3C7',
        buttonColor: '#D97706',
        buttonTextColor: '#FFFFFF',
        textColor: '#FFFFFF',
        gradientStart: '#D97706',
        gradientEnd: '#FBBF24',
        gradientColors: ['#B45309', '#D97706', '#F59E0B', '#FBBF24'],
        isDark: true,
      };
    case 'plumbing':
      return {
        primaryColor: '#334155',
        secondaryColor: '#E2E8F0',
        buttonColor: '#334155',
        buttonTextColor: '#FFFFFF',
        textColor: '#FFFFFF',
        gradientStart: '#334155',
        gradientEnd: '#64748B',
        gradientColors: ['#1E293B', '#334155', '#475569', '#64748B'],
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
      return {
        primaryColor: '#D97706',
        secondaryColor: '#FFF1F2',
        buttonColor: '#DB2777',
        buttonTextColor: '#FFFFFF',
        textColor: '#111111',
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
        primaryColor: '#23532F',
        secondaryColor: '#EAF5EC',
        buttonColor: '#1E4B29',
        buttonTextColor: '#FFFFFF',
        textColor: '#FFFFFF',
        gradientStart: '#1E4B29',
        gradientEnd: '#2F663C',
        gradientColors: ['#14351D', '#1E4B29', '#2F663C', '#488057'],
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
      : category.slug === 'cleaning'
      ? 'hero_cleaning'
      : category.slug === 'ac-appliances'
      ? 'hero_background'
      : category.slug === 'electrical'
      ? 'hero_electrical'
      : category.slug === 'painting'
      ? 'hero_painting'
      : category.slug === 'plumbing'
      ? 'hero_background'
      : 'hero_gardener';

  const titles: Record<string, { title: string; subtitle: string; cta: string }> = {
    'ac-appliances': {
      title: 'Keep your home cool & efficient',
      subtitle: 'Certified technicians for AC, fridge, and appliances in 20 mins',
      cta: 'Book AC Service',
    },
    'cleaning': {
      title: 'Keep your home spotless & fresh',
      subtitle: 'Professional deep cleaning and sofa sanitization at your door',
      cta: 'Book Cleaning',
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
    // 1. Check in-memory cache first
    const cached = experienceCache.get(categoryIdOrSlug);
    if (cached) return cached;

    // 2. Identify Category
    let category: CategoryItem | undefined = INITIAL_DISCOVERY_CATEGORIES.find(
      (c) => c.id === categoryIdOrSlug || c.slug === categoryIdOrSlug
    );

    // If not found in defaults, query Supabase
    if (!category) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryIdOrSlug);
        const { data: catData } = await supabase
          .from('categories')
          .select('*')
          .eq(isUuid ? 'id' : 'slug', categoryIdOrSlug)
          .single();

        if (catData) {
          category = {
            id: catData.id,
            name: catData.name,
            short_name: catData.short_name,
            slug: catData.slug,
            description: catData.description,
            icon: catData.icon,
            image_url: catData.image_url,
            sort_order: catData.sort_order || 0,
            is_active: catData.is_active,
            is_featured: catData.is_featured,
            show_on_home: catData.show_on_home,
            tier: catData.tier,
          };
        }
      } catch {
        // Continue with fallback
      }
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
        const resolvedImageUrl =
          category.slug === 'home-decor'
            ? 'hero_homedecors'
            : category.slug === 'cleaning'
            ? 'hero_cleaning'
            : category.slug === 'ac-appliances'
            ? 'hero_background'
            : category.slug === 'electrical'
            ? 'hero_electrical'
            : category.slug === 'painting'
            ? 'hero_painting'
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

      if (themeRes.data) {
        const isAcCategory = category.slug === 'ac-appliances';
        const isDarkTheme = isAcCategory ? true : (themeRes.data.is_dark ?? false);
        theme = {
          primaryColor: themeRes.data.primary_color,
          secondaryColor: themeRes.data.secondary_color,
          surfaceColor: themeRes.data.surface_color || '#FFFFFF',
          accentColor: themeRes.data.accent_color,
          textColor: isAcCategory ? '#FFFFFF' : (themeRes.data.text_color || (isDarkTheme ? '#FFFFFF' : '#111111')),
          mutedTextColor: themeRes.data.muted_text_color || (isDarkTheme ? 'rgba(255, 255, 255, 0.75)' : '#666666'),
          buttonColor: themeRes.data.button_color,
          buttonTextColor: themeRes.data.button_text_color || '#FFFFFF',
          gradientStart: themeRes.data.gradient_start,
          gradientEnd: themeRes.data.gradient_end,
          gradientColors: theme.gradientColors || [themeRes.data.gradient_start, themeRes.data.gradient_end],
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

    // 4. Organize services into structured catalog sections
    const sections: CatalogSectionData[] = [];
    if (services.length > 0) {
      sections.push({
        id: `popular_${category.id}`,
        title: `Popular in ${category.short_name || category.name}`,
        services: services.slice(0, 4),
      });

      if (services.length > 4) {
        sections.push({
          id: `all_${category.id}`,
          title: `All ${category.name} Services`,
          services: services.slice(4),
        });
      }
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
