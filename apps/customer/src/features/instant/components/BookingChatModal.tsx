/**
 * SERVENTICA — Customer Real-Time Booking Chat Modal
 * Direct, authorized communication with assigned service specialist
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { X, Send, Shield, Check, MessageSquare } from 'lucide-react-native';
import { ServenticaTokens, Fonts } from '../../../../../../packages/design-system/src';
import { bookingChatService, ChatMessage } from '../../../services/BookingChatService';

interface BookingChatModalProps {
  visible: boolean;
  bookingId: string;
  bookingNumber?: string;
  customerId: string;
  customerName?: string;
  partnerName?: string;
  partnerAvatarUrl?: string | null;
  partnerSpecialization?: string;
  onClose: () => void;
}

const QUICK_CHIPS = [
  'I am waiting near the main gate',
  'Doorbell is working / please ring',
  'Please call once you reach the building',
  'Elevator is available to 4th floor',
  'Flat / door number is...',
];

export const BookingChatModal: React.FC<BookingChatModalProps> = ({
  visible,
  bookingId,
  bookingNumber,
  customerId,
  customerName = 'Customer',
  partnerName = 'Specialist',
  partnerAvatarUrl,
  partnerSpecialization = 'Certified Serventica Specialist',
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!visible || !bookingId || !customerId) return;

    let isMounted = true;
    setIsLoading(true);

    bookingChatService.fetchMessages(bookingId, customerId).then((initialMsgs) => {
      if (isMounted) {
        setMessages(initialMsgs);
        setIsLoading(false);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 200);
      }
    });

    const unsub = bookingChatService.subscribeToMessages(bookingId, bookingNumber, (newMsg) => {
      if (isMounted) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [visible, bookingId, customerId, bookingNumber]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputText('');

    const res = await bookingChatService.sendMessage(
      bookingId,
      customerId,
      customerName,
      text,
      bookingNumber
    );

    setIsSending(false);

    if (res.success && res.message) {
      const sentMsg = res.message;
      setMessages((prev) => {
        if (prev.some((m) => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isCustomer = item.senderRole === 'CUSTOMER';
    const isSystem = item.senderRole === 'SYSTEM';

    if (isSystem) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.text}</Text>
        </View>
      );
    }

    const timeStr = new Date(item.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View
        style={[
          styles.messageRow,
          isCustomer ? styles.messageRowRight : styles.messageRowLeft,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isCustomer ? styles.bubbleCustomer : styles.bubblePartner,
          ]}
        >
          <Text
            style={[
              styles.senderLabel,
              isCustomer ? styles.senderLabelCustomer : styles.senderLabelPartner,
            ]}
          >
            {isCustomer ? 'You' : item.senderName || partnerName}
          </Text>
          <Text
            style={[
              styles.messageText,
              isCustomer ? styles.messageTextCustomer : styles.messageTextPartner,
            ]}
          >
            {item.text}
          </Text>
          <View style={styles.timeRow}>
            <Text
              style={[
                styles.timeText,
                isCustomer ? styles.timeTextCustomer : styles.timeTextPartner,
              ]}
            >
              {timeStr}
            </Text>
            {isCustomer && <Check size={12} color="rgba(255,255,255,0.7)" style={{ marginLeft: 3 }} />}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerProfile}>
            <View style={styles.avatarContainer}>
              <Image
                source={{
                  uri:
                    partnerAvatarUrl ||
                    'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150',
                }}
                style={styles.avatar}
              />
              <View style={styles.onlineBadge} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>{partnerName}</Text>
              <Text style={styles.headerSubtitle}>{partnerSpecialization}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <X size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* SECURITY & PRIVACY NOTICE */}
        <View style={styles.securityBanner}>
          <Shield size={13} color="#7C3AED" />
          <Text style={styles.securityText}>
            Direct Real-time Channel • Assigned Specialist Only
          </Text>
        </View>

        {/* MESSAGES LIST */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#7C3AED" />
            <Text style={styles.loadingText}>Connecting to room...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messagesList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MessageSquare size={32} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Direct Specialist Chat</Text>
                <Text style={styles.emptySubtitle}>
                  Provide gate directions, door codes, or arrival instructions to {partnerName}.
                </Text>
              </View>
            }
          />
        )}

        {/* QUICK CHIPS */}
        <View style={styles.quickChipsWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={QUICK_CHIPS}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.chipBtn}
                onPress={() => handleSendMessage(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.chipText}>{item}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.chipsContainer}
          />
        </View>

        {/* INPUT BAR */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type instructions or directions..."
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={300}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim() || isSending}
            activeOpacity={0.8}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontFamily: Fonts.Bold,
    fontSize: 15,
    color: '#0F172A',
  },
  headerSubtitle: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: '#64748B',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE9FE',
  },
  securityText: {
    fontFamily: Fonts.SemiBold,
    fontSize: 10,
    color: '#7C3AED',
    letterSpacing: 0.2,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontFamily: Fonts.Medium,
    fontSize: 12,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 15,
    color: '#334155',
    marginTop: 6,
  },
  emptySubtitle: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleCustomer: {
    backgroundColor: '#7C3AED',
    borderBottomRightRadius: 2,
  },
  bubblePartner: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomLeftRadius: 2,
  },
  senderLabel: {
    fontSize: 10,
    fontFamily: Fonts.SemiBold,
    marginBottom: 2,
  },
  senderLabelCustomer: {
    color: 'rgba(255,255,255,0.7)',
  },
  senderLabelPartner: {
    color: '#7C3AED',
  },
  messageText: {
    fontSize: 13,
    fontFamily: Fonts.Regular,
    lineHeight: 18,
  },
  messageTextCustomer: {
    color: '#FFFFFF',
  },
  messageTextPartner: {
    color: '#0F172A',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timeText: {
    fontSize: 9,
    fontFamily: Fonts.Regular,
  },
  timeTextCustomer: {
    color: 'rgba(255,255,255,0.6)',
  },
  timeTextPartner: {
    color: '#94A3B8',
  },
  systemMessageContainer: {
    alignSelf: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 10,
    fontFamily: Fonts.Medium,
    color: '#475569',
  },
  quickChipsWrapper: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
  },
  chipsContainer: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chipBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  chipText: {
    fontFamily: Fonts.Medium,
    fontSize: 11,
    color: '#475569',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: Fonts.Regular,
    color: '#0F172A',
    maxHeight: 80,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
});
