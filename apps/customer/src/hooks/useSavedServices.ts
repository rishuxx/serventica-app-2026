import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { savedServicesService } from '../services/saved-services.service';
import { SavedServiceItem } from '../../../../packages/types/src';

export function useSavedServices() {
  const { user } = useAuth();
  const [savedServices, setSavedServices] = useState<SavedServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadSaved = useCallback(async () => {
    if (!user?.id) {
      setSavedServices([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await savedServicesService.getSavedServices(user.id);
      setSavedServices(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load saved services');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const toggleSave = useCallback(
    async (serviceId: string): Promise<boolean> => {
      if (!user?.id || !serviceId) return false;

      const isAlreadySaved = savedServices.some((s) => s.serviceId === serviceId);
      const previousList = savedServices;

      // 1. Optimistic update
      if (isAlreadySaved) {
        setSavedServices((prev) => prev.filter((s) => s.serviceId !== serviceId));
      } else {
        // Temporary optimistic entry
        setSavedServices((prev) => [
          ...prev,
          {
            id: `temp_${Date.now()}`,
            userId: user.id,
            serviceId,
            createdAt: new Date().toISOString(),
            service: {
              id: serviceId,
              name: 'Service',
              slug: 'service',
              description: '',
              basePrice: 0,
              durationMinutes: 60,
              rating: 0,
              reviewsCount: 0,
            },
          },
        ]);
      }

      // 2. Perform database mutation
      try {
        const ok = await savedServicesService.toggleSavedService(
          user.id,
          serviceId,
          isAlreadySaved
        );

        if (!ok) {
          // Rollback on failure
          setSavedServices(previousList);
          return false;
        } else {
          // Sync fresh data from server silently
          const fresh = await savedServicesService.getSavedServices(user.id);
          setSavedServices(fresh);
          return true;
        }
      } catch {
        setSavedServices(previousList);
        return false;
      }
    },
    [user?.id, savedServices]
  );

  const isSaved = useCallback(
    (serviceId: string) => {
      return savedServices.some((s) => s.serviceId === serviceId);
    },
    [savedServices]
  );

  return {
    savedServices,
    isLoading,
    error,
    refresh: loadSaved,
    toggleSave,
    isSaved,
  };
}
