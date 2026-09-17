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
  Sparkles,
  Sun,
  Sunset,
  Moon,
  CreditCard,
  Wallet,
  Banknote,
  ChevronRight,
  Check,
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

// Payment Methods list
export type PaymentMethodType = 'UPI' | 'CARDS' | 'COD' | 'WALLET';

interface PaymentOption {
  id: PaymentMethodType;
  title: string;
  subtitle: string;
  badge?: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  { id: 'UPI', title: 'UPI / Google Pay / PhonePe', subtitle: 'Fastest 1-step verification', badge: 'FAST' },
  { id: 'CARDS', title: 'Credit / Debit Card', subtitle: 'Visa, MasterCard, RuPay' },
  { id: 'WALLET', title: 'Serventica Balance & Wallets', subtitle: 'Paytm, Amazon Pay' },
  { id: 'COD', title: 'Pay After Service (Cash / Online)', subtitle: 'Pay directly to pro when job done' },
];

// Hourly duration options ONLY for ondemand / househelp / massage / gardening
const HOURLY_SERVICE_DURATIONS = [
  { id: '0.5hr', durationLabel: '0.5 hr', priceMultiplier: 1 },
  { id: '1hr', durationLabel: '1 hr', priceMultiplier: 1.8 },
  { id: '1.5hr', durationLabel: '1.5 hr', priceMultiplier: 2.5 },
  { id: '2hr', durationLabel: '2 hr', priceMultiplier: 3.2 },
];

// Check if a category/service is hourly (ondemand, house help, massage/spa, gardening)
const isHourlyOnDemandService = (categorySlug?: string, serviceName?: string) => {
  const checkStr = `${categorySlug || ''} ${serviceName || ''}`.toLowerCase();
  return (
    checkStr.includes('massage') ||
    checkStr.includes('spa') ||
    checkStr.includes('gardener') ||
    checkStr.includes('gardening') ||
    checkStr.includes('maid') ||
    checkStr.includes('househelp') ||
    checkStr.includes('cook') ||
    checkStr.includes('helper') ||
    checkStr.includes('ondemand')
  );
};

// Generate next 6 days dynamically from today
const getAvailableBookingDays = () => {
  const days: { key: string; dayLabel: string; subLabel: string; dateNumber: number; monthName: string }[] = [];
  const today = new Date();
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < 6; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    let subLabel = dayNames[d.getDay()];
    if (i === 0) subLabel = 'TODAY';
    else if (i === 1) subLabel = 'TOM';

    days.push({
      key: d.toISOString().split('T')[0],
      dayLabel: `${d.getDate()} ${monthNames[d.getMonth()]}`,
      subLabel,
      dateNumber: d.getDate(),
      monthName: monthNames[d.getMonth()],
    });
  }
  return days;
};

// Time of Day periods
type TimePeriod = 'MORNING' | 'AFTERNOON' | 'EVENING';

const PERIOD_SLOTS: Record<TimePeriod, string[]> = {
  MORNING: ['07:30 AM', '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'],
  AFTERNOON: ['12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM'],
  EVENING: ['04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM'],
};

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
  const [selectedDurationId, setSelectedDurationId] = useState<string>('1hr');
  const availableDays = useMemo(() => getAvailableBookingDays(), []);
  const [selectedDayKey, setSelectedDayKey] = useState<string>(availableDays[0].key);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('MORNING');
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>('09:00 AM');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodType>('UPI');
  const [isPaymentPickerOpen, setIsPaymentPickerOpen] = useState<boolean>(false);
  const [isSuccessBooked, setIsSuccessBooked] = useState<boolean>(false);

  const itemList = Object.values(items);

  // Determine if ANY item in cart requires hourly duration selection
  const hasHourlyService = useMemo(() => {
    return itemList.some((it) => isHourlyOnDemandService(it.categoryId || it.categoryName, it.name));
  }, [itemList]);

  // Customer Contact Info
  const customerName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Verified Customer'
    : 'Verified Customer';
  const customerPhone = user?.phone || '+91 98765 43210';

  const selectedDayObj = availableDays.find((d) => d.key === selectedDayKey) || availableDays[0];
  const activePaymentOption = PAYMENT_OPTIONS.find((p) => p.id === selectedPaymentMethod) || PAYMENT_OPTIONS[0];

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
        paymentMethod: selectedPaymentMethod,
        duration: hasHourlyService ? selectedDurationId : undefined,
        scheduleDate: bookingMode === 'SCHEDULED' ? selectedDayObj.dayLabel : 'Instant Dispatch',
        scheduleSlot: bookingMode === 'SCHEDULED' ? `${selectedPeriod} (${selectedSlotTime})` : 'Express 20-Min Slot',
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
                  : `Your appointment is scheduled for ${selectedDayObj.dayLabel} at ${selectedSlotTime}.`}
              </Text>
              <Text style={styles.successPaymentMeta}>
                Payment Mode: {activePaymentOption.title}
              </Text>
            </View>
          ) : (
            <>
              <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                {/* 1. Address & Contact Pill Bar (Glass-like Soft Light Yellow) */}
                <View style={styles.contactBar}>
                  <View style={styles.contactItem}>
                    <MapPin size={14} color="#1E242B" strokeWidth={2.2} />
                    <View style={styles.contactTextCol}>
                      <Text style={styles.contactLabel}>SERVICE LOCATION</Text>
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
                      <Text style={styles.contactLabel}>BOOKING FOR</Text>
                      <Text style={styles.contactValue} numberOfLines={1}>
                        {customerName} • {customerPhone}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 2. Selected Services List */}
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
                                <Sparkles size={16} color="#FFCC00" />
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

                          {/* Stepper Buttons in Light Yellow Pill (No shadows/outlines) */}
                          <View style={styles.stepperPill}>
                            <TouchableOpacity
                              style={styles.stepperActionBtn}
                              onPress={() => removeItem(item.serviceId)}
                              activeOpacity={0.7}
                            >
                              <Minus size={13} color="#1E242B" strokeWidth={2.8} />
                            </TouchableOpacity>
                            <Text style={styles.stepperValue}>{item.quantity}</Text>
                            <TouchableOpacity
                              style={styles.stepperActionBtn}
                              onPress={() => addItem(item as any)}
                              activeOpacity={0.7}
                            >
                              <Plus size={13} color="#1E242B" strokeWidth={2.8} />
                            </TouchableOpacity>
                          </View>
                        </View>
                        {index < itemList.length - 1 && <View style={styles.itemDivider} />}
                      </View>
                    );
                  })}
                </View>

                {/* 3. Booking Mode Selector: Express vs Schedule */}
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
                        color="#1E242B"
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

                  {/* Dynamic Scheduler Options (When Scheduled mode is active) */}
                  {bookingMode === 'SCHEDULED' && (
                    <View style={styles.schedulerContainer}>
                      {/* 3.1 Service Duration Row ONLY for ondemand/hourly tasks */}
                      {hasHourlyService && (
                        <>
                          <Text style={styles.subSectionTitle}>Service duration</Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalOptionsRow}
                          >
                            {HOURLY_SERVICE_DURATIONS.map((dur) => {
                              const isSelected = selectedDurationId === dur.id;
                              const calculatedPrice = Math.round((fees.itemTotal || 499) * (dur.priceMultiplier / 1.8));
                              const strikePrice = Math.round(calculatedPrice * 1.6);
                              return (
                                <TouchableOpacity
                                  key={dur.id}
                                  style={[
                                    styles.durationCard,
                                    isSelected && styles.durationCardActive,
                                  ]}
                                  onPress={() => setSelectedDurationId(dur.id)}
                                  activeOpacity={0.75}
                                >
                                  <Text style={[styles.durationTitle, isSelected && styles.durationTitleActive]}>
                                    {dur.durationLabel}
                                  </Text>
                                  <View style={styles.durationPriceRow}>
                                    <Text style={[styles.durationPriceText, isSelected && styles.durationPriceTextActive]}>
                                      ₹{calculatedPrice}
                                    </Text>
                                    <Text style={styles.durationStrikeText}>₹{strikePrice}</Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </>
                      )}

                      {/* 3.2 Select Date Row */}
                      <Text style={[styles.subSectionTitle, hasHourlyService && { marginTop: 16 }]}>Select date</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalOptionsRow}
                      >
                        {availableDays.map((d) => {
                          const isSelected = selectedDayKey === d.key;
                          return (
                            <TouchableOpacity
                              key={d.key}
                              style={[
                                styles.dateCard,
                                isSelected && styles.dateCardActive,
                              ]}
                              onPress={() => setSelectedDayKey(d.key)}
                              activeOpacity={0.75}
                            >
                              <Text style={[styles.dateCardDay, isSelected && styles.dateCardDayActive]}>
                                {d.dayLabel}
                              </Text>
                              <Text style={[styles.dateCardSub, isSelected && styles.dateCardSubActive]}>
                                {d.subLabel}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>

                      {/* 3.3 Select Time of Day (Morning / Afternoon / Evening) */}
                      <Text style={[styles.subSectionTitle, { marginTop: 16 }]}>Select time</Text>
                      <View style={styles.periodPillBar}>
                        <TouchableOpacity
                          style={[
                            styles.periodSegment,
                            selectedPeriod === 'MORNING' && styles.periodSegmentActive,
                          ]}
                          onPress={() => {
                            setSelectedPeriod('MORNING');
                            setSelectedSlotTime(PERIOD_SLOTS.MORNING[0]);
                          }}
                          activeOpacity={0.8}
                        >
                          <Sun size={13} color={selectedPeriod === 'MORNING' ? '#1E242B' : '#475569'} />
                          <Text style={[styles.periodText, selectedPeriod === 'MORNING' && styles.periodTextActive]}>
                            Morning
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.periodSegment,
                            selectedPeriod === 'AFTERNOON' && styles.periodSegmentActive,
                          ]}
                          onPress={() => {
                            setSelectedPeriod('AFTERNOON');
                            setSelectedSlotTime(PERIOD_SLOTS.AFTERNOON[0]);
                          }}
                          activeOpacity={0.8}
                        >
                          <Sunset size={13} color={selectedPeriod === 'AFTERNOON' ? '#1E242B' : '#475569'} />
                          <Text style={[styles.periodText, selectedPeriod === 'AFTERNOON' && styles.periodTextActive]}>
                            Afternoon
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.periodSegment,
                            selectedPeriod === 'EVENING' && styles.periodSegmentActive,
                          ]}
                          onPress={() => {
                            setSelectedPeriod('EVENING');
                            setSelectedSlotTime(PERIOD_SLOTS.EVENING[0]);
                          }}
                          activeOpacity={0.8}
                        >
                          <Moon size={13} color={selectedPeriod === 'EVENING' ? '#1E242B' : '#475569'} />
                          <Text style={[styles.periodText, selectedPeriod === 'EVENING' && styles.periodTextActive]}>
                            Evening
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* 3.4 Standard Slots Card */}
                      <View style={styles.slotsCardBox}>
                        <Text style={styles.slotsBoxHeading}>Standard slots</Text>
                        <View style={styles.slotsGridContainer}>
                          {PERIOD_SLOTS[selectedPeriod].map((slot) => {
                            const isSelected = selectedSlotTime === slot;
                            return (
                              <TouchableOpacity
                                key={slot}
                                style={[
                                  styles.slotChipItem,
                                  isSelected && styles.slotChipItemActive,
                                ]}
                                onPress={() => setSelectedSlotTime(slot)}
                                activeOpacity={0.75}
                              >
                                <Text
                                  style={[
                                    styles.slotChipLabel,
                                    isSelected && styles.slotChipLabelActive,
                                  ]}
                                >
                                  {slot}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      {/* Note */}
                      <Text style={styles.schedulerNote}>
                        <Text style={styles.schedulerNoteBold}>NOTE: </Text>
                        Professionals arrive within 30 minutes of the selected slot.
                      </Text>
                    </View>
                  )}
                </View>

                {/* 4. Payment Method Selector Glass Card */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
                  <TouchableOpacity
                    style={styles.paymentMethodCard}
                    activeOpacity={0.85}
                    onPress={() => setIsPaymentPickerOpen(!isPaymentPickerOpen)}
                  >
                    <View style={styles.paymentMethodIconWrap}>
                      {selectedPaymentMethod === 'UPI' && <Zap size={16} color="#1E242B" fill="#FFCC00" />}
                      {selectedPaymentMethod === 'CARDS' && <CreditCard size={16} color="#1E242B" />}
                      {selectedPaymentMethod === 'WALLET' && <Wallet size={16} color="#1E242B" />}
                      {selectedPaymentMethod === 'COD' && <Banknote size={16} color="#1E242B" />}
                    </View>
                    <View style={styles.paymentMethodTextCol}>
                      <View style={styles.paymentMethodTitleRow}>
                        <Text style={styles.paymentMethodTitle}>{activePaymentOption.title}</Text>
                        {activePaymentOption.badge && (
                          <View style={styles.paymentBadge}>
                            <Text style={styles.paymentBadgeText}>{activePaymentOption.badge}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.paymentMethodSubtitle}>{activePaymentOption.subtitle}</Text>
                    </View>
                    <Text style={styles.changeLink}>Change</Text>
                  </TouchableOpacity>

                  {/* Expandable Payment Methods Picker */}
                  {isPaymentPickerOpen && (
                    <View style={styles.paymentOptionsList}>
                      {PAYMENT_OPTIONS.map((opt) => {
                        const isSelected = selectedPaymentMethod === opt.id;
                        return (
                          <TouchableOpacity
                            key={opt.id}
                            style={[
                              styles.paymentOptionItem,
                              isSelected && styles.paymentOptionItemActive,
                            ]}
                            onPress={() => {
                              setSelectedPaymentMethod(opt.id);
                              setIsPaymentPickerOpen(false);
                            }}
                            activeOpacity={0.75}
                          >
                            <View style={styles.paymentOptionLeft}>
                              <View style={[styles.paymentRadio, isSelected && styles.paymentRadioActive]}>
                                {isSelected && <View style={styles.paymentRadioInner} />}
                              </View>
                              <View>
                                <Text style={[styles.paymentOptionName, isSelected && styles.paymentOptionNameActive]}>
                                  {opt.title}
                                </Text>
                                <Text style={styles.paymentOptionDesc}>{opt.subtitle}</Text>
                              </View>
                            </View>
                            {isSelected && <Check size={16} color="#1E242B" strokeWidth={2.8} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* 5. Dotted Rate List & Bill Summary */}
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

              {/* Bottom Sticky Checkout Action (Solid Vibrant Yellow with Soft Shadow matching reference) */}
              <View style={styles.footerRow}>
                <View style={styles.footerPayCol}>
                  <Text style={styles.footerAmountLabel}>TOTAL PAYABLE</Text>
                  <Text style={styles.footerAmountValue}>₹{fees.finalPayable}</Text>
                </View>

                <AnimatedTouchable
                  style={styles.payButton}
                  onPress={handleCheckout}
                >
                  <Text style={styles.payButtonText}>
                    {bookingMode === 'EXPRESS' ? `Pay ₹${fees.finalPayable}` : `Pay ₹${fees.finalPayable}`}
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
    maxHeight: '92%',
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
    fontWeight: '700',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollList: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  contactBar: {
    backgroundColor: '#FFFDF0', // Clean soft glass-like light yellow
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    color: '#B45309',
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
    color: '#D97706',
  },
  contactDivider: {
    height: 1,
    backgroundColor: 'rgba(253, 230, 138, 0.45)',
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
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
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
    backgroundColor: '#FFFDF0', // Clean soft light yellow pill
    borderRadius: 18,
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 9,
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
    paddingVertical: 11,
    gap: 7,
  },
  modeTabActive: {
    backgroundColor: '#FFFDF0', // Clean soft glass light yellow
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
  schedulerContainer: {
    marginTop: 14,
  },
  subSectionTitle: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '700',
    color: '#1E242B',
    marginBottom: 8,
  },
  horizontalOptionsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  durationCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minWidth: 78,
    alignItems: 'center',
  },
  durationCardActive: {
    backgroundColor: '#FFFDF0',
  },
  durationTitle: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '700',
    color: '#1E242B',
  },
  durationTitleActive: {
    color: '#B45309',
  },
  durationPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  durationPriceText: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '700',
    color: '#1E242B',
  },
  durationPriceTextActive: {
    color: '#B45309',
  },
  durationStrikeText: {
    fontSize: 9.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  dateCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  dateCardActive: {
    backgroundColor: '#FFFDF0',
  },
  dateCardDay: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '700',
    color: '#1E242B',
  },
  dateCardDayActive: {
    color: '#1E242B',
  },
  dateCardSub: {
    fontSize: 9.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  dateCardSubActive: {
    color: '#B45309',
  },
  periodPillBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    padding: 3,
    marginBottom: 12,
  },
  periodSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 18,
    gap: 5,
  },
  periodSegmentActive: {
    backgroundColor: '#FFCC00', // Solid light yellow
  },
  periodText: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '600',
    color: '#475569',
  },
  periodTextActive: {
    color: '#1E242B',
    fontWeight: '700',
  },
  slotsCardBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 12,
  },
  slotsBoxHeading: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '700',
    color: '#1E242B',
    marginBottom: 10,
  },
  slotsGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotChipItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: '22%',
    alignItems: 'center',
  },
  slotChipItemActive: {
    backgroundColor: '#FFFDF0',
  },
  slotChipLabel: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '600',
    color: '#1E242B',
  },
  slotChipLabelActive: {
    color: '#B45309',
    fontWeight: '700',
  },
  schedulerNote: {
    fontSize: 10,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  schedulerNoteBold: {
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '700',
    color: '#475569',
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF0', // Glass-like soft light yellow
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 6,
    gap: 12,
  },
  paymentMethodIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 204, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodTextCol: {
    flex: 1,
  },
  paymentMethodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentMethodTitle: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '700',
    color: '#1E242B',
  },
  paymentBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  paymentBadgeText: {
    fontSize: 8.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  paymentMethodSubtitle: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
    marginTop: 1,
  },
  paymentOptionsList: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  paymentOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  paymentOptionItemActive: {
    backgroundColor: '#FFFDF0',
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  paymentRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentRadioActive: {
    borderColor: '#FFCC00',
  },
  paymentRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFCC00',
  },
  paymentOptionName: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '600',
    color: '#1E242B',
  },
  paymentOptionNameActive: {
    color: '#B45309',
    fontWeight: '700',
  },
  paymentOptionDesc: {
    fontSize: 10,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
    marginTop: 1,
  },
  billContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    padding: 16,
    marginTop: 14,
    marginBottom: 14,
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
    color: '#065F46',
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
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFCC00', // Solid light yellow CTA matching reference
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#B45309',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  payButtonText: {
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '800',
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
  successPaymentMeta: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#059669',
    marginTop: 10,
    fontWeight: '700',
  },
});
