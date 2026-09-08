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
  category_id?: string;
  category_name?: string;
}

export interface HomeHeroAsset {
  id: string;
  name: string;
  slug: string;
  storage_path: string;
  image_url: string;
  mobile_image_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color?: string;
  gradient_start: string;
  gradient_end: string;
  text_color: string;
  overlay_color?: string;
  is_dark: boolean;
  headline: string;
  subheadline: string;
  cta_label: string;
  cta_target_route?: string;
}

export interface HomePayload {
  heroAsset: HomeHeroAsset;
  banners: HomeBannerItem[];
  categories: HomeCategoryItem[];
  basics: HomeBasicServiceItem[];
}
