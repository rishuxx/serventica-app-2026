export type SearchResultType = 'service' | 'category';

export interface ServiceSearchResult {
  id: string;
  type: SearchResultType;
  name: string;
  slug: string;
  categoryId?: string;
  categoryName?: string;
  imageUrl?: string;
  description?: string;
  shortTagline?: string;
  basePrice?: number;
  rating?: number;
  durationMinutes?: number;
}
