import { ServiceDetails, ServiceVariant } from '../packages/types/src';

describe('Service Details Domain & Variant Logic Tests', () => {
  const mockServiceDetails: ServiceDetails = {
    service: {
      id: 'srv_ac_deep_clean',
      category_id: 'cat_ac',
      name: 'Power Jet AC Deep Cleaning',
      slug: 'ac-deep-clean-jet',
      description: 'High pressure jet cleaning of indoor and outdoor coils',
      base_price: 799,
      duration_minutes: 60,
      pricing_type: 'VARIANT',
      rating: 4.9,
      reviews_count: 512,
      is_active: true,
    },
    category: {
      id: 'cat_ac',
      name: 'AC & Appliance Repair',
      slug: 'ac-appliances',
      sort_order: 1,
      is_active: true,
    },
    subcategory: null,
    variants: [
      {
        id: 'var_std_jet',
        service_id: 'srv_ac_deep_clean',
        slug: 'standard-jet-clean',
        name: 'Standard Power Jet Clean',
        description: 'Coil pressure wash and filter scrub',
        duration_minutes: 60,
        price: 799,
        sort_order: 1,
        is_default: true,
        is_active: true,
      },
      {
        id: 'var_premium_jet',
        service_id: 'srv_ac_deep_clean',
        slug: 'premium-foam-jet-clean',
        name: 'Premium Anti-Bacterial Foam Jet',
        description: 'High-pressure wash + German antimicrobial foam jacket',
        duration_minutes: 90,
        price: 999,
        sort_order: 2,
        is_default: false,
        is_active: true,
      },
    ],
    addons: [],
    media: [],
    inclusions: [
      {
        id: 'inc_1',
        service_id: 'srv_ac_deep_clean',
        title: 'Indoor unit coil & filter wash',
        sort_order: 1,
        is_active: true,
      },
    ],
    exclusions: [
      {
        id: 'exc_1',
        service_id: 'srv_ac_deep_clean',
        title: 'Gas refill & spare parts',
        sort_order: 1,
        is_active: true,
      },
    ],
    faqs: [
      {
        id: 'faq_1',
        service_id: 'srv_ac_deep_clean',
        question: 'Will water spill onto my wall?',
        answer: 'No, our team uses a dedicated waterproof catch jacket.',
        sort_order: 1,
        is_active: true,
      },
    ],
    ratingSummary: {
      averageRating: 4.9,
      reviewsCount: 512,
    },
    isSaved: false,
  };

  test('Preselects default variant correctly', () => {
    const defaultVariant =
      mockServiceDetails.variants.find((v) => v.is_default) || mockServiceDetails.variants[0];
    expect(defaultVariant).toBeDefined();
    expect(defaultVariant.id).toBe('var_std_jet');
    expect(defaultVariant.price).toBe(799);
  });

  test('Calculates price and duration correctly when variant changes', () => {
    let selectedVariant: ServiceVariant | null = mockServiceDetails.variants[0];
    let calculatedPrice = selectedVariant ? selectedVariant.price : mockServiceDetails.service.base_price;
    let calculatedDuration = selectedVariant ? selectedVariant.duration_minutes : mockServiceDetails.service.duration_minutes;

    expect(calculatedPrice).toBe(799);
    expect(calculatedDuration).toBe(60);

    // Switch to premium variant
    selectedVariant = mockServiceDetails.variants[1];
    calculatedPrice = selectedVariant.price;
    calculatedDuration = selectedVariant.duration_minutes;

    expect(calculatedPrice).toBe(999);
    expect(calculatedDuration).toBe(90);
  });

  test('Validates non-negative price and positive duration constraints', () => {
    mockServiceDetails.variants.forEach((variant) => {
      expect(variant.price).toBeGreaterThanOrEqual(0);
      expect(variant.duration_minutes).toBeGreaterThan(0);
    });
    expect(mockServiceDetails.service.base_price).toBeGreaterThanOrEqual(0);
    expect(mockServiceDetails.service.duration_minutes).toBeGreaterThan(0);
  });
});
