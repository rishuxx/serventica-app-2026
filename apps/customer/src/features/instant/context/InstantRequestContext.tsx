/**
 * SERVENTICA — Instant Request State Layer & Context
 * Central state machine managing the customer Instant lifecycle:
 * Hub -> Configuration -> Authoritative Quote -> Review -> Dispatch & Matching -> Active Tracking -> In-Service Extensions -> Completion
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  InstantStep,
  InstantServiceCatalogItem,
  HelpingHandConfig,
  RoadHelpConfig,
  LaundryConfig,
  PackMoveConfig,
  InstantQuote,
  MatchingState,
  InstantActiveBooking,
  InstantErrorState,
} from '../types/instant.types';
import { instantApi } from '../services/instant.api';
import { trackingSocketService } from '../../../services/tracking/TrackingSocketService';
import { socketConnectionManager } from '../../../services/tracking/SocketConnectionManager';
import { LocationItem } from '../../../types/location.types';
import { bookingRepository } from '../../../repositories/booking.repository';
import { BookingRecord } from '../../../../../../packages/types/src';
import { DispatchService } from '../../../services/DispatchService';
import { supabase } from '../../../lib/supabase/client';
import { useAuth } from '../../../context/AuthContext';
import { ensureUuid, isUuid } from '../../../lib/uuid.utils';
import { liveTrackingService } from '../../../services/LiveTrackingService';

function generateUUID(): string {
  return 'inst_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
}

interface InstantRequestContextValue {
  step: InstantStep;
  catalog: InstantServiceCatalogItem[];
  isCatalogLoading: boolean;
  selectedService: InstantServiceCatalogItem | null;
  helpingHandConfig: HelpingHandConfig;
  roadHelpConfig: RoadHelpConfig;
  laundryConfig: LaundryConfig;
  packMoveConfig: PackMoveConfig;
  quote: InstantQuote | null;
  isQuoteLoading: boolean;
  isSubmitting: boolean;
  matchingState: MatchingState;
  activeBooking: InstantActiveBooking | null;
  error: InstantErrorState | null;
  serviceRemainingSeconds: number;
  isExtensionModalOpen: boolean;

  // Actions
  loadCatalog: (lat?: number, lon?: number) => Promise<void>;
  selectService: (slug: string) => void;
  updateHelpingHandConfig: (partial: Partial<HelpingHandConfig>) => void;
  updateRoadHelpConfig: (partial: Partial<RoadHelpConfig>) => void;
  updateLaundryConfig: (partial: Partial<LaundryConfig>) => void;
  updatePackMoveConfig: (partial: Partial<PackMoveConfig>) => void;
  fetchQuote: (location: LocationItem) => Promise<void>;
  submitDispatch: (location: LocationItem) => Promise<void>;
  retryMatching: () => void;
  requestExtension: (additionalMinutes: number) => Promise<boolean>;
  cancelActiveBooking: (reason?: string) => Promise<void>;
  openExtensionModal: () => void;
  closeExtensionModal: () => void;
  clearError: () => void;
  navigateStep: (step: InstantStep) => void;
  resetToHub: () => void;
}

const InstantRequestContext = createContext<InstantRequestContextValue | null>(null);

export const InstantRequestProvider: React.FC<{
  children: React.ReactNode;
  initialLocation?: LocationItem;
  initialServiceSlug?: string;
}> = ({ children, initialLocation, initialServiceSlug }) => {
  const { user } = useAuth();
  const fallbackServices = React.useMemo(() => instantApi.getFallbackCatalog().services, []);

  const initialSelectedService = React.useMemo(() => {
    if (initialServiceSlug) {
      const match = fallbackServices.find(
        (s) =>
          s.slug === initialServiceSlug ||
          (initialServiceSlug.includes('clean') && s.slug === 'helping-hand')
      );
      if (match) return match;
    }
    return fallbackServices[0];
  }, [initialServiceSlug, fallbackServices]);

  const [step, setStep] = useState<InstantStep>('CONFIG');
  const [catalog, setCatalog] = useState<InstantServiceCatalogItem[]>(fallbackServices);
  const [isCatalogLoading, setIsCatalogLoading] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<InstantServiceCatalogItem | null>(initialSelectedService);

  // Sync selected service if initialServiceSlug changes dynamically
  useEffect(() => {
    if (initialServiceSlug) {
      const match = fallbackServices.find(
        (s) =>
          s.slug === initialServiceSlug ||
          (initialServiceSlug.includes('clean') && s.slug === 'helping-hand')
      );
      if (match) {
        setSelectedService(match);
        setStep('CONFIG');
      }
    }
  }, [initialServiceSlug, fallbackServices]);

  // Default Helping Hand configuration
  const [helpingHandConfig, setHelpingHandConfig] = useState<HelpingHandConfig>({
    selectedTasks: ['Cleaning'],
    durationMinutes: 60,
    customTaskNote: '',
  });

  // Default Road Help configuration
  const [roadHelpConfig, setRoadHelpConfig] = useState<RoadHelpConfig>({
    subservice: 'FUEL',
    fuelType: 'PETROL',
    fuelLitres: 1, // Fixed per backend policy
    vehicleType: 'CAR',
    breakdownIssue: 'Cannot start',
    issueDescription: '',
  });

  // Default Laundry configuration
  const [laundryConfig, setLaundryConfig] = useState<LaundryConfig>({
    approxLoadKg: 4,
    loadLabel: 'Standard Load (~4 kg)',
    clothingTypes: ['Daily Wear', 'Towels & Linens'],
    specialInstructions: '',
  });

  // Default Pack & Move configuration
  const [packMoveConfig, setPackMoveConfig] = useState<PackMoveConfig>({
    needs: ['Moving'],
    helperCount: 1,
    durationMinutes: 60,
    specialInstructions: '',
  });

  const [quote, setQuote] = useState<InstantQuote | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => generateUUID());

  const [matchingState, setMatchingState] = useState<MatchingState>('SEARCHING');
  const [activeBooking, setActiveBooking] = useState<InstantActiveBooking | null>(null);
  const [error, setError] = useState<InstantErrorState | null>(null);
  const [serviceRemainingSeconds, setServiceRemainingSeconds] = useState<number>(0);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeBookingIdRef = useRef<string | null>(null);

  // 1. Load catalog on mount or location update (background refresh)
  const loadCatalog = useCallback(async (lat?: number, lon?: number) => {
    try {
      const latitude = lat ?? initialLocation?.latitude ?? 30.316494;
      const longitude = lon ?? initialLocation?.longitude ?? 78.032191;
      const res = await instantApi.getCatalog(latitude, longitude);
      if (res.services && res.services.length > 0) {
        setCatalog(res.services);
      }
    } catch (e: any) {
      console.warn('[InstantContext] Catalog load error, preserving fallback catalog', e);
    } finally {
      setIsCatalogLoading(false);
    }
  }, [initialLocation?.latitude, initialLocation?.longitude]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // 2. Select service
  const selectService = useCallback((slug: string) => {
    const found = catalog.find(
      (s) => s.slug === slug || (slug.includes('clean') && s.slug === 'helping-hand')
    );
    if (found) {
      setSelectedService(found);
      setStep('CONFIG');
      setError(null);
    }
  }, [catalog]);

  // 3. Update configuration helpers
  const updateHelpingHandConfig = useCallback((partial: Partial<HelpingHandConfig>) => {
    setHelpingHandConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const updateRoadHelpConfig = useCallback((partial: Partial<RoadHelpConfig>) => {
    setRoadHelpConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const updateLaundryConfig = useCallback((partial: Partial<LaundryConfig>) => {
    setLaundryConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const updatePackMoveConfig = useCallback((partial: Partial<PackMoveConfig>) => {
    setPackMoveConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  // 4. Fetch authoritative quote from backend
  const fetchQuote = useCallback(async (location: LocationItem) => {
    if (!selectedService) return;
    setIsQuoteLoading(true);
    setError(null);

    const lat = location.latitude ?? 30.316494;
    const lon = location.longitude ?? 78.032191;

    let requirements: any = {
      durationMinutes: 60,
    };

    switch (selectedService.slug) {
      case 'helping-hand':
        requirements = {
          durationMinutes: helpingHandConfig.durationMinutes,
          taskCategory: helpingHandConfig.selectedTasks.join(', '),
        };
        break;
      case 'road-help':
        requirements = {
          durationMinutes: 30,
          issueType: roadHelpConfig.subservice,
          fuelType: roadHelpConfig.fuelType,
          fuelQuantityLitres: roadHelpConfig.subservice === 'FUEL' ? 1 : undefined,
          vehicleType: roadHelpConfig.vehicleType,
        };
        break;
      case 'laundry':
        requirements = {
          durationMinutes: 30,
          approxLoadKg: laundryConfig.approxLoadKg,
        };
        break;
      case 'pack-move':
        requirements = {
          durationMinutes: packMoveConfig.durationMinutes,
          requiredPartnerCount: packMoveConfig.helperCount,
        };
        break;
    }

    try {
      const generatedQuote = await instantApi.getQuote({
        serviceSlug: selectedService.slug,
        latitude: lat,
        longitude: lon,
        requirements,
      });

      setQuote(generatedQuote);
      setIdempotencyKey(generateUUID());
      setStep('REVIEW');
    } catch (err: any) {
      console.warn('[InstantContext] Failed to get quote', err);
      setError({
        code: err.code || 'QUOTE_FAILED',
        title: 'Unable to calculate price',
        message: err.message || 'Please verify your location and try again.',
        canRetry: true,
        recommendedAction: 'RETRY',
      });
    } finally {
      setIsQuoteLoading(false);
    }
  }, [
    selectedService,
    helpingHandConfig,
    roadHelpConfig,
    laundryConfig,
    packMoveConfig,
  ]);

  // 5. Submit dispatch with double-tap protection & idempotency
  const submitDispatch = useCallback(async (location: LocationItem) => {
    if (!selectedService || !quote || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setMatchingState('SEARCHING');
    setStep('MATCHING');

    let requirements: any = { durationMinutes: 60 };
    switch (selectedService.slug) {
      case 'helping-hand':
        requirements = {
          durationMinutes: helpingHandConfig.durationMinutes,
          taskCategory: helpingHandConfig.selectedTasks.join(', '),
          specialInstructions: helpingHandConfig.customTaskNote,
        };
        break;
      case 'road-help':
        requirements = {
          durationMinutes: 30,
          issueType: roadHelpConfig.subservice,
          fuelType: roadHelpConfig.fuelType,
          fuelQuantityLitres: roadHelpConfig.subservice === 'FUEL' ? 1 : undefined,
          vehicleType: roadHelpConfig.vehicleType,
          specialInstructions: roadHelpConfig.issueDescription,
        };
        break;
      case 'laundry':
        requirements = {
          durationMinutes: 30,
          approxLoadKg: laundryConfig.approxLoadKg,
          specialInstructions: laundryConfig.specialInstructions,
        };
        break;
      case 'pack-move':
        requirements = {
          durationMinutes: packMoveConfig.durationMinutes,
          requiredPartnerCount: packMoveConfig.helperCount,
          specialInstructions: packMoveConfig.specialInstructions,
        };
        break;
    }

    try {
      const res = await instantApi.createDispatch(
        {
          quoteId: quote.quoteId,
          addressId: (location as any).id || 'addr_current_gps',
          serviceSlug: selectedService.slug,
          requirements,
          paymentMethod: 'INSTANT_PREAUTH_CARD',
          idempotencyKey,
        },
        idempotencyKey
      );

      const safeBookingId = ensureUuid(res.bookingId);
      const authUserRes = await supabase.auth.getUser();
      const activeUserId = user?.id || authUserRes?.data?.user?.id;
      const effectiveCustomerId = activeUserId && isUuid(activeUserId)
        ? activeUserId
        : '6e9fc42b-8f70-4c39-9278-49d33043aac9';
      const effectiveAddressId = (location as any)?.id && isUuid((location as any).id)
        ? (location as any).id
        : ensureUuid();
      const generatedBookingNumber = `SRV-${safeBookingId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`;
      const generatedOtp = String(Math.floor(1000 + Math.random() * 9000));

      setActiveBooking({
        bookingId: safeBookingId,
        bookingNumber: generatedBookingNumber,
        serviceSlug: selectedService.slug,
        serviceTitle: selectedService.title,
        status: res.status,
        verificationOtp: generatedOtp,
        addressLine: location.formattedAddress || 'Current Location',
        totalPayable: quote.totalPayable,
        currency: quote.currency,
        canExtend: false,
        createdAt: new Date().toISOString(),
        customerId: effectiveCustomerId,
      });

      // Seed into bookingRepository and Supabase PostgreSQL with valid UUIDs
      try {
        const initialRecord: BookingRecord = {
          id: safeBookingId,
          bookingNumber: generatedBookingNumber,
          fulfillmentMode: 'INSTANT',
          verificationOtp: generatedOtp,
          serviceId: selectedService.slug,
          serviceSlug: selectedService.slug,
          serviceImageUrl: selectedService.slug,
          serviceName: selectedService.title,
          status: 'SEARCHING_PARTNER',
          customerId: effectiveCustomerId,
          addressId: effectiveAddressId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          scheduledDate: new Date().toISOString().split('T')[0],
          scheduledStartTime: 'Instant (~9-15 mins)',
          address: {
            title: location.shortAddress || location.formattedAddress || 'Current Location',
            addressLine1: location.formattedAddress || location.shortAddress || 'Current Location',
            city: location.city || 'Dehradun',
            state: 'Uttarakhand',
            pincode: (location as any).pincode || '248001',
            formattedAddress: location.formattedAddress || 'Current Location',
            latitude: location.latitude ?? 30.343866,
            longitude: location.longitude ?? 77.953231,
          },
          partner: null,
          payment: {
            subtotal: quote.subtotal,
            tax: quote.tax,
            platformFee: 0,
            discount: quote.discount,
            total: quote.totalPayable,
            currency: quote.currency,
            paymentStatus: 'AUTHORIZED',
            paymentMethod: 'INSTANT_PREAUTH_CARD',
          },
          items: quote.lineItems.map((li, idx) => ({
            id: ensureUuid(),
            bookingId: safeBookingId,
            serviceId: `${selectedService.slug}_${idx}`,
            serviceName: li.description,
            quantity: 1,
            unitPrice: li.amount,
            totalPrice: li.amount,
          })),
        };
        await bookingRepository.saveBooking(initialRecord);

        // Real Supabase Instant Dispatch Wave trigger
        try {
          // Resolve a real service_id from public.services
          const { data: realService } = await supabase
            .from('services')
            .select('id')
            .eq('slug', selectedService.slug)
            .limit(1)
            .maybeSingle();

          const serviceIdToDispatch = realService?.id || selectedService.slug;
          const lat = location.latitude ?? 30.343866;
          const lng = location.longitude ?? 77.953231;

          console.log('[InstantContext] Firing real Supabase placeOrderAndDispatch for booking:', safeBookingId, 'service:', serviceIdToDispatch);
          await DispatchService.placeOrderAndDispatch({
            bookingId: safeBookingId,
            bookingNumber: initialRecord.bookingNumber,
            customerId: effectiveCustomerId,
            serviceIdOrSlug: serviceIdToDispatch,
            serviceName: selectedService.title,
            pickupLatitude: lat,
            pickupLongitude: lng,
            addressText: location.formattedAddress || 'Dehradun, Uttarakhand',
            totalAmount: quote.totalPayable,
            paymentMethod: 'INSTANT_CARD',
            verificationOtp: generatedOtp,
          }).then((dispRes) => {
            console.log('[InstantContext] Dispatch wave result:', dispRes);
          }).catch((dispErr) => {
            console.warn('[InstantContext] Dispatch wave error:', dispErr);
          });
        } catch (waveErr) {
          console.warn('[InstantContext] Dispatch wave trigger error:', waveErr);
        }
      } catch (repoErr) {
        console.warn('[InstantContext] Failed to seed initial record into bookingRepository:', repoErr);
      }

      // Connect to real-time room for tracking and matching events
      setupSocketListeners(safeBookingId);
    } catch (err: any) {
      console.warn('[InstantContext] Dispatch error', err);
      setIsSubmitting(false);
      setMatchingState('UNAVAILABLE');
      setError({
        code: err.code || 'DISPATCH_ERROR',
        title: 'No available professional nearby right now',
        message: 'All specialists in this area are currently assisting other customers. You can try again or schedule for later.',
        canRetry: true,
        recommendedAction: 'RETRY',
      });
    }
  }, [
    selectedService,
    quote,
    isSubmitting,
    idempotencyKey,
    helpingHandConfig,
    roadHelpConfig,
    laundryConfig,
    packMoveConfig,
  ]);

  // 6. Realtime Socket.IO and Repository synchronization setup
  const setupSocketListeners = useCallback((bookingId: string) => {
    socketConnectionManager.connect({ role: 'CUSTOMER', userId: 'usr_instant_customer' });

    trackingSocketService.joinTrackingRoom(bookingId, 'CUSTOMER', {
      onSnapshot: (snapshot) => {
        if (snapshot.lastKnownPartnerLocation) {
          setActiveBooking((prev) =>
            prev ? { ...prev, liveLocation: snapshot.lastKnownPartnerLocation } : null
          );
        }
      },
      onLocationUpdate: (loc) => {
        setActiveBooking((prev) =>
          prev ? { ...prev, liveLocation: loc } : null
        );
      },
    });

    const socket = socketConnectionManager.connect();

    // Event: Partner Matched
    const onMatched = (matchedPayload: any) => {
      console.log('[InstantContext] Received booking:matched', matchedPayload);
      setMatchingState('FOUND');
      setActiveBooking((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'PARTNER_ASSIGNED',
          assignedPartner: matchedPayload,
        };
      });

      setTimeout(() => {
        setStep('ACTIVE');
        setIsSubmitting(false);
      }, 1200);
    };

    // Real-time synchronization with local booking repository (Partner App Simulator Sandbox testing)
    const unsubRepo = bookingRepository.subscribe(async () => {
      try {
        const upcoming = await bookingRepository.getBookings(user?.id || '6e9fc42b-8f70-4c39-9278-49d33043aac9', 'UPCOMING');
        const current = upcoming.find((b) => b.id === bookingId);
        if (current) {
          // 1. Partner accepted the order in sandbox
          if (
            current.partner &&
            current.status !== 'SEARCHING_PARTNER' &&
            current.status !== 'CONFIRMED'
          ) {
            onMatched({
              partnerId: current.partner.id,
              name: current.partner.name,
              phone: current.partner.phone,
              rating: current.partner.rating || 4.95,
              specialization: current.partner.specialization || 'Certified Serventica Specialist',
              avatarUrl: current.partner.avatarUrl,
              vehicleDetails: 'Two-Wheeler (UK07-AB1234)',
              coordinates: (current.partner as any).location || { latitude: 30.318494, longitude: 78.034191 },
            });
          }

          // 2. Partner arrived at doorstep
          if (current.status === 'PARTNER_ARRIVED') {
            setActiveBooking((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                status: 'ARRIVED_AT_DOORSTEP',
                verificationOtp: (current as any).verificationOtp || prev.verificationOtp,
              };
            });
          }

          // 3. Partner started service
          if (current.status === 'SERVICE_STARTED') {
            setActiveBooking((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                status: 'SERVICE_IN_PROGRESS',
                serviceStartedAt: new Date().toISOString(),
                scheduledEndAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                canExtend: true,
              };
            });
            setServiceRemainingSeconds(3600);
          }

          // 4. Partner completed service
          if (current.status === 'SERVICE_COMPLETED') {
            setActiveBooking((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                status: 'COMPLETED',
                canExtend: false,
              };
            });
            setStep('COMPLETED');
          }
        }
      } catch (err) {
        console.warn('[InstantContext] Sandbox repo subscription error:', err);
      }
    });

    // Event: Partner Doorstep Arrival
    const onArrived = (arrivalPayload: any) => {
      console.log('[InstantContext] Received booking:arrived', arrivalPayload);
      setActiveBooking((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'ARRIVED_AT_DOORSTEP',
          verificationOtp: arrivalPayload.otp || prev.verificationOtp,
        };
      });
    };

    // Event: Service Started
    const onServiceStarted = (startPayload: any) => {
      console.log('[InstantContext] Received booking:service_started', startPayload);
      setActiveBooking((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'SERVICE_IN_PROGRESS',
          serviceStartedAt: startPayload.serviceStartedAt,
          scheduledEndAt: startPayload.scheduledEndAt,
          canExtend: true,
        };
      });

      // Start countdown timer
      if (startPayload.scheduledEndAt) {
        const endMs = new Date(startPayload.scheduledEndAt).getTime();
        const diffSecs = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
        setServiceRemainingSeconds(diffSecs);
      }
    };

    // Event: Extension Confirmed
    const onExtensionConfirmed = (extPayload: any) => {
      console.log('[InstantContext] Extension confirmed', extPayload);
      setActiveBooking((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          scheduledEndAt: extPayload.newScheduledEndAt,
        };
      });

      if (extPayload.newScheduledEndAt) {
        const endMs = new Date(extPayload.newScheduledEndAt).getTime();
        const diffSecs = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
        setServiceRemainingSeconds(diffSecs);
      }
      setIsExtensionModalOpen(false);
    };

    // Event: Service Completed
    const onCompleted = (completePayload: any) => {
      console.log('[InstantContext] Service completed', completePayload);
      setActiveBooking((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'COMPLETED',
          canExtend: false,
        };
      });
      setStep('COMPLETED');
    };

    // Event: Redispatching (Wave escalation)
    const onRedispatching = () => {
      console.log('[InstantContext] Booking redispatching to next wave');
      setMatchingState('RETRYING');
    };

    socket.on('booking:matched', onMatched);
    socket.on('booking:arrived', onArrived);
    socket.on('booking:service_started', onServiceStarted);
    // Direct Supabase Realtime subscription on public.bookings for live partner acceptance & status transitions
    const safeBookingUuid = ensureUuid(bookingId);
    const supabaseBookingChannel = supabase
      .channel(`cust-booking-status-${safeBookingUuid}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${safeBookingUuid}`,
        },
        async (payload: any) => {
          console.log('[InstantContext Realtime Booking UPDATE]:', payload.new);
          const updated = payload.new;
          if (updated?.partner_id && updated?.status === 'PARTNER_ACCEPTED') {
            // Fetch partner details
            let partnerName = 'Assigned Professional';
            let partnerPhone = '+91 98765 43210';
            let partnerRating = 4.92;
            let partnerAvatar = '';
            try {
              const { data: prof } = await supabase
                .from('professionals')
                .select('full_name, phone, rating, avatar_url')
                .eq('id', updated.partner_id)
                .maybeSingle();
              if (prof) {
                partnerName = prof.full_name || partnerName;
                partnerPhone = prof.phone || partnerPhone;
                partnerRating = prof.rating || partnerRating;
                partnerAvatar = prof.avatar_url || '';
              }
            } catch (pErr) {}

            onMatched({
              partnerId: updated.partner_id,
              name: partnerName,
              phone: partnerPhone,
              rating: partnerRating,
              specialization: 'Certified Serventica Specialist',
              avatarUrl: partnerAvatar,
              vehicleDetails: 'Two-Wheeler (UK07-EV)',
              coordinates: { latitude: 30.343866, longitude: 77.953231 },
            });
          } else if (updated?.status === 'PARTNER_EN_ROUTE') {
            setActiveBooking((prev) => (prev ? { ...prev, status: 'EN_ROUTE' } : null));
          } else if (updated?.status === 'PARTNER_ARRIVED') {
            onArrived({ otp: updated.verification_otp || '4821' });
          } else if (updated?.status === 'SERVICE_STARTED') {
            onServiceStarted({
              serviceStartedAt: updated.service_started_at || new Date().toISOString(),
              scheduledEndAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            });
          } else if (updated?.status === 'SERVICE_COMPLETED' || updated?.status === 'CLOSED') {
            onCompleted({});
          }
        }
      )
      .subscribe();

    // Live Supabase Broadcast Channel Subscription (Dual redundancy for zero-latency sync)
    const unsubLiveTracking = liveTrackingService.subscribeToBookingTracking(
      bookingId,
      (loc) => {
        setActiveBooking((prev) => (prev ? { ...prev, liveLocation: loc } : null));
      },
      async (rawStatus) => {
        const s = String(rawStatus);
        console.log('[InstantContext Live Broadcast Status Update]:', s);
        if (s === 'PARTNER_ACCEPTED' || s === 'PARTNER_ASSIGNED' || s === 'LIVE') {
          // Fetch latest detail from DB
          try {
            const { data: bData } = await supabase.rpc('get_customer_booking_detail', {
              p_booking_id: bookingId,
            });
            if (bData?.partner) {
              onMatched({
                partnerId: bData.partner.id,
                name: bData.partner.name || 'Assigned Professional',
                phone: bData.partner.phone || '+91 98765 43210',
                rating: bData.partner.rating || 4.95,
                specialization: 'Certified Serventica Specialist',
                avatarUrl: bData.partner.avatarUrl || '',
                vehicleDetails: 'Two-Wheeler (UK07-EV)',
                coordinates: {
                  latitude: bData.partner.currentLatitude || 30.343866,
                  longitude: bData.partner.currentLongitude || 77.953231,
                },
              });
            }
          } catch (e) {}
        } else if (s === 'PARTNER_EN_ROUTE') {
          setActiveBooking((prev) => (prev ? { ...prev, status: 'EN_ROUTE' } : null));
        } else if (s === 'PARTNER_ARRIVED' || s === 'ARRIVED') {
          try {
            const { data: bData } = await supabase.rpc('get_customer_booking_detail', {
              p_booking_id: bookingId,
            });
            onArrived({ otp: bData?.verificationOtp || (bData as any)?.verification_otp });
          } catch (e) {
            onArrived({});
          }
        } else if (s === 'SERVICE_STARTED') {
          onServiceStarted({
            serviceStartedAt: new Date().toISOString(),
            scheduledEndAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          });
        } else if (s === 'SERVICE_COMPLETED' || s === 'CLOSED' || s === 'COMPLETED') {
          onCompleted({});
        } else if (s === 'CANCELLED_BY_CUSTOMER' || s === 'CANCELLED_BY_PARTNER' || s === 'CANCELLED') {
          setActiveBooking((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
          setStep('HUB');
        }
      }
    );

    // High-reliability live sync fallback (checks DB every 2.5s and on app foreground)
    let isMatchedHandled = false;
    const checkAndSyncStatus = async () => {
      if (isMatchedHandled) return;
      try {
        const { data: bData } = await supabase
          .from('bookings')
          .select('id, status, partner_id')
          .eq('id', safeBookingUuid)
          .maybeSingle();

        if (
          bData?.partner_id &&
          (bData.status === 'PARTNER_ACCEPTED' ||
            bData.status === 'PARTNER_EN_ROUTE' ||
            bData.status === 'PARTNER_ARRIVED' ||
            bData.status === 'SERVICE_STARTED')
        ) {
          isMatchedHandled = true;
          let partnerName = 'Assigned Professional';
          let partnerPhone = '+91 98765 43210';
          let partnerRating = 4.92;
          let partnerAvatar = '';
          try {
            const { data: prof } = await supabase
              .from('professionals')
              .select('full_name, phone, rating, avatar_url')
              .eq('id', bData.partner_id)
              .maybeSingle();
            if (prof) {
              partnerName = prof.full_name || partnerName;
              partnerPhone = prof.phone || partnerPhone;
              partnerRating = prof.rating || partnerRating;
              partnerAvatar = prof.avatar_url || '';
            }
          } catch (pErr) {}

          onMatched({
            partnerId: bData.partner_id,
            name: partnerName,
            phone: partnerPhone,
            rating: partnerRating,
            specialization: 'Certified Serventica Specialist',
            avatarUrl: partnerAvatar,
            vehicleDetails: 'Two-Wheeler (UK07-EV)',
            coordinates: { latitude: 30.343866, longitude: 77.953231 },
          });
        }
      } catch (err) {}
    };

    const pollInterval = setInterval(checkAndSyncStatus, 2500);
    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkAndSyncStatus();
      }
    });

    return () => {
      clearInterval(pollInterval);
      appStateSub.remove();
      unsubRepo();
      unsubLiveTracking();
      try {
        supabase.removeChannel(supabaseBookingChannel);
      } catch (e) {}
      socket.off('booking:matched', onMatched);
      socket.off('booking:arrived', onArrived);
      socket.off('booking:service_started', onServiceStarted);
      socket.off('booking:extension_confirmed', onExtensionConfirmed);
      socket.off('booking:completed', onCompleted);
      socket.off('booking:redispatching', onRedispatching);
    };
  }, []);

  // 7. Live service timer heartbeat
  useEffect(() => {
    if (step === 'ACTIVE' && activeBooking?.status === 'SERVICE_IN_PROGRESS') {
      timerRef.current = setInterval(() => {
        setServiceRemainingSeconds((prev) => Math.max(0, prev - 1));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, activeBooking?.status]);

  // 8. Actions
  const retryMatching = useCallback(() => {
    if (!activeBookingIdRef.current) return;
    setMatchingState('SEARCHING');
    setError(null);
  }, []);

  const requestExtension = useCallback(async (additionalMinutes: number): Promise<boolean> => {
    if (!activeBooking) return false;
    try {
      await instantApi.requestExtension(activeBooking.bookingId, additionalMinutes);
      return true;
    } catch (e: any) {
      console.warn('[InstantContext] Extension request error', e);
      return false;
    }
  }, [activeBooking]);

  const cancelActiveBooking = useCallback(async (reason?: string) => {
    if (!activeBooking) return;
    try {
      await instantApi.cancelBooking(activeBooking.bookingId, reason || 'Customer requested');
      resetToHub();
    } catch (e) {
      console.warn('[InstantContext] Cancellation error', e);
    }
  }, [activeBooking]);

  const clearError = useCallback(() => setError(null), []);
  const navigateStep = useCallback((newStep: InstantStep) => setStep(newStep), []);
  const openExtensionModal = useCallback(() => setIsExtensionModalOpen(true), []);
  const closeExtensionModal = useCallback(() => setIsExtensionModalOpen(false), []);

  const resetToHub = useCallback(() => {
    setStep('CONFIG');
    setQuote(null);
    setIsSubmitting(false);
    setActiveBooking(null);
    setError(null);
    setMatchingState('SEARCHING');
    activeBookingIdRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const value: InstantRequestContextValue = {
    step,
    catalog,
    isCatalogLoading,
    selectedService,
    helpingHandConfig,
    roadHelpConfig,
    laundryConfig,
    packMoveConfig,
    quote,
    isQuoteLoading,
    isSubmitting,
    matchingState,
    activeBooking,
    error,
    serviceRemainingSeconds,
    isExtensionModalOpen,

    loadCatalog,
    selectService,
    updateHelpingHandConfig,
    updateRoadHelpConfig,
    updateLaundryConfig,
    updatePackMoveConfig,
    fetchQuote,
    submitDispatch,
    retryMatching,
    requestExtension,
    cancelActiveBooking,
    openExtensionModal,
    closeExtensionModal,
    clearError,
    navigateStep,
    resetToHub,
  };

  return (
    <InstantRequestContext.Provider value={value}>
      {children}
    </InstantRequestContext.Provider>
  );
};

export const useInstantRequest = (): InstantRequestContextValue => {
  const ctx = useContext(InstantRequestContext);
  if (!ctx) {
    throw new Error('useInstantRequest must be used within an InstantRequestProvider');
  }
  return ctx;
};
