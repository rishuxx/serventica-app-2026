import { supabase } from '../lib/supabase/client';
import {
  CustomerProfile,
  SavedServiceItem,
  NotificationRecord,
  SupportTicketRecord,
  ServiceReviewRecord,
} from '../../../../packages/types/src';

class AccountRepository {
  /**
   * Fetch customer profile with fallback
   */
  async getProfile(userId: string): Promise<CustomerProfile | null> {
    try {
      const { data, error } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        return data as CustomerProfile;
      }
    } catch (err) {
      console.warn('[AccountRepository.getProfile] Error:', err);
    }
    return null;
  }

  /**
   * Update customer profile in both users and customer_profiles tables
   */
  async updateProfile(
    userId: string,
    updates: {
      firstName?: string;
      lastName?: string;
      email?: string;
      avatarUrl?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const fullName = [updates.firstName, updates.lastName].filter(Boolean).join(' ');

      // 1. Update public.users
      const userUpdate: any = { updated_at: new Date().toISOString() };
      if (updates.email) userUpdate.email = updates.email;
      if (fullName) userUpdate.display_name = fullName;
      if (updates.avatarUrl) userUpdate.avatar_url = updates.avatarUrl;

      await supabase.from('users').update(userUpdate).eq('id', userId);

      // 2. Update public.customer_profiles
      const profileUpdate: any = { updated_at: new Date().toISOString() };
      if (updates.firstName !== undefined) profileUpdate.first_name = updates.firstName;
      if (updates.lastName !== undefined) profileUpdate.last_name = updates.lastName;
      if (updates.avatarUrl !== undefined) profileUpdate.avatar_url = updates.avatarUrl;

      const { error } = await supabase
        .from('customer_profiles')
        .update(profileUpdate)
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update profile' };
    }
  }

  /**
   * Saved Services (Wishlist) Operations
   */
  async getSavedServices(userId: string): Promise<SavedServiceItem[]> {
    try {
      const { data, error } = await supabase
        .from('saved_services')
        .select('*, services(*, categories(name))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((item: any) => ({
          id: item.id,
          userId: item.user_id,
          serviceId: item.service_id,
          createdAt: item.created_at,
          service: {
            id: item.services?.id || item.service_id,
            name: item.services?.name || 'Service',
            slug: item.services?.slug || 'service',
            description: item.services?.description || '',
            basePrice: Number(item.services?.base_price) || 0,
            durationMinutes: Number(item.services?.duration_minutes) || 60,
            rating: Number(item.services?.rating) || 4.8,
            reviewsCount: Number(item.services?.reviews_count) || 0,
            imageUrl: item.services?.image_url,
            categoryName: item.services?.categories?.name,
          },
        }));
      }
    } catch (err) {
      console.warn('[AccountRepository.getSavedServices] Error:', err);
    }
    return [];
  }

  async saveService(userId: string, serviceId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('saved_services').insert({
        user_id: userId,
        service_id: serviceId,
      });
      return !error;
    } catch {
      return false;
    }
  }

  async unsaveService(userId: string, serviceId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('saved_services')
        .delete()
        .eq('user_id', userId)
        .eq('service_id', serviceId);
      return !error;
    } catch {
      return false;
    }
  }

  async isServiceSaved(userId: string, serviceId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('saved_services')
        .select('id')
        .eq('user_id', userId)
        .eq('service_id', serviceId)
        .maybeSingle();
      return Boolean(data);
    } catch {
      return false;
    }
  }

  /**
   * Notifications Operations
   */
  async getNotifications(userId: string): Promise<NotificationRecord[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((item: any) => ({
          id: item.id,
          userId: item.user_id,
          type: item.type,
          title: item.title,
          body: item.body,
          data: item.data,
          readAt: item.read_at,
          createdAt: item.created_at,
        }));
      }
    } catch (err) {
      console.warn('[AccountRepository.getNotifications] Error:', err);
    }
    return [];
  }

  async markNotificationRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Support Tickets Operations
   */
  async createSupportTicket(input: {
    userId: string;
    bookingId?: string | null;
    category: string;
    subject: string;
    description: string;
  }): Promise<{ success: boolean; ticketId?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: input.userId,
          booking_id: input.bookingId || null,
          category: input.category,
          subject: input.subject,
          description: input.description,
          status: 'OPEN',
        })
        .select('id')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, ticketId: data?.id };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to submit support ticket' };
    }
  }

  async getSupportTickets(userId: string): Promise<SupportTicketRecord[]> {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*, bookings(booking_number)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((item: any) => ({
          id: item.id,
          userId: item.user_id,
          bookingId: item.booking_id,
          bookingNumber: item.bookings?.booking_number,
          category: item.category,
          subject: item.subject,
          description: item.description,
          status: item.status,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        }));
      }
    } catch (err) {
      console.warn('[AccountRepository.getSupportTickets] Error:', err);
    }
    return [];
  }

  /**
   * Reviews Operations
   */
  async submitReview(input: {
    userId: string;
    bookingId: string;
    serviceId: string;
    partnerId?: string | null;
    rating: number;
    reviewText?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('reviews').insert({
        user_id: input.userId,
        booking_id: input.bookingId,
        service_id: input.serviceId,
        partner_id: input.partnerId || null,
        rating: input.rating,
        review_text: input.reviewText?.trim() || null,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to submit review' };
    }
  }

  async getBookingReview(bookingId: string): Promise<ServiceReviewRecord | null> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          userId: data.user_id,
          bookingId: data.booking_id,
          serviceId: data.service_id,
          partnerId: data.partner_id,
          rating: data.rating,
          reviewText: data.review_text,
          createdAt: data.created_at,
        };
      }
    } catch {
      // Ignored
    }
    return null;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);
    } catch {
      // Ignored
    }
  }

  async getUserReviews(userId?: string): Promise<ServiceReviewRecord[]> {
    try {
      let query = supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data.map((item: any) => ({
          id: item.id,
          userId: item.user_id,
          bookingId: item.booking_id,
          serviceId: item.service_id,
          partnerId: item.partner_id,
          rating: item.rating,
          reviewText: item.review_text,
          createdAt: item.created_at,
        }));
      }
    } catch (err) {
      console.warn('[AccountRepository.getUserReviews] Error:', err);
    }
    return [];
  }
}

export const accountRepository = new AccountRepository();
