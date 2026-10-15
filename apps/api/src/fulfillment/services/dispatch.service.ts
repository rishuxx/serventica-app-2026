import { Injectable, Logger, Optional } from '@nestjs/common';
import { InMemoryFulfillmentRepository } from '../repositories/in-memory-fulfillment.repository';
import { DispatchOfferRecord, BookingRecord } from '../repositories/fulfillment.repository.interface';
import { PartnerMatchingService, RankedPartnerCandidate } from './partner-matching.service';
import { PartnerEligibilityService } from './partner-eligibility.service';
import { ServicePolicyFactory } from '../policies/service-policy.factory';
import { PartnerCandidateContext } from '../specifications/partner-candidate.interface';
import { TrackingGateway } from '../../tracking/tracking.gateway';
import { DispatchOfferPayload } from '@serventica/types';

export interface DispatchWaveState {
  bookingId: string;
  currentWave: number;
  maxWaves: number;
  candidates: RankedPartnerCandidate[];
  contactedPartnerIds: Set<string>;
  activeOfferIds: string[];
  status: 'DISPATCHING' | 'ACCEPTED' | 'UNFULFILLABLE';
}

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  // Wave timeout: 45 seconds
  private readonly WAVE_TIMEOUT_MS = 45 * 1000;
  // Maximum number of dispatch waves before marking UNFULFILLABLE
  private readonly MAX_WAVES = 3;

  private readonly activeWaves = new Map<string, DispatchWaveState>();

  constructor(
    private readonly repository: InMemoryFulfillmentRepository,
    private readonly eligibilityService: PartnerEligibilityService,
    private readonly matchingService: PartnerMatchingService,
    private readonly policyFactory: ServicePolicyFactory,
    @Optional() private readonly trackingGateway?: TrackingGateway
  ) {}

  /**
   * Starts wave-based dispatch for a confirmed booking
   */
  public async initiateDispatch(booking: BookingRecord): Promise<DispatchWaveState> {
    const policy = this.policyFactory.getPolicy(booking.service_id);
    const requiredCapability = policy.resolveRequiredCapability(booking.service_requirement || {});

    const context: PartnerCandidateContext = {
      serviceType: policy.serviceType,
      requiredCapability,
      customerLatitude: booking.latitude,
      customerLongitude: booking.longitude,
      maxRadiusKm: policy.maxRadiusKm,
      maxEtaMinutes: policy.maxEtaMinutes,
      durationMinutes: booking.service_requirement?.durationMinutes || policy.minDurationMinutes,
      requiredVehicle: booking.service_requirement?.vehicleType,
    };

    // 1. Fetch all partners & filter eligible
    const allCandidates = await this.repository.getAllPartnerCandidates();
    const { eligible } = this.eligibilityService.filterEligibleCandidates(allCandidates, context);

    if (eligible.length === 0) {
      this.logger.warn(`No eligible partners found for booking ${booking.id}`);
      await this.repository.updateBookingStatus(booking.id, 'UNFULFILLABLE');
      return {
        bookingId: booking.id,
        currentWave: 1,
        maxWaves: this.MAX_WAVES,
        candidates: [],
        contactedPartnerIds: new Set(),
        activeOfferIds: [],
        status: 'UNFULFILLABLE',
      };
    }

    // 2. Rank candidates
    const ranked = this.matchingService.rankCandidates(eligible, context);

    const waveState: DispatchWaveState = {
      bookingId: booking.id,
      currentWave: 1,
      maxWaves: this.MAX_WAVES,
      candidates: ranked,
      contactedPartnerIds: new Set(),
      activeOfferIds: [],
      status: 'DISPATCHING',
    };
    this.activeWaves.set(booking.id, waveState);

    // 3. Dispatch Wave 1
    await this.dispatchNextWave(booking.id);
    return this.activeWaves.get(booking.id)!;
  }

  /**
   * Advances dispatch to the next wave of ranked partners
   */
  public async dispatchNextWave(bookingId: string): Promise<boolean> {
    const waveState = this.activeWaves.get(bookingId);
    const booking = await this.repository.getBooking(bookingId);

    if (!waveState || !booking || waveState.status !== 'DISPATCHING') {
      return false;
    }

    // Determine how many partners to contact in this wave
    const requiredCount = booking.required_partner_count || 1;
    const batchSize = Math.max(requiredCount, 1);

    // Pick candidates who haven't been contacted yet
    const uncontacted = waveState.candidates.filter(
      (rc) => !waveState.contactedPartnerIds.has(rc.candidate.partnerId)
    );

    if (uncontacted.length === 0 || waveState.currentWave > waveState.maxWaves) {
      this.logger.warn(`All dispatch waves exhausted for booking ${bookingId}`);
      waveState.status = 'UNFULFILLABLE';
      await this.repository.updateBookingStatus(bookingId, 'UNFULFILLABLE');
      return false;
    }

    const waveCandidates = uncontacted.slice(0, batchSize);
    const expiresAt = new Date(Date.now() + this.WAVE_TIMEOUT_MS).toISOString();

    for (const ranked of waveCandidates) {
      const offerId = `off_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const payoutAmount = Math.round(booking.total * 0.8 * 100) / 100; // 80% partner payout

      const offerRecord: DispatchOfferRecord = {
        offerId,
        bookingId: booking.id,
        partnerId: ranked.candidate.partnerId,
        waveNumber: waveState.currentWave,
        serviceType: booking.service_id,
        serviceTitle: booking.service_requirement?.serviceTitle || booking.service_id,
        durationMinutes: booking.service_requirement?.durationMinutes || 60,
        payoutAmount,
        currency: booking.currency || 'INR',
        customerArea: booking.address_line || 'Service Location',
        customerCoordinates: { latitude: booking.latitude, longitude: booking.longitude },
        distanceKm: ranked.distanceKm,
        estimatedTravelMinutes: ranked.etaMinutes,
        status: 'PENDING',
        expiresAt,
        requirements: booking.service_requirement || {},
        createdAt: new Date().toISOString(),
      };

      await this.repository.saveOffer(offerRecord);
      waveState.activeOfferIds.push(offerId);
      waveState.contactedPartnerIds.add(ranked.candidate.partnerId);

      // Phase 3: Real-Time Wave Broadcast to partner's private socket room
      const remainingSeconds = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
      const offerPayload: DispatchOfferPayload = {
        offerId: offerRecord.offerId,
        bookingId: offerRecord.bookingId,
        serviceType: offerRecord.serviceType as any,
        serviceTitle: offerRecord.serviceTitle,
        durationMinutes: offerRecord.durationMinutes,
        payoutAmount: offerRecord.payoutAmount,
        currency: offerRecord.currency,
        customerArea: offerRecord.customerArea,
        distanceKm: offerRecord.distanceKm,
        estimatedTravelMinutes: offerRecord.estimatedTravelMinutes,
        expiresAt: offerRecord.expiresAt,
        remainingSeconds,
        requirements: offerRecord.requirements,
      };
      this.trackingGateway?.broadcastOfferToPartner(ranked.candidate.partnerId, offerPayload);

      this.logger.log(
        `Dispatched Wave ${waveState.currentWave} offer ${offerId} to partner ${ranked.candidate.partnerId} for booking ${booking.id}`
      );
    }

    waveState.currentWave += 1;
    return true;
  }

  /**
   * Partner declines an offer -> immediately advance to next candidate in wave
   */
  public async handleOfferDecline(offerId: string, reason: string): Promise<void> {
    const offer = await this.repository.getOffer(offerId);
    if (!offer || offer.status !== 'PENDING') return;

    await this.repository.updateOfferStatus(offerId, 'DECLINED');
    this.trackingGateway?.broadcastOfferCancelled(offer.partnerId, offerId, reason);
    this.logger.log(`Offer ${offerId} declined by partner ${offer.partnerId}: ${reason}`);

    // Trigger next wave for this booking
    await this.dispatchNextWave(offer.bookingId);
  }

  /**
   * Expire stale offers and advance wave if pending
   */
  public async processExpiredOffers(): Promise<void> {
    const now = Date.now();
    for (const [bookingId, waveState] of this.activeWaves.entries()) {
      if (waveState.status !== 'DISPATCHING') continue;

      const offers = await this.repository.getOffersForBooking(bookingId);
      let anyExpired = false;

      for (const offer of offers) {
        if (offer.status === 'PENDING' && new Date(offer.expiresAt).getTime() <= now) {
          await this.repository.updateOfferStatus(offer.offerId, 'EXPIRED');
          this.trackingGateway?.broadcastOfferCancelled(offer.partnerId, offer.offerId, 'OFFER_EXPIRED');
          anyExpired = true;
          this.logger.log(`Offer ${offer.offerId} expired for booking ${bookingId}`);
        }
      }

      if (anyExpired) {
        await this.dispatchNextWave(bookingId);
      }
    }
  }

  public markBookingFulfilled(bookingId: string): void {
    const waveState = this.activeWaves.get(bookingId);
    if (waveState) {
      waveState.status = 'ACCEPTED';
    }
  }

  /**
   * Re-activates dispatch wave or initiates fresh wave when partner cancels
   */
  public async redispatchBooking(bookingId: string): Promise<boolean> {
    const waveState = this.activeWaves.get(bookingId);
    if (waveState) {
      waveState.status = 'DISPATCHING';
      return this.dispatchNextWave(bookingId);
    }
    const booking = await this.repository.getBooking(bookingId);
    if (booking) {
      const state = await this.initiateDispatch(booking);
      return state.status === 'DISPATCHING';
    }
    return false;
  }
}
