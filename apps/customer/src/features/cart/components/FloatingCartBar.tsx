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
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

interface FloatingCartBarProps {
  onPressCheckout?: () => void;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({ onPressCheckout }) => {
  const { itemCount, openCartDrawer } = useCart();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bagRotateAnim = useRef(new Animated.Value(0)).current;
  const pressScaleAnim = useRef(new Animated.Value(1)).current;
  const arrowSlideAnim = useRef(new Animated.Value(0)).current;
  const bagFloatAnim = useRef(new Animated.Value(0)).current;

  // Arrow subtle continuous micro-animation loop
  useEffect(() => {
    const arrowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowSlideAnim, {
          toValue: 3,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(arrowSlideAnim, {
          toValue: 0,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );

    const bagLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bagFloatAnim, {
          toValue: -2,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(bagFloatAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(bagFloatAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    arrowLoop.start();
    bagLoop.start();

    return () => {
      arrowLoop.stop();
      bagLoop.stop();
    };
  }, [arrowSlideAnim, bagFloatAnim]);

  // Slide In/Out & Count Change Animation
  useEffect(() => {
    if (itemCount > 0) {
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 18,
        mass: 0.6,
        stiffness: 220,
        useNativeDriver: true,
      }).start();

      // Tactile spring pulse & wiggle on count changes
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(bagRotateAnim, {
            toValue: -0.18,
            duration: 80,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 0.92,
            duration: 90,
            useNativeDriver: true,
          }),
          Animated.timing(bagRotateAnim, {
            toValue: 0.14,
            duration: 80,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.spring(pulseAnim, {
            toValue: 1,
            friction: 4,
            tension: 220,
            useNativeDriver: true,
          }),
          Animated.spring(bagRotateAnim, {
            toValue: 0,
            friction: 4,
            tension: 220,
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

  const handlePressIn = () => {
    Animated.spring(pressScaleAnim, {
      toValue: 0.93,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 220,
      useNativeDriver: true,
    }).start();
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
          transform: [
            { translateY: slideAnim },
            { scale: pressScaleAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.yellowCapsuleBar}
        activeOpacity={0.92}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
        accessibilityRole="button"
        accessibilityLabel={`View Cart with ${itemCount} items`}
      >
        {/* Left Side: Animated Bag Icon & Badge */}
        <View style={styles.leftCol}>
          <Animated.View
            style={[
              styles.iconWrapper,
              {
                transform: [
                  { scale: pulseAnim },
                  { rotate: bagRotation },
                  { translateY: bagFloatAnim },
                ],
              },
            ]}
          >
            <ShoppingBag size={18} color="#1E242B" strokeWidth={2.4} />
            <View style={styles.badgePill}>
              <Text style={styles.badgeCount}>{itemCount}</Text>
            </View>
          </Animated.View>
        </View>

        {/* Center/Right Side: "View Cart" & Animated Arrow Circle */}
        <View style={styles.rightCol}>
          <Text style={styles.viewCartText}>View Cart</Text>
          <View style={styles.arrowCircle}>
            <Animated.View
              style={{
                transform: [{ translateX: arrowSlideAnim }],
              }}
            >
              <ArrowRight size={13} color="#FFFFFF" strokeWidth={2.8} />
            </Animated.View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 78 : 64, // Elegant snug gap right above bottom navigation
    alignSelf: 'center',
    zIndex: 999,
  },
  yellowCapsuleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fac420', // Warm golden yellow
    borderRadius: 28,
    paddingLeft: 13,
    paddingRight: 10,
    paddingVertical: 7,
    gap: 11,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
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
    borderWidth: 1,
    borderColor: '#fac420',
  },
  badgeCount: {
    fontSize: 9,
    fontFamily: ServenticaTokens.fonts.Bold,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 10,
    letterSpacing: 0,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  viewCartText: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.Bold,
    fontWeight: '700',
    color: '#1E242B',
    letterSpacing: 0,
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
