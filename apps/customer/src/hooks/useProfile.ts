import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { accountRepository } from '../repositories/account.repository';
import { CustomerProfile } from '../../../../packages/types/src';

export function useProfile() {
  const { user, profile: authProfile, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(authProfile);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await accountRepository.getProfile(user.id);
      if (data) {
        setProfile(data);
      } else {
        setProfile(authProfile);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, authProfile]);

  useEffect(() => {
    if (authProfile) {
      setProfile(authProfile);
    } else {
      loadProfile();
    }
  }, [authProfile, loadProfile]);

  const updateProfile = async (updates: {
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string;
  }) => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    setIsUpdating(true);
    try {
      const res = await accountRepository.updateProfile(user.id, updates);
      if (res.success) {
        await refreshProfile();
        await loadProfile();
        return { success: true };
      }
      return { success: false, error: res.error };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update' };
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    profile: profile || authProfile,
    user,
    isLoading,
    isUpdating,
    error,
    refresh: loadProfile,
    updateProfile,
  };
}
