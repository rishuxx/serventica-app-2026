import {
  ServiceCategory,
  ServiceSubcategory,
  ServiceItem,
  ServiceVariant,
  ServiceAddon,
  ServiceMedia,
  ServiceInclusion,
  ServiceExclusion,
  ServiceFAQ,
  RatingSummary,
  ServiceDetails,
  PaginationParams,
  PaginatedResult,
} from '../../../../packages/types/src';

export type CategoryItem = ServiceCategory;

export interface ServiceDetailItem extends ServiceItem {
  short_tagline?: string;
}

export interface CategoryHierarchyPayload {
  category: CategoryItem;
  subcategories: ServiceSubcategory[] | CategoryItem[];
  services: ServiceDetailItem[];
}

export type {
  ServiceCategory,
  ServiceSubcategory,
  ServiceItem,
  ServiceVariant,
  ServiceAddon,
  ServiceMedia,
  ServiceInclusion,
  ServiceExclusion,
  ServiceFAQ,
  RatingSummary,
  ServiceDetails,
  PaginationParams,
  PaginatedResult,
};
