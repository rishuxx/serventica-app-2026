import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { accountRepository } from '../repositories/account.repository';
import { SavedServiceItem } from '../../../../packages/types/src';

export function useSavedServices() {
  const { user } = useAuth();
  const [savedServices, setSavedServices] = useState<SavedServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      const data = await accountRepository.getSavedServices(user.id);
      setSavedServices(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load saved services');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const toggleSave = async (serviceId: string) => {
    if (!user?.id) return false;

    const isAlreadySaved = savedServices.some((s) => s.serviceId === serviceId);
    // Optimistic UI update
    if (isAlreadySaved) {
      setSavedServices((prev) => prev.filter((s) => s.serviceId !== serviceId));
      const ok = await accountRepository.unsaveService(user.id, serviceId);
      if (!ok) await loadSaved(); // Rollback if failed
      return !ok;
    } else {
      const ok = await accountRepository.saveService(user.id, serviceId);
      await loadSaved();
      return ok;
    }
  };

  const isSaved = (serviceId: string) => {
    return savedServices.some((s) => s.serviceId === serviceId);
  };

  return {
    savedServices,
    isLoading,
    error,
    refresh: loadSaved,
    toggleSave,
    isSaved,
  };
}
