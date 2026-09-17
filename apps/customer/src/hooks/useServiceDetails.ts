import { useState, useEffect, useCallback, useMemo } from 'react';
import { catalogService } from '../services/catalog.service';
import { savedServicesService } from '../services/saved-services.service';
import { useAuth } from '../context/AuthContext';
import {
  ServiceDetails,
  ServiceVariant,
} from '../../../../packages/types/src';

export interface UseServiceDetailsResult {
  details: ServiceDetails | null;
  selectedVariant: ServiceVariant | null;
  setSelectedVariant: (variant: ServiceVariant) => void;
  isSaved: boolean;
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;
  toggleSave: () => Promise<boolean>;
  refresh: () => Promise<void>;
  calculatedPrice: number;
  calculatedDuration: number;
}

export function useServiceDetails(idOrSlug?: string): UseServiceDetailsResult {
  const { user } = useAuth();
  const [details, setDetails] = useState<ServiceDetails | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ServiceVariant | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServiceDetails = useCallback(async () => {
    if (!idOrSlug) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await catalogService.getServiceDetails(idOrSlug, user?.id);
      if (!data) {
        setError('Service not found');
        setIsLoading(false);
        return;
      }

      setDetails(data);
      setIsSaved(Boolean(data.isSaved));

      // Resolve initial default variant
      if (data.variants && data.variants.length > 0) {
        const defaultVar = data.variants.find((v) => v.is_default) || data.variants[0];
        setSelectedVariant(defaultVar);
      } else {
        setSelectedVariant(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load service details');
    } finally {
      setIsLoading(false);
    }
  }, [idOrSlug, user?.id]);

  useEffect(() => {
    fetchServiceDetails();
  }, [fetchServiceDetails]);

  // Optimistic save/unsave toggle
  const toggleSave = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !details?.service?.id) return false;

    const previousState = isSaved;
    const nextState = !previousState;

    // 1. Optimistic UI update
    setIsSaved(nextState);
    setIsSaving(true);

    try {
      // 2. Perform Supabase database mutation
      const success = await savedServicesService.toggleSavedService(
        user.id,
        details.service.id,
        previousState
      );

      if (!success) {
        // Rollback on failure
        setIsSaved(previousState);
      }
      return success;
    } catch {
      setIsSaved(previousState);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, details?.service?.id, isSaved]);

  const calculatedPrice = useMemo(() => {
    if (selectedVariant) {
      return selectedVariant.price;
    }
    return details?.service?.base_price ?? 0;
  }, [selectedVariant, details?.service?.base_price]);

  const calculatedDuration = useMemo(() => {
    if (selectedVariant) {
      return selectedVariant.duration_minutes;
    }
    return details?.service?.duration_minutes ?? 60;
  }, [selectedVariant, details?.service?.duration_minutes]);

  return {
    details,
    selectedVariant,
    setSelectedVariant,
    isSaved,
    isSaving,
    isLoading,
    error,
    toggleSave,
    refresh: fetchServiceDetails,
    calculatedPrice,
    calculatedDuration,
  };
}
