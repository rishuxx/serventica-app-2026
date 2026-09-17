import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import {
  X,
  Plus,
  Minus,
  ShieldCheck,
  Zap,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Phone,
  User as UserIcon,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import { useCart } from '../context/CartContext';
import { useLocation } from '../../../context/LocationContext';
import { useAuth } from '../../../context/AuthContext';
import { AnimatedTouchable } from '../../../shared/components/AnimatedTouchable';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { AssetRegistry } from '../../../services/home.service';

interface CartDrawerModalProps {
  onProceedToBooking?: (bookingData: any) => void;
}

// Generate next 6 days dynamically from today
const getAvailableBookingDays = () => {
  const days: { key: string; label: string; dateStr: string; dayName: string }[] = [];
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < 6; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    let label = '';
    if (i === 0) label = 'Today';
    else if (i === 1) label = 'Tomorrow';
    else label = `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}`;

    days.push({
      key: d.toISOString().split('T')[0],
      label,
      dateStr: `${d.getDate()} ${monthNames[d.getMonth()]}`,
      dayName: dayNames[d.getDay()],
    });
  }
  return days;
};

// Available realistic slot windows for Home Services
const SCHEDULE_TIME_SLOTS = [
  { id: 'morning_1', time: '09:00 AM - 11:00 AM', label: 'Morning Slot' },
  { id: 'morning_2', time: '11:00 AM - 01:00 PM', label: 'Mid-Day Slot' },
  { id: 'afternoon_1', time: '02:00 PM - 04:00 PM', label: 'Afternoon Slot' },
  { id: 'evening_1', time: '05:00 PM - 07:00 PM', label: 'Evening Prime' },
  { id: 'evening_2', time: '07:00 PM - 09:00 PM', label: 'Night Slot' },
];

export const CartDrawerModal: React.FC<CartDrawerModalProps> = ({ onProceedToBooking }) => {
  const {
    items,
    itemCount,
    fees,
    isCartDrawerOpen,
    closeCartDrawer,
    addItem,
    removeItem,
    clearCart,
  } = useCart();
  const { activeLocation, openSelectLocation } = useLocation();
  const { user, profile } = useAuth();

  const [bookingMode, setBookingMode] = useState<'EXPRESS' | 'SCHEDULED'>('EXPRESS');
  const availableDays = useMemo(() => getAvailableBookingDays(), []);
  const [selectedDayKey, setSelectedDayKey] = useState<string>(availableDays[0].key);
  const [selectedSlotId, setSelectedSlotId] = useState<string>(SCHEDULE_TIME_SLOTS[0].id);
  const [isSuccessBooked, setIsSuccessBooked] = useState<boolean>(false);

  const itemList = Object.values(items);

  // Customer Contact Fallback Info
  const customerName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Verified Customer'
    : 'Verified Customer';
  const customerPhone = user?.phone || '+91 98765 43210';

  const selectedDayObj = availableDays.find((d) => d.key === selectedDayKey) || availableDays[0];
  const selectedSlotObj = SCHEDULE_TIME_SLOTS.find((s) => s.id === selectedSlotId) || SCHEDULE_TIME_SLOTS[0];

  const handleCheckout = () => {
    setIsSuccessBooked(true);
    setTimeout(() => {
      setIsSuccessBooked(false);
      clearCart();
      closeCartDrawer();
      onProceedToBooking?.({
        items: itemList,
        fees,
        bookingMode,
        scheduleDate: bookingMode === 'SCHEDULED' ? selectedDayObj.label : 'Instant Dispatch',
        scheduleSlot: bookingMode === 'SCHEDULED' ? selectedSlotObj.time : 'Express 20-Min Slot',
        location: activeLocation,
        customer: { name: customerName, phone: customerPhone },
      });
    }, 1800);
  };

  return (
    <Modal
      visible={isCartDrawerOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={closeCartDrawer}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.dismissOverlay} activeOpacity={1} onPress={closeCartDrawer} />

        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Review Booking</Text>
              <Text style={styles.headerSubtitle}>
                {itemCount} {itemCount === 1 ? 'service' : 'services'} • Serventica Certified
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={closeCartDrawer} activeOpacity={0.7}>
              <X size={17} color="#475569" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          {isSuccessBooked ? (
            <View style={styles.successState}>
              <View style={styles.successIconCircle}>
                <CheckCircle2 size={44} color="#10B981" strokeWidth={2.2} />
              </View>
              <Text style={styles.successTitle}>Booking Confirmed!</Text>
              <Text style={styles.successDesc}>
                {bookingMode === 'EXPRESS'
                  ? 'Your verified professional is dispatched and arriving in ~20 mins.'
                  : `Your appointment is scheduled for ${selectedDayObj.label} (${selectedSlotObj.time}).`}
              </Text>
            </View>
          ) : (
            <>
              <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                {/* 1. Address & Contact Pill Bar */}
                <View style={styles.contactBar}>
                  <View style={styles.contactItem}>
                    <MapPin size={14} color="#1E242B" strokeWidth={2.2} />
                    <View style={styles.contactTextCol}>
                      <Text style={styles.contactLabel}>Service Location</Text>
                      <Text style={styles.contactValue} numberOfLines={1}>
                        {activeLocation.shortAddress || activeLocation.city || 'Your selected address'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => { closeCartDrawer(); openSelectLocation(); }}>
                      <Text style={styles.changeLink}>Change</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.contactDivider} />

                  <View style={styles.contactItem}>
                    <Phone size={13} color="#1E242B" strokeWidth={2.2} />
                    <View style={styles.contactTextCol}>
                      <Text style={styles.contactLabel}>Booking For</Text>
                      <Text style={styles.contactValue} numberOfLines={1}>
                        {customerName} • {customerPhone}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 2. Selected Services with Visual Images */}
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionLabel}>SELECTED SERVICES</Text>
                    <TouchableOpacity onPress={clearCart}>
                      <Text style={styles.clearText}>Clear all</Text>
                    </TouchableOpacity>
                  </View>

                  {itemList.map((item, index) => {
                    const imgKey = item.imageUrl || '';
                    const isRegistry = Boolean(imgKey && AssetRegistry[imgKey]);
                    const imgSource = isRegistry
                      ? AssetRegistry[imgKey]
                      : imgKey.startsWith('http')
                      ? { uri: imgKey }
                      : null;

                    return (
                      <View key={item.serviceId}>
                        <View style={styles.serviceItemCard}>
                          {/* Service Image */}
                          <View style={styles.itemImageWrapper}>
                            {imgSource ? (
                              <Image source={imgSource} style={styles.itemThumb} resizeMode="contain" />
                            ) : (
                              <View style={styles.itemFallbackThumb}>
                                <Sparkles size={16} color="#94A3B8" />
                              </View>
                            )}
                          </View>

                          {/* Service Details */}
                          <View style={styles.itemDetailsCol}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemPriceMeta}>
                              ₹{item.basePrice} <Text style={styles.itemDurationMeta}>• {item.durationMinutes} mins</Text>
                            </Text>
                          </View>

                          {/* Stepper Buttons */}
                          <View style={styles.stepperPill}>
                            <TouchableOpacity
                              style={styles.stepperActionBtn}
                              onPress={() => removeItem(item.serviceId)}
                              activeOpacity={0.7}
                            >
                              <Minus size={12} color="#1E242B" strokeWidth={2.6} />
                            </TouchableOpacity>
                            <Text style={styles.stepperValue}>{item.quantity}</Text>
                            <TouchableOpacity
                              style={styles.stepperActionBtn}
                              onPress={() => addItem(item as any)}
                              activeOpacity={0.7}
                            >
                              <Plus size={12} color="#1E242B" strokeWidth={2.6} />
                            </TouchableOpacity>
                          </View>
                        </View>
                        {index < itemList.length - 1 && <View style={styles.itemDivider} />}
                      </View>
                    );
                  })}
                </View>

                {/* 3. Slot Type Switcher: Express vs Schedule */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionLabel}>BOOKING TIME & MODE</Text>
                  <View style={styles.modeToggleRow}>
                    <TouchableOpacity
                      style={[
                        styles.modeTab,
                        bookingMode === 'EXPRESS' && styles.modeTabActive,
                      ]}
                      onPress={() => setBookingMode('EXPRESS')}
                      activeOpacity={0.8}
                    >
                      <Zap
                        size={15}
                        color={bookingMode === 'EXPRESS' ? '#1E242B' : '#64748B'}
                        fill={bookingMode === 'EXPRESS' ? '#FFCC00' : 'none'}
                      />
                      <Text
                        style={[
                          styles.modeTabText,
                          bookingMode === 'EXPRESS' && styles.modeTabTextActive,
                        ]}
                      >
                        Express (20m)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.modeTab,
                        bookingMode === 'SCHEDULED' && styles.modeTabActive,
                      ]}
                      onPress={() => setBookingMode('SCHEDULED')}
                      activeOpacity={0.8}
                    >
                      <Calendar
                        size={15}
                        color={bookingMode === 'SCHEDULED' ? '#1E242B' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.modeTabText,
                          bookingMode === 'SCHEDULED' && styles.modeTabTextActive,
                        ]}
                      >
                        Schedule Slot
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Dynamic Scheduler Options (when Scheduled mode is active) */}
                  {bookingMode === 'SCHEDULED' && (
                    <View style={styles.scheduleOptionsCard}>
                      <Text style={styles.subOptionHeading}>1. SELECT DAY</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.daysScrollList}
                      >
                        {availableDays.map((d) => {
                          const isSelected = selectedDayKey === d.key;
                          return (
                            <TouchableOpacity
                              key={d.key}
                              style={[
                                styles.dayPillBtn,
                                isSelected && styles.dayPillBtnActive,
                              ]}
                              onPress={() => setSelectedDayKey(d.key)}
                              activeOpacity={0.75}
                            >
                              <Text style={[styles.dayPillDay, isSelected && styles.dayPillTextActive]}>
                                {d.label === 'Today' || d.label === 'Tomorrow' ? d.label : d.dayName}
                              </Text>
                              <Text style={[styles.dayPillDate, isSelected && styles.dayPillTextActive]}>
                                {d.dateStr}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>

                      <Text style={[styles.subOptionHeading, { marginTop: 14 }]}>2. SELECT TIME SLOT</Text>
                      <View style={styles.slotsGrid}>
                        {SCHEDULE_TIME_SLOTS.map((slot) => {
                          const isSelected = selectedSlotId === slot.id;
                          return (
                            <TouchableOpacity
                              key={slot.id}
                              style={[
                                styles.slotChipBtn,
                                isSelected && styles.slotChipBtnActive,
                              ]}
                              onPress={() => setSelectedSlotId(slot.id)}
                              activeOpacity={0.75}
                            >
                              <Clock size={12} color={isSelected ? '#1E242B' : '#64748B'} />
                              <Text
                                style={[
                                  styles.slotChipText,
                                  isSelected && styles.slotChipTextActive,
                                ]}
                              >
                                {slot.time}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>

                {/* 4. Dotted Rate List & Bill Summary */}
                <View style={styles.billContainer}>
                  <Text style={styles.billHeading}>Bill Summary</Text>

                  {/* Item Total */}
                  <View style={styles.dottedBillRow}>
                    <Text style={styles.billLabel}>Item Total</Text>
                    <View style={styles.dotFiller} />
                    <Text style={styles.billValue}>₹{fees.itemTotal}</Text>
                  </View>

                  {/* Convenience Fee */}
                  <View style={styles.dottedBillRow}>
                    <Text style={styles.billLabel}>Convenience Fee</Text>
                    <View style={styles.dotFiller} />
                    <Text style={styles.billValue}>₹{fees.convenienceFee}</Text>
                  </View>

                  {/* Partner Safety */}
                  <View style={styles.dottedBillRow}>
                    <Text style={styles.billLabel}>Partner Safety & Insurance</Text>
                    <View style={styles.dotFiller} />
                    <Text style={styles.billValue}>₹{fees.partnerSafetyFee}</Text>
                  </View>

                  {/* Promo Discount if any */}
                  {fees.discountAmount > 0 ? (
                    <View style={styles.dottedBillRow}>
                      <Text style={[styles.billLabel, styles.discountGreen]}>Special Promotion</Text>
                      <View style={styles.dotFiller} />
                      <Text style={[styles.billValue, styles.discountGreen]}>-₹{fees.discountAmount}</Text>
                    </View>
                  ) : null}

                  <View style={styles.solidDivider} />

                  {/* To Pay */}
                  <View style={styles.toPayRow}>
                    <Text style={styles.toPayLabel}>To Pay</Text>
                    <Text style={styles.toPayValue}>₹{fees.finalPayable}</Text>
                  </View>
                </View>

                {/* Guarantee Banner */}
                <View style={styles.trustBanner}>
                  <ShieldCheck size={16} color="#059669" strokeWidth={2.2} />
                  <Text style={styles.trustBannerText}>
                    30-Day Service Guarantee • Serventica Verified Background Checked Pros
                  </Text>
                </View>
              </ScrollView>

              {/* Bottom Sticky Checkout Action */}
              <View style={styles.footerRow}>
                <View style={styles.footerPayCol}>
                  <Text style={styles.footerAmountLabel}>TOTAL PAYABLE</Text>
                  <Text style={styles.footerAmountValue}>₹{fees.finalPayable}</Text>
                </View>

                <AnimatedTouchable
                  style={styles.proceedButton}
                  onPress={handleCheckout}
                >
                  <Text style={styles.proceedButtonText}>
                    {bookingMode === 'EXPRESS' ? 'Book Express (20m)' : 'Confirm Booking'}
                  </Text>
                  <ArrowRight size={15} color="#1E242B" strokeWidth={2.8} />
                </AnimatedTouchable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'android' ? 18 : 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '800',
    color: '#1E242B',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: ServenticaTokens.fonts.Regular,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollList: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  contactBar: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactTextCol: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 10,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  contactValue: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '600',
    color: '#1E242B',
    marginTop: 1,
  },
  changeLink: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '700',
    color: '#2563EB',
  },
  contactDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  sectionBlock: {
    marginBottom: 18,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.6,
  },
  clearText: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#EF4444',
    fontWeight: '600',
  },
  serviceItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemImageWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemThumb: {
    width: '85%',
    height: '85%',
  },
  itemFallbackThumb: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetailsCol: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '600',
    color: '#1E242B',
    lineHeight: 18,
  },
  itemPriceMeta: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '700',
    color: '#1E242B',
    marginTop: 2,
  },
  itemDurationMeta: {
    fontFamily: ServenticaTokens.fonts.Regular,
    fontWeight: '400',
    color: '#64748B',
  },
  stepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 7,
    paddingVertical: 4,
    gap: 9,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  stepperActionBtn: {
    padding: 2,
  },
  stepperValue: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '700',
    color: '#1E242B',
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 11,
    gap: 7,
  },
  modeTabActive: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FFCC00',
  },
  modeTabText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '600',
    color: '#475569',
  },
  modeTabTextActive: {
    color: '#1E242B',
    fontWeight: '700',
  },
  scheduleOptionsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subOptionHeading: {
    fontSize: 10,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  daysScrollList: {
    gap: 8,
    paddingVertical: 2,
  },
  dayPillBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: 'center',
    minWidth: 78,
  },
  dayPillBtnActive: {
    backgroundColor: '#1E242B',
    borderColor: '#1E242B',
  },
  dayPillDay: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '700',
    color: '#1E242B',
  },
  dayPillDate: {
    fontSize: 10,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
    marginTop: 2,
  },
  dayPillTextActive: {
    color: '#FFFFFF',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 11,
    paddingVertical: 8,
    gap: 5,
  },
  slotChipBtnActive: {
    backgroundColor: '#FFCC00',
    borderColor: '#FFCC00',
  },
  slotChipText: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '600',
    color: '#475569',
  },
  slotChipTextActive: {
    color: '#1E242B',
    fontWeight: '700',
  },
  billContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  billHeading: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '700',
    color: '#1E242B',
    marginBottom: 12,
  },
  dottedBillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  billLabel: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#475569',
  },
  dotFiller: {
    flex: 1,
    marginHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    borderStyle: 'dashed',
    height: 1,
  },
  billValue: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '600',
    color: '#1E242B',
  },
  discountGreen: {
    color: '#059669',
    fontWeight: '700',
  },
  solidDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  toPayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  toPayLabel: {
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '800',
    color: '#1E242B',
  },
  toPayValue: {
    fontSize: 16.5,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '800',
    color: '#1E242B',
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 11,
    gap: 8,
    marginBottom: 20,
  },
  trustBannerText: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#047857',
    flexShrink: 1,
    lineHeight: 15,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerPayCol: {
    justifyContent: 'center',
  },
  footerAmountLabel: {
    fontSize: 9.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  footerAmountValue: {
    fontSize: 18,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '800',
    color: '#1E242B',
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFCC00',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    gap: 7,
    ...Platform.select({
      ios: {
        shadowColor: '#1E242B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  proceedButtonText: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '700',
    color: '#1E242B',
  },
  successState: {
    alignItems: 'center',
    paddingVertical: 44,
    paddingHorizontal: 24,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 20,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '800',
    color: '#1E242B',
    marginBottom: 6,
  },
  successDesc: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
  },
});
