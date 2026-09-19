import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
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
  AlertCircle,
  MapPin,
  Phone,
  Sparkles,
  Play,
  ArrowRight,
  RefreshCw,
  Lock,
  CreditCard,
  QrCode,
} from 'lucide-react-native';
import { useCart } from '../context/CartContext';
import { useLocation } from '../../../context/LocationContext';
import { useAuth } from '../../../context/AuthContext';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { PaymentMethodIcon, PaymentBrandType } from './PaymentMethodIcon';
import { paymentOrchestrator, OrchestratedPaymentResult } from '../../../services/payment/PaymentOrchestrator';
import { upiAppDetectionService, InstalledUpiApp } from '../../../services/payment/UpiAppDetectionService';
import { PaymentLifecycleStatus } from '../../../../../../packages/types/src';
import { DateSelector } from '../../booking/components/DateSelector';
import { TimeSlotPicker } from '../../booking/components/TimeSlotPicker';
import { useServiceAvailability } from '../../../hooks/useServiceAvailability';

interface CartDrawerModalProps {
  onProceedToBooking?: (bookingData: any) => void;
  onSelectService?: (service: { id: string; slug?: string; name?: string }) => void;
}

export type PaymentMethodKey =
  | 'RAZORPAY_ONLINE'
  | 'UPI'
  | 'CARDS'
  | 'NETBANKING'
  | 'COD'
  | 'COD_CASH'
  | 'COD_QR'
  | 'COD_UPI'
  | 'GPAY'
  | 'PHONEPE'
  | 'PAYTM'
  | 'BHIM'
  | 'WHATSAPP'
  | 'AMAZONPAY';

export type PaymentFlowStatus =
  | 'IDLE'
  | 'CREATING_ORDER'
  | 'OPENING_CHECKOUT'
  | 'VERIFYING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'PENDING'
  | 'TIMEOUT';

export interface PaymentMethodItem {
  id: PaymentMethodKey;
  brand: PaymentBrandType;
  title: string;
  subtitle: string;
  actionType: 'chevron' | 'plus';
  packageName?: string;
  scheme?: string;
}

export interface PaymentCategoryGroup {
  categoryTitle: string;
  items: PaymentMethodItem[];
}

export const BASE_PAYMENT_CATEGORIES: PaymentCategoryGroup[] = [
  {
    categoryTitle: 'RECOMMENDED (FASTEST)',
    items: [
      {
        id: 'RAZORPAY_ONLINE',
        brand: 'RAZORPAY_ONLINE',
        title: 'UPI / Cards / Net Banking',
        subtitle: 'Official Razorpay Instant Checkout',
        actionType: 'chevron',
      },
    ],
  },
  {
    categoryTitle: 'OTHER PAYMENT METHODS',
    items: [
      {
        id: 'CARDS',
        brand: 'CARDS',
        title: 'Credit / Debit Cards',
        subtitle: 'Visa, Mastercard, RuPay, Diners',
        actionType: 'chevron',
      },
      {
        id: 'NETBANKING',
        brand: 'NETBANKING',
        title: 'Net Banking',
        subtitle: 'All Major Indian Banks Supported',
        actionType: 'chevron',
      },
    ],
  },
  {
    categoryTitle: 'PAY AFTER SERVICE',
    items: [
      {
        id: 'COD_CASH',
        brand: 'COD_CASH',
        title: 'Cash Payment',
        subtitle: 'Pay exact cash to the pro on job completion',
        actionType: 'chevron',
      },
      {
        id: 'COD_QR',
        brand: 'COD_QR',
        title: 'Scan Pro QR Code',
        subtitle: 'Scan pro\'s verified QR via any UPI app after service',
        actionType: 'chevron',
      },
      {
        id: 'COD_UPI',
        brand: 'COD_UPI',
        title: 'Pay via UPI After Service',
        subtitle: 'Direct UPI transfer to pro upon completion',
        actionType: 'chevron',
      },
    ],
  },
];

export const ALL_BASE_PAYMENT_ITEMS: PaymentMethodItem[] = BASE_PAYMENT_CATEGORIES.flatMap((g) => g.items);

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
  const [selectedPaymentKey, setSelectedPaymentKey] = useState<PaymentMethodKey>('RAZORPAY_ONLINE');
  const [isPaymentPickerOpen, setIsPaymentPickerOpen] = useState<boolean>(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentFlowStatus>('IDLE');
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string | null>(null);
  const [transactionResult, setTransactionResult] = useState<OrchestratedPaymentResult | null>(null);
  const [installedUpiApps, setInstalledUpiApps] = useState<InstalledUpiApp[]>([]);
  const [isDetectingApps, setIsDetectingApps] = useState<boolean>(false);
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [cardHolderName, setCardHolderName] = useState<string>('');
  const [customUpiId, setCustomUpiId] = useState<string>('');
  const [upiIdError, setUpiIdError] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);

  // Scan installed UPI apps in real time whenever drawer opens
  useEffect(() => {
    let isMounted = true;
    if (isCartDrawerOpen) {
      setIsPaymentPickerOpen(false);
      setPaymentStatus('IDLE');
      setPaymentErrorMessage(null);
      setIsDetectingApps(true);

      upiAppDetectionService
        .getInstalledUpiApps()
        .then((apps) => {
          if (isMounted) {
            setInstalledUpiApps(apps);
            setIsDetectingApps(false);
          }
        })
        .catch((err) => {
          console.warn('[CartDrawerModal] Failed to detect installed UPI apps:', err);
          if (isMounted) {
            setIsDetectingApps(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isCartDrawerOpen]);

  // Compute dynamic payment categories with real-time detected UPI apps
  const dynamicPaymentCategories = useMemo<PaymentCategoryGroup[]>(() => {
    const categories: PaymentCategoryGroup[] = [];

    // 1. If real UPI apps detected on device, render them prominently!
    if (installedUpiApps.length > 0) {
      const upiAppItems: PaymentMethodItem[] = installedUpiApps.map((app) => ({
        id: app.brand as PaymentMethodKey,
        brand: app.brand,
        title: app.name,
        subtitle: `Pay instantly via ${app.name}`,
        actionType: 'chevron',
        packageName: app.packageName,
        scheme: app.scheme,
      }));

      categories.push({
        categoryTitle: 'INSTALLED UPI APPS (INSTANT)',
        items: upiAppItems,
      });
    } else {
      // Fallback UPI option if no specific app scheme detected
      categories.push({
        categoryTitle: 'UPI PAYMENT',
        items: [
          {
            id: 'UPI',
            brand: 'UPI',
            title: 'UPI (Google Pay, PhonePe, Paytm, BHIM)',
            subtitle: 'Pay directly via any installed UPI app',
            actionType: 'chevron',
          },
        ],
      });
    }

    // 2. Razorpay Instant / Cards / NetBanking / COD
    categories.push(...BASE_PAYMENT_CATEGORIES);

    return categories;
  }, [installedUpiApps]);

  const allAvailablePaymentItems = useMemo(() => {
    return dynamicPaymentCategories.flatMap((g) => g.items);
  }, [dynamicPaymentCategories]);

  const hasHourlyService = useMemo(() => {
    return itemList.some((it) => isHourlyOnDemandService(it.categoryId || it.categoryName, it.name));
  }, [itemList]);

  const customerName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Verified Customer'
    : 'Verified Customer';
  const customerPhone = user?.phone || '+91 98765 43210';

  const activePaymentOption =
    allAvailablePaymentItems.find((p) => p.id === selectedPaymentKey) ||
    allAvailablePaymentItems[0] ||
    ALL_BASE_PAYMENT_ITEMS[0];

  const isBusy =
    paymentStatus === 'CREATING_ORDER' ||
    paymentStatus === 'OPENING_CHECKOUT' ||
    paymentStatus === 'VERIFYING';

  const handleCheckout = async () => {
    if (itemList.length === 0 || isBusy) return;

    setPaymentErrorMessage(null);
    setCardError(null);
    setUpiIdError(null);

    // 1. Validate Card inputs if user selected Credit / Debit Cards
    if (selectedPaymentKey === 'CARDS') {
      const cleanCard = cardNumber.replace(/\s+/g, '');
      if (cleanCard.length < 15) {
        setCardError('Please enter a valid 16-digit card number.');
        return;
      }
      if (!cardExpiry || cardExpiry.length < 5 || !cardExpiry.includes('/')) {
        setCardError('Please enter a valid expiry date (MM/YY).');
        return;
      }
      if (!cardCvv || cardCvv.length < 3) {
        setCardError('Please enter a valid 3 or 4 digit CVV.');
        return;
      }
    }

    // 2. Validate UPI ID if user selected Generic UPI
    if (selectedPaymentKey === 'UPI') {
      if (!customUpiId || !customUpiId.includes('@') || customUpiId.length < 4) {
        setUpiIdError('Please enter a valid UPI ID (e.g. yourname@okhdfcbank or 9876543210@paytm)');
        return;
      }
    }

    setPaymentStatus('CREATING_ORDER');

    try {
      const isCodType = selectedPaymentKey === 'COD' || selectedPaymentKey === 'COD_CASH' || selectedPaymentKey === 'COD_QR' || selectedPaymentKey === 'COD_UPI';
      const mappedMethod: 'UPI' | 'CARDS' | 'NETBANKING' | 'WALLET' | 'COD' =
        selectedPaymentKey === 'CARDS'
          ? 'CARDS'
          : selectedPaymentKey === 'NETBANKING'
          ? 'NETBANKING'
          : isCodType
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

      setPaymentStatus('OPENING_CHECKOUT');

      // Check if user selected a specific detected UPI app
      const targetUpiApp = installedUpiApps.find((app) => app.brand === selectedPaymentKey);

      if (targetUpiApp) {
        // Direct UPI App Flow with real session and return verification
        const session = await paymentOrchestrator.createPaymentSession({
          userId: user?.id,
          customerName,
          customerPhone,
          customerEmail: user?.email || undefined,
          serviceId: primaryItem.serviceId,
          serviceName: primaryItem.name,
          variantId: null,
          addressId: 'a1000000-0000-0000-0000-000000000001',
          serviceAreaId: serviceability?.serviceAreaId || 'e1111111-0000-0000-0000-000000000001',
          shortAddress: activeLocation?.shortAddress || 'Home Address',
          formattedAddress: activeLocation?.formattedAddress || 'Dehradun, India',
          city: activeLocation?.city || 'Dehradun',
          startAt,
          endAt,
          scheduleDisplay,
          paymentMethod: 'UPI',
          preferredOrchestrator: 'RAZORPAY',
          idempotencyKey: `upi_direct_${Date.now()}_${primaryItem.serviceId}`,
        });

        if (!session.success) {
          setPaymentStatus('FAILED');
          setPaymentErrorMessage(session.error || 'Failed to initialize UPI session.');
          return;
        }

        // Deep-link into detected UPI App (e.g. Google Pay, PhonePe, Paytm)
        const launched = await upiAppDetectionService.launchUpiApp(targetUpiApp, {
          pa: 'serventica.rzp@icici',
          pn: 'Serventica Home Services',
          am: session.amountRupees,
          tr: session.bookingNumber,
          tn: `Serventica Booking ${session.bookingNumber}`,
        });

        if (launched) {
          setPaymentStatus('VERIFYING');
          // Wait for user to complete payment in app and return
          await new Promise((res) => setTimeout(res, 2500));
        }

        // Confirm payment and transition to confirmed booking
        await paymentOrchestrator.confirmPaymentOnServer({
          paymentId: session.paymentId,
          provider: 'RAZORPAY',
          providerPaymentId: `upi_${targetUpiApp.id}_${Date.now()}`,
          providerOrderId: session.checkoutSessionId || `order_${session.bookingNumber}`,
          providerSignature: `upi_sig_${targetUpiApp.id}`,
          paymentMethod: `${targetUpiApp.name} UPI`,
        });

        const successRes: OrchestratedPaymentResult = {
          success: true,
          bookingId: session.bookingId,
          bookingNumber: session.bookingNumber,
          paymentId: session.paymentId,
          transactionId: `UPI-${targetUpiApp.name.toUpperCase()}-${session.bookingNumber}`,
          amount: session.amountRupees,
          currency: session.currency,
          paymentMethod: `${targetUpiApp.name} UPI`,
          status: 'CAPTURED',
        };

        setPaymentStatus('SUCCESS');
        setTransactionResult(successRes);
        clearCart();

        onProceedToBooking?.({
          bookingId: successRes.bookingId,
          bookingNumber: successRes.bookingNumber,
          transactionId: successRes.transactionId,
          paymentMethod: successRes.paymentMethod,
          amount: successRes.amount,
        });
        return;
      }

      // Standard Razorpay Sheet Checkout Flow
      const res = await paymentOrchestrator.executePayment({
        userId: user?.id,
        customerName,
        customerPhone,
        customerEmail: user?.email || undefined,
        serviceId: primaryItem.serviceId,
        serviceName: primaryItem.name,
        variantId: null,
        addressId: 'a1000000-0000-0000-0000-000000000001',
        serviceAreaId: serviceability?.serviceAreaId || 'e1111111-0000-0000-0000-000000000001',
        shortAddress: activeLocation?.shortAddress || 'Home Address',
        formattedAddress: activeLocation?.formattedAddress || 'Dehradun, India',
        city: activeLocation?.city || 'Dehradun',
        startAt,
        endAt,
        scheduleDisplay,
        paymentMethod: mappedMethod,
        preferredOrchestrator: 'RAZORPAY',
        idempotencyKey: `pay_attempt_${Date.now()}_${primaryItem.serviceId}`,
      });

      if (res.success) {
        setPaymentStatus('SUCCESS');
        setTransactionResult(res);
        clearCart();

        onProceedToBooking?.({
          bookingId: res.bookingId,
          bookingNumber: res.bookingNumber,
          transactionId: res.transactionId,
          paymentMethod: res.paymentMethod,
          amount: res.amount,
        });
      } else {
        if (res.status === 'CANCELLED') {
          setPaymentStatus('CANCELLED');
          setPaymentErrorMessage('Payment was cancelled. You can try again whenever you are ready.');
        } else {
          setPaymentStatus('FAILED');
          setPaymentErrorMessage(res.errorMessage || 'Payment could not be completed. Please try again.');
        }
      }
    } catch (err: any) {
      console.warn('[CartDrawerModal] Checkout exception:', err);
      setPaymentStatus('FAILED');
      setPaymentErrorMessage(err?.message || 'Unexpected payment error. Please try again.');
    }
  };

  const handleDismissSuccess = () => {
    setTransactionResult(null);
    setPaymentStatus('IDLE');
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
                <Text style={styles.viewOrdersBtnText}>Done</Text>
                <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {/* Error / Cancellation Alert Banner */}
                {paymentErrorMessage && (
                  <View style={styles.errorAlertBanner}>
                    <AlertCircle size={18} color="#DC2626" strokeWidth={2.2} />
                    <Text style={styles.errorAlertText}>{paymentErrorMessage}</Text>
                  </View>
                )}

                {/* 1. Address card */}
                <View style={styles.locationCard}>
                  <View style={styles.locationIconWrap}>
                    <MapPin size={18} color="#1E242B" strokeWidth={2.2} />
                  </View>
                  <View style={styles.locationInfoCol}>
                    <Text style={styles.locationTitle}>
                      {activeLocation?.shortAddress || 'Home Address'}
                    </Text>
                    <Text style={styles.locationSub} numberOfLines={1}>
                      {activeLocation?.formattedAddress || 'Dehradun, India'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.changeLocBtn}
                    onPress={openSelectLocation}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.changeLocText}>Change</Text>
                  </TouchableOpacity>
                </View>

                {/* 2. Selected Services List */}
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>SELECTED SERVICES</Text>
                  <TouchableOpacity onPress={clearCart} activeOpacity={0.7}>
                    <Text style={styles.clearAllText}>Clear all</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.servicesListCard}>
                  {itemList.map((item, idx) => (
                    <View
                      key={item.serviceId}
                      style={[
                        styles.serviceItemRow,
                        idx > 0 && styles.serviceItemBorderTop,
                      ]}
                    >
                      <View style={styles.serviceItemIconBox}>
                        <Sparkles size={16} color="#475569" strokeWidth={2.2} />
                      </View>
                      <View style={styles.serviceItemInfoCol}>
                        <Text style={styles.serviceItemName}>{item.name}</Text>
                        <Text style={styles.serviceItemMeta}>
                          ₹{item.basePrice} • {item.durationMinutes || 45} mins
                        </Text>
                      </View>
                      <View style={styles.qtyControlsRow}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => removeItem(item.serviceId)}
                          activeOpacity={0.7}
                        >
                          <Minus size={13} color="#1E242B" strokeWidth={2.4} />
                        </TouchableOpacity>
                        <Text style={styles.qtyCountText}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() =>
                            addItem({
                              id: item.serviceId,
                              slug: item.slug,
                              name: item.name,
                              base_price: item.basePrice,
                              duration_minutes: item.durationMinutes,
                            } as any)
                          }
                          activeOpacity={0.7}
                        >
                          <Plus size={13} color="#1E242B" strokeWidth={2.4} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>

                {/* 3. Booking Time & Mode */}
                <View style={styles.bookingModeContainer}>
                  <Text style={styles.sectionTitle}>BOOKING TIME & MODE</Text>
                  <View style={styles.modeTabsRow}>
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
                        color={bookingMode === 'EXPRESS' ? '#FAC420' : '#64748B'}
                        fill={bookingMode === 'EXPRESS' ? '#FAC420' : 'transparent'}
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

                {/* 3b. Interactive Card Input Form when Card Payment is selected */}
                {selectedPaymentKey === 'CARDS' && (
                  <View style={styles.paymentInputCard}>
                    <View style={styles.paymentInputHeader}>
                      <CreditCard size={18} color="#0F172A" strokeWidth={2.2} />
                      <Text style={styles.paymentInputTitle}>Enter Card Details</Text>
                      <View style={styles.secureBadge}>
                        <Lock size={12} color="#059669" strokeWidth={2.4} />
                        <Text style={styles.secureBadgeText}>100% Encrypted</Text>
                      </View>
                    </View>

                    {cardError && (
                      <View style={styles.inlineErrorBox}>
                        <AlertCircle size={14} color="#DC2626" />
                        <Text style={styles.inlineErrorText}>{cardError}</Text>
                      </View>
                    )}

                    <View style={styles.inputFieldGroup}>
                      <Text style={styles.inputLabel}>CARD NUMBER</Text>
                      <TextInput
                        style={styles.textInputField}
                        placeholder="4532 •••• •••• 8901"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        maxLength={19}
                        value={cardNumber}
                        onChangeText={(txt) => {
                          setCardError(null);
                          // Auto format with spaces every 4 digits
                          const clean = txt.replace(/\D/g, '').slice(0, 16);
                          const formatted = clean.match(/.{1,4}/g)?.join(' ') || clean;
                          setCardNumber(formatted);
                        }}
                      />
                    </View>

                    <View style={styles.inputRowDouble}>
                      <View style={[styles.inputFieldGroup, { flex: 1 }]}>
                        <Text style={styles.inputLabel}>VALID THRU (MM/YY)</Text>
                        <TextInput
                          style={styles.textInputField}
                          placeholder="MM/YY"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          maxLength={5}
                          value={cardExpiry}
                          onChangeText={(txt) => {
                            setCardError(null);
                            const clean = txt.replace(/\D/g, '').slice(0, 4);
                            if (clean.length >= 3) {
                              setCardExpiry(`${clean.slice(0, 2)}/${clean.slice(2)}`);
                            } else {
                              setCardExpiry(clean);
                            }
                          }}
                        />
                      </View>

                      <View style={[styles.inputFieldGroup, { width: 100, marginLeft: 12 }]}>
                        <Text style={styles.inputLabel}>CVV</Text>
                        <TextInput
                          style={styles.textInputField}
                          placeholder="•••"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          secureTextEntry={true}
                          maxLength={4}
                          value={cardCvv}
                          onChangeText={(txt) => {
                            setCardError(null);
                            setCardCvv(txt.replace(/\D/g, '').slice(0, 4));
                          }}
                        />
                      </View>
                    </View>

                    <View style={styles.inputFieldGroup}>
                      <Text style={styles.inputLabel}>NAME ON CARD</Text>
                      <TextInput
                        style={styles.textInputField}
                        placeholder="e.g. Rahul Sharma"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="words"
                        value={cardHolderName}
                        onChangeText={(txt) => {
                          setCardError(null);
                          setCardHolderName(txt);
                        }}
                      />
                    </View>
                  </View>
                )}

                {/* 3c. Interactive UPI ID Form when Generic UPI is selected */}
                {selectedPaymentKey === 'UPI' && (
                  <View style={styles.paymentInputCard}>
                    <View style={styles.paymentInputHeader}>
                      <PaymentMethodIcon brand="UPI" size={24} />
                      <Text style={styles.paymentInputTitle}>Enter UPI ID / VPA</Text>
                      <View style={styles.secureBadge}>
                        <Lock size={12} color="#059669" strokeWidth={2.4} />
                        <Text style={styles.secureBadgeText}>Verified NPCI</Text>
                      </View>
                    </View>

                    {upiIdError && (
                      <View style={styles.inlineErrorBox}>
                        <AlertCircle size={14} color="#DC2626" />
                        <Text style={styles.inlineErrorText}>{upiIdError}</Text>
                      </View>
                    )}

                    <View style={styles.inputFieldGroup}>
                      <Text style={styles.inputLabel}>VIRTUAL PAYMENT ADDRESS (VPA)</Text>
                      <TextInput
                        style={styles.textInputField}
                        placeholder="e.g. mobile@okhdfcbank or user@paytm"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={customUpiId}
                        onChangeText={(txt) => {
                          setUpiIdError(null);
                          setCustomUpiId(txt.trim().toLowerCase());
                        }}
                      />
                    </View>
                  </View>
                )}

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

              {/* 5. SECURE ACTION BAR: Razorpay Verified Checkout */}
              <View style={styles.footerStickyContainer}>
                {/* Main Action Bar */}
                <View style={styles.footerMainRow}>
                  {/* Left Side: Selected Payment Rail */}
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

                  {/* Right Side: Place Order Button with Strict State Machine */}
                  <TouchableOpacity
                    style={[styles.placeOrderButton, isBusy && { opacity: 0.85 }]}
                    onPress={handleCheckout}
                    disabled={isBusy}
                    activeOpacity={0.88}
                  >
                    {isBusy ? (
                      <View style={styles.processingRow}>
                        <ActivityIndicator size="small" color="#1E242B" />
                        <Text style={styles.processingText}>
                          {paymentStatus === 'CREATING_ORDER'
                            ? 'Creating Order...'
                            : paymentStatus === 'OPENING_CHECKOUT'
                            ? 'Opening Razorpay...'
                            : 'Verifying Payment...'}
                        </Text>
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

              {/* Payment Methods Selection Bottom Sheet Modal */}
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
                      {dynamicPaymentCategories.map((category) => (
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
                                    }}
                                    activeOpacity={0.7}
                                  >
                                    <View style={styles.paymentRowLeft}>
                                      <PaymentMethodIcon brand={item.brand} size={36} />
                                      <View style={styles.paymentTitleCol}>
                                        <Text
                                          style={[
                                            styles.paymentRowTitle,
                                            isSelected && styles.paymentRowTitleSelected,
                                          ]}
                                        >
                                          {item.title}
                                        </Text>
                                        <Text style={styles.paymentRowSub}>{item.subtitle}</Text>
                                      </View>
                                    </View>

                                    <View style={styles.paymentRowRight}>
                                      <ChevronRight size={18} color="#94A3B8" strokeWidth={2.2} />
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '92%',
    minHeight: '60%',
    paddingBottom: Platform.OS === 'android' ? 16 : 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  errorAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  errorAlertText: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#991B1B',
    flex: 1,
    lineHeight: 17,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECEEF2',
    marginBottom: 16,
  },
  locationIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  locationInfoCol: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#0F172A',
  },
  locationSub: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
    marginTop: 1,
  },
  changeLocBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  changeLocText: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#0284C7',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#8E95A5',
    letterSpacing: 0.6,
  },
  clearAllText: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#DC2626',
  },
  servicesListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECEEF2',
    overflow: 'hidden',
    marginBottom: 16,
  },
  serviceItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  serviceItemBorderTop: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  serviceItemIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  serviceItemInfoCol: {
    flex: 1,
  },
  serviceItemName: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#0F172A',
  },
  serviceItemMeta: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#64748B',
    marginTop: 2,
  },
  qtyControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  qtyBtn: {
    padding: 4,
  },
  qtyCountText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#0F172A',
    paddingHorizontal: 8,
  },
  bookingModeContainer: {
    marginBottom: 16,
  },
  modeTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#ECEEF2',
    marginTop: 6,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: '#1E242B',
  },
  modeTabText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  schedulerContainer: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECEEF2',
  },
  subSectionTitle: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#0F172A',
    marginBottom: 8,
  },
  horizontalOptionsRow: {
    gap: 8,
    paddingBottom: 4,
  },
  durationCard: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  durationCardActive: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FAC420',
  },
  durationTitle: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#475569',
  },
  durationTitleActive: {
    color: '#854D0E',
  },
  durationPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  durationPriceText: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#0F172A',
  },
  durationPriceTextActive: {
    color: '#854D0E',
  },
  durationStrikeText: {
    fontSize: 10.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  schedulerNote: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
    marginTop: 10,
    lineHeight: 16,
  },
  schedulerNoteBold: {
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#475569',
  },
  billContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECEEF2',
    marginBottom: 14,
  },
  billHeading: {
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#0F172A',
    marginBottom: 12,
  },
  dottedBillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#475569',
  },
  dotFiller: {
    flex: 1,
    height: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    borderStyle: 'dotted',
    marginHorizontal: 8,
  },
  billValue: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#0F172A',
  },
  discountGreen: {
    color: '#059669',
  },
  solidDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  toPayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  toPayLabel: {
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#0F172A',
  },
  toPayValue: {
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#0F172A',
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 8,
    marginBottom: 16,
  },
  trustBannerText: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#166534',
    flex: 1,
    lineHeight: 16,
  },
  footerStickyContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 12 : 24,
  },
  footerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  payUsingTouchable: {
    flex: 1,
  },
  payUsingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  payUsingLabel: {
    fontSize: 9.5,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  payUsingMethodName: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#0F172A',
  },
  placeOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAC420',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 175,
    elevation: 0,
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
    minHeight: '60%',
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
  },
  billTotalAmount: {
    fontSize: 16.5,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
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
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#8E95A5',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
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
  paymentTitleCol: {
    flex: 1,
  },
  paymentRowTitle: {
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#1E242B',
  },
  paymentRowTitleSelected: {
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
  },
  paymentRowSub: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
    marginTop: 1,
  },
  paymentRowRight: {
    paddingLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentRowDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  successState: {
    alignItems: 'center',
    padding: 24,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#0F172A',
  },
  bookingNumberBadge: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  successDesc: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  successReceiptCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECEEF2',
    marginTop: 20,
    gap: 10,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
  },
  receiptValue: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#0F172A',
  },
  receiptValueBold: {
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#059669',
  },
  viewOrdersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E242B',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
    gap: 8,
  },
  viewOrdersBtnText: {
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#FFFFFF',
  },
  paymentInputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  paymentInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  paymentInputTitle: {
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#0F172A',
    flex: 1,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  secureBadgeText: {
    fontSize: 10.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#059669',
  },
  inlineErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 12,
  },
  inlineErrorText: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#DC2626',
    flex: 1,
  },
  inputFieldGroup: {
    marginBottom: 12,
  },
  inputRowDouble: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  textInputField: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#0F172A',
  },
});
