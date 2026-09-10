import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  ChevronRight,
  ClipboardList,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { useBookings } from '../../../hooks/useBookings';
import { BookingRecord } from '../../../../../../packages/types/src';
import { AssetRegistry } from '../../../services/home.service';

interface BookingsScreenProps {
  onBack: () => void;
  onSelectBooking: (bookingId: string) => void;
  onExploreServices: () => void;
}

type TabType = 'UPCOMING' | 'COMPLETED' | 'CANCELLED';

export const BookingsScreen: React.FC<BookingsScreenProps> = ({
  onBack,
  onSelectBooking,
  onExploreServices,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('UPCOMING');
  const { bookings, isLoading, error, refresh } = useBookings(activeTab);

  const renderStatusBadge = (status: string) => {
    if (status === 'SERVICE_COMPLETED' || status === 'CLOSED') {
      return (
        <View style={[styles.statusBadge, styles.statusSuccess]}>
          <CheckCircle2 size={11} color="#059669" strokeWidth={2.2} />
          <Text style={[styles.statusBadgeText, styles.textSuccess]}>Completed</Text>
        </View>
      );
    }
    if (status.includes('CANCELLED') || status === 'PAYMENT_FAILED') {
      return (
        <View style={[styles.statusBadge, styles.statusDanger]}>
          <XCircle size={11} color="#DC2626" strokeWidth={2.2} />
          <Text style={[styles.statusBadgeText, styles.textDanger]}>Cancelled</Text>
        </View>
      );
    }
    return (
      <View style={[styles.statusBadge, styles.statusWarning]}>
        <Clock size={11} color="#D97706" strokeWidth={2.2} />
        <Text style={[styles.statusBadgeText, styles.textWarning]}>
          {status.replace(/_/g, ' ')}
        </Text>
      </View>
    );
  };

  const renderBookingItem = ({ item }: { item: BookingRecord }) => {
    const imageSource =
      item.serviceImageUrl && AssetRegistry[item.serviceImageUrl]
        ? AssetRegistry[item.serviceImageUrl]
        : AssetRegistry.basic_ac_repair;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => onSelectBooking(item.id)}
        accessibilityRole="button"
        accessibilityLabel={`Booking for ${item.serviceName}`}
      >
        <View style={styles.cardHeader}>
          {renderStatusBadge(item.status)}
          <Text style={styles.dateText}>{item.scheduledDate || 'Scheduled'}</Text>
        </View>

        <View style={styles.serviceRow}>
          <View style={styles.imageBox}>
            <Image source={imageSource} style={styles.serviceImage} resizeMode="contain" />
          </View>

          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName} numberOfLines={1}>
              {item.serviceName}
            </Text>
            <View style={styles.addressRow}>
              <MapPin size={12} color="#777777" strokeWidth={2} />
              <Text style={styles.addressText} numberOfLines={1}>
                {item.address.city || item.address.title}
              </Text>
            </View>
            <Text style={styles.priceText}>₹{item.payment.total}</Text>
          </View>

          <ChevronRight size={18} color="#888888" strokeWidth={2.2} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.circleBackButton}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color='#1E242B' strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* TABS */}
      <View style={styles.tabsContainer}>
        {(['UPCOMING', 'COMPLETED', 'CANCELLED'] as TabType[]).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab === 'UPCOMING' ? 'Upcoming' : tab === 'COMPLETED' ? 'Completed' : 'Cancelled';
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* LIST OR STATES */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color='#1E242B' />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorTitle}>Unable to load bookings.</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refresh} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIconCircle}>
            <ClipboardList size={32} color="#888888" strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>
            {activeTab === 'UPCOMING'
              ? 'No upcoming services'
              : activeTab === 'COMPLETED'
              ? 'No completed bookings'
              : 'No cancelled bookings'}
          </Text>
          <Text style={styles.emptySubtitle}>
            When you schedule verified home technicians, your reservations will appear here.
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={onExploreServices}
            activeOpacity={0.85}
          >
            <Text style={styles.exploreBtnText}>Explore Services</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={refresh}
          refreshing={isLoading}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFBFA',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 14,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0ED',
  },
  circleBackButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
  },
  headerSpacer: {
    width: 38,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0ED',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F7F7F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#1E242B',
  },
  tabText: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#666666',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFEFEA',
    shadowColor: '#1E242B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F7F5',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  statusSuccess: {
    backgroundColor: '#ECFDF5',
  },
  statusWarning: {
    backgroundColor: '#FEF3C7',
  },
  statusDanger: {
    backgroundColor: '#FEF2F2',
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Medium,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  textSuccess: {
    color: '#059669',
  },
  textWarning: {
    color: '#D97706',
  },
  textDanger: {
    color: '#DC2626',
  },
  dateText: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#888888',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F7F7F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  serviceImage: {
    width: 36,
    height: 36,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14.5,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
    marginBottom: 3,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#777777',
  },
  priceText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#1E242B',
    fontWeight: '700',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#777777',
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#777777',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1E242B',
  },
  retryBtnText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#FFFFFF',
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F5F5F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#777777',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  exploreBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#1E242B',
  },
  exploreBtnText: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
