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
import { Fonts } from '../../../../../../packages/design-system/src';
import { DotmCircular7 } from './DotmCircular7';
import { ServenticaBrandLogo } from './ServenticaBrandLogo';
import { SNAP_EXPANDED, SNAP_MID, SNAP_MINIMIZED } from './ExpandableOrderBottomSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RadarSearchingBackdropProps {
  height: number;
  panY?: Animated.Value;
}

export const RadarSearchingBackdrop: React.FC<RadarSearchingBackdropProps> = ({
  height,
  panY,
}) => {
  const topInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44;
  const availableHeight = Math.max(220, SNAP_MID - topInset);

  // Parallax motion when the bottom sheet expands / moves across all 3 rest states
  const defaultPanY = useRef(new Animated.Value(SNAP_MID)).current;
  const activePanY = panY || defaultPanY;

  const orbTranslateY = activePanY.interpolate({
    inputRange: [SNAP_EXPANDED, SNAP_MID, SNAP_MINIMIZED],
    outputRange: [-70, 0, 30],
    extrapolate: 'clamp',
  });

  const orbScale = activePanY.interpolate({
    inputRange: [SNAP_EXPANDED, SNAP_MID, SNAP_MINIMIZED],
    outputRange: [0.82, 1, 1.05],
    extrapolate: 'clamp',
  });

  const orbOpacity = activePanY.interpolate({
    inputRange: [SNAP_EXPANDED, SNAP_EXPANDED + 140, SNAP_MID, SNAP_MINIMIZED],
    outputRange: [0.05, 0.65, 1, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, { height }]}>
      {/* VIBRANT ROYAL PURPLE GRADIENT (NO GREY SPOTS) */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          {/* Smooth Diagonal Royal Violet / Purple Blend */}
          <SvgLinearGradient id="searchingPurpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#2E0E4E" stopOpacity="1" />
            <Stop offset="25%" stopColor="#401272" stopOpacity="1" />
            <Stop offset="50%" stopColor="#551B94" stopOpacity="1" />
            <Stop offset="75%" stopColor="#6C25C7" stopOpacity="1" />
            <Stop offset="100%" stopColor="#7E2DF2" stopOpacity="1" />
          </SvgLinearGradient>

          {/* Warm electric violet ambient glow towards top right */}
          <SvgRadialGradient
            id="searchingVioletGlow"
            cx="85%"
            cy="18%"
            rx="80%"
            ry="60%"
            fx="85%"
            fy="18%"
          >
            <Stop offset="0%" stopColor="#A855F7" stopOpacity="0.45" />
            <Stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
          </SvgRadialGradient>

          {/* Deep violet glow on top left */}
          <SvgRadialGradient
            id="searchingDeepGlow"
            cx="20%"
            cy="15%"
            rx="65%"
            ry="65%"
            fx="20%"
            fy="15%"
          >
            <Stop offset="0%" stopColor="#4C1D95" stopOpacity="0.75" />
            <Stop offset="100%" stopColor="#4C1D95" stopOpacity="0" />
          </SvgRadialGradient>
        </Defs>

        <Rect x="0" y="0" width="100%" height="100%" fill="url(#searchingPurpleGrad)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#searchingDeepGlow)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#searchingVioletGlow)" />
      </Svg>

      {/* SERVENTICA LOGO AT TOP WITH SAFE CONTENT AREA */}
      <View style={[styles.topBrandHeader, { top: topInset + 6 }]}>
        <ServenticaBrandLogo size="md" />
      </View>

      {/* DYNAMIC PARALLAX ORB CONTAINER: Centered in the backdrop above the sheet */}
      <Animated.View
        style={[
          styles.orbParallaxWrapper,
          {
            top: topInset + 30,
            height: availableHeight - 30,
            transform: [{ translateY: orbTranslateY }, { scale: orbScale }],
            opacity: orbOpacity,
          },
        ]}
      >
        {/* CIRCULAR 7-DOT MATRIX LOADER CENTER STAGE: Pure white glowing dots */}
        <View style={styles.globeCenterStage}>
          <DotmCircular7
            size={140}
            dotSize={14}
            speed={1.8}
            color="#FFFFFF"
          />
        </View>

        {/* CAPTION BELOW 3D GLOBE IN PURE LEXEND */}
        <View style={styles.bottomCaptionRow}>
          <Text style={styles.bottomCaptionText}>
            Matching verified Servs near you • usually 5–10 mins
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
    backgroundColor: '#2E0E4E',
  },
  topBrandHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  orbParallaxWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  globeCenterStage: {
    width: SCREEN_WIDTH,
    height: 195,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomCaptionRow: {
    paddingHorizontal: 20,
    marginTop: 12,
    alignItems: 'center',
  },
  bottomCaptionText: {
    fontSize: 13,
    fontFamily: Fonts.Medium,
    color: '#EDE9FE',
    textAlign: 'center',
    letterSpacing: -0.1,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

export default RadarSearchingBackdrop;
