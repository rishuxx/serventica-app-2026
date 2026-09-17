import { supabase } from '../lib/supabase/client';
import {
  ServicePrice,
  PriceResolutionContext,
  ResolvedPrice,
} from '../../../../packages/types/src';

export interface IPricingRepository {
  getApplicablePrice(context: PriceResolutionContext): Promise<ResolvedPrice>;
  getPricesForServices(
    serviceIds: string[],
    cityId?: string | null
  ): Promise<Map<string, ResolvedPrice>>;
}

export class SupabasePricingRepository implements IPricingRepository {
  private cache = new Map<string, { price: ResolvedPrice; timestamp: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  private getCacheKey(context: PriceResolutionContext): string {
    return `${context.serviceId}:${context.variantId || 'null'}:${context.cityId || 'null'}:${context.serviceAreaId || 'null'}`;
  }

  async getApplicablePrice(context: PriceResolutionContext): Promise<ResolvedPrice> {
    const cacheKey = this.getCacheKey(context);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.price;
    }

    try {
      // Query service_prices for this service
      let query = supabase
        .from('service_prices')
        .select('*')
        .eq('service_id', context.serviceId)
        .eq('is_active', true);

      if (context.variantId) {
        query = query.or(`variant_id.eq.${context.variantId},variant_id.is.null`);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        const resolved = this.resolveMultiTierPrice(data, context);
        this.cache.set(cacheKey, { price: resolved, timestamp: Date.now() });
        return resolved;
      }
    } catch (err) {
      console.warn('Error querying service_prices:', err);
    }

    // Fallback: Global default / inspection base
    const defaultPrice: ResolvedPrice = {
      amount: 499,
      labourPrice: 499,
      materialPrice: 0,
      platformFee: 0,
      taxRate: 18,
      taxAmount: 89.82,
      currency: 'INR',
      priceType: 'FIXED',
      isLocationSpecific: false,
      resolutionTier: 'GLOBAL_DEFAULT',
    };

    return defaultPrice;
  }

  async getPricesForServices(
    serviceIds: string[],
    cityId?: string | null
  ): Promise<Map<string, ResolvedPrice>> {
    const resultMap = new Map<string, ResolvedPrice>();
    if (!serviceIds || serviceIds.length === 0) return resultMap;

    try {
      let query = supabase
        .from('service_prices')
        .select('*')
        .in('service_id', serviceIds)
        .eq('is_active', true);

      const { data, error } = await query;
      if (!error && data) {
        for (const serviceId of serviceIds) {
          const serviceRecords = data.filter((d: any) => d.service_id === serviceId);
          const resolved = this.resolveMultiTierPrice(serviceRecords, { serviceId, cityId });
          resultMap.set(serviceId, resolved);
        }
      }
    } catch (err) {
      console.warn('Error in getPricesForServices:', err);
    }

    return resultMap;
  }

  /**
   * Multi-tier Price Resolution Engine
   * Priority:
   * 1. Service Area Price
   * 2. City Price
   * 3. Global National Price
   */
  private resolveMultiTierPrice(
    records: any[],
    context: PriceResolutionContext
  ): ResolvedPrice {
    if (!records || records.length === 0) {
      return {
        amount: 499,
        labourPrice: 499,
        materialPrice: 0,
        platformFee: 0,
        taxRate: 18,
        taxAmount: 89.82,
        currency: 'INR',
        priceType: 'FIXED',
        isLocationSpecific: false,
        resolutionTier: 'UNCONFIGURED',
      };
    }

    // 1. Check Service Area match
    if (context.serviceAreaId) {
      const areaRecord = records.find(
        (r) => r.service_area_id === context.serviceAreaId
      );
      if (areaRecord) {
        return this.mapRecordToResolved(areaRecord, 'SERVICE_AREA', true);
      }
    }

    // 2. Check City match
    if (context.cityId) {
      const cityRecord = records.find(
        (r) => r.city_id === context.cityId && !r.service_area_id
      );
      if (cityRecord) {
        return this.mapRecordToResolved(cityRecord, 'CITY', true);
      }
    }

    // 3. Check Global National Default match (city_id IS NULL AND service_area_id IS NULL)
    const globalRecord = records.find(
      (r) => !r.city_id && !r.service_area_id
    );
    if (globalRecord) {
      return this.mapRecordToResolved(globalRecord, 'GLOBAL_DEFAULT', false);
    }

    // Default to the first available active record
    return this.mapRecordToResolved(records[0], 'GLOBAL_DEFAULT', false);
  }

  private mapRecordToResolved(
    record: any,
    tier: 'SERVICE_AREA' | 'CITY' | 'GLOBAL_DEFAULT' | 'UNCONFIGURED',
    isLocationSpecific: boolean
  ): ResolvedPrice {
    const base = Number(record.base_price || 0);
    const labour = Number(record.labour_price || 0);
    const material = Number(record.material_price || 0);
    const platform = Number(record.platform_fee || 0);
    const taxRate = Number(record.tax_rate || 18);
    const taxAmount = (base * taxRate) / 100;

    return {
      amount: base,
      labourPrice: labour,
      materialPrice: material,
      platformFee: platform,
      taxRate,
      taxAmount,
      currency: record.currency || 'INR',
      priceType: record.price_type || 'FIXED',
      isLocationSpecific,
      resolutionTier: tier,
    };
  }
}

export const pricingRepository = new SupabasePricingRepository();
