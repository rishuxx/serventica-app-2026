import { supabase } from '../lib/supabase/client';
import { ServiceOrigin, OriginType } from '../types/routing.types';

export const INITIAL_CONFIGURED_ORIGIN: ServiceOrigin = {
  id: 'orig_dehradun_nanda_ki_chowki',
  name: 'Kolhupani – Nanda Ki Chowki – Palwali – Majhun Rd',
  type: 'HUB',
  address: 'Nanda Ki Chowki, Dehradun, Uttarakhand 248007',
  city: 'Dehradun',
  state: 'Uttarakhand',
  pincode: '248007',
  latitude: 30.343866,
  longitude: 77.953231,
  isActive: true,
  priority: 100,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export class ServiceOriginRepository {
  private cachedOrigin: ServiceOrigin | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 mins

  async getPrimaryActiveOrigin(): Promise<ServiceOrigin> {
    if (this.cachedOrigin && Date.now() - this.cacheTimestamp < this.CACHE_TTL_MS) {
      return this.cachedOrigin;
    }

    try {
      const { data, error } = await supabase
        .from('service_origins')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        this.cachedOrigin = INITIAL_CONFIGURED_ORIGIN;
        this.cacheTimestamp = Date.now();
        return INITIAL_CONFIGURED_ORIGIN;
      }

      const origin: ServiceOrigin = {
        id: data.id,
        name: data.name,
        type: data.origin_type as OriginType,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        pincode: data.pincode || undefined,
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        isActive: data.is_active,
        priority: data.priority,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      this.cachedOrigin = origin;
      this.cacheTimestamp = Date.now();
      return origin;
    } catch (err) {
      console.warn('Failed to load primary origin from database, using configured fallback:', err);
      return INITIAL_CONFIGURED_ORIGIN;
    }
  }

  async getAllActiveOrigins(): Promise<ServiceOrigin[]> {
    try {
      const { data, error } = await supabase
        .from('service_origins')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error || !data || data.length === 0) {
        return [INITIAL_CONFIGURED_ORIGIN];
      }

      return data.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.origin_type as OriginType,
        address: d.address || undefined,
        city: d.city || undefined,
        state: d.state || undefined,
        pincode: d.pincode || undefined,
        latitude: Number(d.latitude),
        longitude: Number(d.longitude),
        isActive: d.is_active,
        priority: d.priority,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    } catch {
      return [INITIAL_CONFIGURED_ORIGIN];
    }
  }
}

export const serviceOriginRepository = new ServiceOriginRepository();
