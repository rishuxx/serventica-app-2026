import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  LocationItem,
  SavedAddressItem,
  CreateAddressInput,
  GPSState,
  ServiceabilityResult,
} from '../types/location.types';
import { locationService } from '../services/location.service';
import { addressRepository } from '../repositories/address.repository';
import { serviceabilityService } from '../services/serviceability.service';
import { useAuth } from './AuthContext';

interface LocationContextValue {
  activeLocation: LocationItem;
  savedAddresses: SavedAddressItem[];
  currentGpsLocation: LocationItem | null;
  gpsState: GPSState;
  gpsErrorMessage: string | null;
  isSelectLocationOpen: boolean;
  isSearching: boolean;
  searchQuery: string;
  searchResults: LocationItem[];
  serviceability: ServiceabilityResult | null;
  isLoadingAddresses: boolean;

  openSelectLocation: () => void;
  closeSelectLocation: () => void;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  fetchCurrentGPS: () => Promise<LocationItem | null>;
  selectLocation: (location: LocationItem | SavedAddressItem) => Promise<boolean>;
  saveAddress: (input: CreateAddressInput) => Promise<SavedAddressItem>;
  updateAddress: (id: string, input: Partial<CreateAddressInput>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
  refreshAddresses: () => Promise<void>;
}

const INITIAL_LOCATION: LocationItem = {
  latitude: null,
  longitude: null,
  shortAddress: 'Detecting location...',
  formattedAddress: 'Acquiring GPS location...',
  city: 'Locating...',
};

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id || null;

  const [activeLocation, setActiveLocationState] = useState<LocationItem>(INITIAL_LOCATION);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddressItem[]>([]);
  const [currentGpsLocation, setCurrentGpsLocation] = useState<LocationItem | null>(null);
  const [gpsState, setGpsState] = useState<GPSState>('IDLE');
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string | null>(null);
  const [isSelectLocationOpen, setIsSelectLocationOpen] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchQuery, setSearchQueryState] = useState<string>('');
  const [searchResults, setSearchResults] = useState<LocationItem[]>([]);
  const [serviceability, setServiceability] = useState<ServiceabilityResult | null>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState<boolean>(false);

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Restore cached active location on startup
  useEffect(() => {
    const bootstrap = async () => {
      const cached = await addressRepository.getActiveLocation();
      if (cached) {
        setActiveLocationState(cached);
      }
      await refreshAddresses();
      // Acquire live GPS on launch
      fetchCurrentGPS();
    };
    bootstrap();
  }, [userId]);

  // 2. Fetch saved addresses
  const refreshAddresses = useCallback(async () => {
    setIsLoadingAddresses(true);
    try {
      const addrs = await addressRepository.getSavedAddresses(userId);
      setSavedAddresses(addrs);
    } catch (err) {
      console.warn('Failed to load saved addresses:', err);
    } finally {
      setIsLoadingAddresses(false);
    }
  }, [userId]);

  // 3. Compute dynamic distances relative to current GPS
  const addressesWithDistance = useMemo(() => {
    if (!currentGpsLocation || currentGpsLocation.latitude == null || currentGpsLocation.longitude == null) {
      return savedAddresses;
    }
    return savedAddresses.map((addr) => {
      const dist = locationService.calculateDistance(
        currentGpsLocation.latitude,
        currentGpsLocation.longitude,
        addr.latitude,
        addr.longitude
      );
      return {
        ...addr,
        distanceKm: dist?.km ?? null,
        distanceFormatted: dist?.formatted ?? undefined,
      };
    });
  }, [savedAddresses, currentGpsLocation]);

  // 4. Fetch Live Hardware GPS
  const fetchCurrentGPS = useCallback(async (): Promise<LocationItem | null> => {
    setGpsState('LOCATING');
    setGpsErrorMessage(null);

    try {
      const perm = await locationService.requestPermission();
      if (perm === 'DENIED') {
        setGpsState('PERMISSION_DENIED');
        setGpsErrorMessage('Location permission is required to use current location.');
        return null;
      }
      if (perm === 'NEVER_ASK_AGAIN') {
        setGpsState('PERMANENTLY_DENIED');
        setGpsErrorMessage('Location permission is permanently disabled. Please enable in Settings.');
        return null;
      }

      const loc = await locationService.getCurrentLocation();
      setCurrentGpsLocation(loc);
      setGpsState('SUCCESS');

      // If active location has no resolved GPS yet, set it as active
      setActiveLocationState((prev) => {
        if (prev.latitude == null) {
          addressRepository.setActiveLocation(loc);
          return loc;
        }
        return prev;
      });

      return loc;
    } catch (err: any) {
      console.warn('GPS fetch failed:', err);
      setGpsState('ERROR');
      setGpsErrorMessage(err?.message || 'Unable to determine your GPS location.');
      return null;
    }
  }, []);

  // 5. Real Debounced Geocoding Search (300ms)
  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await locationService.searchPlaces(query);
        setSearchResults(results);
      } catch (err) {
        console.warn('Place search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300) as any;
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQueryState('');
    setSearchResults([]);
    setIsSearching(false);
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
  }, []);

  // 6. Select Address & Validate Serviceability
  const selectLocation = useCallback(
    async (location: LocationItem | SavedAddressItem): Promise<boolean> => {
      const check = await serviceabilityService.checkServiceability(location);
      setServiceability(check);

      if (!check.isServiceable) {
        return false;
      }

      // Persist as active location only if serviceable
      setActiveLocationState(location);
      await addressRepository.setActiveLocation(location);

      setIsSelectLocationOpen(false);
      clearSearch();
      return true;
    },
    [clearSearch]
  );


  // 7. Saved Address CRUD
  const saveAddress = useCallback(
    async (input: CreateAddressInput): Promise<SavedAddressItem> => {
      const created = await addressRepository.createAddress(userId, input);
      await refreshAddresses();
      // Select newly created address
      await selectLocation(created);
      return created;
    },
    [userId, refreshAddresses, selectLocation]
  );

  const updateAddress = useCallback(
    async (id: string, input: Partial<CreateAddressInput>): Promise<void> => {
      await addressRepository.updateAddress(userId, id, input);
      await refreshAddresses();
    },
    [userId, refreshAddresses]
  );

  const deleteAddress = useCallback(
    async (id: string): Promise<void> => {
      await addressRepository.deleteAddress(userId, id);
      await refreshAddresses();
    },
    [userId, refreshAddresses]
  );

  const setDefaultAddress = useCallback(
    async (id: string): Promise<void> => {
      await addressRepository.setDefaultAddress(userId, id);
      await refreshAddresses();
    },
    [userId, refreshAddresses]
  );

  const value: LocationContextValue = {
    activeLocation,
    savedAddresses: addressesWithDistance,
    currentGpsLocation,
    gpsState,
    gpsErrorMessage,
    isSelectLocationOpen,
    isSearching,
    searchQuery,
    searchResults,
    serviceability,
    isLoadingAddresses,

    openSelectLocation: () => setIsSelectLocationOpen(true),
    closeSelectLocation: () => {
      setIsSelectLocationOpen(false);
      clearSearch();
    },
    setSearchQuery,
    clearSearch,
    fetchCurrentGPS,
    selectLocation,
    saveAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    refreshAddresses,
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

export const useLocation = (): LocationContextValue => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
