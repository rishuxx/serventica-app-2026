import { SupabasePricingRepository } from '../apps/customer/src/repositories/pricing.repository';
import { PricingService } from '../apps/customer/src/services/PricingService';

describe('PricingService & SupabasePricingRepository', () => {
  let mockPricingRepo: any;
  let pricingService: PricingService;

  beforeEach(() => {
    mockPricingRepo = {
      getApplicablePrice: jest.fn(),
      getPricesForServices: jest.fn(),
    };
    pricingService = new PricingService(mockPricingRepo);
  });

  it('formats prices into standard INR format', () => {
    expect(pricingService.formatPrice(549)).toBe('₹549');
    expect(pricingService.formatPrice(1499)).toBe('₹1,499');
    expect(pricingService.formatPrice(0)).toBe('₹0');
  });

  it('resolves price with service area override taking priority', async () => {
    const repo = new SupabasePricingRepository();
    // Simulate internal multi-tier resolution logic
    const records = [
      {
        id: 'p1',
        service_id: 's1',
        city_id: null,
        service_area_id: null,
        base_price: 499,
        labour_price: 499,
        material_price: 0,
        currency: 'INR',
        price_type: 'FIXED',
      },
      {
        id: 'p2',
        service_id: 's1',
        city_id: 'city-mumbai',
        service_area_id: null,
        base_price: 599,
        labour_price: 599,
        material_price: 0,
        currency: 'INR',
        price_type: 'FIXED',
      },
      {
        id: 'p3',
        service_id: 's1',
        city_id: 'city-mumbai',
        service_area_id: 'area-bandra',
        base_price: 649,
        labour_price: 649,
        material_price: 0,
        currency: 'INR',
        price_type: 'FIXED',
      },
    ];

    // Test area resolution
    const resolvedArea = (repo as any).resolveMultiTierPrice(records, {
      serviceId: 's1',
      cityId: 'city-mumbai',
      serviceAreaId: 'area-bandra',
    });
    expect(resolvedArea.amount).toBe(649);
    expect(resolvedArea.resolutionTier).toBe('SERVICE_AREA');

    // Test city resolution when area is not provided
    const resolvedCity = (repo as any).resolveMultiTierPrice(records, {
      serviceId: 's1',
      cityId: 'city-mumbai',
      serviceAreaId: null,
    });
    expect(resolvedCity.amount).toBe(599);
    expect(resolvedCity.resolutionTier).toBe('CITY');

    // Test global default fallback when city has no override
    const resolvedDefault = (repo as any).resolveMultiTierPrice(records, {
      serviceId: 's1',
      cityId: 'city-delhi',
      serviceAreaId: null,
    });
    expect(resolvedDefault.amount).toBe(499);
    expect(resolvedDefault.resolutionTier).toBe('GLOBAL_DEFAULT');
  });
});
