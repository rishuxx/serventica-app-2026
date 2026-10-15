/**
 * SERVENTICA — Customer Booking Realtime Chat Service
 * Dual-channel Socket.io/Realtime communication between Customer and Authorized Assigned Partner
 */

import { supabase } from '../lib/supabase/client';

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderRole: 'CUSTOMER' | 'PARTNER' | 'SYSTEM';
  senderName: string;
  text: string;
  createdAt: string;
}

class BookingChatService {
  /**
   * Fetch chat history for authorized customer
   */
  async fetchMessages(bookingId: string, customerId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase.rpc('get_booking_messages', {
        p_booking_id: bookingId,
        p_caller_id: customerId,
      });

      if (error) {
        console.warn('[BookingChatService] fetch error:', error.message);
        return [];
      }

      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('[BookingChatService] fetch exception:', err);
      return [];
    }
  }

  /**
   * Send a chat message to authorized assigned partner
   */
  async sendMessage(
    bookingId: string,
    customerId: string,
    customerName: string,
    text: string,
    bookingNumber?: string
  ): Promise<{ success: boolean; message?: ChatMessage; error?: string }> {
    const cleanText = text.trim();
    if (!cleanText) return { success: false, error: 'Message cannot be empty' };

    try {
      const { data, error } = await supabase.rpc('send_booking_message', {
        p_booking_id: bookingId,
        p_sender_id: customerId,
        p_sender_role: 'CUSTOMER',
        p_sender_name: customerName,
        p_message: cleanText,
      });

      if (error || !data?.success) {
        return { success: false, error: error?.message || data?.error || 'Failed to send' };
      }

      const msg = data.message as ChatMessage;

      // Broadcast over Realtime channels for zero-latency peer delivery
      const targetChannels = [
        `order_${bookingId}_tracking`,
        ...(bookingNumber ? [`order_${bookingNumber}_tracking`] : []),
      ];

      targetChannels.forEach((chName) => {
        try {
          const ch = supabase.channel(chName);
          ch.send({
            type: 'broadcast',
            event: 'CHAT_MESSAGE',
            payload: msg,
          });
        } catch (e) {}
      });

      return { success: true, message: msg };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Subscribe to real-time incoming messages in booking room
   */
  subscribeToMessages(
    bookingId: string,
    bookingNumber: string | undefined,
    onMessage: (msg: ChatMessage) => void
  ): () => void {
    const channelNames = [
      `order_${bookingId}_tracking`,
      ...(bookingNumber ? [`order_${bookingNumber}_tracking`] : []),
    ];

    const channels = channelNames.map((name) => {
      const ch = supabase.channel(name, {
        config: { broadcast: { self: false } },
      });

      ch.on('broadcast', { event: 'CHAT_MESSAGE' }, (eventPayload: any) => {
        if (eventPayload?.payload?.text) {
          onMessage(eventPayload.payload as ChatMessage);
        }
      }).subscribe();

      return ch;
    });

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }
}

export const bookingChatService = new BookingChatService();
