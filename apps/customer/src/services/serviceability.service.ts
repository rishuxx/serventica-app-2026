import { LocationItem, ServiceabilityResult } from '../types/location.types';
import { supabase } from '../lib/supabase/client';

export class ServiceabilityService {
  /**
   * Validates whether a given geographical location is serviced by Serventica.
   * Checks database service_zones table with fallback to pilot zones.
   */
  async checkServiceability(location: LocationItem): Promise<ServiceabilityResult> {
    if (!location) {
      return {
        isServiceable: false,
        message: 'Invalid location provided',
      };
    }

    try {
      // 1. Check Supabase service_zones table if user coordinates are available
      if (location.latitude != null && location.longitude != null) {
        const { data: zones, error } = await supabase
          .from('service_zones')
          .select('id, name, city, is_active')
          .eq('is_active', true);

        if (!error && zones && zones.length > 0) {
          // Check if city matches any active zone
          const matchedZone = zones.find(
            (z) =>
              z.city?.toLowerCase() === location.city?.toLowerCase() ||
              location.formattedAddress?.toLowerCase().includes(z.city?.toLowerCase()) ||
              location.formattedAddress?.toLowerCase().includes(z.name?.toLowerCase())
          );

          if (matchedZone) {
            return {
              isServiceable: true,
              zoneName: matchedZone.name || matchedZone.city,
              serviceAreaId: matchedZone.id,
              estimatedDeliveryTime: '20 minutes',
              message: `Serventica is active in ${matchedZone.name}`,
            };
          }
        }
      }

      // 2. Client-side verified serviceable pilot cities and regions
      const activeCities = [
        'dehradun',
        'vikas nagar',
        'vikasnagar',
        'sudhowala',
        'prem nagar',
        'premnagar',
        'selaqui',
        'selakui',
        'herbertpur',
        'rishikesh',
        'haridwar',
        'roorkee',
        'mussoorie',
        'prayagraj',
        'allahabad',
        'delhi',
        'new delhi',
        'noida',
        'greater noida',
        'gurugram',
        'gurgaon',
        'ghaziabad',
        'bengaluru',
        'bangalore',
        'mountain view', // development & emulator testing zone
        'san jose',
        'sunnyvale',
      ];

      const locationCity = (location.city || '').toLowerCase();
      const locationFull = (location.formattedAddress || '').toLowerCase();

      const isMatch = activeCities.some(
        (c) => locationCity.includes(c) || locationFull.includes(c)
      );

      if (isMatch) {
        return {
          isServiceable: true,
          zoneName: location.city || 'Standard Service Zone',
          estimatedDeliveryTime: '20 minutes',
          message: `Serventica services available in ${location.city}`,
        };
      }

      // 3. Fallback for unserviceable remote areas
      return {
        isServiceable: false,
        message: `Serventica isn't available in ${location.city || 'this location'} yet. We're expanding to more areas soon!`,
      };
    } catch (err) {
      console.warn('Serviceability check error:', err);
      // Graceful degradation: allow location but report standard status
      return {
        isServiceable: true,
        zoneName: location.city || 'Active Zone',
        estimatedDeliveryTime: '20-30 minutes',
      };
    }
  }
}

export const serviceabilityService = new ServiceabilityService();
