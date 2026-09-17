import { catalogRepository } from './catalog.repository';
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

    try {
      const details = await catalogRepository.getServiceDetails(idOrSlug);
      if (details) {
        return {
          id: details.service.id,
          category_id: details.service.category_id,
          subcategory_id: details.service.subcategory_id || undefined,
          name: details.service.name,
          slug: details.service.slug,
          description: details.service.description,
          short_tagline: details.service.short_description || undefined,
          base_price: details.service.base_price,
          duration_minutes: details.service.duration_minutes,
          pricing_type: details.service.pricing_type,
          rating: details.ratingSummary.averageRating,
          reviews_count: details.ratingSummary.reviewsCount,
          image_url: details.service.thumbnail_url || details.service.hero_image_url || undefined,
          is_active: details.service.is_active,
          category_name: details.category.name,
          category_slug: details.category.slug,
          subcategory_name: details.subcategory?.name,
          included_items: details.inclusions.map((i) => i.title),
          excluded_items: details.exclusions.map((e) => e.title),
          overview: details.service.description,
          faq: details.faqs.map((f) => ({ question: f.question, answer: f.answer })),
        };
      }
    } catch (err) {
      console.warn('[ServiceRepository.getServiceByIdOrSlug] Repository error:', err);
    }

    // Fallback lookup from offline catalog if database isn't connected
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
