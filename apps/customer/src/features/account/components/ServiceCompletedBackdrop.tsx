import React, { useRef } from 'react';
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
import LottieView from 'lottie-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';
import { ServenticaBrandLogo } from './ServenticaBrandLogo';
import { SNAP_EXPANDED, SNAP_MID, SNAP_MINIMIZED } from './ExpandableOrderBottomSheet';

const GPAY_TICK = require('../../../assets/animations/gpay-tick.json');
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ServiceCompletedBackdropProps {
  height: number;
  panY?: Animated.Value;
  completedTime?: string;
}

export const ServiceCompletedBackdrop: React.FC<ServiceCompletedBackdropProps> = ({
  height,
  panY,
}) => {
  const topInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44;
  const availableHeight = Math.max(240, SNAP_MID - topInset);

  // Parallax motion when the bottom sheet expands / collapses across all 3 rest states
  const defaultPanY = useRef(new Animated.Value(SNAP_MID)).current;
  const activePanY = panY || defaultPanY;

  const contentTranslateY = activePanY.interpolate({
    inputRange: [SNAP_EXPANDED, SNAP_MID, SNAP_MINIMIZED],
    outputRange: [-70, 0, 180],
    extrapolate: 'clamp',
  });

  const contentScale = activePanY.interpolate({
    inputRange: [SNAP_EXPANDED, SNAP_MID, SNAP_MINIMIZED],
    outputRange: [0.85, 1, 1.08],
    extrapolate: 'clamp',
  });

  const contentOpacity = activePanY.interpolate({
    inputRange: [SNAP_EXPANDED, SNAP_EXPANDED + 130, SNAP_MID, SNAP_MINIMIZED],
    outputRange: [0.05, 0.7, 1, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, { height }]}>
      {/* Full-bleed Emerald Green SVG Gradient with Ambient Glow */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <SvgLinearGradient id="greenCompleteGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#047857" stopOpacity="1" />
            <Stop offset="50%" stopColor="#059669" stopOpacity="1" />
            <Stop offset="100%" stopColor="#064E3B" stopOpacity="1" />
          </SvgLinearGradient>

          <SvgRadialGradient
            id="greenCenterGlow"
            cx="50%"
            cy="40%"
            rx="60%"
            ry="45%"
            fx="50%"
            fy="40%"
          >
            <Stop offset="0%" stopColor="#34D399" stopOpacity="0.35" />
            <Stop offset="100%" stopColor="#34D399" stopOpacity="0" />
          </SvgRadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#greenCompleteGrad)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#greenCenterGlow)" />
      </Svg>

      {/* SERVENTICA OFFICIAL WHITE LOGO AT TOP WITH SAFE CONTENT AREA */}
      <View style={[styles.topBrandHeader, { top: topInset + 6 }]}>
        <ServenticaBrandLogo size="md" color="#FFFFFF" />
      </View>

      {/* CENTER CELEBRATORY LOTTIE ANIMATION & STATUS (DYNAMICALLY CENTERED WITH PARALLAX) */}
      <Animated.View
        style={[
          styles.centerStage,
          {
            top: topInset + 20,
            height: availableHeight,
            transform: [{ translateY: contentTranslateY }, { scale: contentScale }],
            opacity: contentOpacity,
          },
        ]}
      >
        {/* Tightly sized Lottie wrapper to eliminate vertical gap */}
        <View style={styles.lottieWrapper}>
          <LottieView
            source={GPAY_TICK}
            autoPlay
            loop={false}
            style={styles.lottieAnimation}
          />
        </View>

        {/* Text Headings closely placed directly below the tick */}
        <Text style={styles.celebrateTitle}>Service completed!</Text>
        <Text style={styles.celebrateSubtitle}>Thanks for choosing Serventica</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  topBrandHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  centerStage: {
    position: 'absolute',
    left: 0,
    right: 0,
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottieWrapper: {
    width: 130,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: -4,
  },
  lottieAnimation: {
    width: 145,
    height: 145,
  },
  celebrateTitle: {
    fontSize: 23,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 4,
    marginTop: 0,
  },
  celebrateSubtitle: {
    fontSize: 13.5,
    fontFamily: Fonts.Medium,
    color: 'rgba(236, 253, 245, 0.92)',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
});

export default ServiceCompletedBackdrop;
