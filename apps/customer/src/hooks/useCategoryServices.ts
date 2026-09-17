import { useState, useEffect, useCallback } from 'react';
import { catalogService } from '../services/catalog.service';
import {
  ServiceCategory,
  ServiceSubcategory,
  ServiceItem,
} from '../../../../packages/types/src';

export interface UseCategoryServicesResult {
  category: ServiceCategory | null;
  subcategories: ServiceSubcategory[];
  services: ServiceItem[];
  selectedSubcategoryId: string;
  setSelectedSubcategoryId: (subcategoryId: string) => void;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCategoryServices(categorySlugOrId: string): UseCategoryServicesResult {
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [subcategories, setSubcategories] = useState<ServiceSubcategory[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [nextOffset, setNextOffset] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const fetchCategoryAndServices = useCallback(async () => {
    if (!categorySlugOrId) return;
    setIsLoading(true);
    setError(null);

    try {
      const hierarchy = await catalogService.getCategoryHierarchy(categorySlugOrId);
      if (!hierarchy) {
        setError('Category not found');
        setIsLoading(false);
        return;
      }

      setCategory(hierarchy.category);
      setSubcategories(hierarchy.subcategories as ServiceSubcategory[]);

      // Fetch initial services
      const subcatId = selectedSubcategoryId === 'all' ? undefined : selectedSubcategoryId;
      const paginated = await catalogService.getServicesByCategory(
        hierarchy.category.id,
        subcatId,
        { limit: 20, offset: 0 }
      );

      // If database returned services, use them; otherwise use hierarchy services
      const effectiveServices = paginated.data.length > 0 ? paginated.data : (hierarchy.services as ServiceItem[]);
      setServices(effectiveServices);
      setHasMore(paginated.hasMore);
      setNextOffset(paginated.nextOffset);
    } catch (err: any) {
      setError(err?.message || 'Failed to load category services');
    } finally {
      setIsLoading(false);
    }
  }, [categorySlugOrId, selectedSubcategoryId]);

  useEffect(() => {
    fetchCategoryAndServices();
  }, [fetchCategoryAndServices]);

  const loadMore = useCallback(async () => {
    if (!category || !hasMore || isLoadingMore || nextOffset === undefined) return;

    setIsLoadingMore(true);
    try {
      const subcatId = selectedSubcategoryId === 'all' ? undefined : selectedSubcategoryId;
      const paginated = await catalogService.getServicesByCategory(
        category.id,
        subcatId,
        { limit: 20, offset: nextOffset }
      );

      setServices((prev) => [...prev, ...paginated.data]);
      setHasMore(paginated.hasMore);
      setNextOffset(paginated.nextOffset);
    } catch {
      // ignore
    } finally {
      setIsLoadingMore(false);
    }
  }, [category, hasMore, isLoadingMore, nextOffset, selectedSubcategoryId]);

  return {
    category,
    subcategories,
    services,
    selectedSubcategoryId,
    setSelectedSubcategoryId,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh: fetchCategoryAndServices,
  };
}
