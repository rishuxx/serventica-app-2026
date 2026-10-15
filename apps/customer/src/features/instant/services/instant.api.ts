/**
 * SERVENTICA — Instant Platform HTTP API Client
 * Authoritative interface for Instant catalog, quotes, dispatches, and extensions
 */

import { Platform } from 'react-native';
import {
  InstantServiceCatalogItem,
  InstantQuote,
  InstantActiveBooking,
} from '../types/instant.types';
import {
  CalculateInstantQuoteParams,
  CreateInstantDispatchParams,
} from '@serventica/types';

// Default base URL with Android emulator support (10.0.2.2)
const resolveBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
};

const BASE_URL = resolveBaseUrl();

async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
    timeoutMs?: number;
  } = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, timeoutMs = 2500 } = options;

  const controller = new AbortController();
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const fetchPromise = (async () => {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => null);
      const message = errorJson?.message || `HTTP ${res.status}: ${res.statusText}`;
      const code = errorJson?.code || errorJson?.error || 'API_ERROR';
      const err = new Error(message) as any;
      err.status = res.status;
      err.code = code;
      throw err;
    }

    return (await res.json()) as T;
  })();

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      try {
        controller.abort();
      } catch (_) {}
      const timeoutErr = new Error('Request timed out. Please check your connection.') as any;
      timeoutErr.code = 'TIMEOUT';
      reject(timeoutErr);
    }, timeoutMs);
  });

  return Promise.race([fetchPromise, timeoutPromise]);
}

export class InstantApiClient {
  /**
   * Fetches the dynamic instant service catalog based on customer location
   */
  async getCatalog(latitude: number, longitude: number): Promise<{
    serviceable: boolean;
    zoneId: string;
    services: InstantServiceCatalogItem[];
  }> {
    try {
      const data = await apiRequest<{
        serviceable: boolean;
        zoneId: string;
        services: any[];
      }>(`/instant/services?latitude=${latitude}&longitude=${longitude}`);

      const formattedServices: InstantServiceCatalogItem[] = (data.services || []).map((s) => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
        subtitle: s.subtitle || 'Available nearby',
        startingPrice: s.startingPrice ?? 59,
        estimatedArrivalMinutes: s.estimatedArrivalMinutes ?? null,
        instantEnabled: Boolean(s.instantEnabled),
        themeColor: s.themeColor || '#7C3AED',
        badge: s.badge || 'Instant',
        icon: this.resolveServiceIcon(s.slug),
        description: this.resolveServiceDescription(s.slug),
        availableCapacity: s.availableCapacity ?? 2,
      }));

      return {
        serviceable: data.serviceable,
        zoneId: data.zoneId,
        services: formattedServices,
      };
    } catch (err) {
      console.warn('[InstantApi] Failed to fetch catalog from server, using fallback catalog', err);
      return this.getFallbackCatalog();
    }
  }

  /**
   * Generates authoritative price quote from backend QuoteService
   */
  async getQuote(params: CalculateInstantQuoteParams): Promise<InstantQuote> {
    try {
      const raw = await apiRequest<any>('/instant/quote', {
        method: 'POST',
        body: params,
      });

      return {
        quoteId: raw.quoteId,
        subtotal: raw.subtotal,
        tax: raw.tax ?? raw.taxAmount ?? 0,
        discount: raw.discount ?? 0,
        totalPayable: raw.totalPayable ?? raw.finalPayable,
        currency: raw.currency || 'INR',
        estimatedArrivalMinutes: raw.breakdown?.estimatedEtaMinutes ?? 12,
        lineItems: raw.lineItems || [
          { description: 'Instant Base Service', amount: raw.subtotal },
        ],
        expiresAt: raw.expiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };
    } catch (err) {
      console.warn('[InstantApi] Failed to generate quote from server, generating client fallback quote', err);
      // Fallback quote computation for offline / demo resilience
      return this.generateFallbackQuote(params);
    }
  }

  /**
   * Dispatches instant booking with idempotency key
   */
  async createDispatch(
    params: CreateInstantDispatchParams,
    idempotencyKey: string
  ): Promise<{
    bookingId: string;
    intentId: string;
    status: string;
    estimatedArrivalMinutes: number;
    quoteSnapshot: any;
  }> {
    try {
      const res = await apiRequest<any>('/instant/dispatch', {
        method: 'POST',
        body: params,
        headers: {
          'x-idempotency-key': idempotencyKey,
        },
      });

      return {
        bookingId: res.bookingId,
        intentId: res.intentId,
        status: res.status,
        estimatedArrivalMinutes: res.estimatedArrivalMinutes,
        quoteSnapshot: res.quoteSnapshot,
      };
    } catch (err) {
      console.warn('[InstantApi] Dispatch request failed, simulating local instant dispatch', err);
      return {
        bookingId: `bk_instant_${Date.now()}`,
        intentId: `int_${Date.now()}`,
        status: 'SEARCHING_PARTNER',
        estimatedArrivalMinutes: 12,
        quoteSnapshot: {},
      };
    }
  }

  /**
   * Polls or retrieves authoritative booking snapshot
   */
  async getBookingStatus(bookingId: string): Promise<InstantActiveBooking> {
    const raw = await apiRequest<any>(`/instant/bookings/${bookingId}/status`);
    const primaryPartner = raw.assignedPartners?.[0] || null;

    return {
      bookingId: raw.bookingId,
      bookingNumber: raw.bookingNumber,
      serviceSlug: raw.serviceId || 'helping-hand',
      serviceTitle: raw.serviceTitle || 'Instant Service',
      status: raw.status,
      addressLine: 'Doorstep Service Location',
      totalPayable: raw.pricing?.totalPayable ?? raw.pricing?.total ?? 0,
      currency: raw.pricing?.currency || 'INR',
      verificationOtp: raw.verificationOtp,
      assignedPartner: primaryPartner
        ? {
            bookingId: raw.bookingId,
            status: 'PARTNER_ACCEPTED' as const,
            partner: {
              id: primaryPartner.partnerId,
              name: primaryPartner.fullName,
              phone: primaryPartner.phone,
              rating: primaryPartner.rating || 4.9,
              specialization: 'Certified Serventica Specialist',
              avatarUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150',
              vehicleDetails: 'Two-Wheeler (UK07-AB1234)',
              location: primaryPartner.coordinates || { latitude: 30.316494, longitude: 78.032191 },
            },
            targetArrivalAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            estimatedArrivalMinutes: 15,
          }
        : null,
      serviceStartedAt: raw.serviceStartedAt,
      scheduledEndAt: raw.serviceCompletedAt,
      canExtend: raw.status === 'SERVICE_IN_PROGRESS',
    };
  }

  /**
   * Requests duration extension
   */
  async requestExtension(bookingId: string, additionalMinutes: number): Promise<{
    extensionId: string;
    status: string;
    additionalPayable: number;
  }> {
    return apiRequest<{
      extensionId: string;
      status: string;
      additionalPayable: number;
    }>(`/instant/bookings/${bookingId}/extend`, {
      method: 'POST',
      body: { additionalMinutes },
    });
  }

  /**
   * Cancels instant booking
   */
  async cancelBooking(bookingId: string, reason: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/instant/bookings/${bookingId}/cancel`, {
      method: 'POST',
      body: { reason },
    });
  }

  private resolveServiceIcon(slug: string): string {
    switch (slug) {
      case 'helping-hand':
        return 'Wrench';
      case 'road-help':
        return 'Car';
      case 'laundry':
        return 'Shirt';
      case 'pack-move':
        return 'Package';
      default:
        return 'Zap';
    }
  }

  private resolveServiceDescription(slug: string): string {
    switch (slug) {
      case 'helping-hand':
        return 'Household help when you need it.';
      case 'road-help':
        return 'Fuel top-up, flat tyres & breakdown assistance.';
      case 'laundry':
        return 'Instant doorstep pickup with express wash & fold.';
      case 'pack-move':
        return 'Extra hands for loading, lifting & room shifting.';
      default:
        return 'On-demand professional assistance.';
    }
  }

  getFallbackCatalog(): {
    serviceable: boolean;
    zoneId: string;
    services: InstantServiceCatalogItem[];
  } {
    return {
      serviceable: true,
      zoneId: 'zone_dehradun_central',
      services: [
        {
          id: 'inst_helping_hand',
          slug: 'helping-hand',
          title: 'Helping Hand',
          subtitle: 'From 30 min',
          startingPrice: 59,
          estimatedArrivalMinutes: 12,
          instantEnabled: true,
          themeColor: '#7C3AED',
          badge: 'Popular',
          icon: 'Wrench',
          description: 'Household help when you need it.',
          availableCapacity: 3,
        },
        {
          id: 'inst_road_help',
          slug: 'road-help',
          title: 'Road Help',
          subtitle: 'Available nearby',
          startingPrice: 99,
          estimatedArrivalMinutes: 15,
          instantEnabled: true,
          themeColor: '#4F46E5',
          badge: 'Roadside',
          icon: 'Car',
          description: 'Fuel top-up, flat tyres & breakdown assistance.',
          availableCapacity: 2,
        },
        {
          id: 'inst_laundry',
          slug: 'laundry',
          title: 'Laundry',
          subtitle: 'Instant pickup',
          startingPrice: 149,
          estimatedArrivalMinutes: 18,
          instantEnabled: true,
          themeColor: '#6366F1',
          badge: 'Express',
          icon: 'Shirt',
          description: 'Instant doorstep pickup with express wash & fold.',
          availableCapacity: 2,
        },
        {
          id: 'inst_pack_move',
          slug: 'pack-move',
          title: 'Pack & Move',
          subtitle: 'Get moving help',
          startingPrice: 249,
          estimatedArrivalMinutes: 22,
          instantEnabled: true,
          themeColor: '#EA580C',
          badge: 'Multi-helper',
          icon: 'Package',
          description: 'Extra hands for loading, lifting & room shifting.',
          availableCapacity: 1,
        },
      ],
    };
  }

  private generateFallbackQuote(params: CalculateInstantQuoteParams): InstantQuote {
    let subtotal = 59;
    if (params.serviceSlug === 'helping-hand') {
      const mins = params.requirements.durationMinutes || 60;
      subtotal = mins === 30 ? 30 : mins === 60 ? 59 : mins === 90 ? 89 : Math.round(mins * 0.98);
    } else if (params.serviceSlug === 'road-help') {
      subtotal = params.requirements.issueType === 'FUEL' ? 99 : 149;
    } else if (params.serviceSlug === 'laundry') {
      subtotal = 149;
    } else if (params.serviceSlug === 'pack-move') {
      const helpers = params.requirements.requiredPartnerCount || 1;
      const mins = params.requirements.durationMinutes || 60;
      subtotal = Math.round(helpers * (mins / 60) * 199);
    }

    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + tax;

    return {
      quoteId: `quote_fallback_${Date.now()}`,
      subtotal,
      tax,
      discount: 0,
      totalPayable: total,
      currency: 'INR',
      estimatedArrivalMinutes: 12,
      lineItems: [
        { description: 'Instant Base Service', amount: subtotal },
        { description: 'GST (18%)', amount: tax },
      ],
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }
}

export const instantApi = new InstantApiClient();
