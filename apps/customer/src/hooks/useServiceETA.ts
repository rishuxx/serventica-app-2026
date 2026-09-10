import { useState, useEffect, useRef, useCallback } from 'react';
import { ETAResult, GeoPoint } from '../types/routing.types';
import { etaRepository } from '../repositories/eta.repository';

export interface UseServiceETAResult {
  eta: ETAResult | null;
  isCalculating: boolean;
  error: string | null;
  formattedETA: string;
  formattedDistance: string | null;
  retry: () => void;
}

export function useServiceETA(destination?: GeoPoint | null): UseServiceETAResult {
  const [eta, setEta] = useState<ETAResult | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Stale request guard for rapid location switching
  const activeRequestId = useRef<number>(0);

  const fetchETA = useCallback(async (dest: GeoPoint) => {
    const requestId = ++activeRequestId.current;
    setError(null);
    setIsCalculating(true);

    try {
      const result = await etaRepository.getETAForLocation(dest);
      if (requestId === activeRequestId.current) {
        setEta(result);
        setIsCalculating(false);
      }
    } catch (err: any) {
      if (requestId === activeRequestId.current) {
        setError(err?.message || 'Unable to calculate travel ETA');
        setIsCalculating(false);
      }
    }
  }, []);

  useEffect(() => {
    if (
      !destination ||
      typeof destination.latitude !== 'number' ||
      typeof destination.longitude !== 'number' ||
      isNaN(destination.latitude) ||
      isNaN(destination.longitude)
    ) {
      setIsCalculating(true);
      return;
    }

    fetchETA(destination);
  }, [destination?.latitude, destination?.longitude, fetchETA]);

  const retry = useCallback(() => {
    if (destination && destination.latitude != null && destination.longitude != null) {
      fetchETA(destination);
    }
  }, [destination, fetchETA]);

  // Presentation string
  const displayString = isCalculating
    ? 'Getting...'
    : eta
    ? eta.formattedETA
    : 'Unavailable';

  return {
    eta,
    isCalculating,
    error,
    formattedETA: displayString,
    formattedDistance: eta?.formattedDistance || null,
    retry,
  };
}
