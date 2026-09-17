import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { ArrowLeft, Bell, Calendar, CheckCircle2, AlertCircle, Sparkles, CreditCard, ChevronRight } from 'lucide-react-native';
import { useNotifications } from '../../../hooks/useNotifications';
import { NotificationRecord } from '@serventica/types';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

interface NotificationsScreenProps {
  onBack: () => void;
  onNavigateToBooking?: (bookingId: string) => void;
  onNavigateToServices?: () => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onBack,
  onNavigateToBooking,
  onNavigateToServices,
}) => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const handleNotificationPress = async (notification: NotificationRecord) => {
    if (!notification.readAt) {
      await markAsRead(notification.id);
    }
    if (notification.data?.booking_id && onNavigateToBooking) {
      onNavigateToBooking(notification.data.booking_id);
    } else if (onNavigateToServices) {
      onNavigateToServices();
    }
  };

  const renderIcon = (type: NotificationRecord['type']) => {
    switch (type) {
      case 'BOOKING_UPDATE':
        return <Calendar size={18} color='#1E242B' strokeWidth={1.8} />;
      case 'SERVICE_STATUS':
        return <CheckCircle2 size={18} color="#15803d" strokeWidth={1.8} />;
      case 'PAYMENT':
        return <CreditCard size={18} color="#1d4ed8" strokeWidth={1.8} />;
      case 'SUPPORT':
        return <AlertCircle size={18} color="#b45309" strokeWidth={1.8} />;
      case 'PROMOTION':
      default:
        return <Sparkles size={18} color="#6b21a8" strokeWidth={1.8} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={22} color='#1E242B' strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity
            onPress={markAllAsRead}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color='#1E242B' />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Bell size={32} color="#999999" strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>You're all caught up</Text>
          <Text style={styles.emptySubtitle}>
            Updates regarding your bookings, services, and offers will appear right here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isUnread = !item.readAt;
            return (
              <TouchableOpacity
                style={[styles.notificationCard, isUnread && styles.unreadCard]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.75}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconCircle}>
                    {renderIcon(item.type)}
                  </View>
                  <View style={styles.textContainer}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.title, isUnread && styles.unreadTitle]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {isUnread && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.body} numberOfLines={2}>
                      {item.body}
                    </Text>
                    <Text style={styles.timestamp}>
                      {new Date(item.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#CCCCCC" strokeWidth={1.8} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: ServenticaTokens.fonts.Bold,
    fontSize: 20,
    color: '#1E242B',
    letterSpacing: 0.3,
  },
  markAllText: {
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontSize: 13,
    color: '#444444',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontFamily: ServenticaTokens.fonts.Regular,
    fontSize: 14,
    color: '#777777',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F7F7F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: ServenticaTokens.fonts.Bold,
    fontSize: 18,
    color: '#1E242B',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: ServenticaTokens.fonts.Regular,
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  unreadCard: {
    backgroundColor: '#FAF9F6',
    borderColor: '#E5E5E0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F4F4F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontSize: 15,
    color: '#222222',
    flex: 1,
  },
  unreadTitle: {
    color: '#1E242B',
    fontWeight: '600',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#0F5132',
    marginLeft: 6,
  },
  body: {
    fontFamily: ServenticaTokens.fonts.Regular,
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    marginBottom: 6,
  },
  timestamp: {
    fontFamily: ServenticaTokens.fonts.Regular,
    fontSize: 11,
    color: '#999999',
  },
});
