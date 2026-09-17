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
  ChevronDown,
  ChevronRight,
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
import { paymentService, PaymentExecutionResult } from '../../../services/payment.service';
import { DateSelector } from '../../booking/components/DateSelector';
import { TimeSlotPicker } from '../../booking/components/TimeSlotPicker';
import { useServiceAvailability } from '../../../hooks/useServiceAvailability';

interface CartDrawerModalProps {
  onProceedToBooking?: (bookingData: any) => void;
  onSelectService?: (service: { id: string; slug?: string; name?: string }) => void;
}

export type PaymentMethodKey =
  | 'NAVI'
  | 'GOOGLE_PAY'
  | 'CARDS'
  | 'PLUXEE'
  | 'YONO_SBI'
  | 'UPI_ADD'
  | 'AMAZON_PAY'
  | 'MOBIKWIK'
  | 'WALLET'
  | 'COD';

export interface PaymentMethodItem {
  id: PaymentMethodKey;
  brand: PaymentBrandType;
  title: string;
  actionType: 'chevron' | 'plus';
}

export interface PaymentCategoryGroup {
  categoryTitle: string;
  items: PaymentMethodItem[];
}

export const PAYMENT_CATEGORIES: PaymentCategoryGroup[] = [
  {
    categoryTitle: 'RECOMMENDED',
    items: [
      { id: 'NAVI', brand: 'NAVI', title: 'Navi UPI', actionType: 'chevron' },
      { id: 'GOOGLE_PAY', brand: 'GOOGLE_PAY', title: 'Google Pay UPI', actionType: 'chevron' },
    ],
  },
  {
    categoryTitle: 'CARDS',
    items: [
      { id: 'CARDS', brand: 'CARDS_ADD', title: 'Add credit or debit cards', actionType: 'plus' },
      { id: 'PLUXEE', brand: 'PLUXEE', title: 'Add Pluxee', actionType: 'plus' },
    ],
  },
  {
    categoryTitle: 'PAY BY ANY UPI APP',
    items: [
      { id: 'YONO_SBI', brand: 'YONO_SBI', title: 'Yono SBI UPI', actionType: 'chevron' },
      { id: 'UPI_ADD', brand: 'UPI_ADD', title: 'Add new UPI ID', actionType: 'plus' },
    ],
  },
  {
    categoryTitle: 'WALLETS',
    items: [
      { id: 'AMAZON_PAY', brand: 'AMAZON_PAY', title: 'Amazon Pay Balance', actionType: 'plus' },
      { id: 'MOBIKWIK', brand: 'MOBIKWIK', title: 'Mobikwik', actionType: 'plus' },
      { id: 'WALLET', brand: 'WALLET', title: 'Serventica Wallet', actionType: 'chevron' },
    ],
  },
  {
    categoryTitle: 'PAY ON DELIVERY',
    items: [
      { id: 'COD', brand: 'COD', title: 'Pay After Service (Cash / UPI)', actionType: 'chevron' },
    ],
  },
];

export const ALL_PAYMENT_ITEMS: PaymentMethodItem[] = PAYMENT_CATEGORIES.flatMap((g) => g.items);


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

export const CartDrawerModal: React.FC<CartDrawerModalProps> = ({ onProceedToBooking, onSelectService }) => {
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

  const itemList = Object.values(items);
  const primaryItem = itemList[0];

  const {
    serviceability,
    isCheckingServiceability,
    isServiceable,
    dates,
    selectedDate,
    setSelectedDate,
    isLoadingDates,
    slots,
    groupedSlots,
    selectedSlot,
    setSelectedSlot,
    isLoadingSlots,
  } = useServiceAvailability({
    serviceId: primaryItem?.serviceId,
    latitude: activeLocation?.latitude,
    longitude: activeLocation?.longitude,
    enabled: isCartDrawerOpen && Boolean(primaryItem?.serviceId),
  });

  const [bookingMode, setBookingMode] = useState<'EXPRESS' | 'SCHEDULED'>('EXPRESS');
  const [selectedDurationId, setSelectedDurationId] = useState<string>('1hr');
  const [selectedPaymentKey, setSelectedPaymentKey] = useState<PaymentMethodKey>('GOOGLE_PAY');
  const [isPaymentPickerOpen, setIsPaymentPickerOpen] = useState<boolean>(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [transactionResult, setTransactionResult] = useState<PaymentExecutionResult | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

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

  const activePaymentOption = ALL_PAYMENT_ITEMS.find((p) => p.id === selectedPaymentKey) || ALL_PAYMENT_ITEMS[0];

  const handleCheckout = async () => {
    if (itemList.length === 0 || isProcessingPayment) return;

    setIsProcessingPayment(true);

    try {
      const mappedMethod: 'UPI' | 'CARDS' | 'WALLET' | 'COD' =
        selectedPaymentKey === 'CARDS'
          ? 'CARDS'
          : selectedPaymentKey === 'WALLET'
          ? 'WALLET'
          : selectedPaymentKey === 'COD'
          ? 'COD'
          : 'UPI';

      const scheduleDisplay =
        bookingMode === 'SCHEDULED'
          ? selectedSlot?.displayTime || 'Scheduled Slot'
          : 'Express 20m Dispatch';

      const now = new Date();
      const startAt = selectedSlot?.startAt || now.toISOString();
      const endAt =
        selectedSlot?.endAt ||
        new Date(now.getTime() + (primaryItem?.durationMinutes || 60) * 60000).toISOString();

      const res = await paymentService.processPayment({
        userId: user?.id,
        customerName,
        customerPhone,
        customerEmail: user?.email || undefined,
        serviceId: primaryItem.serviceId,
        serviceName: primaryItem.name,
        variantId: null,
        addressId: 'a1000000-0000-0000-0000-000000000001',
        serviceAreaId: serviceability?.serviceAreaId || 'e1111111-0000-0000-0000-000000000001',
        shortAddress: activeLocation.shortAddress || 'Home Address',
        formattedAddress: activeLocation.formattedAddress || 'Dehradun, India',
        city: activeLocation.city || 'Dehradun',
        startAt,
        endAt,
        scheduleDisplay,
        paymentMethod: mappedMethod,
        paymentBrand: activePaymentOption.title,
        idempotencyKey: `pay_attempt_${Date.now()}_${primaryItem.serviceId}`,
      });

      if (res.success) {
        setTransactionResult({
          success: true,
          transactionId: res.transactionId || 'TXN-SUCCESS',
          paymentMethod: res.paymentMethod,
          amount: res.amount,
          currency: 'INR',
          status: 'CAPTURED',
          timestamp: new Date().toISOString(),
          bookingId: res.bookingId,
          bookingNumber: res.bookingNumber,
        });
        clearCart();

        onProceedToBooking?.({
          bookingId: res.bookingId,
          bookingNumber: res.bookingNumber,
          transactionId: res.transactionId,
          paymentMethod: res.paymentMethod,
          amount: res.amount,
        });
      }
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
                  : `Your appointment is confirmed for ${selectedDate || 'the selected date'} (${selectedSlot?.displayTime || 'Scheduled slot'}).`}
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
                {/* 1. Location & Booking Summary Pill Card */}
                <View style={styles.contactBar}>
                  <View style={styles.contactItem}>
                    <MapPin size={14} color="#64748B" />
                    <View style={styles.contactTextCol}>
                      <Text style={styles.contactLabel}>SERVICE LOCATION</Text>
                      <Text style={styles.contactValue} numberOfLines={1}>
                        {activeLocation?.shortAddress || activeLocation?.city || 'Outer Circle, New Delhi'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        closeCartDrawer();
                        openSelectLocation();
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.changeLink}>Change</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.contactDivider} />

                  <View style={styles.contactItem}>
                    <Phone size={14} color="#64748B" />
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
                    <TouchableOpacity onPress={clearCart} activeOpacity={0.7}>
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
                          {/* Service Image & Details - Tapping navigates to Service Detail Screen */}
                          <TouchableOpacity
                            style={styles.itemInfoTouchable}
                            activeOpacity={0.7}
                            onPress={() => {
                              closeCartDrawer();
                              onSelectService?.({
                                id: item.serviceId,
                                slug: item.slug,
                                name: item.name,
                              });
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`View ${item.name} details`}
                          >
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
                          </TouchableOpacity>

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
                      <DateSelector
                        dates={dates}
                        selectedDate={selectedDate}
                        onSelectDate={(d) => setSelectedDate(d)}
                        isLoading={isLoadingDates}
                      />

                      {/* Select Time */}
                      <Text style={[styles.subSectionTitle, { marginTop: 16 }]}>Select time</Text>
                      <TimeSlotPicker
                        slots={slots}
                        groupedSlots={groupedSlots}
                        selectedSlot={selectedSlot}
                        onSelectSlot={(s) => setSelectedSlot(s)}
                        isLoading={isLoadingSlots}
                      />

                      <Text style={styles.schedulerNote}>
                        <Text style={styles.schedulerNoteBold}>NOTE: </Text>
                        Slots reflect real-time partner capacity in your area. Arrival within window.
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
                    Serventica Wallet Balance: <Text style={styles.balanceStripBold}>₹{walletBalance}</Text>
                  </Text>
                  <Text style={styles.balanceStripDot}> • </Text>
                  <TouchableOpacity
                    onPress={async () => {
                      const newBal = await paymentService.addWalletBalance(500);
                      setWalletBalance(newBal);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addMoneyText}>+ Add ₹500</Text>
                  </TouchableOpacity>
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

                  {/* Right Side: Place Order Button (Yellow #FCF403 Rounded Pill with Price on Left & Place Order on Right, No Shadow) */}
                  <TouchableOpacity
                    style={[styles.placeOrderButton, isProcessingPayment && { opacity: 0.75 }]}
                    onPress={handleCheckout}
                    disabled={isProcessingPayment}
                    activeOpacity={0.88}
                  >
                    {isProcessingPayment ? (
                      <View style={styles.processingRow}>
                        <ActivityIndicator size="small" color="#1E242B" />
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
                          <Play size={10} color="#1E242B" fill="#1E242B" style={{ marginLeft: 2 }} />
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Payment Methods Selection Bottom Sheet Modal matching reference image */}
              {isPaymentPickerOpen && (
                <View style={styles.paymentModalOverlay}>
                  <TouchableOpacity
                    style={styles.paymentModalDismiss}
                    activeOpacity={1}
                    onPress={() => setIsPaymentPickerOpen(false)}
                  />
                  <View style={styles.paymentSheet}>
                    {/* Top Header: Down chevron circle button + Bill total */}
                    <View style={styles.paymentSheetTopBar}>
                      <TouchableOpacity
                        style={styles.chevronDownCircleBtn}
                        onPress={() => setIsPaymentPickerOpen(false)}
                        activeOpacity={0.7}
                      >
                        <ChevronDown size={20} color="#1E242B" strokeWidth={2.4} />
                      </TouchableOpacity>
                      <Text style={styles.billTotalText}>
                        Bill total: <Text style={styles.billTotalAmount}>₹{fees.finalPayable}</Text>
                      </Text>
                    </View>

                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.paymentSheetScrollContent}
                    >
                      {PAYMENT_CATEGORIES.map((category) => (
                        <View key={category.categoryTitle} style={styles.paymentCategoryContainer}>
                          <Text style={styles.paymentCategoryHeader}>{category.categoryTitle}</Text>

                          <View style={styles.paymentCardGroup}>
                            {category.items.map((item, idx) => {
                              const isSelected = selectedPaymentKey === item.id;
                              const isLast = idx === category.items.length - 1;

                              return (
                                <React.Fragment key={item.id}>
                                  <TouchableOpacity
                                    style={styles.paymentRowItem}
                                    onPress={() => {
                                      setSelectedPaymentKey(item.id);
                                      setIsPaymentPickerOpen(false);
                                      // Trigger checkout with selected payment method
                                      setTimeout(() => {
                                        handleCheckout();
                                      }, 150);
                                    }}
                                    activeOpacity={0.7}
                                  >
                                    <View style={styles.paymentRowLeft}>
                                      <PaymentMethodIcon brand={item.brand} size={36} />
                                      <Text style={[styles.paymentRowTitle, isSelected && styles.paymentRowTitleSelected]}>
                                        {item.title}
                                      </Text>
                                    </View>

                                    <View style={styles.paymentRowRight}>
                                      {item.actionType === 'plus' ? (
                                        <Plus size={18} color="#E23744" strokeWidth={2.4} />
                                      ) : (
                                        <ChevronRight size={18} color="#94A3B8" strokeWidth={2.2} />
                                      )}
                                    </View>
                                  </TouchableOpacity>

                                  {!isLast && <View style={styles.paymentRowDivider} />}
                                </React.Fragment>
                              );
                            })}
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              )}
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
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
    letterSpacing: 0,
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
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactValue: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#1E242B',
    marginTop: 1,
  },
  changeLink: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Bold,
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
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#475569',
    letterSpacing: 0.5,
  },
  clearText: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#EF4444',
  },
  serviceItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemInfoTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#1E242B',
    lineHeight: 18,
  },
  itemPriceMeta: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
    marginTop: 2,
  },
  itemDurationMeta: {
    fontFamily: ServenticaTokens.fonts.Regular,
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
    fontFamily: ServenticaTokens.fonts.Bold,
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
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#475569',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
    fontFamily: ServenticaTokens.fonts.Bold,
  },
  schedulerContainer: {
    marginTop: 14,
  },
  subSectionTitle: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.SemiBold,
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
    fontFamily: ServenticaTokens.fonts.Bold,
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
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
  },
  durationPriceTextActive: {
    color: '#FFFFFF',
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
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateCardActive: {
    backgroundColor: '#1E242B',
    borderColor: '#1E242B',
  },
  dateCardDay: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
  },
  dateCardDayActive: {
    color: '#FFFFFF',
  },
  dateCardSub: {
    fontSize: 9.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
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
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#475569',
  },
  periodTextActive: {
    color: '#FFFFFF',
    fontFamily: ServenticaTokens.fonts.Bold,
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
    fontFamily: ServenticaTokens.fonts.Bold,
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
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#1E242B',
  },
  slotChipLabelActive: {
    color: '#FFFFFF',
    fontFamily: ServenticaTokens.fonts.Bold,
  },
  schedulerNote: {
    fontSize: 10,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  schedulerNoteBold: {
    fontFamily: ServenticaTokens.fonts.Bold,
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
    fontFamily: ServenticaTokens.fonts.SemiBold,
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
    color: '#1E242B',
  },
  discountGreen: {
    color: '#059669',
    fontFamily: ServenticaTokens.fonts.Bold,
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
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
  },
  toPayValue: {
    fontSize: 16.5,
    fontFamily: ServenticaTokens.fonts.Bold,
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
    fontFamily: ServenticaTokens.fonts.Medium,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  balanceStripText: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#475569',
  },
  balanceStripBold: {
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
  },
  balanceStripDot: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#94A3B8',
  },
  addMoneyText: {
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#E23744',
    fontSize: 11.5,
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
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  payUsingMethodName: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#1E242B',
    marginTop: 2,
  },

  placeOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fac420',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 175,
    elevation: 0,
    shadowOpacity: 0,
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
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#1E242B',
  },
  buttonPriceCol: {
    marginRight: 14,
  },
  buttonPriceText: {
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
    lineHeight: 18,
  },
  buttonTotalLabel: {
    fontSize: 8.5,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: 'rgba(30, 36, 43, 0.75)',
    letterSpacing: 0.6,
  },
  buttonActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  placeOrderText: {
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
  },

  // Payment Picker Modal
  paymentModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    zIndex: 999,
  },
  paymentModalDismiss: {
    flex: 1,
  },
  paymentSheet: {
    backgroundColor: '#F4F5F8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    minHeight: '65%',
    paddingBottom: Platform.OS === 'android' ? 20 : 36,
  },
  paymentSheetTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 14,
  },
  chevronDownCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  billTotalText: {
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#1E242B',
    letterSpacing: 0,
  },
  billTotalAmount: {
    fontSize: 16.5,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
    letterSpacing: 0,
  },
  paymentSheetScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  paymentCategoryContainer: {
    marginTop: 14,
  },
  paymentCategoryHeader: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#8E95A5',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  paymentCardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ECEEF2',
    overflow: 'hidden',
  },
  paymentRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  paymentRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  paymentRowTitle: {
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#1E242B',
    letterSpacing: 0,
  },
  paymentRowTitleSelected: {
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#1E242B',
    letterSpacing: 0,
  },
  paymentRowRight: {
    paddingLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentRowDivider: {
    height: 1,
    backgroundColor: '#F1F3F6',
    marginLeft: 50,
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
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
    marginBottom: 4,
  },
  bookingNumberBadge: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.Regular,
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
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
  },
  receiptValue: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#1E242B',
  },
  receiptValueBold: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Bold,
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
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#FFFFFF',
  },
});
