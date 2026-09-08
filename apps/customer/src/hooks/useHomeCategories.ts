import { useState, useEffect, useCallback } from 'react';
import { CategoryItem } from '../types/category.types';
import { categoryService, INITIAL_DISCOVERY_CATEGORIES } from '../services/category.service';

export function useHomeCategories() {
  const [categories, setCategories] = useState<CategoryItem[]>(INITIAL_DISCOVERY_CATEGORIES);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await categoryService.getHomeCategories();
      setCategories(items);
    } catch {
      // Fallback already set as initial state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const selectCategory = useCallback((categoryId: string) => {
    setSelectedCategoryId((prev) => (prev === categoryId ? null : categoryId));
  }, []);

  return {
    categories,
    selectedCategoryId,
    selectCategory,
    isLoading,
    refreshCategories: fetchCategories,
  };
}
