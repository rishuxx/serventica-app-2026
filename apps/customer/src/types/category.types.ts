export interface CategoryItem {
  id: string;
  name: string;
  short_name?: string;
  slug: string;
  description?: string;
  icon?: string;
  image_url?: string;
  sort_order: number;
  is_active: boolean;
  is_featured?: boolean;
  show_on_home?: boolean;
  tier?: number;
  parent_id?: string | null;
}

export interface ServiceDetailItem {
  id: string;
  category_id: string;
  subcategory_id?: string;
  name: string;
  slug: string;
  description: string;
  short_tagline?: string;
  base_price: number;
  duration_minutes: number;
  pricing_type: string;
  rating: number;
  reviews_count?: number;
  image_url?: string;
  is_active: boolean;
}

export interface CategoryHierarchyPayload {
  category: CategoryItem;
  subcategories: CategoryItem[];
  services: ServiceDetailItem[];
}
