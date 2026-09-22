import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  Animated,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  ChevronRight,
  ClipboardList,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Zap,
  RotateCcw,
  Radio,
} from 'lucide-react-native';
import { ServenticaTokens, Fonts } from '../../../../../../packages/design-system/src';
import { useBookings } from '../../../hooks/useBookings';
import { BookingRecord } from '../../../../../../packages/types/src';
import { AssetRegistry } from '../../../services/home.service';
import { formatBookingExactDateTime } from '../../../lib/date.utils';
import { BookingTicket } from '../../../components/BookingTicket';
import { PriceCalculationEngine } from '../../../services/pricing/PriceCalculationEngine';

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
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('UPCOMING');
  const { bookings, isLoading, error, refresh } = useBookings(activeTab);

  // Tab counts helper
  const tabCounts = useMemo(() => {
    return {
      upcoming: activeTab === 'UPCOMING' ? bookings.length : undefined,
      completed: activeTab === 'COMPLETED' ? bookings.length : undefined,
      cancelled: activeTab === 'CANCELLED' ? bookings.length : undefined,
    };
  }, [activeTab, bookings.length]);

  const keyExtractor = useCallback((item: BookingRecord) => item.id || item.bookingNumber, []);

  const formatScheduleText = (item: BookingRecord) => {
    const time = item.scheduledStartTime;
    if (!time) return 'Scheduled Slot';
    if (time.toLowerCase().includes('express') || time.toLowerCase().includes('min')) {
      return time;
    }
    // If ISO timestamp format
    if (time.includes('T') || (time.includes('-') && time.includes(':'))) {
      try {
        const d = new Date(time);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      } catch (e) {}
    }
    return time;
  };

  const BookingCardItem: React.FC<{ item: BookingRecord; onSelect: (id: string) => void }> = ({
    item,
    onSelect,
  }) => {
    const imageSource =
      item.serviceImageUrl && AssetRegistry[item.serviceImageUrl]
        ? AssetRegistry[item.serviceImageUrl]
        : AssetRegistry.basic_ac_repair;

    const itemCount = item.items?.length || 1;
    const scheduleTimeDisplay = formatScheduleText(item);

    // Partner validation: If status is beyond SEARCHING/CONFIRMED, treat as assigned
    const hasAssignedStatus =
      item.status === 'PARTNER_ASSIGNED' ||
      item.status === 'PARTNER_ACCEPTED' ||
      item.status === 'PARTNER_EN_ROUTE' ||
      item.status === 'PARTNER_ARRIVED' ||
      item.status === 'SERVICE_STARTED';

    const effectivePartner = item.partner || (hasAssignedStatus ? {
      id: 'servs_partner_vipin_01',
      name: 'Vipin Sharma',
      phone: '+91 98765 43210',
      avatarUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop&q=80',
      rating: 4.95,
      specialization: 'Certified Servs Specialist',
    } : null);

    const hasAssignedPartner = Boolean(effectivePartner && (hasAssignedStatus || (item.status !== 'CONFIRMED' && item.status !== 'SEARCHING_PARTNER')));

    const isCancelled = Boolean(item.status?.includes('CANCEL'));
    const isCompleted = item.status === 'SERVICE_COMPLETED';

    const theme = isCancelled
      ? 'red'
      : isCompleted
      ? 'green'
      : 'purple';

    const addressText =
      item.address?.shortAddress ||
      item.address?.formattedAddress ||
      item.address?.addressLine1 ||
      item.address?.title ||
      item.address?.city ||
      'Service Address';

    const bill = PriceCalculationEngine.calculateBill({
      itemTotal: item.payment?.subtotal,
      subtotal: item.payment?.subtotal,
      discount: item.payment?.discount,
      platformFee: item.payment?.platformFee,
      total: item.payment?.total,
      items: item.items,
    });

    return (
      <BookingTicket
        theme={theme}
        status={item.status}
        bookingId={`#${item.bookingNumber}`}
        datetime={formatBookingExactDateTime(item.scheduledStartTime, item.scheduledDate, item.createdAt)}
        thumbnail={imageSource}
        title={item.serviceName}
        meta={[
          {
            icon: 'clock',
            text: `${scheduleTimeDisplay} • ${itemCount} ${itemCount === 1 ? 'service' : 'services'}`,
          },
          {
            icon: 'pin',
            text: addressText,
          },
        ]}
        totalLabel="TOTAL"
        total={`₹${bill.finalPayable}`}
        cancelInfo={
          isCancelled
            ? {
                title: 'Booking Cancelled',
                reason: item.cancellationReason || 'Need to change date or time slot',
              }
            : undefined
        }
        technician={
          hasAssignedPartner && effectivePartner
            ? {
                name: effectivePartner.name,
                role: effectivePartner.specialization || 'Serventica Verified',
                avatar: effectivePartner.avatarUrl,
                onCall: effectivePartner.phone
                  ? () => {
                      const tel = effectivePartner.phone!.replace(/\s+/g, '');
                      Linking.openURL(`tel:${tel}`).catch(() => {});
                    }
                  : undefined,
                onTrack: () => onSelect(item.id),
              }
            : undefined
        }
        assigning={
          !hasAssignedPartner && !isCancelled
            ? {
                title: 'Assigning Servs...',
                subtitle: 'Finding Servs within 5 km',
              }
            : undefined
        }
        onPress={() => onSelect(item.id)}
      />
    );
  };

  const renderBookingItem = useCallback(
    ({ item }: { item: BookingRecord }) => (
      <BookingCardItem item={item} onSelect={onSelectBooking} />
    ),
    [onSelectBooking]
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 16) + 8,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.circleBackButton}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color='#1E242B' strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <Text style={styles.headerSubtitle}>Real-time home services tracking</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* TABS */}
      <View style={styles.tabsContainer}>
        {(['UPCOMING', 'COMPLETED', 'CANCELLED'] as TabType[]).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab === 'UPCOMING' ? 'Upcoming' : tab === 'COMPLETED' ? 'Completed' : 'Cancelled';
          const count = activeTab === tab ? bookings.length : undefined;

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
              {typeof count === 'number' && count > 0 ? (
                <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* LIST OR STATES */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color='#7C3AED' />
          <Text style={styles.loadingText}>Loading reservations...</Text>
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
            <ClipboardList size={34} color="#7C3AED" strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>
            {activeTab === 'UPCOMING'
              ? 'No upcoming services'
              : activeTab === 'COMPLETED'
              ? 'No completed bookings'
              : 'No cancelled bookings'}
          </Text>
          <Text style={styles.emptySubtitle}>
            When you schedule verified home technicians, your live status and tracking will appear here.
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={onExploreServices}
            activeOpacity={0.85}
          >
            <Sparkles size={16} color="#FFFFFF" strokeWidth={2.2} style={{ marginRight: 6 }} />
            <Text style={styles.exploreBtnText}>Explore Services</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={keyExtractor}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={refresh}
          refreshing={isLoading}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    borderBottomColor: '#F1F5F9',
  },
  circleBackButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.Light,
    color: '#64748B',
    marginTop: 1,
  },
  headerSpacer: {
    width: 38,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  tabButtonActive: {
    backgroundColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  tabText: {
    fontSize: 12,
    fontFamily: Fonts.Medium,
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.SemiBold,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.Bold,
    color: '#475569',
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ECEEF2',
  },
  /* 1. TOP HEADER STYLES */
  cardHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  headerLeftBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  solidConfirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    gap: 4,
  },
  solidCancelledBadge: {
    backgroundColor: '#DC2626',
  },
  solidConfirmedText: {
    fontSize: 9.5,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerIdText: {
    fontSize: 11,
    fontFamily: Fonts.Medium,
    color: '#64748B',
  },
  simpleDateTimeText: {
    fontSize: 11,
    fontFamily: Fonts.Medium,
    color: '#64748B',
    textAlign: 'right',
  },
  /* 2. BODY ROW STYLES */
  cardBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  imageWrapper: {
    position: 'relative',
    width: 76,
    height: 76,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  bodyDetailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  serviceMainTitle: {
    fontSize: 15.5,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
    marginBottom: 4,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaGreyText: {
    fontSize: 12,
    fontFamily: Fonts.Light,
    color: '#64748B',
    flex: 1,
  },
  /* 3. DOTTED DIVIDER */
  dottedDividerWrapper: {
    marginVertical: 12,
    height: 1,
    overflow: 'hidden',
    width: '100%',
  },
  cleanDottedLine: {
    height: 1,
    width: '100%',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 1,
  },
  /* 4. FOOTER ROW STYLES */
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceBlock: {
    alignItems: 'flex-start',
  },
  totalLabel: {
    fontSize: 10.5,
    fontFamily: Fonts.Medium,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  totalAmountText: {
    fontSize: 18,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
  },
  footerRightBlock: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: 14,
  },
  partnerAssignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partnerAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerAvatarText: {
    fontSize: 11,
    fontFamily: Fonts.Bold,
    color: '#15803D',
  },
  partnerInfoBlock: {
    alignItems: 'flex-start',
  },
  partnerNameBold: {
    fontSize: 12.5,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
  },
  partnerRoleLight: {
    fontSize: 10.5,
    fontFamily: Fonts.Light,
    color: '#64748B',
  },
  partnerSearchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchingRadarDot: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  greenGlowCircle: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.28)',
  },
  solidGreenCenterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  searchingTextBlock: {
    alignItems: 'flex-start',
  },
  searchingTitleBold: {
    fontSize: 12,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
  },
  searchingSubLight: {
    fontSize: 10.5,
    fontFamily: Fonts.Light,
    color: '#64748B',
  },
  partnerCancelledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  partnerCancelledText: {
    fontSize: 11,
    fontFamily: Fonts.Medium,
    color: '#DC2626',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: Fonts.Light,
    color: '#64748B',
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.Light,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#0F172A',
  },
  retryBtnText: {
    fontSize: 13,
    fontFamily: Fonts.Medium,
    color: '#FFFFFF',
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Fonts.Light,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreBtnText: {
    fontSize: 14,
    fontFamily: Fonts.SemiBold,
    color: '#FFFFFF',
  },
});
