import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Platform,
} from 'react-native';
import { ArrowRight, ShoppingBag, Zap } from 'lucide-react-native';
import { useCart } from '../context/CartContext';
import { AnimatedTouchable } from '../../../shared/components/AnimatedTouchable';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

interface FloatingCartBarProps {
  onPressCheckout?: () => void;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({ onPressCheckout }) => {
  const { itemCount, fees, openCartDrawer } = useCart();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bagRotateAnim = useRef(new Animated.Value(0)).current;

  // Slide In/Out Animation
  useEffect(() => {
    if (itemCount > 0) {
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 20,
        mass: 0.7,
        stiffness: 240,
        useNativeDriver: true,
      }).start();

      // Trigger subtle tactile pulse and wiggle on item count change
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.14,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(bagRotateAnim, {
            toValue: -0.15,
            duration: 90,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 0.95,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(bagRotateAnim, {
            toValue: 0.12,
            duration: 90,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.spring(pulseAnim, {
            toValue: 1,
            friction: 4,
            tension: 200,
            useNativeDriver: true,
          }),
          Animated.spring(bagRotateAnim, {
            toValue: 0,
            friction: 4,
            tension: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [itemCount, slideAnim, pulseAnim, bagRotateAnim]);

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

  const bagRotation = bagRotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-30deg', '30deg'],
  });

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
        style={styles.glassCartBar}
        activeOpacity={0.92}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`View Cart with ${itemCount} items`}
      >
        {/* Left Side: Animated Professional Icon & Item Count Badge */}
        <View style={styles.leftCol}>
          <Animated.View
            style={[
              styles.iconWrapper,
              {
                transform: [{ scale: pulseAnim }, { rotate: bagRotation }],
              },
            ]}
          >
            <ShoppingBag size={21} color="#1E242B" strokeWidth={2.3} />
            <View style={styles.badgePill}>
              <Text style={styles.badgeCount}>{itemCount}</Text>
            </View>
          </Animated.View>

          {/* Express Delivery Badge */}
          <View style={styles.expressTag}>
            <Zap size={11} color="#EAB308" fill="#EAB308" />
            <Text style={styles.expressText}>20-Min Express</Text>
          </View>
        </View>

        {/* Right Side: Clean "View Cart" CTA with Gold Arrow */}
        <View style={styles.rightCol}>
          <Text style={styles.viewCartText}>View Cart</Text>
          <View style={styles.goldArrowBtn}>
            <ArrowRight size={13} color="#1E242B" strokeWidth={2.8} />
          </View>
        </View>
      </AnimatedTouchable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 74, // Perfectly sits directly above bottom nav bar
    left: 20,
    right: 20,
    zIndex: 999,
  },
  glassCartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 36, // Highly rounded pill curve
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 8,
    borderWidth: 1.2,
    borderColor: 'rgba(230, 235, 240, 0.95)',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgePill: {
    position: 'absolute',
    top: -3,
    right: -7,
    backgroundColor: '#FFCC00',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeCount: {
    fontSize: 9.5,
    fontFamily: ServenticaTokens.fonts.Bold,
    fontWeight: '800',
    color: '#1E242B',
    lineHeight: 11,
  },
  expressTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 14,
    gap: 4,
  },
  expressText: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Medium,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: -0.1,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  viewCartText: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '700',
    color: '#1E242B',
    letterSpacing: -0.2,
  },
  goldArrowBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFCC00',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
