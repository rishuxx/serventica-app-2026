export interface HomeBannerItem {
  id: string;
  title: string;
  subtitle: string;
  badge_text?: string;
  image_url: string;
  cta_label?: string;
  target_route: string;
  discount_percentage?: number;
}

export interface HomeCategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  sort_order: number;
}

export interface HomeBasicServiceItem {
  id: string;
  name: string;
  slug: string;
  short_tagline?: string;
  description: string;
  base_price: number;
  image_url: string;
  rating: number;
}

export interface HomePayload {
  banners: HomeBannerItem[];
  categories: HomeCategoryItem[];
  basics: HomeBasicServiceItem[];
}
