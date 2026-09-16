import { RibbonColorVariant, RibbonType } from './types';

export interface RibbonStyleConfig {
  gradientStart: string;
  gradientEnd: string;
  fillAlpha?: number;
  textColor: string;
  defaultLabel?: string;
}

// Exactly from the user-provided Android Vector drawables:
// 1. Green Ribbon: #52DF58 (start 0) -> #204921 (offset 0.805) with 0.85 alpha
// 2. Yellow/Amber Ribbon: #FFDD6D (start 0) -> #F37A00 (offset 0.69) with 0.85 alpha
// 3. Orange / Deep Flame Ribbon: #FFA726 (start 0) -> #E65100 (offset 0.75)
export const ribbonColorGradients: Record<RibbonColorVariant, RibbonStyleConfig> = {
  green: {
    gradientStart: '#52DF58',
    gradientEnd: '#204921',
    fillAlpha: 0.92,
    textColor: '#FFFFFF',
    defaultLabel: 'Occasional Decors',
  },
  yellow: {
    gradientStart: '#FFDD6D',
    gradientEnd: '#F37A00',
    fillAlpha: 0.95,
    textColor: '#FFFFEE', // From styles.xml
    defaultLabel: 'Serventica Originals',
  },
  orange: {
    gradientStart: '#FFA726',
    gradientEnd: '#E65100',
    fillAlpha: 0.95,
    textColor: '#FFFFFF',
    defaultLabel: 'Most Booked Service',
  },
};

// Semantic map pointing strictly to the 3 curated colors: Green, Yellow, Orange
export const ribbonConfig: Record<RibbonType, { colorVariant: RibbonColorVariant; label: string }> = {
  GREEN: { colorVariant: 'green', label: 'Services' },
  YELLOW: { colorVariant: 'yellow', label: 'Serventica Originals' },
  ORANGE: { colorVariant: 'orange', label: 'Most Booked' },

  MOST_BOOKED: { colorVariant: 'orange', label: 'Most Booked Service' },
  RECOMMENDED: { colorVariant: 'yellow', label: 'Recommended' },
  FEATURED: { colorVariant: 'green', label: 'Featured Service' },
  LAST_USED: { colorVariant: 'orange', label: 'Booked Recently' },
  TRENDING: { colorVariant: 'yellow', label: 'Trending' },
  POPULAR: { colorVariant: 'orange', label: 'Popular' },
  ORIGINAL: { colorVariant: 'yellow', label: 'Serventica Originals' },
  OFFER: { colorVariant: 'yellow', label: 'Special Offer' },
  SERVICES: { colorVariant: 'green', label: 'Services' },
  LATEST_BOOKED: { colorVariant: 'green', label: 'Latest Booked' },
};
