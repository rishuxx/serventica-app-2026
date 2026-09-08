import { useState, useEffect, useCallback } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

export interface LocationState {
  shortAddress: string;
  fullAddress: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  isPermissionGranted: boolean;
  isLoading: boolean;
}

const DEFAULT_FULL = '12/A, Purwanchal Dawar, Nehru Park, Prayagraj, Uttar Pradesh, India';
const DEFAULT_SHORT = '12/A, Purwanchal Dawar...';

export function useHomeLocation() {
  const [location, setLocation] = useState<LocationState>({
    shortAddress: DEFAULT_SHORT,
    fullAddress: DEFAULT_FULL,
    city: 'Prayagraj',
    latitude: 25.4358,
    longitude: 81.8463,
    isPermissionGranted: false,
    isLoading: false,
  });

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // High-accuracy reverse geocoding using OpenStreetMap Nominatim
  const fetchReadableAddress = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
        {
          headers: {
            'User-Agent': 'ServenticaCustomerApp/1.0 (contact@serventica.com)',
            'Accept-Language': 'en',
          },
        }
      );
      if (response.ok) {
        const json: any = await response.json();
        const addressObj = json?.address || {};
        const road =
          addressObj.road ||
          addressObj.suburb ||
          addressObj.neighbourhood ||
          addressObj.residential ||
          addressObj.commercial ||
          '';
        const city =
          addressObj.city ||
          addressObj.town ||
          addressObj.village ||
          addressObj.county ||
          addressObj.state_district ||
          'Prayagraj';

        const full = json?.display_name || `${road ? road + ', ' : ''}${city}, India`;
        const short = road ? `${road}, ${city}` : `${city}, India`;

        setLocation((prev) => ({
          ...prev,
          shortAddress: short,
          fullAddress: full,
          city,
          latitude: lat,
          longitude: lon,
          isLoading: false,
        }));
        return true;
      }
    } catch (err) {
      console.warn('Reverse geocoding error:', err);
    }
    return false;
  };

  // High-reliability live IP-based location fallback (works everywhere without needing native GPS daemon on emulators)
  const fetchIPLocation = async () => {
    try {
      const res = await fetch('https://ipwho.is/');
      if (res.ok) {
        const data: any = await res.json();
        if (data && data.success !== false && data.latitude && data.longitude) {
          const lat = data.latitude;
          const lon = data.longitude;
          const city = data.city || 'Prayagraj';
          const region = data.region || 'Uttar Pradesh';
          const road = data.connection?.org || '';
          const short = `${city}, ${region}`;
          const full = `${city}, ${region}, India (${lat.toFixed(4)}, ${lon.toFixed(4)})`;

          // Try reverse geocoding for pinpoint local street name
          const geocoded = await fetchReadableAddress(lat, lon);
          if (!geocoded) {
            setLocation((prev) => ({
              ...prev,
              shortAddress: short,
              fullAddress: full,
              city,
              latitude: lat,
              longitude: lon,
              isLoading: false,
            }));
          }
          return;
        }
      }
    } catch (err) {
      console.warn('IP location fetch error:', err);
    }
    setLocation((prev) => ({ ...prev, isLoading: false }));
  };

  const getCoordinates = useCallback(() => {
    setLocation((prev) => ({ ...prev, isLoading: true }));

    const geo = (global as any)?.navigator?.geolocation;
    if (geo && typeof geo.getCurrentPosition === 'function') {
      geo.getCurrentPosition(
        (position: any) => {
          const { latitude, longitude } = position.coords;
          fetchReadableAddress(latitude, longitude);
        },
        () => {
          // If native GPS times out or is unavailable, use live IP location
          fetchIPLocation();
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
      );
    } else {
      fetchIPLocation();
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Serventica Location Permission',
            message: 'Serventica needs access to your location to discover verified technicians in your area.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (
          granted === PermissionsAndroid.RESULTS.GRANTED ||
          granted === 'never_ask_again'
        ) {
          setLocation((prev) => ({ ...prev, isPermissionGranted: true }));
        }
        getCoordinates();
      } catch (err) {
        console.warn(err);
        getCoordinates();
      }
    } else {
      getCoordinates();
    }
  }, [getCoordinates]);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  return {
    ...location,
    isAddressModalOpen,
    openAddressModal: () => setIsAddressModalOpen(true),
    closeAddressModal: () => setIsAddressModalOpen(false),
    requestPermission,
    refreshLocation: getCoordinates,
  };
}
