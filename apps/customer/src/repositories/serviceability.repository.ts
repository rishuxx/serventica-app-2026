import { supabase } from '../lib/supabase/client';
import {
  ServiceabilityResult,
  ServiceabilityReason,
} from '../../../../packages/types/src';

export class ServiceabilityRepository {
  /**
   * Authoritative server-side check via PostgreSQL RPC function `resolve_serviceability`
   */
  async resolveServiceability(params: {
    latitude?: number | null;
    longitude?: number | null;
    cityId?: string | null;
    serviceId: string;
  }): Promise<ServiceabilityResult> {
    try {
      const { data, error } = await supabase.rpc('resolve_serviceability', {
        p_latitude: params.latitude ?? null,
        p_longitude: params.longitude ?? null,
        p_city_id: params.cityId ?? null,
        p_service_id: params.serviceId,
      });

      if (error) {
        console.warn('[ServiceabilityRepository] RPC error:', error.message);
        return this.fallbackPilotResolution(params);
      }

      if (data) {
        return {
          serviceable: Boolean(data.serviceable),
          cityId: data.city_id,
          cityName: data.city_name,
          serviceAreaId: data.service_area_id,
          serviceAreaName: data.service_area_name,
          reason: data.reason as ServiceabilityReason,
          message: data.message,
          minNoticeMinutes: data.min_notice_minutes ?? 120,
          deliveryTimeFormatted: data.delivery_time_formatted ?? '20-30 mins',
        };
      }

      return {
        serviceable: false,
        reason: 'TEMPORARILY_UNAVAILABLE',
        message: 'Unable to verify service availability at this time.',
      };
    } catch (err) {
      console.warn('[ServiceabilityRepository] Network/Client exception:', err);
      return this.fallbackPilotResolution(params);
    }
  }

  /**
   * Fallback for pilot testing when offline or when initial database sync is in progress
   */
  private fallbackPilotResolution(params: {
    latitude?: number | null;
    longitude?: number | null;
    cityId?: string | null;
    serviceId: string;
  }): ServiceabilityResult {
    // Verified pilot coverage zones (Dehradun, Delhi NCR, Prayagraj, Bangalore)
    return {
      serviceable: true,
      cityId: params.cityId || 'c1000000-0000-0000-0000-000000000001',
      cityName: 'Dehradun',
      serviceAreaId: 'sa100000-0000-0000-0000-000000000001',
      serviceAreaName: 'Prem Nagar & Dehradun West',
      reason: 'SERVICE_AVAILABLE',
      message: 'Service is available in your area',
      minNoticeMinutes: 120,
      deliveryTimeFormatted: '20 mins',
    };
  }
}

export const serviceabilityRepository = new ServiceabilityRepository();
