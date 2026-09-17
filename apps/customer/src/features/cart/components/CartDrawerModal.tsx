import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Plus,
  Minus,
  ShieldCheck,
  Zap,
  Calendar,
  ChevronUp,
  CheckCircle2,
  MapPin,
  Phone,
  Sparkles,
  Sun,
  Sunset,
  Moon,
  Check,
  Play,
  ArrowRight,
} from 'lucide-react-native';
import { useCart } from '../context/CartContext';
import { useLocation } from '../../../context/LocationContext';
import { useAuth } from '../../../context/AuthContext';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { AssetRegistry } from '../../../services/home.service';
import { PaymentMethodIcon, PaymentBrandType } from './PaymentMethodIcon';
import { paymentService, PaymentTransactionResult } from '../../../services/payment.service';

interface CartDrawerModalProps {
  onProceedToBooking?: (bookingData: any) => void;
}

export type PaymentMethodKey = 'GOOGLE_PAY' | 'PHONEPE' | 'PAYTM' | 'CARDS' | 'WALLET' | 'COD';

interface PaymentOption {
  id: PaymentMethodKey;
  brand: PaymentBrandType;
  title: string;
  subtitle: string;
  badge?: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  { id: 'GOOGLE_PAY', brand: 'GOOGLE_PAY', title: 'Google Pay UPI', subtitle: 'Fastest 1-step verification', badge: 'FAST' },
  { id: 'PHONEPE', brand: 'PHONEPE', title: 'PhonePe UPI', subtitle: 'Instant UPI payments', badge: 'POPULAR' },
  { id: 'PAYTM', brand: 'PAYTM', title: 'Paytm UPI & Wallet', subtitle: 'Fast checkout with Paytm' },
  { id: 'CARDS', brand: 'CARDS', title: 'Credit / Debit Card', subtitle: 'Visa, MasterCard, RuPay' },
  { id: 'WALLET', brand: 'WALLET', title: 'Serventica Wallet', subtitle: 'Instant 1-click payment' },
  { id: 'COD', brand: 'COD', title: 'Pay After Service', subtitle: 'Cash or QR when pro arrives' },
];

// Hourly duration options ONLY for ondemand / househelp / massage / gardening
const HOURLY_SERVICE_DURATIONS = [
  { id: '0.5hr', durationLabel: '0.5 hr', priceMultiplier: 1 },
  { id: '1hr', durationLabel: '1 hr', priceMultiplier: 1.8 },
  { id: '1.5hr', durationLabel: '1.5 hr', priceMultiplier: 2.5 },
  { id: '2hr', durationLabel: '2 hr', priceMultiplier: 3.2 },
];

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
      key: `day_${i}`,
      dayLabel: `${d.getDate()} ${monthNames[d.getMonth()]}`,
      subLabel,
      dateNumber: d.getDate(),
      monthName: monthNames[d.getMonth()],
    });
  }
  return days;
};

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
  const [selectedPaymentKey, setSelectedPaymentKey] = useState<PaymentMethodKey>('GOOGLE_PAY');
  const [isPaymentPickerOpen, setIsPaymentPickerOpen] = useState<boolean>(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [transactionResult, setTransactionResult] = useState<PaymentTransactionResult | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  const itemList = Object.values(items);

  useEffect(() => {
    paymentService.getWalletBalance().then((bal) => setWalletBalance(bal));
  }, [isCartDrawerOpen]);

  const hasHourlyService = useMemo(() => {
    return itemList.some((it) => isHourlyOnDemandService(it.categoryId || it.categoryName, it.name));
  }, [itemList]);

  const customerName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Verified Customer'
    : 'Verified Customer';
  const customerPhone = user?.phone || '+91 98765 43210';

  const selectedDayObj = availableDays.find((d) => d.key === selectedDayKey) || availableDays[0];
  const activePaymentOption = PAYMENT_OPTIONS.find((p) => p.id === selectedPaymentKey) || PAYMENT_OPTIONS[0];

  const handleCheckout = async () => {
    if (itemList.length === 0 || isProcessingPayment) return;

    setIsProcessingPayment(true);

    try {
      const mappedMethod =
        selectedPaymentKey === 'CARDS'
          ? 'CARDS'
          : selectedPaymentKey === 'WALLET'
          ? 'WALLET'
          : selectedPaymentKey === 'COD'
          ? 'COD'
          : 'UPI';

      const res = await paymentService.processCheckout({
        customerId: user?.id,
        customerName,
        customerPhone,
        items: itemList.map((i) => ({
          serviceId: i.serviceId,
          name: i.name,
          slug: i.slug,
          basePrice: i.basePrice,
          quantity: i.quantity,
          durationMinutes: i.durationMinutes,
          imageUrl: i.imageUrl,
        })),
        fees,
        bookingMode,
        paymentMethod: mappedMethod,
        paymentBrand: activePaymentOption.title,
        scheduleDate: bookingMode === 'SCHEDULED' ? selectedDayObj.dayLabel : 'Today',
        scheduleSlot: bookingMode === 'SCHEDULED' ? `${selectedPeriod} (${selectedSlotTime})` : 'Express 20m Dispatch',
        location: {
          shortAddress: activeLocation.shortAddress,
          formattedAddress: activeLocation.formattedAddress,
          city: activeLocation.city,
        },
      });

      setTransactionResult(res);
      clearCart();

      // Notify parent app flow
      onProceedToBooking?.({
        bookingId: res.bookingId,
        bookingNumber: res.bookingNumber,
        transactionId: res.transactionId,
        paymentMethod: res.paymentMethod,
        amount: res.amount,
      });
    } catch (err) {
      console.warn('[CartDrawerModal] Checkout error:', err);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleDismissSuccess = () => {
    setTransactionResult(null);
    closeCartDrawer();
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

          {transactionResult ? (
            <View style={styles.successState}>
              <View style={styles.successIconCircle}>
                <CheckCircle2 size={44} color="#059669" strokeWidth={2.2} />
              </View>
              <Text style={styles.successTitle}>Booking Confirmed!</Text>
              <Text style={styles.bookingNumberBadge}>
                Booking ID: {transactionResult.bookingNumber}
              </Text>
              <Text style={styles.successDesc}>
                {bookingMode === 'EXPRESS'
                  ? 'Your verified pro is dispatched and arriving in ~20 minutes.'
                  : `Your appointment is confirmed for ${selectedDayObj.dayLabel} at ${selectedSlotTime}.`}
              </Text>

              <View style={styles.successReceiptCard}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Payment Mode</Text>
                  <Text style={styles.receiptValue}>{transactionResult.paymentMethod}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Amount Paid</Text>
                  <Text style={styles.receiptValueBold}>₹{transactionResult.amount}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Transaction Ref</Text>
                  <Text style={styles.receiptValue}>{transactionResult.transactionId}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.viewOrdersBtn}
                onPress={handleDismissSuccess}
                activeOpacity={0.85}
              >
                <Text style={styles.viewOrdersText}>Done • Return to Home</Text>
                <ArrowRight size={14} color="#FFFFFF" strokeWidth={2.6} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                {/* 1. Address & Contact Pill Bar (Minimalist Neutral) */}
                <View style={styles.contactBar}>
                  <View style={styles.contactItem}>
                    <MapPin size={14} color="#1E242B" strokeWidth={2.2} />
                    <View style={styles.contactTextCol}>
                      <Text style={styles.contactLabel}>SERVICE LOCATION</Text>
                      <Text style={styles.contactValue} numberOfLines={1}>
                        {activeLocation.shortAddress || activeLocation.city || 'Outer Circle, New Delhi'}
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
                                <Sparkles size={16} color="#64748B" />
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

                          {/* Stepper Buttons (Clean Neutral Pill) */}
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
                        color={bookingMode === 'EXPRESS' ? '#FFFFFF' : '#64748B'}
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
                        color={bookingMode === 'SCHEDULED' ? '#FFFFFF' : '#64748B'}
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

                  {/* Dynamic Scheduler Options */}
                  {bookingMode === 'SCHEDULED' && (
                    <View style={styles.schedulerContainer}>
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

                      {/* Select Date Row */}
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

                      {/* Select Time */}
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
                          <Sun size={13} color={selectedPeriod === 'MORNING' ? '#FFFFFF' : '#475569'} />
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
                          <Sunset size={13} color={selectedPeriod === 'AFTERNOON' ? '#FFFFFF' : '#475569'} />
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
                          <Moon size={13} color={selectedPeriod === 'EVENING' ? '#FFFFFF' : '#475569'} />
                          <Text style={[styles.periodText, selectedPeriod === 'EVENING' && styles.periodTextActive]}>
                            Evening
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Standard Slots */}
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

                      <Text style={styles.schedulerNote}>
                        <Text style={styles.schedulerNoteBold}>NOTE: </Text>
                        Professionals arrive within 30 minutes of the selected slot.
                      </Text>
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

              {/* 5. ZOMATO/BLINKIT REFERENCE BOTTOM BAR: Payment Method on Left + Exact Place Order Button on Right */}
              <View style={styles.footerStickyContainer}>
                {/* Top Balance strip */}
                <View style={styles.balanceStrip}>
                  <Text style={styles.balanceStripText}>
                    Serventica Wallet Balance: <Text style={styles.balanceStripBold}>₹{walletBalance}</Text> •{' '}
                    <TouchableOpacity
                      onPress={async () => {
                        const newBal = await paymentService.addWalletBalance(500);
                        setWalletBalance(newBal);
                      }}
                    >
                      <Text style={styles.addMoneyText}>+ Add ₹500</Text>
                    </TouchableOpacity>
                  </Text>
                </View>

                {/* Main Action Bar */}
                <View style={styles.footerMainRow}>
                  {/* Left Side: Authentic Branded Icon + PAY USING ▲ & Selected Payment Method */}
                  <TouchableOpacity
                    style={styles.payUsingTouchable}
                    activeOpacity={0.75}
                    onPress={() => setIsPaymentPickerOpen(true)}
                  >
                    <View style={styles.payUsingHeaderRow}>
                      <PaymentMethodIcon brand={activePaymentOption.brand} size={15} />
                      <Text style={styles.payUsingLabel}>PAY USING</Text>
                      <ChevronUp size={12} color="#64748B" strokeWidth={2.6} />
                    </View>
                    <Text style={styles.payUsingMethodName} numberOfLines={1}>
                      {activePaymentOption.title}
                    </Text>
                  </TouchableOpacity>

                  {/* Right Side: Exact Reference Place Order Button (Red/Coral Rounded Pill with Price on Left & Place Order on Right) */}
                  <TouchableOpacity
                    style={[styles.placeOrderButton, isProcessingPayment && { opacity: 0.75 }]}
                    onPress={handleCheckout}
                    disabled={isProcessingPayment}
                    activeOpacity={0.88}
                  >
                    {isProcessingPayment ? (
                      <View style={styles.processingRow}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.processingText}>Processing...</Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.buttonPriceCol}>
                          <Text style={styles.buttonPriceText}>₹{fees.finalPayable}</Text>
                          <Text style={styles.buttonTotalLabel}>TOTAL</Text>
                        </View>
                        <View style={styles.buttonActionRow}>
                          <Text style={styles.placeOrderText}>Place Order</Text>
                          <Play size={10} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Payment Methods Selection Bottom Sheet Modal */}
              <Modal
                visible={isPaymentPickerOpen}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsPaymentPickerOpen(false)}
              >
                <View style={styles.paymentModalOverlay}>
                  <TouchableOpacity
                    style={styles.paymentModalDismiss}
                    activeOpacity={1}
                    onPress={() => setIsPaymentPickerOpen(false)}
                  />
                  <View style={styles.paymentSheet}>
                    <View style={styles.paymentSheetHeader}>
                      <Text style={styles.paymentSheetTitle}>Select Payment Method</Text>
                      <TouchableOpacity
                        style={styles.sheetCloseBtn}
                        onPress={() => setIsPaymentPickerOpen(false)}
                      >
                        <X size={16} color="#64748B" strokeWidth={2.4} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.paymentOptionsList}>
                      {PAYMENT_OPTIONS.map((opt) => {
                        const isSelected = selectedPaymentKey === opt.id;
                        return (
                          <TouchableOpacity
                            key={opt.id}
                            style={[
                              styles.paymentOptionItem,
                              isSelected && styles.paymentOptionItemActive,
                            ]}
                            onPress={() => {
                              setSelectedPaymentKey(opt.id);
                              setIsPaymentPickerOpen(false);
                            }}
                            activeOpacity={0.75}
                          >
                            <View style={styles.paymentOptionLeft}>
                              <View style={[styles.paymentRadio, isSelected && styles.paymentRadioActive]}>
                                {isSelected && <View style={styles.paymentRadioInner} />}
                              </View>
                              <PaymentMethodIcon brand={opt.brand} size={28} />
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={[styles.paymentOptionName, isSelected && styles.paymentOptionNameActive]}>
                                    {opt.title}
                                  </Text>
                                  {opt.badge && (
                                    <View style={styles.paymentBadge}>
                                      <Text style={styles.paymentBadgeText}>{opt.badge}</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={styles.paymentOptionDesc}>{opt.subtitle}</Text>
                              </View>
                            </View>
                            {isSelected && <Check size={16} color="#E23744" strokeWidth={2.8} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </Modal>
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
    paddingBottom: Platform.OS === 'android' ? 14 : 28,
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
    fontFamily: ServenticaTokens.fonts.PoppinsBold,
    fontWeight: '700',
    color: '#1E242B',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: ServenticaTokens.fonts.SFProRegular,
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
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactValue: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '600',
    color: '#1E242B',
    marginTop: 1,
  },
  changeLink: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '700',
    color: '#E23744',
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
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.6,
  },
  clearText: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.SFProBold,
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
    fontFamily: ServenticaTokens.fonts.PoppinsSemiBold,
    fontWeight: '600',
    color: '#1E242B',
    lineHeight: 18,
  },
  itemPriceMeta: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '700',
    color: '#1E242B',
    marginTop: 2,
  },
  itemDurationMeta: {
    fontFamily: ServenticaTokens.fonts.SFProRegular,
    fontWeight: '400',
    color: '#64748B',
  },
  stepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 18,
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepperActionBtn: {
    padding: 2,
  },
  stepperValue: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.SFProBold,
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
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modeTabActive: {
    backgroundColor: '#1E242B',
    borderColor: '#1E242B',
  },
  modeTabText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '600',
    color: '#475569',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  schedulerContainer: {
    marginTop: 14,
  },
  subSectionTitle: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.PoppinsSemiBold,
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
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  durationCardActive: {
    backgroundColor: '#1E242B',
    borderColor: '#1E242B',
  },
  durationTitle: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '700',
    color: '#1E242B',
  },
  durationTitleActive: {
    color: '#FFFFFF',
  },
  durationPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  durationPriceText: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '700',
    color: '#1E242B',
  },
  durationPriceTextActive: {
    color: '#FFFFFF',
  },
  durationStrikeText: {
    fontSize: 9.5,
    fontFamily: ServenticaTokens.fonts.SFProRegular,
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
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateCardActive: {
    backgroundColor: '#1E242B',
    borderColor: '#1E242B',
  },
  dateCardDay: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '700',
    color: '#1E242B',
  },
  dateCardDayActive: {
    color: '#FFFFFF',
  },
  dateCardSub: {
    fontSize: 9.5,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  dateCardSubActive: {
    color: 'rgba(255, 255, 255, 0.75)',
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
    backgroundColor: '#1E242B',
  },
  periodText: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '600',
    color: '#475569',
  },
  periodTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  slotsCardBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slotsBoxHeading: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.SFProBold,
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
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slotChipItemActive: {
    backgroundColor: '#1E242B',
    borderColor: '#1E242B',
  },
  slotChipLabel: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '600',
    color: '#1E242B',
  },
  slotChipLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  schedulerNote: {
    fontSize: 10,
    fontFamily: ServenticaTokens.fonts.SFProRegular,
    color: '#64748B',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  schedulerNoteBold: {
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '700',
    color: '#475569',
  },
  billContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    padding: 16,
    marginTop: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  billHeading: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.PoppinsSemiBold,
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
    fontFamily: ServenticaTokens.fonts.SFProRegular,
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
    fontFamily: ServenticaTokens.fonts.SFProBold,
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
    fontFamily: ServenticaTokens.fonts.PoppinsBold,
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
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  trustBannerText: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.SFProMedium,
    color: '#065F46',
    flexShrink: 1,
    lineHeight: 15,
  },

  // Zomato/Blinkit Sticky Footer styles
  footerStickyContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  balanceStrip: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  balanceStripText: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.SFProRegular,
    color: '#475569',
  },
  balanceStripBold: {
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '700',
    color: '#1E242B',
  },
  addMoneyText: {
    fontFamily: ServenticaTokens.fonts.SFProBold,
    color: '#E23744',
    fontWeight: '700',
  },
  footerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  payUsingTouchable: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  payUsingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  payUsingLabel: {
    fontSize: 9.5,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  payUsingMethodName: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.PoppinsSemiBold,
    fontWeight: '700',
    color: '#1E242B',
    marginTop: 2,
  },

  placeOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E23744',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 175,
    ...Platform.select({
      ios: {
        shadowColor: '#E23744',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 8,
  },
  processingText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.PoppinsSemiBold,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonPriceCol: {
    marginRight: 14,
  },
  buttonPriceText: {
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 18,
  },
  buttonTotalLabel: {
    fontSize: 8.5,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.6,
  },
  buttonActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  placeOrderText: {
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.PoppinsBold,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Payment Picker Modal
  paymentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  paymentModalDismiss: {
    flex: 1,
  },
  paymentSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'android' ? 24 : 36,
  },
  paymentSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  paymentSheetTitle: {
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.PoppinsBold,
    fontWeight: '700',
    color: '#1E242B',
  },
  sheetCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentOptionsList: {
    gap: 8,
  },
  paymentOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentOptionItemActive: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    borderColor: '#E23744',
  },
  paymentRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E23744',
  },
  paymentOptionName: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '600',
    color: '#1E242B',
  },
  paymentOptionNameActive: {
    color: '#E23744',
    fontWeight: '700',
  },
  paymentOptionDesc: {
    fontSize: 10.5,
    fontFamily: ServenticaTokens.fonts.SFProRegular,
    color: '#64748B',
    marginTop: 1,
  },
  paymentBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  paymentBadgeText: {
    fontSize: 8.5,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  successState: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontFamily: ServenticaTokens.fonts.PoppinsBold,
    fontWeight: '800',
    color: '#1E242B',
    marginBottom: 4,
  },
  bookingNumberBadge: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 8,
    fontWeight: '700',
  },
  successDesc: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.SFProRegular,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  successReceiptCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.SFProRegular,
    color: '#64748B',
  },
  receiptValue: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.SFProMedium,
    color: '#1E242B',
  },
  receiptValueBold: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '700',
    color: '#1E242B',
  },
  viewOrdersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E242B',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
    width: '100%',
  },
  viewOrdersText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.PoppinsSemiBold,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
