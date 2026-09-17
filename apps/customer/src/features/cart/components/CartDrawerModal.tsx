import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShieldCheck,
  Zap,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react-native';
import { useCart } from '../context/CartContext';
import { useLocation } from '../../../context/LocationContext';
import { AnimatedTouchable } from '../../../shared/components/AnimatedTouchable';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

interface CartDrawerModalProps {
  onProceedToBooking?: (bookingData: any) => void;
}

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
  const { activeLocation } = useLocation();

  const [selectedSlotType, setSelectedSlotType] = useState<'EXPRESS' | 'TODAY_EVENING' | 'TOMORROW'>('EXPRESS');
  const [isSuccessBooked, setIsSuccessBooked] = useState<boolean>(false);

  const itemList = Object.values(items);

  const handleCheckout = () => {
    setIsSuccessBooked(true);
    setTimeout(() => {
      setIsSuccessBooked(false);
      clearCart();
      closeCartDrawer();
      onProceedToBooking?.({
        items: itemList,
        fees,
        slotType: selectedSlotType,
        location: activeLocation,
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
                {itemCount} {itemCount === 1 ? 'service' : 'services'} for {activeLocation.shortAddress}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={closeCartDrawer}>
              <X size={18} color="#64748B" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          {isSuccessBooked ? (
            <View style={styles.successState}>
              <CheckCircle2 size={54} color="#10B981" strokeWidth={2} />
              <Text style={styles.successTitle}>Booking Confirmed!</Text>
              <Text style={styles.successDesc}>
                Our top-rated certified partner is assigned and on the way.
              </Text>
            </View>
          ) : (
            <>
              <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                {/* 1. Item List */}
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionLabel}>SELECTED SERVICES</Text>
                    <TouchableOpacity onPress={clearCart}>
                      <Text style={styles.clearText}>Clear all</Text>
                    </TouchableOpacity>
                  </View>

                  {itemList.map((item) => (
                    <View key={item.serviceId} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemMeta}>₹{item.basePrice} • {item.durationMinutes} mins</Text>
                      </View>

                      {/* Stepper */}
                      <View style={styles.stepperBox}>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => removeItem(item.serviceId)}
                        >
                          <Minus size={13} color="#1E242B" strokeWidth={2.4} />
                        </TouchableOpacity>
                        <Text style={styles.stepperQty}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => addItem(item as any)}
                        >
                          <Plus size={13} color="#1E242B" strokeWidth={2.4} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>

                {/* 2. Express Dispatch Slot Selector */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionLabel}>SELECT TIME & SPEED</Text>
                  <View style={styles.slotOptionGrid}>
                    <TouchableOpacity
                      style={[
                        styles.slotCard,
                        selectedSlotType === 'EXPRESS' && styles.slotCardActive,
                      ]}
                      onPress={() => setSelectedSlotType('EXPRESS')}
                    >
                      <View style={styles.slotHeader}>
                        <Zap size={15} color={selectedSlotType === 'EXPRESS' ? '#0284C7' : '#64748B'} />
                        <Text
                          style={[
                            styles.slotName,
                            selectedSlotType === 'EXPRESS' && styles.slotNameActive,
                          ]}
                        >
                          Express (20m)
                        </Text>
                      </View>
                      <Text style={styles.slotDesc}>Instant partner dispatch</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.slotCard,
                        selectedSlotType === 'TODAY_EVENING' && styles.slotCardActive,
                      ]}
                      onPress={() => setSelectedSlotType('TODAY_EVENING')}
                    >
                      <View style={styles.slotHeader}>
                        <Clock size={15} color={selectedSlotType === 'TODAY_EVENING' ? '#0284C7' : '#64748B'} />
                        <Text
                          style={[
                            styles.slotName,
                            selectedSlotType === 'TODAY_EVENING' && styles.slotNameActive,
                          ]}
                        >
                          Today 5-7 PM
                        </Text>
                      </View>
                      <Text style={styles.slotDesc}>Standard evening slot</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 3. Bill Summary */}
                <View style={styles.billCard}>
                  <Text style={styles.billHeading}>Bill Summary</Text>

                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Item Total</Text>
                    <Text style={styles.billValue}>₹{fees.itemTotal}</Text>
                  </View>

                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Convenience Fee</Text>
                    <Text style={styles.billValue}>₹{fees.convenienceFee}</Text>
                  </View>

                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Partner Safety & Insurance</Text>
                    <Text style={styles.billValue}>₹{fees.partnerSafetyFee}</Text>
                  </View>

                  {fees.discountAmount > 0 ? (
                    <View style={styles.billRow}>
                      <Text style={[styles.billLabel, styles.discountLabel]}>Promo Discount</Text>
                      <Text style={[styles.billValue, styles.discountValue]}>-₹{fees.discountAmount}</Text>
                    </View>
                  ) : null}

                  <View style={styles.dividerLine} />

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>To Pay</Text>
                    <Text style={styles.totalValue}>₹{fees.finalPayable}</Text>
                  </View>
                </View>

                {/* Trust Badge */}
                <View style={styles.trustBadge}>
                  <ShieldCheck size={16} color="#10B981" />
                  <Text style={styles.trustText}>
                    Serventica Verified Professionals • 30-Day Service Guarantee
                  </Text>
                </View>
              </ScrollView>

              {/* Bottom Sticky CTA */}
              <View style={styles.footerRow}>
                <View>
                  <Text style={styles.footerTotalLabel}>FINAL AMOUNT</Text>
                  <Text style={styles.footerTotalVal}>₹{fees.finalPayable}</Text>
                </View>

                <AnimatedTouchable
                  style={styles.payBtn}
                  onPress={handleCheckout}
                >
                  <Text style={styles.payBtnText}>Proceed to Book</Text>
                  <ArrowRight size={16} color="#1E242B" strokeWidth={2.4} />
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'android' ? 20 : 34,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
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
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollList: {
    paddingHorizontal: 20,
    paddingTop: 14,
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
    fontWeight: '700',
    color: '#8E95A2',
    letterSpacing: 0.8,
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  clearText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    color: '#1E242B',
    fontWeight: '600',
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  itemMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 10,
  },
  stepperBtn: {
    padding: 3,
  },
  stepperQty: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E242B',
  },
  slotOptionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  slotCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  slotCardActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0284C7',
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  slotName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E242B',
  },
  slotNameActive: {
    color: '#0284C7',
  },
  slotDesc: {
    fontSize: 11,
    color: '#64748B',
  },
  billCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  billHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E242B',
    marginBottom: 10,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  billLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  billValue: {
    fontSize: 12,
    color: '#1E242B',
    fontWeight: '600',
  },
  discountLabel: {
    color: '#10B981',
    fontWeight: '600',
  },
  discountValue: {
    color: '#10B981',
    fontWeight: '700',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E242B',
  },
  totalValue: {
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 10,
    gap: 8,
    marginBottom: 20,
  },
  trustText: {
    fontSize: 11,
    color: '#065F46',
    flexShrink: 1,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerTotalLabel: {
    fontSize: 10,
    color: '#8E95A2',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footerTotalVal: {
    fontSize: 18,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFCC00',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 18,
    gap: 8,
    shadowColor: '#1E242B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  payBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E242B',
  },
  successState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  successTitle: {
    fontSize: 20,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
    marginTop: 14,
    marginBottom: 6,
  },
  successDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
});
