import { useState, useEffect, useCallback } from 'react';
import { serviceRepository, ServiceDetailFull } from '../repositories/service.repository';

export function useServiceDetail(serviceId?: string, serviceSlug?: string) {
  const [service, setService] = useState<ServiceDetailFull | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  const fetchDetail = useCallback(async () => {
    if (!serviceId && !serviceSlug) {
      setService(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    try {
      let data = serviceId ? await serviceRepository.getServiceByIdOrSlug(serviceId) : null;
      if (!data && serviceSlug) {
        data = await serviceRepository.getServiceByIdOrSlug(serviceSlug);
      }
      if (data) {
        setService(data);
      } else {
        setHasError(true);
      }
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [serviceId, serviceSlug]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return {
    service,
    isLoading,
    hasError,
    refresh: fetchDetail,
  };
}
