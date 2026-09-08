export type AddressLabel = 'Home' | 'Work' | 'Other' | 'Friend';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationItem {
  latitude: number | null;
  longitude: number | null;
  shortAddress: string;
  formattedAddress: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
  landmark?: string;
  road?: string;
  suburb?: string;
  houseNumber?: string;
}

export interface SavedAddressItem extends LocationItem {
  id: string;
  userId: string;
  title: AddressLabel | string;
  customLabel?: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  distanceKm?: number | null;
  distanceFormatted?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAddressInput {
  title: AddressLabel | string;
  customLabel?: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
  isDefault?: boolean;
}

export interface ServiceabilityResult {
  isServiceable: boolean;
  zoneName?: string;
  serviceAreaId?: string;
  message?: string;
  estimatedDeliveryTime?: string;
}

export type GPSState =
  | 'IDLE'
  | 'PERMISSION_REQUIRED'
  | 'LOCATING'
  | 'SUCCESS'
  | 'ERROR'
  | 'PERMISSION_DENIED'
  | 'PERMANENTLY_DENIED';
