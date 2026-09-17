import { SupabaseServiceRepository } from '../apps/customer/src/repositories/catalog.repository';
import { CatalogService } from '../apps/customer/src/services/catalog.service';

describe('Catalog Repository & Application Service Unit Tests', () => {
  let repository: SupabaseServiceRepository;
  let service: CatalogService;

  beforeEach(() => {
    repository = new SupabaseServiceRepository();
    service = new CatalogService(repository);
  });

  test('getCategories returns list of categories and handles fallback', async () => {
    const categories = await service.getCategories();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
    expect(categories[0]).toHaveProperty('id');
    expect(categories[0]).toHaveProperty('slug');
    expect(categories[0]).toHaveProperty('name');
  });

  test('getCategory returns valid category by slug', async () => {
    const category = await service.getCategory('ac-appliances');
    expect(category).not.toBeNull();
    expect(category?.slug).toBe('ac-appliances');
  });

  test('getCategoryHierarchy returns structured category, subcategories and services', async () => {
    const hierarchy = await service.getCategoryHierarchy('ac-appliances');
    expect(hierarchy).not.toBeNull();
    expect(hierarchy?.category.slug).toBe('ac-appliances');
    expect(Array.isArray(hierarchy?.subcategories)).toBe(true);
    expect(Array.isArray(hierarchy?.services)).toBe(true);
  });

  test('searchServices rejects short queries < 2 chars', async () => {
    const results = await service.searchServices('a');
    expect(results).toEqual([]);
  });
});
