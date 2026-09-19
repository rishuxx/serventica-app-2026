import { SafeAsyncStorage as AsyncStorage } from '../../../../packages/utils/src/storage/safe-storage';
import { supabase } from '../lib/supabase/client';
import {
  SavedAddressItem,
  LocationItem,
  CreateAddressInput,
} from '../types/location.types';

const STORAGE_ACTIVE_LOCATION_KEY = '@serventica_active_location_v1';
const STORAGE_SAVED_ADDRESSES_KEY = '@serventica_saved_addresses_v1';

const DEFAULT_SAMPLE_ADDRESSES: SavedAddressItem[] = [
  {
    id: 'addr_sample_home',
    userId: 'default_user',
    title: 'Home',
    addressLine1: 'Q/21, Balaji Boys Hostel, Sudhowala',
    addressLine2: 'Near BFIT',
    city: 'Dehradun',
    state: 'Uttarakhand',
    pincode: '248015',
    latitude: 30.3475,
    longitude: 77.9547,
    formattedAddress: 'Q/21, Balaji Boys Hostel, Sudhowala, Near BFIT, Dehradun, 248015',
    shortAddress: 'Sudhowala, Dehradun',
    isDefault: true,
  },
  {
    id: 'addr_sample_work',
    userId: 'default_user',
    title: 'Work',
    addressLine1: 'Q, Prem Nagar',
    addressLine2: 'Chakrata Road',
    city: 'Dehradun',
    state: 'Uttarakhand',
    pincode: '248007',
    latitude: 30.3344,
    longitude: 77.9621,
    formattedAddress: 'Q, Prem Nagar, Chakrata Road, Dehradun, 248007',
    shortAddress: 'Prem Nagar, Dehradun',
    isDefault: false,
  },
];

class AddressRepository {
  /**
   * Load active location from local persistent storage (instant offline load)
   */
  async getActiveLocation(): Promise<LocationItem | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_ACTIVE_LOCATION_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Failed to read active location from storage:', err);
    }
    return null;
  }

  /**
   * Persist active selected location locally
   */
  async setActiveLocation(location: LocationItem): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_ACTIVE_LOCATION_KEY,
        JSON.stringify(location)
      );
    } catch (err) {
      console.warn('Failed to save active location to storage:', err);
    }
  }

  /**
   * Retrieve saved addresses from Supabase, with local cache fallback & merge
   */
  async getSavedAddresses(userId?: string | null): Promise<SavedAddressItem[]> {
    let localAddresses: SavedAddressItem[] = [];

    // 1. Read local cache first for instant synchronous UI
    try {
      const raw = await AsyncStorage.getItem(STORAGE_SAVED_ADDRESSES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localAddresses = parsed;
        } else {
          localAddresses = DEFAULT_SAMPLE_ADDRESSES;
          await AsyncStorage.setItem(
            STORAGE_SAVED_ADDRESSES_KEY,
            JSON.stringify(DEFAULT_SAMPLE_ADDRESSES)
          );
        }
      } else {
        localAddresses = DEFAULT_SAMPLE_ADDRESSES;
        await AsyncStorage.setItem(
          STORAGE_SAVED_ADDRESSES_KEY,
          JSON.stringify(DEFAULT_SAMPLE_ADDRESSES)
        );
      }
    } catch (err) {
      console.warn('Failed to read local address cache:', err);
      localAddresses = DEFAULT_SAMPLE_ADDRESSES;
    }

    // 2. If authenticated user exists, sync from Supabase
    if (userId) {
      try {
        const { data, error } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', userId)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const remoteAddresses: SavedAddressItem[] = data.map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            title: row.title || 'Home',
            customLabel: row.custom_label,
            addressLine1: row.address_line1,
            addressLine2: row.address_line2,
            landmark: row.landmark,
            city: row.city,
            state: row.state,
            pincode: row.pincode,
            latitude: row.latitude || null,
            longitude: row.longitude || null,
            formattedAddress:
              row.formatted_address ||
              `${row.address_line1}${row.address_line2 ? ', ' + row.address_line2 : ''}, ${row.city}, ${row.pincode}`,
            shortAddress: `${row.address_line1}, ${row.city}`,
            isDefault: Boolean(row.is_default),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }));

          // Merge local and remote
          const mergedMap = new Map<string, SavedAddressItem>();
          remoteAddresses.forEach((a) => mergedMap.set(a.id, a));
          localAddresses.forEach((a) => {
            if (!mergedMap.has(a.id)) mergedMap.set(a.id, a);
          });
          const merged = Array.from(mergedMap.values());

          await AsyncStorage.setItem(
            STORAGE_SAVED_ADDRESSES_KEY,
            JSON.stringify(merged)
          );
          return merged;
        }
      } catch (err) {
        console.warn('Supabase address sync failed, continuing with cache:', err);
      }
    }

    return localAddresses;
  }

  /**
   * Save a new address in Supabase and local cache
   */
  async createAddress(
    userId: string | null,
    input: CreateAddressInput
  ): Promise<SavedAddressItem> {
    const addressId = 'addr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();

    const newAddress: SavedAddressItem = {
      id: addressId,
      userId: userId || 'guest_user',
      title: input.title,
      customLabel: input.customLabel,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      landmark: input.landmark,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      latitude: input.latitude,
      longitude: input.longitude,
      formattedAddress: input.formattedAddress,
      shortAddress: `${input.addressLine1}, ${input.city}`,
      isDefault: input.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    };

    // 1. Save to local cache immediately
    try {
      const existing = await this.getSavedAddresses(userId);
      const updated = [newAddress, ...existing.filter((a) => a.id !== newAddress.id)];
      await AsyncStorage.setItem(
        STORAGE_SAVED_ADDRESSES_KEY,
        JSON.stringify(updated)
      );
    } catch (err) {
      console.warn('Failed to save to local cache:', err);
    }

    // 2. Sync to Supabase in background
    if (userId) {
      try {
        if (input.isDefault) {
          await supabase
            .from('addresses')
            .update({ is_default: false })
            .eq('user_id', userId);
        }

        const { data, error } = await supabase
          .from('addresses')
          .insert({
            user_id: userId,
            title: input.title,
            address_line1: input.addressLine1,
            address_line2: input.addressLine2 || null,
            landmark: input.landmark || null,
            city: input.city,
            state: input.state,
            pincode: input.pincode,
            latitude: input.latitude,
            longitude: input.longitude,
            formatted_address: input.formattedAddress,
            is_default: input.isDefault ?? false,
          })
          .select()
          .single();

        if (!error && data) {
          newAddress.id = data.id;
        }
      } catch (err) {
        console.warn('Supabase insert failed:', err);
      }
    }

    return newAddress;
  }

  /**
   * Update an existing address
   */
  async updateAddress(
    userId: string | null,
    addressId: string,
    updates: Partial<CreateAddressInput>
  ): Promise<void> {
    try {
      const existing = await this.getSavedAddresses(userId);
      const updated = existing.map((item) =>
        item.id === addressId
          ? {
              ...item,
              ...updates,
              shortAddress: updates.addressLine1
                ? `${updates.addressLine1}, ${updates.city || item.city}`
                : item.shortAddress,
              updatedAt: new Date().toISOString(),
            }
          : item
      );
      await AsyncStorage.setItem(
        STORAGE_SAVED_ADDRESSES_KEY,
        JSON.stringify(updated)
      );
    } catch (err) {
      console.warn('Failed to update local address cache:', err);
    }

    if (userId) {
      try {
        await supabase
          .from('addresses')
          .update({
            title: updates.title,
            address_line1: updates.addressLine1,
            address_line2: updates.addressLine2,
            landmark: updates.landmark,
            city: updates.city,
            state: updates.state,
            pincode: updates.pincode,
            formatted_address: updates.formattedAddress,
            updated_at: new Date().toISOString(),
          })
          .eq('id', addressId)
          .eq('user_id', userId);
      } catch (err) {
        console.warn('Failed to update address on Supabase:', err);
      }
    }
  }

  /**
   * Delete an address
   */
  async deleteAddress(userId: string | null, addressId: string): Promise<void> {
    try {
      const existing = await this.getSavedAddresses(userId);
      const updated = existing.filter((item) => item.id !== addressId);
      await AsyncStorage.setItem(
        STORAGE_SAVED_ADDRESSES_KEY,
        JSON.stringify(updated)
      );
    } catch (err) {
      console.warn('Failed to update local cache after delete:', err);
    }

    if (userId) {
      try {
        await supabase
          .from('addresses')
          .delete()
          .eq('id', addressId)
          .eq('user_id', userId);
      } catch (err) {
        console.warn('Failed to delete address on Supabase:', err);
      }
    }
  }

  /**
   * Set default address
   */
  async setDefaultAddress(userId: string | null, addressId: string): Promise<void> {
    try {
      const existing = await this.getSavedAddresses(userId);
      const updated = existing.map((item) => ({
        ...item,
        isDefault: item.id === addressId,
      }));
      await AsyncStorage.setItem(
        STORAGE_SAVED_ADDRESSES_KEY,
        JSON.stringify(updated)
      );
    } catch (err) {
      console.warn('Failed to update local cache defaults:', err);
    }

    if (userId) {
      try {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', userId);

        await supabase
          .from('addresses')
          .update({ is_default: true })
          .eq('id', addressId)
          .eq('user_id', userId);
      } catch (err) {
        console.warn('Failed to set default address on Supabase:', err);
      }
    }
  }
}

export const addressRepository = new AddressRepository();
