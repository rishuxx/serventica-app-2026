export type RibbonColorVariant = 'green' | 'yellow' | 'orange';

export type RibbonType =
  | 'GREEN'
  | 'YELLOW'
  | 'ORANGE'
  | 'MOST_BOOKED'
  | 'LATEST_BOOKED'
  | 'RECOMMENDED'
  | 'TRENDING'
  | 'POPULAR'
  | 'ORIGINAL'
  | 'OFFER'
  | 'SERVICES'
  | 'FEATURED'
  | 'LAST_USED';

export interface ServiceRibbon {
  type?: RibbonType;
  colorVariant?: RibbonColorVariant;
  label: string;
}

export interface ServiceBranding {
  brand?: string;
  highlight?: string;
}

export interface ServiceOffer {
  value?: string;
  suffix?: string;
  description?: string;
  terms?: string;
}

export interface ServiceCardData {
  id: string;
  name: string;
  image: string | number; // Support remote URI or local require
  rating?: number;
  reviewCount?: number;
  categories?: string[];
  ribbon?: ServiceRibbon;
  secondaryRibbon?: ServiceRibbon;
  favorite?: boolean;
  branding?: ServiceBranding;
  offer?: ServiceOffer;
  price?: number;
  originalPrice?: number;
  durationMinutes?: number;
  lastUsedDate?: string;
  isFeatured?: boolean;
}

export type ServiceCardSize = 'small' | 'medium' | 'large';

export type ServiceCardVariant = 'default' | 'promotional' | 'compact' | 'featured' | 'last_used';
