import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  Sun,
  Sunrise,
  Moon,
  CheckCircle2,
  Clock,
} from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { useCart } from '../../../features/cart/context/CartContext';

interface DurationOption {
  id: string;
  label: string;
  price: number;
  originalPrice: number;
}

const DURATIONS: DurationOption[] = [
  { id: '0.5hr', label: '0.5 hr', price: 30, originalPrice: 125 },
  { id: '1hr', label: '1 hr', price: 59, originalPrice: 250 },
  { id: '1.5hr', label: '1.5 hr', price: 89, originalPrice: 375 },
  { id: '2hr', label: '2 hr', price: 118, originalPrice: 500 },
];

const PERIOD_TABS = [
  { id: 'MORNING', label: 'Morning', icon: Sunrise },
  { id: 'AFTERNOON', label: 'Afternoon', icon: Sun },
  { id: 'EVENING', label: 'Evening', icon: Moon },
];

const SLOTS_MAP: Record<string, string[]> = {
  MORNING: ['8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'],
  AFTERNOON: ['12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM'],
  EVENING: ['4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM'],
};

interface ScheduleFulfillmentScreenProps {
  onBack: () => void;
  categoryName?: string;
  categorySlug?: string;
}

export const ScheduleFulfillmentScreen: React.FC<ScheduleFulfillmentScreenProps> = ({
  onBack,
  categoryName = 'House Help & Cleaning',
  categorySlug = 'home-cleaning',
}) => {
  const { addItem, openCartDrawer } = useCart();
  const [selectedDurationId, setSelectedDurationId] = useState<string>('1hr');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('MORNING');
  const [selectedSlot, setSelectedSlot] = useState<string>('8:30 AM');

  // Generate real calendar dates starting today
  const dates = React.useMemo(() => {
    const list = [];
    const today = new Date();
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      let sub = dayNames[d.getDay()];
      if (i === 0) sub = 'TODAY';
      else if (i === 1) sub = 'TOM';

      list.push({
        dateNumber: d.getDate(),
        month: monthNames[d.getMonth()],
        sub,
        fullDate: `${d.getDate()} ${monthNames[d.getMonth()]}`,
      });
    }
    return list;
  }, []);

  const selectedDuration = DURATIONS.find((d) => d.id === selectedDurationId) || DURATIONS[1];
  const activeSlots = SLOTS_MAP[selectedPeriod] || SLOTS_MAP.MORNING;

  const handleAddToCart = () => {
    addItem({
      id: `scheduled_${categorySlug}_${selectedDuration.id}`,
      name: `${categoryName} (${selectedDuration.label})`,
      base_price: selectedDuration.price,
      duration_minutes: selectedDuration.id === '0.5hr' ? 30 : selectedDuration.id === '1hr' ? 60 : selectedDuration.id === '1.5hr' ? 90 : 120,
      image_url: 'service_cleaning',
    } as any);
    openCartDrawer();
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#1E242B" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule for later</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Category Header Label */}
        <View style={styles.categoryContextBadge}>
          <Text style={styles.categoryContextText}>{categoryName.toUpperCase()} SERVICE</Text>
        </View>

        {/* 1. SERVICE DURATION CARDS */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Service duration</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowGap}>
            {DURATIONS.map((dur) => {
              const isSelected = selectedDurationId === dur.id;
              return (
                <TouchableOpacity
                  key={dur.id}
                  style={[styles.durationTile, isSelected && styles.durationTileActive]}
                  onPress={() => setSelectedDurationId(dur.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.durationTileLabel}>{dur.label}</Text>
                  <View style={styles.durationPriceRow}>
                    <Text style={styles.durationPriceText}>₹{dur.price}</Text>
                    <Text style={styles.durationOriginalText}>₹{dur.originalPrice}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 2. SELECT DATE TILES */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Select date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowGap}>
            {dates.map((d, index) => {
              const isSelected = selectedDayIndex === index;
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.dateTile, isSelected && styles.dateTileActive]}
                  onPress={() => setSelectedDayIndex(index)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dateTileText}>{d.dateNumber} {d.month}</Text>
                  <Text style={[styles.dateTileSub, isSelected && styles.dateTileSubActive]}>{d.sub}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 3. SELECT TIME PERIOD PILLS */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Select time</Text>
          <View style={styles.periodPillGroup}>
            {PERIOD_TABS.map((tab) => {
              const IconComp = tab.icon;
              const isSelected = selectedPeriod === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.periodPill, isSelected && styles.periodPillActive]}
                  onPress={() => setSelectedPeriod(tab.id)}
                  activeOpacity={0.85}
                >
                  <IconComp size={15} color={isSelected ? '#FFFFFF' : '#475569'} strokeWidth={2.2} />
                  <Text style={[styles.periodPillText, isSelected && styles.periodPillTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 4. STANDARD SLOTS GRID */}
        <View style={styles.slotsCardBox}>
          <Text style={styles.slotsBoxTitle}>Standard slots</Text>

          <View style={styles.slotsGrid}>
            {activeSlots.map((slot) => {
              const isSelected = selectedSlot === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[styles.slotItem, isSelected && styles.slotItemActive]}
                  onPress={() => setSelectedSlot(slot)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.slotItemText, isSelected && styles.slotItemTextActive]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* NOTE */}
        <View style={styles.noteContainer}>
          <Text style={styles.noteTitle}>NOTE</Text>
          <Text style={styles.noteText}>
            Professionals arrive within 30 minutes of the selected slot.
          </Text>
        </View>
      </ScrollView>

      {/* STICKY BOTTOM ADD TO CART BUTTON */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.addCartButton} onPress={handleAddToCart} activeOpacity={0.88}>
          <Text style={styles.addCartButtonText}>Add to cart • ₹{selectedDuration.price}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
  },
  categoryContextBadge: {
    backgroundColor: '#EDF9F3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  categoryContextText: {
    fontSize: 10.5,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#0A7E44',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 100,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
    marginBottom: 10,
  },
  rowGap: {
    gap: 10,
    paddingRight: 10,
  },
  durationTile: {
    width: 82,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    alignItems: 'center',
  },
  durationTileActive: {
    borderColor: '#0A7E44',
    backgroundColor: '#EDF9F3',
  },
  durationTileLabel: {
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
    marginBottom: 4,
  },
  durationPriceRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'baseline',
  },
  durationPriceText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
  },
  durationOriginalText: {
    fontSize: 10.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  dateTile: {
    width: 82,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    alignItems: 'center',
  },
  dateTileActive: {
    borderColor: '#0A7E44',
    backgroundColor: '#EDF9F3',
  },
  dateTileText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
    marginBottom: 3,
  },
  dateTileSub: {
    fontSize: 10,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  dateTileSubActive: {
    color: '#0A7E44',
  },
  periodPillGroup: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  periodPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  periodPillActive: {
    backgroundColor: '#0A7E44',
  },
  periodPillText: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#64748B',
  },
  periodPillTextActive: {
    color: '#FFFFFF',
    fontFamily: ServenticaTokens.fonts.Bold,
  },
  slotsCardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  slotsBoxTitle: {
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
    marginBottom: 12,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotItem: {
    width: '23%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 9,
    alignItems: 'center',
  },
  slotItemActive: {
    backgroundColor: '#EDF9F3',
    borderColor: '#0A7E44',
  },
  slotItemText: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#334155',
  },
  slotItemTextActive: {
    color: '#0A7E44',
    fontFamily: ServenticaTokens.fonts.Bold,
  },
  noteContainer: {
    marginTop: 4,
    paddingHorizontal: 4,
  },
  noteTitle: {
    fontSize: 10.5,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  noteText: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#94A3B8',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  addCartButton: {
    backgroundColor: '#0A7E44',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCartButtonText: {
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#FFFFFF',
  },
});
