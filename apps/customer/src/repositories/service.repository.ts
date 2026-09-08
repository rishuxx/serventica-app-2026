import { supabase } from '../lib/supabase/client';
import { ServiceDetailItem } from '../types/category.types';
import { categoryService } from '../services/category.service';

export interface ServiceDetailFull extends ServiceDetailItem {
  category_name?: string;
  category_slug?: string;
  subcategory_name?: string;
  included_items?: string[];
  excluded_items?: string[];
  overview?: string;
  faq?: Array<{ question: string; answer: string }>;
}

class ServiceRepository {
  /**
   * Fetches service by ID or Slug with comprehensive detail and inclusions
   */
  async getServiceByIdOrSlug(idOrSlug: string): Promise<ServiceDetailFull | null> {
    if (!idOrSlug) return null;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    try {
      // 1. Fetch service record from Supabase
      const query = supabase
        .from('services')
        .select('*, categories(id, name, slug)');

      const { data, error } = isUuid
        ? await query.eq('id', idOrSlug).maybeSingle()
        : await query.eq('slug', idOrSlug).maybeSingle();

      if (!error && data) {
        return this.mapDbServiceToModel(data);
      }
    } catch (err) {
      console.warn('Supabase service query failed, checking catalog repository:', err);
    }

    // 2. Resilient fallback lookup from existing indexed catalog
    const allServices = await this.getAllFallbackCatalogServices();
    const matched = allServices.find((s) => {
      const target = idOrSlug.toLowerCase().trim();
      const sId = s.id.toLowerCase();
      const sSlug = s.slug.toLowerCase();
      const sName = s.name.toLowerCase();

      return (
        sId === target ||
        sSlug === target ||
        sSlug.startsWith(target) ||
        target.startsWith(sSlug) ||
        sName === target ||
        sName.includes(target) ||
        target.includes(sName)
      );
    });

    if (matched) {
      return this.enrichFallbackService(matched);
    }

    return null;
  }

  private mapDbServiceToModel(data: any): ServiceDetailFull {
    const defaultInclusions = this.generateDefaultInclusions(data.slug || data.name);

    return {
      id: data.id,
      category_id: data.category_id,
      subcategory_id: data.subcategory_id || undefined,
      name: data.name,
      slug: data.slug,
      description: data.description,
      short_tagline: data.short_tagline || undefined,
      base_price: Number(data.base_price) || 0,
      duration_minutes: Number(data.duration_minutes) || 0,
      pricing_type: data.pricing_type || 'FIXED',
      rating: Number(data.rating) || 0,
      reviews_count: Number(data.reviews_count) || 0,
      image_url: data.image_url || undefined,
      is_active: Boolean(data.is_active),
      category_name: data.categories?.name,
      category_slug: data.categories?.slug,
      included_items: data.included_items || defaultInclusions.included,
      excluded_items: data.excluded_items || defaultInclusions.excluded,
      overview: data.description,
    };
  }

  private async getAllFallbackCatalogServices(): Promise<ServiceDetailItem[]> {
    return categoryService.getAllFallbackServices();
  }

  private enrichFallbackService(srv: ServiceDetailItem): ServiceDetailFull {
    const inclusions = this.generateDefaultInclusions(srv.slug || srv.name);
    return {
      ...srv,
      included_items: inclusions.included,
      excluded_items: inclusions.excluded,
      overview: srv.description,
    };
  }

  private generateDefaultInclusions(slugOrName: string): { included: string[]; excluded: string[] } {
    const s = slugOrName.toLowerCase();

    if (s.includes('ac')) {
      return {
        included: [
          'Complete diagnostic and cooling efficiency inspection',
          'Filter, indoor tray, and external condenser check',
          'Amperage and refrigerant pressure measurement',
          'Upfront quote for any additional spare parts if needed',
        ],
        excluded: [
          'Spare parts replacement (charged as per standard rate card)',
          'Complete copper piping alterations or masonry repairs',
        ],
      };
    }

    if (s.includes('clean')) {
      return {
        included: [
          'Professional deep scrubbing and surface sanitization',
          'Hospital-grade eco-friendly cleaning detergents',
          'Degreasing of appliances, tiles, and high-touch areas',
          'Post-service quality inspection with supervisor',
        ],
        excluded: [
          'Repainting or restoration of permanently stained grout',
          'Cleaning of interior locked cupboards containing valuables',
        ],
      };
    }

    if (s.includes('electric') || s.includes('fan')) {
      return {
        included: [
          'Detailed voltage, load, and wiring health check',
          'Secure mounting and precision connection tightening',
          'Earthing test and safety breaker evaluation',
        ],
        excluded: [
          'New cabling lines through internal conduits',
          'Electrical fixtures, bulbs, and external hardware',
        ],
      };
    }

    if (s.includes('plumb') || s.includes('leak') || s.includes('tap')) {
      return {
        included: [
          'Leak pinpointing and pipe pressure testing',
          'Washer, spindle, and connection gasket replacement',
          'Clean sealant application and functional test run',
        ],
        excluded: [
          'Major civil masonry breaking or re-tiling',
          'Pipes and brass fittings cost (unless quoted separately)',
        ],
      };
    }

    return {
      included: [
        'On-site inspection by verified Serventica professional',
        'Transparent upfront pricing before job commencement',
        'Post-service testing and cleanup of work area',
      ],
      excluded: [
        'Consumable spare materials unless specified in booking',
      ],
    };
  }
}

export const serviceRepository = new ServiceRepository();
