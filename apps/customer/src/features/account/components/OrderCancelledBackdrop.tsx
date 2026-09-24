import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient as SvgRadialGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import { XCircle, ShieldAlert } from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';
import { ServenticaBrandLogo } from './ServenticaBrandLogo';
import { SNAP_EXPANDED, SNAP_MID, SNAP_MINIMIZED } from './ExpandableOrderBottomSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OrderCancelledBackdropProps {
  height: number;
  reason?: string;
  panY?: Animated.Value;
}

export const OrderCancelledBackdrop: React.FC<OrderCancelledBackdropProps> = ({
  height,
  reason = 'Cancelled upon customer request',
  panY,
}) => {
  const topInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44;
  const availableHeight = Math.max(220, SNAP_MID - topInset);

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Parallax motion when the bottom sheet moves across snap states
  const defaultPanY = useRef(new Animated.Value(SNAP_MID)).current;
  const activePanY = panY || defaultPanY;

  const contentTranslateY = activePanY.interpolate({
    inputRange: [SNAP_EXPANDED, SNAP_MID, SNAP_MINIMIZED],
    outputRange: [-60, 0, 30],
    extrapolate: 'clamp',
  });

  const contentOpacity = activePanY.interpolate({
    inputRange: [SNAP_EXPANDED, SNAP_EXPANDED + 140, SNAP_MID, SNAP_MINIMIZED],
    outputRange: [0.05, 0.65, 1, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: false,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  return (
    <View style={[styles.container, { height }]}>
      {/* RICH MULTI-STOP RADIAL & LINEAR RED GRADIENT BLEND (FERALUI) */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          {/* Multi-stop 135-deg linear blend from #EB6101 to #D7003A */}
          <SvgLinearGradient id="cancelledLinearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="6.6%" stopColor="#EB6101" stopOpacity="1" />
            <Stop offset="8.9%" stopColor="#EB6006" stopOpacity="1" />
            <Stop offset="11.2%" stopColor="#EA5F11" stopOpacity="1" />
            <Stop offset="13.5%" stopColor="#E85D1B" stopOpacity="1" />
            <Stop offset="15.8%" stopColor="#E75B23" stopOpacity="1" />
            <Stop offset="18.1%" stopColor="#E55929" stopOpacity="1" />
            <Stop offset="20.4%" stopColor="#E4582D" stopOpacity="1" />
            <Stop offset="22.7%" stopColor="#E4572E" stopOpacity="1" />
            <Stop offset="28.5%" stopColor="#E1552E" stopOpacity="1" />
            <Stop offset="34.4%" stopColor="#DB4E2F" stopOpacity="1" />
            <Stop offset="40.2%" stopColor="#D2462F" stopOpacity="1" />
            <Stop offset="46.0%" stopColor="#C93C2F" stopOpacity="1" />
            <Stop offset="51.9%" stopColor="#C0322E" stopOpacity="1" />
            <Stop offset="57.7%" stopColor="#B92B2E" stopOpacity="1" />
            <Stop offset="63.6%" stopColor="#B7282E" stopOpacity="1" />
            <Stop offset="68.4%" stopColor="#B9272F" stopOpacity="1" />
            <Stop offset="73.3%" stopColor="#BD2430" stopOpacity="1" />
            <Stop offset="78.1%" stopColor="#C41F33" stopOpacity="1" />
            <Stop offset="83.0%" stopColor="#CA1835" stopOpacity="1" />
            <Stop offset="87.8%" stopColor="#D10F38" stopOpacity="1" />
            <Stop offset="92.7%" stopColor="#D50539" stopOpacity="1" />
            <Stop offset="97.5%" stopColor="#D7003A" stopOpacity="1" />
          </SvgLinearGradient>

          {/* Radial specular highlight at top left (12% 8%) */}
          <SvgRadialGradient
            id="cancelledRadialGlow"
            cx="12%"
            cy="8%"
            rx="90%"
            ry="70%"
            fx="12%"
            fy="8%"
          >
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
            <Stop offset="60%" stopColor="#FFFFFF" stopOpacity="0" />
          </SvgRadialGradient>
        </Defs>

        <Rect x="0" y="0" width="100%" height="100%" fill="url(#cancelledLinearGrad)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#cancelledRadialGlow)" />
      </Svg>

      {/* SERVENTICA LOGO AT TOP WITH SAFE CONTENT AREA */}
      <View style={[styles.topBrandHeader, { top: topInset + 6 }]}>
        <ServenticaBrandLogo size="md" />
      </View>

      {/* DYNAMIC PARALLAX CANCELLED CONTENT: Centered above bottom sheet */}
      <Animated.View
        style={[
          styles.contentWrapper,
          {
            top: topInset + 30,
            height: availableHeight - 30,
            transform: [{ translateY: contentTranslateY }, { scale: scaleAnim }],
            opacity: Animated.multiply(opacityAnim, contentOpacity),
          },
        ]}
      >
        {/* Soft Glass Icon Badge */}
        <View style={styles.iconBadge}>
          <View style={styles.iconInnerCircle}>
            <XCircle size={36} color="#FFFFFF" strokeWidth={2.2} />
          </View>
        </View>

        {/* L-Sized Heading in pure Lexend-Bold */}
        <Text style={styles.cancelledTitle}>Order Cancelled</Text>

        {/* Reason pill mentioning the cancellation reason */}
        <View style={styles.reasonPill}>
          <ShieldAlert size={14} color="#FFE4E6" strokeWidth={2.2} />
          <Text style={styles.reasonText} numberOfLines={2}>
            {reason}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: '#B7282E',
  },
  topBrandHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  contentWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.40)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  iconInnerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelledTitle: {
    fontSize: 26,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
    letterSpacing: -0.4,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  reasonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 10,
    gap: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    maxWidth: SCREEN_WIDTH - 48,
  },
  reasonText: {
    fontSize: 13,
    fontFamily: Fonts.Medium,
    color: '#FFFFFF',
    letterSpacing: -0.1,
    textAlign: 'center',
  },
});

export default OrderCancelledBackdrop;
