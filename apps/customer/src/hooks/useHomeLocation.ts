import { useState, useEffect, useCallback, useRef } from 'react';
import { PermissionsAndroid, Platform, NativeModules } from 'react-native';

export interface LocationState {
  shortAddress: string;
  fullAddress: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  isPermissionGranted: boolean;
  isLoading: boolean;
  error?: string | null;
}

export function useHomeLocation() {
  const [location, setLocation] = useState<LocationState>({
    shortAddress: 'Detecting location...',
    fullAddress: 'Detecting your current GPS location...',
    city: 'Detecting...',
    latitude: null,
    longitude: null,
    isPermissionGranted: false,
    isLoading: true,
    error: null,
  });

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const isFetchingRef = useRef(false);

  // Multi-tier high-accuracy reverse geocoding
  const reverseGeocode = async (lat: number, lon: number): Promise<boolean> => {
    // 1. Primary Provider: OpenStreetMap Nominatim
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'ServenticaApp/1.0 (contact@serventica.com)',
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
          const postcode = addr.postcode || '';
          const country = addr.country || '';

          const parts: string[] = [];
          if (road) parts.push(road);
          if (addr.suburb && addr.suburb !== road) parts.push(addr.suburb);
          if (city && city !== road) parts.push(city);
          if (state && state !== city) parts.push(state);
          if (postcode) parts.push(postcode);
          if (country) parts.push(country);

          const full = data.display_name || parts.join(', ');
          const short = road ? `${road}, ${city}` : (city ? `${city}${state ? ', ' + state : ''}` : 'Current Location');

          setLocation({
            shortAddress: short,
            fullAddress: full,
            city,
            latitude: lat,
            longitude: lon,
            isPermissionGranted: true,
            isLoading: false,
            error: null,
          });
          return true;
        }
      }
    } catch (nominatimErr) {
      console.warn('Nominatim reverse geocode error:', nominatimErr);
    }

    // 2. Secondary Provider: BigDataCloud Reverse Geocoding API
    try {
      const bdcRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
      );
      if (bdcRes.ok) {
        const bdcData: any = await bdcRes.json();
        const city =
          bdcData.city ||
          bdcData.locality ||
          bdcData.principalSubdivision ||
          'Nearby';
        const locality = bdcData.locality || bdcData.localityInfo?.administrative?.[0]?.name || '';
        const state = bdcData.principalSubdivision || '';
        const country = bdcData.countryName || '';
        const postcode = bdcData.postcode || '';

        const short = locality && locality !== city ? `${locality}, ${city}` : `${city}${state ? ', ' + state : ''}`;
        const full = [locality, city, state, postcode, country].filter(Boolean).join(', ');

        setLocation({
          shortAddress: short,
          fullAddress: full || `${city}, ${country}`,
          city,
          latitude: lat,
          longitude: lon,
          isPermissionGranted: true,
          isLoading: false,
          error: null,
        });
        return true;
      }
    } catch (bdcErr) {
      console.warn('BigDataCloud reverse geocode error:', bdcErr);
    }

    // 3. Fallback: Display live GPS coordinates if network geocoding services fail
    setLocation({
      shortAddress: `GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      fullAddress: `Exact Coordinates: ${lat.toFixed(6)}, ${lon.toFixed(6)}`,
      city: 'Live GPS',
      latitude: lat,
      longitude: lon,
      isPermissionGranted: true,
      isLoading: false,
      error: null,
    });
    return true;
  };

  // Acquire high-precision GPS coordinates from native GPS hardware
  const fetchLiveGPSLocation = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    setLocation((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // 1. Try Native Android Location Module (direct GPS_PROVIDER / FUSED / NETWORK)
      if (NativeModules.ServenticaLocation?.getCurrentPosition) {
        const pos: any = await NativeModules.ServenticaLocation.getCurrentPosition();
        if (pos && typeof pos.latitude === 'number' && typeof pos.longitude === 'number') {
          await reverseGeocode(pos.latitude, pos.longitude);
          isFetchingRef.current = false;
          return;
        }
      }

      // 2. Try Standard Geolocation navigator (if polyfilled or community module available)
      const geo = (global as any)?.navigator?.geolocation;
      if (geo && typeof geo.getCurrentPosition === 'function') {
        geo.getCurrentPosition(
          async (pos: any) => {
            const { latitude, longitude } = pos.coords;
            await reverseGeocode(latitude, longitude);
            isFetchingRef.current = false;
          },
          async (err: any) => {
            console.warn('Navigator geolocation error:', err);
            isFetchingRef.current = false;
            setLocation((prev) => ({
              ...prev,
              isLoading: false,
              error: 'Unable to acquire GPS lock. Please check location settings.',
            }));
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
        return;
      }

      // If no native hardware location engine responded
      isFetchingRef.current = false;
      setLocation((prev) => ({
        ...prev,
        isLoading: false,
        shortAddress: 'GPS signal waiting...',
        fullAddress: 'Please enable GPS on your device to detect location',
        city: 'Enable GPS',
      }));
    } catch (err: any) {
      console.warn('Location fetch failure:', err);
      isFetchingRef.current = false;
      setLocation((prev) => ({
        ...prev,
        isLoading: false,
        error: err?.message || 'Failed to detect location',
        shortAddress: 'GPS unavailable',
        fullAddress: 'Could not fetch GPS location. Tap to retry.',
        city: 'Retry',
      }));
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);

        const isFineGranted =
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED;
        const isCoarseGranted =
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED;

        if (isFineGranted || isCoarseGranted) {
          setLocation((prev) => ({ ...prev, isPermissionGranted: true }));
          await fetchLiveGPSLocation();
        } else {
          setLocation((prev) => ({
            ...prev,
            isPermissionGranted: false,
            isLoading: false,
            shortAddress: 'Location access required',
            fullAddress: 'Please allow location permission in App Settings to see local services.',
            city: 'Permission Denied',
          }));
        }
      } catch (err) {
        console.warn('Android permission error:', err);
        await fetchLiveGPSLocation();
      }
    } else {
      await fetchLiveGPSLocation();
    }
  }, [fetchLiveGPSLocation]);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  return {
    ...location,
    isAddressModalOpen,
    openAddressModal: () => setIsAddressModalOpen(true),
    closeAddressModal: () => setIsAddressModalOpen(false),
    requestPermission,
    refreshLocation: fetchLiveGPSLocation,
  };
}
