import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, ShoppingBag } from 'lucide-react-native';
import { useCart } from '../context/CartContext';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

interface FloatingCartBarProps {
  onPressCheckout?: () => void;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({ onPressCheckout }) => {
  const insets = useSafeAreaInsets();
  const { itemCount, items, openCartDrawer } = useCart();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const pressScaleAnim = useRef(new Animated.Value(1)).current;
  const arrowSlideAnim = useRef(new Animated.Value(0)).current;

  const itemList = Object.values(items);
  const primaryItem = itemList[0];

  // Subtle arrow animation
  useEffect(() => {
    const arrowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowSlideAnim, {
          toValue: 2.5,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(arrowSlideAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    arrowLoop.start();
    return () => arrowLoop.stop();
  }, [arrowSlideAnim]);

  // Slide In/Out on item count changes
  useEffect(() => {
    if (itemCount > 0) {
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 18,
        mass: 0.6,
        stiffness: 220,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 180,
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

  const handlePressIn = () => {
    Animated.spring(pressScaleAnim, {
      toValue: 0.94,
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

  const itemText = itemCount === 1 ? '1 Item' : `${itemCount} Items`;
  const bottomNavPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 14 : 10);
  // NavCapsule height (~60px) + bottomNavPadding + 22px clean gap
  const dynamicBottom = bottomNavPadding + 60 + 22;

  return (
    <Animated.View
      style={[
        styles.floatingContainer,
        {
          bottom: dynamicBottom,
          transform: [
            { translateY: slideAnim },
            { scale: pressScaleAnim },
          ],
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={styles.cartCapsule}
        activeOpacity={0.92}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
        accessibilityRole="button"
        accessibilityLabel={`View Cart with ${itemCount} items`}
      >
        {/* Left: Product Thumbnail / Icon Disc */}
        <View style={styles.thumbnailCircle}>
          {primaryItem?.imageUrl ? (
            <Image
              source={{ uri: primaryItem.imageUrl }}
              style={styles.productThumbnail}
              resizeMode="contain"
            />
          ) : (
            <ShoppingBag size={20} color="#0F172A" strokeWidth={2.2} />
          )}
        </View>

        {/* Center: "View cart" & "1 Item" */}
        <View style={styles.textColumn}>
          <Text style={styles.viewCartTitle}>View cart</Text>
          <Text style={styles.itemCountSubtitle}>{itemText}</Text>
        </View>

        {/* Right: Circle with Chevron Right */}
        <View style={styles.arrowCircle}>
          <Animated.View
            style={{
              transform: [{ translateX: arrowSlideAnim }],
            }}
          >
            <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.8} />
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 999,
  },
  cartCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fac420', // Luxury golden Serventica yellow
    borderRadius: 36,
    paddingLeft: 6,
    paddingRight: 6,
    paddingVertical: 6,
    width: 218,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.65)',
  },
  thumbnailCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  productThumbnail: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  textColumn: {
    flex: 1,
    paddingLeft: 12,
    paddingRight: 4,
    justifyContent: 'center',
  },
  viewCartTitle: {
    fontSize: 14.5,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#0F172A',
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  itemCountSubtitle: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#334155',
    marginTop: 1,
    lineHeight: 14,
  },
  arrowCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
