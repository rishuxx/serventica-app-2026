import { supabase } from '../lib/supabase/client';
import { SavedServiceItem } from '../../../../packages/types/src';

export interface ISavedServicesRepository {
  getSavedServices(userId: string): Promise<SavedServiceItem[]>;
  saveService(userId: string, serviceId: string): Promise<boolean>;
  unsaveService(userId: string, serviceId: string): Promise<boolean>;
  isServiceSaved(userId: string, serviceId: string): Promise<boolean>;
}

export class SupabaseSavedServicesRepository implements ISavedServicesRepository {
  /**
   * Fetches saved services for a user with joined service & category details
   */
  async getSavedServices(userId: string): Promise<SavedServiceItem[]> {
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('saved_services')
        .select(`
          id,
          user_id,
          service_id,
          created_at,
          services (
            id,
            name,
            slug,
            description,
            thumbnail_url,
            hero_image_url,
            base_price,
            duration_minutes,
            rating,
            reviews_count,
            category_id,
            categories (
              name,
              slug
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((item: any) => {
          const srv = item.services;
          return {
            id: item.id,
            userId: item.user_id,
            serviceId: item.service_id,
            createdAt: item.created_at,
            service: {
              id: srv?.id || item.service_id,
              name: srv?.name || 'Service',
              slug: srv?.slug || 'service',
              description: srv?.description || '',
              basePrice: Number(srv?.base_price) || 0,
              durationMinutes: Number(srv?.duration_minutes) || 60,
              rating: Number(srv?.rating) || 0,
              reviewsCount: Number(srv?.reviews_count) || 0,
              imageUrl: srv?.thumbnail_url || srv?.hero_image_url || undefined,
              categoryName: srv?.categories?.name || undefined,
            },
          };
        });
      }
    } catch (err) {
      console.warn('[SupabaseSavedServicesRepository.getSavedServices] Error:', err);
    }
    return [];
  }

  /**
   * Save a service for the user
   */
  async saveService(userId: string, serviceId: string): Promise<boolean> {
    if (!userId || !serviceId) return false;

    try {
      const { error } = await supabase.from('saved_services').insert({
        user_id: userId,
        service_id: serviceId,
      });

      return !error;
    } catch (err) {
      console.warn('[SupabaseSavedServicesRepository.saveService] Error:', err);
      return false;
    }
  }

  /**
   * Unsave a service for the user
   */
  async unsaveService(userId: string, serviceId: string): Promise<boolean> {
    if (!userId || !serviceId) return false;

    try {
      const { error } = await supabase
        .from('saved_services')
        .delete()
        .eq('user_id', userId)
        .eq('service_id', serviceId);

      return !error;
    } catch (err) {
      console.warn('[SupabaseSavedServicesRepository.unsaveService] Error:', err);
      return false;
    }
  }

  /**
   * Check if a service is saved by the user
   */
  async isServiceSaved(userId: string, serviceId: string): Promise<boolean> {
    if (!userId || !serviceId) return false;

    try {
      const { data, error } = await supabase
        .from('saved_services')
        .select('id')
        .eq('user_id', userId)
        .eq('service_id', serviceId)
        .maybeSingle();

      return !error && Boolean(data);
    } catch {
      return false;
    }
  }
}

export const savedServicesRepository = new SupabaseSavedServicesRepository();
