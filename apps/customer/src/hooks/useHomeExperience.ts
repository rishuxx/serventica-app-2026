import { useState, useEffect, useRef, useCallback } from 'react';
import { CategoryItem } from '../types/category.types';
import { CategoryExperience } from '../types/experience.types';
import {
  experienceRepository,
  experienceCache,
  getFallbackCategoryHero,
  getFallbackCategoryTheme,
} from '../repositories/experience.repository';
import { categoryService, INITIAL_DISCOVERY_CATEGORIES } from '../services/category.service';

export interface UseHomeExperienceResult {
  categories: CategoryItem[];
  selectedCategoryId: string;
  activeCategory: CategoryItem;
  activeExperience: CategoryExperience;
  isLoading: boolean;
  isTransitioning: boolean;
  error: string | null;
  selectCategory: (categoryId: string) => void;
  retry: () => void;
}

export function useHomeExperience(): UseHomeExperienceResult {
  const [categories, setCategories] = useState<CategoryItem[]>(INITIAL_DISCOVERY_CATEGORIES);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    INITIAL_DISCOVERY_CATEGORIES[0].id
  );

  // Default initial category & experience
  const initialCategory = INITIAL_DISCOVERY_CATEGORIES[0];
  const initialExperience: CategoryExperience = {
    category: initialCategory,
    hero: getFallbackCategoryHero(initialCategory),
    theme: getFallbackCategoryTheme(initialCategory.slug),
    catalog: {
      sections: [],
      totalServices: 0,
    },
  };

  const [activeExperience, setActiveExperience] = useState<CategoryExperience>(initialExperience);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sequence token guarding against race conditions during rapid tapping
  const activeRequestId = useRef<number>(0);

  // 1. Fetch categories from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    categoryService
      .getHomeCategories()
      .then((items) => {
        if (!isMounted || !items || items.length === 0) return;
        setCategories(items);
        setSelectedCategoryId((prevId) => {
          const matched = items.find(
            (it) => it.id === prevId || it.slug === prevId || it.slug === 'ac-appliances'
          );
          return matched ? matched.id : items[0].id;
        });
        // Trigger background prefetching for first visible items
        experienceRepository.prefetchInitialCategories(items);
      })
      .catch(() => {
        // Fallback already set
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load experience for active category with stale response protection
  const loadExperience = useCallback(async (targetCatId: string) => {
    const requestId = ++activeRequestId.current;
    setError(null);

    // If already cached, apply immediately without flicker
    const cached = experienceCache.get(targetCatId);
    if (cached) {
      setActiveExperience(cached);
      setIsTransitioning(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsTransitioning(true);

    try {
      const exp = await experienceRepository.getCategoryExperience(targetCatId);

      // Stale response guard: ensure this request is the latest selection
      if (requestId === activeRequestId.current) {
        setActiveExperience(exp);
        setIsLoading(false);
        setIsTransitioning(false);
      }
    } catch (err: any) {
      if (requestId === activeRequestId.current) {
        setError('Failed to load category services');
        setIsLoading(false);
        setIsTransitioning(false);
      }
    }
  }, []);

  // Initial load on mount for default category
  useEffect(() => {
    loadExperience(selectedCategoryId);
  }, [selectedCategoryId, loadExperience]);

  // Category Selection handler: NO navigation, purely persistent Home state change
  const selectCategory = useCallback(
    (categoryId: string) => {
      if (categoryId === selectedCategoryId) {
        return; // Idempotent: tapping already active category does nothing
      }

      setSelectedCategoryId(categoryId);
      loadExperience(categoryId);
    },
    [selectedCategoryId, loadExperience]
  );

  const retry = useCallback(() => {
    loadExperience(selectedCategoryId);
  }, [selectedCategoryId, loadExperience]);

  const activeCategory =
    categories.find((c) => c.id === selectedCategoryId) ||
    activeExperience.category ||
    categories[0];

  return {
    categories,
    selectedCategoryId,
    activeCategory,
    activeExperience,
    isLoading,
    isTransitioning,
    error,
    selectCategory,
    retry,
  };
}
