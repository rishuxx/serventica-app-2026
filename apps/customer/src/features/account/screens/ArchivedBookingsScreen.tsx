import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  Trash2,
  Archive,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';
import { bookingRepository } from '../../../repositories/booking.repository';
import { BookingRecord } from '../../../../../../packages/types/src';
import { AssetRegistry } from '../../../services/home.service';
import { formatBookingExactDateTime } from '../../../lib/date.utils';
import { BookingTicket } from '../../../components/BookingTicket';
import { BookingSwipeableRow } from '../../../components/BookingSwipeableRow';
import { PriceCalculationEngine } from '../../../services/pricing/PriceCalculationEngine';
import { triggerHaptic } from '../../../hooks/useEventHaptics';

interface ArchivedBookingsScreenProps {
  onBack: () => void;
  onSelectBooking: (bookingId: string) => void;
}

export const ArchivedBookingsScreen: React.FC<ArchivedBookingsScreenProps> = ({
  onBack,
  onSelectBooking,
}) => {
  const insets = useSafeAreaInsets();
  const [archivedList, setArchivedList] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadArchived = useCallback(async () => {
    setIsLoading(true);
    const data = await bookingRepository.getArchivedBookings();
    setArchivedList(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadArchived();
    const unsub = bookingRepository.subscribe(() => {
      loadArchived();
    });
    return () => unsub();
  }, [loadArchived]);

  const handleUnarchive = async (bookingId: string) => {
    triggerHaptic('impactMedium');
    await bookingRepository.unarchiveBooking(bookingId);
    loadArchived();
  };

  const keyExtractor = useCallback((item: BookingRecord) => item.id || item.bookingNumber, []);

  const renderItem = ({ item }: { item: BookingRecord }) => {
    const imageSource =
      item.serviceImageUrl && AssetRegistry[item.serviceImageUrl]
        ? AssetRegistry[item.serviceImageUrl]
        : AssetRegistry.basic_ac_repair;

    const isCancelled = Boolean(item.status?.includes('CANCEL'));
    const isCompleted = item.status === 'SERVICE_COMPLETED' || item.status === 'CLOSED';
    const theme = isCancelled ? 'red' : isCompleted ? 'green' : 'purple';

    const bill = PriceCalculationEngine.calculateBill({
      itemTotal: item.payment?.subtotal,
      subtotal: item.payment?.subtotal,
      discount: item.payment?.discount,
      platformFee: item.payment?.platformFee,
      total: item.payment?.total,
      items: item.items,
    });

    return (
      <View style={styles.itemWrapper}>
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
              text: `${item.scheduledStartTime || 'Scheduled Slot'} • ${item.items?.length || 1} services`,
            },
            {
              icon: 'pin',
              text: item.address?.shortAddress || item.address?.city || 'Service Address',
            },
          ]}
          totalLabel="TOTAL"
          total={`₹${bill.finalPayable}`}
          onPress={() => onSelectBooking(item.id)}
        />
        <TouchableOpacity
          style={styles.unarchiveBannerBtn}
          activeOpacity={0.85}
          onPress={() => handleUnarchive(item.id)}
        >
          <RotateCcw size={15} color="#10B981" strokeWidth={2.4} />
          <Text style={styles.unarchiveBtnText}>Restore to My Bookings</Text>
        </TouchableOpacity>
      </View>
    );
  };

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
        <TouchableOpacity style={styles.circleBackButton} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#1E242B" strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Archived Bookings</Text>
          <Text style={styles.headerSubtitle}>Saved outside main activity timeline</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      ) : archivedList.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIconCircle}>
            <Archive size={34} color="#10B981" strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>No Archived Bookings</Text>
          <Text style={styles.emptySubtitle}>
            Swiping right on any booking card in My Bookings moves it here so your main order screen stays organized.
          </Text>
        </View>
      ) : (
        <FlatList
          data={archivedList}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
  listContent: {
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 40,
  },
  itemWrapper: {
    marginBottom: 16,
  },
  unarchiveBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: -8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 6,
  },
  unarchiveBtnText: {
    fontSize: 12,
    fontFamily: Fonts.SemiBold,
    color: '#047857',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#A7F3D0',
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
  },
});
