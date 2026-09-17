import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Platform,
} from 'react-native';
import { ShoppingBag, ArrowRight, Zap } from 'lucide-react-native';
import { useCart } from '../context/CartContext';
import { AnimatedTouchable } from '../../../shared/components/AnimatedTouchable';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

interface FloatingCartBarProps {
  onPressCheckout?: () => void;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({ onPressCheckout }) => {
  const { itemCount, fees, openCartDrawer } = useCart();
  const slideAnim = useRef(new Animated.Value(120)).current;

  useEffect(() => {
    if (itemCount > 0) {
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 18,
        mass: 0.8,
        stiffness: 220,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 120,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [itemCount, slideAnim]);

  if (itemCount === 0) {
    return null;
  }

  const handlePress = () => {
    if (onPressCheckout) {
      onPressCheckout();
    } else {
      openCartDrawer();
    }
  };

  return (
    <Animated.View
      style={[
        styles.floatingContainer,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <AnimatedTouchable
        style={styles.cartBar}
        activeOpacity={0.92}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`View Cart with ${itemCount} items, total ₹${fees.finalPayable}`}
      >
        <View style={styles.leftCol}>
          <View style={styles.badgeBox}>
            <ShoppingBag size={15} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.badgeText}>{itemCount}</Text>
          </View>

          <View style={styles.priceInfo}>
            <View style={styles.priceRow}>
              <Text style={styles.priceText}>₹{fees.finalPayable}</Text>
              {fees.discountAmount > 0 ? (
                <Text style={styles.savingsText}>Save ₹{fees.discountAmount}</Text>
              ) : null}
            </View>
            <View style={styles.expressTag}>
              <Zap size={11} color="#FFCC00" fill="#FFCC00" />
              <Text style={styles.expressText}>20-Min Express Slot</Text>
            </View>
          </View>
        </View>

        <View style={styles.rightCol}>
          <Text style={styles.ctaText}>View Cart</Text>
          <View style={styles.arrowCircle}>
            <ArrowRight size={14} color="#1E242B" strokeWidth={2.5} />
          </View>
        </View>
      </AnimatedTouchable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 84, // Sits perfectly above the bottom navigation bar
    left: 16,
    right: 16,
    zIndex: 999,
  },
  cartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E242B',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#323B44',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  priceInfo: {
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceText: {
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#FFFFFF',
  },
  savingsText: {
    fontSize: 11,
    color: '#4ADE80',
    fontWeight: '600',
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  expressTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  expressText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: ServenticaTokens.fonts.Regular,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFCC00',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
