import { useState, useEffect, useCallback } from 'react';
import { HomePayload } from '../types/home.types';
import { homeService } from '../services/home.service';
import { SafeAsyncStorage as AsyncStorage } from '../../../../packages/utils/src/storage/safe-storage';

const HOME_CACHE_KEY = '@serventica_home_feed_cache_v1';

export function useHome() {
  const [data, setData] = useState<HomePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHome = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const payload = await homeService.getHomePayload();
      setData(payload);
      // Persist latest payload asynchronously for instant subsequent starts
      AsyncStorage.setItem(HOME_CACHE_KEY, JSON.stringify(payload)).catch(() => {});
    } catch (err: any) {
      if (!isBackground) {
        setError(err.message || 'Failed to fetch home feed');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 1. Instant Cache-First Paint: Check if we have a warm offline cache
    AsyncStorage.getItem(HOME_CACHE_KEY)
      .then((cached) => {
        if (cached && isMounted) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.categories && parsed.categories.length > 0) {
              setData(parsed);
              setIsLoading(false);
            }
          } catch (_) {
            // Ignore parse errors
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        // 2. Revalidate from server (stale-while-revalidate pattern)
        if (isMounted) {
          loadHome(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [loadHome]);

  return {
    data,
    isLoading,
    error,
    refresh: () => loadHome(false),
  };
}
