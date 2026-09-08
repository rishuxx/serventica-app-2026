import { useState, useEffect } from 'react';
import { HomePayload } from '../types/home.types';
import { homeService } from '../services/home.service';

export function useHome() {
  const [data, setData] = useState<HomePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHome = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await homeService.getHomePayload();
      setData(payload);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch home feed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHome();
  }, []);

  return {
    data,
    isLoading,
    error,
    refresh: loadHome,
  };
}
