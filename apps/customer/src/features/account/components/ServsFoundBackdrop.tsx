import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Dimensions,
  Image,
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
import { CheckCircle2 } from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';
import { BookingPartner } from '../../../../../../packages/types/src';
import { ServenticaBrandLogo } from './ServenticaBrandLogo';
import { SNAP_EXPANDED, SNAP_MID, SNAP_MINIMIZED } from './ExpandableOrderBottomSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ServsFoundBackdropProps {
  height: number;
  partner?: BookingPartner | null;
  panY?: Animated.Value;
  onTransitionToMap?: () => void;
  durationMs?: number;
}

export const ServsFoundBackdrop: React.FC<ServsFoundBackdropProps> = ({
  height,
  partner,
  panY,
  onTransitionToMap,
  durationMs = 2800,
}) => {
  const topInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44;
  const availableHeight = Math.max(240, SNAP_MID - topInset);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.75)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Parallax motion when the bottom sheet moves across snap states
  const defaultPanY = useRef(new Animated.Value(SNAP_MID)).current;
  const activePanY = panY || defaultPanY;

  const contentTranslateY = activePanY.interpolate({
    inputRange: [SNAP_EXPANDED, SNAP_MID, SNAP_MINIMIZED],
    outputRange: [-60, 0, 110],
    extrapolate: 'clamp',
  });

  const contentOpacity = activePanY.interpolate({
    inputRange: [SNAP_EXPANDED, SNAP_EXPANDED + 140, SNAP_MID, SNAP_MINIMIZED],
    outputRange: [0.05, 0.65, 1, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    // 1. Spring in the match presentation
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
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: durationMs,
        useNativeDriver: false,
      }),
    ]).start();

    // 2. Continuous ambient pulse on avatar ring
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
      ])
    );
    pulseLoop.start();

    // 3. Auto-transition to Live Map after display duration
    const timer = setTimeout(() => {
      if (onTransitionToMap) {
        onTransitionToMap();
      }
    }, durationMs);

    return () => {
      pulseLoop.stop();
      clearTimeout(timer);
    };
  }, [durationMs, onTransitionToMap, scaleAnim, opacityAnim, progressAnim, pulseAnim]);

  const partnerName = partner?.name || 'Vipin Sharma';
  const partnerAvatar =
    partner?.avatarUrl ||
    'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop&q=80';

  return (
    <View style={[styles.container, { height }]}>
      {/* PROFESSIONAL DARK GREEN GRADIENT */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          {/* Deep Forest to Emerald Green Linear Gradient */}
          <SvgLinearGradient id="servsFoundGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#022C22" stopOpacity="1" />
            <Stop offset="25%" stopColor="#064E3B" stopOpacity="1" />
            <Stop offset="50%" stopColor="#065F46" stopOpacity="1" />
            <Stop offset="75%" stopColor="#047857" stopOpacity="1" />
            <Stop offset="100%" stopColor="#059669" stopOpacity="1" />
          </SvgLinearGradient>

          {/* Emerald glow highlight at top right */}
          <SvgRadialGradient
            id="servsFoundGlow"
            cx="85%"
            cy="15%"
            rx="80%"
            ry="60%"
            fx="85%"
            fy="15%"
          >
            <Stop offset="0%" stopColor="#34D399" stopOpacity="0.35" />
            <Stop offset="100%" stopColor="#34D399" stopOpacity="0" />
          </SvgRadialGradient>

          {/* Deep dark tint on top left */}
          <SvgRadialGradient
            id="servsFoundDeep"
            cx="15%"
            cy="15%"
            rx="70%"
            ry="70%"
            fx="15%"
            fy="15%"
          >
            <Stop offset="0%" stopColor="#022C22" stopOpacity="0.75" />
            <Stop offset="100%" stopColor="#022C22" stopOpacity="0" />
          </SvgRadialGradient>
        </Defs>

        <Rect x="0" y="0" width="100%" height="100%" fill="url(#servsFoundGrad)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#servsFoundDeep)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#servsFoundGlow)" />
      </Svg>

      {/* SERVENTICA WHITE LOGO AT TOP WITH SAFE CONTENT AREA */}
      <View style={[styles.topBrandHeader, { top: topInset + 6 }]}>
        <ServenticaBrandLogo size="md" color="#FFFFFF" />
      </View>

      {/* DYNAMIC PARALLAX FOUND CONTENT: Centered above bottom sheet */}
      <Animated.View
        style={[
          styles.contentWrapper,
          {
            top: topInset + 24,
            height: availableHeight,
            transform: [{ translateY: contentTranslateY }, { scale: scaleAnim }],
            opacity: Animated.multiply(opacityAnim, contentOpacity),
          },
        ]}
      >
        {/* Animated Avatar with Verified Shield & Radiant Pulse Ring */}
        <View style={styles.avatarGlowContainer}>
          <Animated.View
            style={[
              styles.pulseHaloRing,
              {
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.12],
                  outputRange: [0.6, 0.2],
                }),
              },
            ]}
          />
          <View style={styles.avatarBorderCircle}>
            <Image source={{ uri: partnerAvatar }} style={styles.avatarImage} />
            <View style={styles.verifiedFloatingPill}>
              <CheckCircle2 size={13} color="#FFFFFF" strokeWidth={2.8} />
            </View>
          </View>
        </View>

        {/* Clean "Servs Found!" Title */}
        <Text style={styles.matchedTitle}>Servs Found!</Text>

        {/* Clean Small-size Partner Name */}
        <Text style={styles.partnerNameText}>{partnerName}</Text>

        {/* Transitioning Progress Bar */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressLabel}>Connecting to live map route...</Text>
          <View style={styles.progressBarTrack}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
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
    backgroundColor: '#022C22',
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
    paddingHorizontal: 20,
  },
  avatarGlowContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pulseHaloRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#34D399',
  },
  avatarBorderCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  verifiedFloatingPill: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#059669',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchedTitle: {
    fontSize: 23,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  partnerNameText: {
    fontSize: 14,
    fontFamily: Fonts.Medium,
    color: 'rgba(236, 253, 245, 0.95)',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.1,
  },
  progressContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 220,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: Fonts.Medium,
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34D399',
    borderRadius: 2,
  },
});

export default ServsFoundBackdrop;
