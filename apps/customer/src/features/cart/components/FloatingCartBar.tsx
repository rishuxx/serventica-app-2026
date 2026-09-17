import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { ArrowRight, ShoppingBag } from 'lucide-react-native';
import { useCart } from '../context/CartContext';
import { AnimatedTouchable } from '../../../shared/components/AnimatedTouchable';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

interface FloatingCartBarProps {
  onPressCheckout?: () => void;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({ onPressCheckout }) => {
  const { itemCount, openCartDrawer } = useCart();
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

      // Tactile spring pulse & wiggle on count changes
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 110,
            useNativeDriver: true,
          }),
          Animated.timing(bagRotateAnim, {
            toValue: -0.15,
            duration: 80,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 0.95,
            duration: 90,
            useNativeDriver: true,
          }),
          Animated.timing(bagRotateAnim, {
            toValue: 0.12,
            duration: 80,
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
        duration: 180,
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
    outputRange: ['-25deg', '25deg'],
  });

  return (
    <Animated.View
      style={[
        styles.floatingContainer,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.yellowCapsuleBar}
        activeOpacity={0.85}
        onPress={handlePress}
        hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
        accessibilityRole="button"
        accessibilityLabel={`View Cart with ${itemCount} items`}
      >
        {/* Left Side: Animated Professional Bag Icon & Count Badge */}
        <View style={styles.leftCol}>
          <Animated.View
            style={[
              styles.iconWrapper,
              {
                transform: [{ scale: pulseAnim }, { rotate: bagRotation }],
              },
            ]}
          >
            <ShoppingBag size={18} color="#1E242B" strokeWidth={2.4} />
            <View style={styles.badgePill}>
              <Text style={styles.badgeCount}>{itemCount}</Text>
            </View>
          </Animated.View>
        </View>

        {/* Center/Right Side: "View Cart" & Arrow Circle Icon */}
        <View style={styles.rightCol}>
          <Text style={styles.viewCartText}>View Cart</Text>
          <View style={styles.arrowCircle}>
            <ArrowRight size={12} color="#FFFFFF" strokeWidth={2.8} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 74, // Sits above the white bottom nav
    alignSelf: 'center',
    zIndex: 999,
  },
  yellowCapsuleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFCC00', // Solid bright vibrant light yellow
    borderRadius: 30, // Clean rounded capsule
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 7,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#B45309',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgePill: {
    position: 'absolute',
    top: -4,
    right: -7,
    backgroundColor: '#1E242B',
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    paddingHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeCount: {
    fontSize: 9,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 10,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewCartText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontWeight: '700',
    color: '#1E242B',
    letterSpacing: -0.2,
  },
  arrowCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1E242B',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
