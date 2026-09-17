import { BookingStatus, ServicePricingType } from './index';

export interface BookingAddressSnapshot {
  title: string;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  formattedAddress: string;
}

export interface BookingPartnerSnapshot {
  id: string;
  name: string;
  avatarUrl?: string | null;
  rating?: number;
  phone?: string;
  specialization?: string;
}

export interface BookingPaymentSummary {
  subtotal: number;
  tax: number;
  discount: number;
  platformFee: number;
  total: number;
  currency: string;
  paymentStatus: 'PENDING' | 'AUTHORIZED' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentMethod?: string;
}

export interface BookingItemDetail {
  id: string;
  bookingId: string;
  serviceId: string;
  serviceName: string;
  serviceSlug?: string;
  serviceImageUrl?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface BookingRecord {
  id: string;
  bookingNumber: string;
  customerId: string;
  partnerId?: string | null;
  addressId: string;
  status: BookingStatus;
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime?: string;
  serviceId: string;
  serviceName: string;
  serviceImageUrl?: string;
  serviceSlug?: string;
  address: BookingAddressSnapshot;
  partner?: BookingPartnerSnapshot | null;
  payment: BookingPaymentSummary;
  items: BookingItemDetail[];
  createdAt: string;
  updatedAt: string;
}

export interface SavedServiceItem {
  id: string;
  userId: string;
  serviceId: string;
  createdAt: string;
  service: {
    id: string;
    name: string;
    slug: string;
    description: string;
    basePrice: number;
    durationMinutes: number;
    rating: number;
    reviewsCount: number;
    imageUrl?: string;
    categoryName?: string;
  };
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  readAt?: string | null;
  createdAt: string;
}

export interface SupportTicketRecord {
  id: string;
  userId: string;
  bookingId?: string | null;
  bookingNumber?: string | null;
  category: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
}

export interface ServiceReviewRecord {
  id: string;
  userId: string;
  bookingId: string;
  serviceId: string;
  serviceName?: string;
  partnerId?: string | null;
  rating: number;
  comment?: string;
  reviewText?: string;
  createdAt: string;
}

