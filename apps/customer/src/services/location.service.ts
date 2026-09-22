import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { LocationItem, LocationCoordinates } from '../types/location.types';
import { ServenticaEnvironment } from '../../../../packages/config/src';

export interface GeocodingProvider {
  search(query: string, biasCoords?: { lat: number; lon: number }): Promise<LocationItem[]>;
  reverseGeocode(lat: number, lon: number): Promise<LocationItem | null>;
}

export class GoogleGeocodingProvider implements GeocodingProvider {
  private apiKey: string;
  private fallbackProvider: GeocodingProvider;

  constructor(apiKey?: string) {
    this.apiKey =
      apiKey ||
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      ServenticaEnvironment?.googleMaps?.apiKey ||
      'AIzaSyAasVoqGTlhp66ydhb7sLMBLHRr36awF6g';
    this.fallbackProvider = new NominatimGeocodingProvider();
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  async search(query: string, biasCoords?: { lat: number; lon: number }): Promise<LocationItem[]> {
    if (!query || query.trim().length < 2) return [];

    if (!this.apiKey) {
      return this.fallbackProvider.search(query, biasCoords);
    }

    try {
      const centerLat = biasCoords?.lat ?? 30.3165;
      const centerLon = biasCoords?.lon ?? 78.0322;

      // 1. Google Places API (New) Autocomplete with Local Proximity Bias
      const autocompleteRes = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
        },
        body: JSON.stringify({
          input: query.trim(),
          includedRegionCodes: ['IN'],
          locationBias: {
            circle: {
              center: {
                latitude: centerLat,
                longitude: centerLon,
              },
              radius: 50000.0,
            },
          },
        }),
      });

      const autoData: any = await autocompleteRes.json();

      if (autoData && Array.isArray(autoData.suggestions) && autoData.suggestions.length > 0) {
        const topSuggestions = autoData.suggestions
          .filter((s: any) => s?.placePrediction?.placeId)
          .slice(0, 6);

        const detailedResults = await Promise.all(
          topSuggestions.map(async (s: any) => {
            const pred = s.placePrediction;
            const placeId = pred.placeId;
            try {
              const detailUrl = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=id,displayName,formattedAddress,location,addressComponents&key=${this.apiKey}`;
              const dRes = await fetch(detailUrl);
              const dData: any = await dRes.json();

              if (dData && dData.location) {
                const lat = dData.location.latitude;
                const lon = dData.location.longitude;

                let city = 'Dehradun';
                let state = '';
                let postalCode = '';
                let road = '';
                let suburb = '';

                for (const comp of dData.addressComponents || []) {
                  const types: string[] = comp.types || [];
                  if (types.includes('route')) road = comp.longText || comp.shortText;
                  if (types.includes('sublocality') || types.includes('sublocality_level_1') || types.includes('sublocality_level_2')) {
                    suburb = comp.longText || comp.shortText;
                  }
                  if (types.includes('locality')) city = comp.longText || comp.shortText;
                  if (types.includes('administrative_area_level_1')) state = comp.longText || comp.shortText;
                  if (types.includes('postal_code')) postalCode = comp.longText || comp.shortText;
                }

                const mainText = pred.structuredFormat?.mainText?.text || dData.displayName?.text || road || suburb || city;
                const formattedAddress = dData.formattedAddress || pred.text?.text;

                return {
                  latitude: lat,
                  longitude: lon,
                  shortAddress: mainText,
                  formattedAddress: formattedAddress,
                  city,
                  state,
                  postalCode,
                  country: 'India',
                  road: road || suburb,
                  suburb,
                };
              }
            } catch (dErr) {
              console.warn('Place detail fetch notice:', dErr);
            }
            return null;
          })
        );

        const validResults = detailedResults.filter((r): r is LocationItem => r !== null);
        if (validResults.length > 0) {
          return validResults;
        }
      }

      // 2. Seamless high-accuracy fallback to Nominatim & OpenStreetMap for any local colonies
      return this.fallbackProvider.search(query);
    } catch (err) {
      console.warn('Google Places API (New) search error, falling back:', err);
      return this.fallbackProvider.search(query);
    }
  }


  async reverseGeocode(lat: number, lon: number): Promise<LocationItem | null> {
    if (!this.apiKey) {
      return this.fallbackProvider.reverseGeocode(lat, lon);
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${this.apiKey}`;
      const res = await fetch(url);
      const data: any = await res.json();

      if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
        const topResult = data.results[0];
        let road = '';
        let city = 'Nearby';
        let state = '';
        let postalCode = '';
        let country = 'India';
        let houseNumber = '';
        let suburb = '';

        for (const comp of topResult.address_components || []) {
          const types: string[] = comp.types || [];
          if (types.includes('street_number')) houseNumber = comp.long_name;
          if (types.includes('route')) road = comp.long_name;
          if (types.includes('sublocality') || types.includes('neighborhood')) suburb = comp.long_name;
          if (types.includes('locality')) city = comp.long_name;
          if (types.includes('administrative_area_level_1')) state = comp.long_name;
          if (types.includes('postal_code')) postalCode = comp.long_name;
          if (types.includes('country')) country = comp.long_name;
        }

        const short = road && road !== city
          ? `${road}, ${city}`
          : (suburb && suburb !== city ? `${suburb}, ${city}` : (city || topResult.formatted_address.split(',')[0]));

        return {
          latitude: lat,
          longitude: lon,
          shortAddress: short,
          formattedAddress: topResult.formatted_address,
          city,
          state,
          postalCode,
          country,
          road: road || suburb,
          suburb,
          houseNumber,
        };
      }

      return this.fallbackProvider.reverseGeocode(lat, lon);
    } catch (err) {
      console.warn('Google reverse geocode error, falling back:', err);
      return this.fallbackProvider.reverseGeocode(lat, lon);
    }
  }
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
  private geocoder: GeocodingProvider = new GoogleGeocodingProvider();

  setGeocodingProvider(provider: GeocodingProvider) {
    this.geocoder = provider;
  }

  async searchPlaces(query: string, biasCoords?: { lat: number; lon: number }): Promise<LocationItem[]> {
    return this.geocoder.search(query, biasCoords);
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<LocationItem | null> {
    return this.geocoder.reverseGeocode(latitude, longitude);
  }

  async requestPermission(): Promise<'GRANTED' | 'DENIED' | 'NEVER_ASK_AGAIN'> {
    // 1. Check Expo Location permission first (works seamlessly on iOS Expo Go & Android Expo)
    try {
      const ExpoLocation = require('expo-location');
      if (ExpoLocation && typeof ExpoLocation.requestForegroundPermissionsAsync === 'function') {
        const { status, canAskAgain } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          return 'GRANTED';
        }
        if (!canAskAgain) {
          return 'NEVER_ASK_AGAIN';
        }
        return 'DENIED';
      }
    } catch (e) {
      // Fallback for bare native builds
    }

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
    // 1. Expo Location Provider (iOS Expo Go + Android Expo)
    try {
      const ExpoLocation = require('expo-location');
      if (ExpoLocation && typeof ExpoLocation.getCurrentPositionAsync === 'function') {
        const loc = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy?.Balanced || 3,
        });
        if (loc?.coords?.latitude && loc?.coords?.longitude) {
          return {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
        }
      }
    } catch (expoErr) {
      // Fallback to native or standard geolocation
    }

    // 2. Native Kotlin GPS Provider (Android bare build)
    if (NativeModules.ServenticaLocation?.getCurrentPosition) {
      try {
        const pos: any = await NativeModules.ServenticaLocation.getCurrentPosition();
        if (pos && typeof pos.latitude === 'number' && typeof pos.longitude === 'number') {
          return { latitude: pos.latitude, longitude: pos.longitude };
        }
      } catch (nativeErr) {
        console.warn('Native GPS provider warning:', nativeErr);
      }
    }

    // 3. Standard navigator.geolocation fallback
    return new Promise((resolve) => {
      const geo = (global as any)?.navigator?.geolocation;
      if (geo && typeof geo.getCurrentPosition === 'function') {
        geo.getCurrentPosition(
          (p: any) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
          () => {
            // Default to Dehradun (Serventica launch city) on timeout/refusal
            resolve({ latitude: 30.3165, longitude: 78.0322 });
          },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
        );
      } else {
        // Graceful default coordinates for Serventica launch area
        resolve({ latitude: 30.3165, longitude: 78.0322 });
      }
    });
  }

  async getCurrentLocation(): Promise<LocationItem> {
    try {
      const coords = await this.getCurrentCoordinates();
      const resolved = await this.reverseGeocode(coords.latitude, coords.longitude);
      if (resolved) {
        return resolved;
      }
    } catch (locErr) {
      console.warn('Current location resolution notice:', locErr);
    }

    return {
      latitude: 28.6139,
      longitude: 77.2090,
      shortAddress: 'Connaught Place, New Delhi',
      formattedAddress: 'Connaught Place, New Delhi, Delhi 110001, India',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110001',
      country: 'India',
    };
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
