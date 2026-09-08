import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { LocationItem, LocationCoordinates } from '../types/location.types';

export interface GeocodingProvider {
  search(query: string): Promise<LocationItem[]>;
  reverseGeocode(lat: number, lon: number): Promise<LocationItem | null>;
}

class NominatimGeocodingProvider implements GeocodingProvider {
  private userAgent = 'ServenticaApp/1.0 (contact@serventica.com)';

  async search(query: string): Promise<LocationItem[]> {
    if (!query || query.trim().length < 2) return [];

    try {
      const encoded = encodeURIComponent(query.trim());
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encoded}&addressdetails=1&limit=8`,
        {
          headers: {
            'User-Agent': this.userAgent,
            'Accept-Language': 'en',
          },
        }
      );

      if (!response.ok) return [];

      const list: any = await response.json();
      if (!Array.isArray(list)) return [];

      return list.map((item) => {
        const addr = item.address || {};
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);

        const road =
          addr.road ||
          addr.pedestrian ||
          addr.street ||
          addr.suburb ||
          addr.neighbourhood ||
          addr.residential ||
          addr.commercial ||
          item.name ||
          '';

        const city =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.municipality ||
          addr.county ||
          addr.state_district ||
          addr.state ||
          'Nearby';

        const state = addr.state || '';
        const postalCode = addr.postcode || '';
        const country = addr.country || 'India';

        const short = road && road !== city ? `${road}, ${city}` : (city ? `${city}${state ? ', ' + state : ''}` : item.display_name.split(',')[0]);

        return {
          latitude: isNaN(lat) ? null : lat,
          longitude: isNaN(lon) ? null : lon,
          shortAddress: short,
          formattedAddress: item.display_name,
          city,
          state,
          postalCode,
          country,
          road,
          suburb: addr.suburb || '',
          houseNumber: addr.house_number || '',
        };
      });
    } catch (err) {
      console.warn('Geocoding search error:', err);
      return [];
    }
  }

  async reverseGeocode(lat: number, lon: number): Promise<LocationItem | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`,
        {
          headers: {
            'User-Agent': this.userAgent,
            'Accept-Language': 'en',
          },
        }
      );

      if (response.ok) {
        const data: any = await response.json();
        if (data && data.address) {
          const addr = data.address;
          const road =
            addr.road ||
            addr.pedestrian ||
            addr.street ||
            addr.suburb ||
            addr.neighbourhood ||
            addr.residential ||
            addr.commercial ||
            '';

          const city =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.municipality ||
            addr.county ||
            addr.state_district ||
            addr.state ||
            'Nearby';

          const state = addr.state || '';
          const postalCode = addr.postcode || '';
          const country = addr.country || 'India';

          const short = road && road !== city ? `${road}, ${city}` : (city ? `${city}${state ? ', ' + state : ''}` : 'Current Location');

          return {
            latitude: lat,
            longitude: lon,
            shortAddress: short,
            formattedAddress: data.display_name || `${road ? road + ', ' : ''}${city}, ${state} ${postalCode}`,
            city,
            state,
            postalCode,
            country,
            road,
            suburb: addr.suburb || '',
            houseNumber: addr.house_number || '',
          };
        }
      }
    } catch (err) {
      console.warn('Nominatim reverse error:', err);
    }

    // Secondary fallback: BigDataCloud
    try {
      const bdcRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
      );
      if (bdcRes.ok) {
        const bdc: any = await bdcRes.json();
        const city = bdc.city || bdc.locality || bdc.principalSubdivision || 'Nearby';
        const locality = bdc.locality || bdc.localityInfo?.administrative?.[0]?.name || '';
        const state = bdc.principalSubdivision || '';
        const country = bdc.countryName || 'India';
        const postalCode = bdc.postcode || '';

        const short = locality && locality !== city ? `${locality}, ${city}` : `${city}${state ? ', ' + state : ''}`;
        const full = [locality, city, state, postalCode, country].filter(Boolean).join(', ');

        return {
          latitude: lat,
          longitude: lon,
          shortAddress: short,
          formattedAddress: full || `${city}, ${country}`,
          city,
          state,
          postalCode,
          country,
          road: locality,
        };
      }
    } catch (bdcErr) {
      console.warn('BigDataCloud fallback error:', bdcErr);
    }

    return {
      latitude: lat,
      longitude: lon,
      shortAddress: `GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      formattedAddress: `Coordinates: ${lat.toFixed(6)}, ${lon.toFixed(6)}`,
      city: 'Live GPS',
    };
  }
}

class LocationService {
  private geocoder: GeocodingProvider = new NominatimGeocodingProvider();

  setGeocodingProvider(provider: GeocodingProvider) {
    this.geocoder = provider;
  }

  async searchPlaces(query: string): Promise<LocationItem[]> {
    return this.geocoder.search(query);
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<LocationItem | null> {
    return this.geocoder.reverseGeocode(latitude, longitude);
  }

  async requestPermission(): Promise<'GRANTED' | 'DENIED' | 'NEVER_ASK_AGAIN'> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);

        const fine = granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
        const coarse = granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION];

        if (
          fine === PermissionsAndroid.RESULTS.GRANTED ||
          coarse === PermissionsAndroid.RESULTS.GRANTED
        ) {
          return 'GRANTED';
        }
        if (
          fine === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
          coarse === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
        ) {
          return 'NEVER_ASK_AGAIN';
        }
        return 'DENIED';
      } catch (err) {
        console.warn('Permission request error:', err);
        return 'DENIED';
      }
    }
    return 'GRANTED';
  }

  async getCurrentCoordinates(): Promise<LocationCoordinates> {
    // 1. Native Kotlin GPS Provider
    if (NativeModules.ServenticaLocation?.getCurrentPosition) {
      const pos: any = await NativeModules.ServenticaLocation.getCurrentPosition();
      if (pos && typeof pos.latitude === 'number' && typeof pos.longitude === 'number') {
        return { latitude: pos.latitude, longitude: pos.longitude };
      }
    }

    // 2. Standard navigator.geolocation fallback
    return new Promise((resolve, reject) => {
      const geo = (global as any)?.navigator?.geolocation;
      if (geo && typeof geo.getCurrentPosition === 'function') {
        geo.getCurrentPosition(
          (p: any) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
          (err: any) => reject(new Error(err.message || 'GPS location timed out')),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      } else {
        reject(new Error('Hardware GPS module not available'));
      }
    });
  }

  async getCurrentLocation(): Promise<LocationItem> {
    const coords = await this.getCurrentCoordinates();
    const resolved = await this.reverseGeocode(coords.latitude, coords.longitude);
    if (!resolved) {
      throw new Error('Failed to reverse geocode GPS location');
    }
    return resolved;
  }

  /**
   * Calculates geodesic distance in kilometers using the Haversine formula
   */
  calculateDistance(
    lat1: number | null | undefined,
    lon1: number | null | undefined,
    lat2: number | null | undefined,
    lon2: number | null | undefined
  ): { km: number; formatted: string } | null {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
      return null;
    }

    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const km = R * c;

    let formatted: string;
    if (km < 0.1) {
      formatted = '< 100 m';
    } else if (km < 1) {
      formatted = `${Math.round(km * 1000)} m`;
    } else {
      formatted = `${km.toFixed(1)} km`;
    }

    return { km, formatted };
  }
}

export const locationService = new LocationService();
