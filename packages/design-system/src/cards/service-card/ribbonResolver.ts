import { ServiceCardData, ServiceRibbon } from './types';

/**
 * Intelligent automatic ribbon resolver for Quick Commerce & Service Cards
 * Inspired by Blinkit, Zepto, and BigBasket dynamic badging algorithms.
 *
 * Automatically resolves top-priority badges:
 * 1. User Recency / Retention: 'Booked Recently' or 'Booked 2w ago' (Orange / High Intent)
 * 2. High Demand Social Proof: 'Most Booked' or 'Most Booked Service' (Orange / Conversion Driver)
 * 3. Categorical Distinction: e.g. Primary Category 'Plumbing', 'Painting', 'Occasional Decors' (Green)
 * 4. Premium / Exclusive Flag: 'Serventica Originals' or 'Trending' (Yellow)
 */
export function resolveServiceRibbons(service: ServiceCardData): {
  ribbon?: ServiceRibbon;
  secondaryRibbon?: ServiceRibbon;
} {
  // If explicit manual ribbons are provided and no automatic override is needed, respect them
  if (service.ribbon || service.secondaryRibbon) {
    return {
      ribbon: service.ribbon,
      secondaryRibbon: service.secondaryRibbon,
    };
  }

  let primary: ServiceRibbon | undefined = undefined;
  let secondary: ServiceRibbon | undefined = undefined;

  // 1. Check for Repeat / Last Ordered Status (Highest personal relevance for customer)
  if (service.lastUsedDate) {
    primary = {
      colorVariant: 'orange',
      label: service.lastUsedDate.includes('ago')
        ? `Booked ${service.lastUsedDate}`
        : 'Booked Recently',
    };
  }
  // 2. Check for Most Booked / Popular
  else if (service.isMostBooked || (service.bookingCount && service.bookingCount > 1000)) {
    primary = {
      colorVariant: 'orange',
      label: 'Most Booked Service',
    };
  }
  // 3. Fallback Primary: Category Ribbon (like 'Plumbing', 'Painting', 'Occasional Decors')
  else if (service.categories && service.categories.length > 0) {
    primary = {
      colorVariant: 'green',
      label: service.categories[0],
    };
  }

  // Determine Secondary Ribbon (if applicable for double-ribbon stacking)
  if (service.isOriginal) {
    secondary = {
      colorVariant: 'yellow',
      label: 'Serventica Originals',
    };
  } else if (service.isTrending) {
    secondary = {
      colorVariant: 'yellow',
      label: 'Trending',
    };
  } else if (service.isFeatured && primary?.colorVariant !== 'green') {
    secondary = {
      colorVariant: 'green',
      label: 'Featured Service',
    };
  }

  return {
    ribbon: primary,
    secondaryRibbon: secondary,
  };
}
