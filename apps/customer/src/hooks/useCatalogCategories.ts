import { useState, useEffect, useCallback } from 'react';
import { catalogService } from '../services/catalog.service';
import { ServiceCategory } from '../../../../packages/types/src';

export interface UseCatalogCategoriesResult {
  categories: ServiceCategory[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCatalogCategories(): UseCatalogCategoriesResult {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await catalogService.getCategories();
      setCategories(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    isLoading,
    error,
    refresh: fetchCategories,
  };
}
