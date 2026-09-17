import { catalogRepository, IServiceRepository } from '../repositories/catalog.repository';
import {
  ServiceCategory,
  ServiceItem,
  ServiceDetails,
  PaginationParams,
  PaginatedResult,
} from '../../../../packages/types/src';
import { CategoryItem, CategoryHierarchyPayload, ServiceDetailItem } from '../types/category.types';

// Production Tier 1 & 2 launch categories fallback for offline resilience
export const INITIAL_DISCOVERY_CATEGORIES: CategoryItem[] = [
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    name: 'AC & Appliance Services',
    short_description: 'AC, Refrigerator & Washing Machine',
    slug: 'ac-appliances',
    description: 'Certified technicians for air conditioners, refrigerators, washing machines, microwaves, and household appliances.',
    icon: 'AirVent',
    icon_name: 'AirVent',
    sort_order: 1,
    is_active: true,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000002',
    name: 'Electrician',
    short_description: 'Wiring, Fans, MCBs & Switchboards',
    slug: 'electrician',
    description: 'Licensed electricians for switches, fans, lighting, MCB protection, and wiring troubleshooting.',
    icon: 'Zap',
    icon_name: 'Zap',
    sort_order: 2,
    is_active: true,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000003',
    name: 'Plumbing',
    short_description: 'Leaks, Taps, Blocks & Pipe Fittings',
    slug: 'plumbing',
    description: 'Expert plumbers for taps, wash basins, toilets, drainage blockages, and water motors.',
    icon: 'Droplets',
    icon_name: 'Droplets',
    sort_order: 3,
    is_active: true,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000004',
    name: 'Home Cleaning',
    short_description: 'Full Home, Sofa & Deep Cleaning',
    slug: 'home-cleaning',
    description: 'Hospital-grade deep cleaning, sofa shampooing, bathroom scrubbing, and kitchen degreasing.',
    icon: 'Sparkles',
    icon_name: 'Sparkles',
    sort_order: 4,
    is_active: true,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000005',
    name: 'Painting',
    short_description: 'Interior, Exterior & Texture',
    slug: 'painting',
    description: 'Laser-smooth wall painting, texture finish, weatherproof exterior coats, and wood polish.',
    icon: 'Paintbrush',
    icon_name: 'Paintbrush',
    sort_order: 5,
    is_active: true,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000006',
    name: 'RO & Water Purification',
    short_description: 'Purifier Repair, Filter & TDS Check',
    slug: 'ro-water',
    description: 'Water purifier maintenance, sediment & carbon filter changes, RO membrane renewal, and mineral balancing.',
    icon: 'Waves',
    icon_name: 'Waves',
    sort_order: 6,
    is_active: true,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000007',
    name: 'Carpentry',
    short_description: 'Furniture Repair, Hinges & Lock Fix',
    slug: 'carpentry',
    description: 'Skilled carpenters for door realignment, wardrobe lock repairs, modular drilling, and custom woodwork.',
    icon: 'Hammer',
    icon_name: 'Hammer',
    sort_order: 7,
    is_active: true,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000008',
    name: 'Pest Control',
    short_description: 'Termites, Cockroaches & Bed Bugs',
    slug: 'pest-control',
    description: 'Odorless certified chemical sprays, gel baiting, and termite barrier treatments with warranty.',
    icon: 'Bug',
    icon_name: 'Bug',
    sort_order: 8,
    is_active: true,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000009',
    name: 'Home Decor & Installation',
    short_description: 'False Ceiling, Curtains & CCTV',
    slug: 'home-decor',
    description: 'False ceilings, wallpaper styling, curtain tracks, smart locks, and CCTV setup.',
    icon: 'Lamp',
    icon_name: 'Lamp',
    sort_order: 9,
    is_active: true,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000010',
    name: 'Laundry & Dry Clean',
    short_description: 'Wash & Fold, Steam Press & Dry Clean',
    slug: 'laundry',
    description: 'Daily wear wash & fold, steam pressing, premium dry cleaning, and sneaker care.',
    icon: 'WashingMachine',
    icon_name: 'WashingMachine',
    sort_order: 10,
    is_active: true,
  },
];

export class CatalogService {
  constructor(private readonly repository: IServiceRepository = catalogRepository) {}

  /**
   * Retrieves active categories from database with offline resilience
   */
  async getCategories(): Promise<ServiceCategory[]> {
    const categories = await this.repository.getCategories();
    if (categories && categories.length > 0) {
      return categories;
    }
    return INITIAL_DISCOVERY_CATEGORIES;
  }

  /**
   * Retrieves category by ID or slug
   */
  async getCategory(idOrSlug: string): Promise<ServiceCategory | null> {
    const category = await this.repository.getCategoryByIdOrSlug(idOrSlug);
    if (category) return category;

    return (
      INITIAL_DISCOVERY_CATEGORIES.find(
        (c) => c.id === idOrSlug || c.slug === idOrSlug
      ) || null
    );
  }

  /**
   * Retrieves complete category hierarchy with subcategories and services
   */
  async getCategoryHierarchy(categorySlugOrId: string): Promise<CategoryHierarchyPayload | null> {
    const category = await this.getCategory(categorySlugOrId);
    if (!category) return null;

    const [subcategories, servicesResult] = await Promise.all([
      this.repository.getSubcategoriesByCategory(category.id),
      this.repository.getServicesByCategory(category.id, undefined, { limit: 50, offset: 0 }),
    ]);

    return {
      category,
      subcategories,
      services: servicesResult.data.map((srv) => ({
        ...srv,
        short_tagline: srv.short_description || undefined,
      })),
    };
  }

  /**
   * Retrieves paginated services for a category
   */
  async getServicesByCategory(
    categoryId: string,
    subcategoryId?: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<ServiceItem>> {
    return this.repository.getServicesByCategory(categoryId, subcategoryId, pagination);
  }

  /**
   * Retrieves complete ServiceDetails domain model
   */
  async getServiceDetails(idOrSlug: string, userId?: string): Promise<ServiceDetails | null> {
    return this.repository.getServiceDetails(idOrSlug, userId);
  }

  /**
   * Search catalog services with query string
   */
  async searchServices(
    query: string,
    options?: { categoryId?: string; limit?: number; offset?: number }
  ): Promise<ServiceItem[]> {
    return this.repository.searchServices(query, options);
  }

  /**
   * Fallback services helper for compatibility
   */
  getAllFallbackServices(): ServiceDetailItem[] {
    return [];
  }
}

export const catalogService = new CatalogService();
