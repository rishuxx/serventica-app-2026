/**
 * SERVENTICA — Dispatch Service
 * Manages instant dispatch waves, partner offer generation, and atomic partner acceptance.
 */

import { supabase } from '../lib/supabase/client';
import { DispatchOffer, DispatchRequest } from '@serventica/types';

export class DispatchService {
  /**
   * Triggers an instant dispatch wave via Supabase RPC
   */
  static async triggerInstantDispatch(params: {
    bookingId: string;
    serviceId: string;
    pickupLatitude: number;
    pickupLongitude: number;
    maxCandidates?: number;
    timeoutSeconds?: number;
  }): Promise<{ success: boolean; dispatchRequestId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('create_instant_dispatch_wave', {
        p_booking_id: params.bookingId,
        p_service_id: params.serviceId,
        p_pickup_lat: params.pickupLatitude,
        p_pickup_lng: params.pickupLongitude,
        p_max_candidates: params.maxCandidates ?? 3,
        p_timeout_seconds: params.timeoutSeconds ?? 45,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: Boolean(data?.success),
        dispatchRequestId: data?.dispatch_request_id,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Concurrency-safe atomic acceptance by an eligible partner
   */
  static async acceptOffer(params: {
    dispatchRequestId: string;
    partnerId: string;
  }): Promise<{ success: boolean; bookingId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('accept_dispatch_offer', {
        p_dispatch_request_id: params.dispatchRequestId,
        p_partner_id: params.partnerId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Failed to accept dispatch offer' };
      }

      return {
        success: true,
        bookingId: data?.booking_id,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Partner declines dispatch offer
   */
  static async rejectOffer(params: {
    dispatchRequestId: string;
    partnerId: string;
    reason?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('reject_dispatch_offer', {
        p_dispatch_request_id: params.dispatchRequestId,
        p_partner_id: params.partnerId,
        p_reason: params.reason ?? 'DECLINED_BY_PARTNER',
      });

      if (error) return { success: false, error: error.message };
      return { success: Boolean(data?.success) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Partner job lifecycle transitions (En Route -> Arrived -> Started -> Completed)
   */
  static async transitionJobStatus(params: {
    bookingId: string;
    partnerId: string;
    nextStatus:
      | 'PARTNER_EN_ROUTE'
      | 'PARTNER_ARRIVED'
      | 'SERVICE_STARTED'
      | 'SERVICE_COMPLETED';
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; error?: string; status?: string }> {
    try {
      const { data, error } = await supabase.rpc('transition_partner_job_status', {
        p_booking_id: params.bookingId,
        p_partner_id: params.partnerId,
        p_next_status: params.nextStatus,
        p_metadata: params.metadata ?? {},
      });

      if (error) return { success: false, error: error.message };
      if (!data?.success) return { success: false, error: data?.error };

      return {
        success: true,
        status: data?.status,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Authoritative Service Start via Phase 7 RPC
   */
  static async startService(params: {
    bookingId: string;
    partnerId: string;
    verificationOtp?: string;
  }): Promise<{ success: boolean; error?: string; status?: string }> {
    try {
      const { data, error } = await supabase.rpc('authoritative_start_service', {
        p_booking_id: params.bookingId,
        p_partner_id: params.partnerId,
        p_verification_otp: params.verificationOtp || null,
      });

      if (error) {
        // Fallback to legacy transition if new migration not applied yet
        return this.transitionJobStatus({
          bookingId: params.bookingId,
          partnerId: params.partnerId,
          nextStatus: 'SERVICE_STARTED',
        });
      }

      if (!data?.success) return { success: false, error: data?.error };
      return { success: true, status: data?.status };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  /**
   * Authoritative Service Completion with Financial Ledger Settlement via Phase 7 RPC
   */
  static async completeService(params: {
    bookingId: string;
    partnerId: string;
    completionNotes?: string;
  }): Promise<{ success: boolean; error?: string; status?: string; payout?: number }> {
    try {
      const { data, error } = await supabase.rpc('authoritative_complete_service', {
        p_booking_id: params.bookingId,
        p_partner_id: params.partnerId,
        p_completion_notes: params.completionNotes || null,
      });

      if (error) {
        // Fallback to legacy transition
        return this.transitionJobStatus({
          bookingId: params.bookingId,
          partnerId: params.partnerId,
          nextStatus: 'SERVICE_COMPLETED',
        });
      }

      if (!data?.success) return { success: false, error: data?.error };
      return { success: true, status: data?.status, payout: data?.payout };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  /**
   * Authoritative Partner Reassignment via Phase 7 RPC
   */
  static async reassignPartner(params: {
    bookingId: string;
    reason: string;
    actorType: 'PARTNER' | 'SYSTEM' | 'ADMIN';
    actorId: string;
  }): Promise<{ success: boolean; error?: string; status?: string }> {
    try {
      const { data, error } = await supabase.rpc('authoritative_reassign_partner', {
        p_booking_id: params.bookingId,
        p_reason: params.reason,
        p_actor_type: params.actorType,
        p_actor_id: params.actorId,
      });

      if (error) return { success: false, error: error.message };
      if (!data?.success) return { success: false, error: data?.error };
      return { success: true, status: data?.status };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }
}
