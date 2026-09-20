import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  Animated,
  Dimensions,
  Easing,
  Image,
} from 'react-native';
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import { ServenticaTokens } from '../../../../packages/design-system/src/tokens';
import { AssetRegistry } from '../services/home.service';

interface WelcomeSplashScreenProps {
  onFinish?: () => void;
}

const { width, height } = Dimensions.get('window');

export const WelcomeSplashScreen: React.FC<WelcomeSplashScreenProps> = ({ onFinish }) => {
  // Animation values for smooth, high-end feel
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const shimmerTranslate = useRef(new Animated.Value(-120)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Enter animation sequence
    Animated.parallel([
      // Smooth fade-in + subtle scale pop for the logo
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      // Gentle ambient purple radial glow fade-in
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      // Tagline subtle fade in
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 800,
        delay: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Continuous elegant shimmer effect across the glass badge
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerTranslate, {
          toValue: 240,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(800),
        Animated.timing(shimmerTranslate, {
          toValue: -120,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerLoop.start();

    return () => {
      shimmerLoop.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Subtle luxury ambient purple gradient background */}
      <Svg
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        width={width}
        height={height}
      >
        <Defs>
          <RadialGradient
            id="purpleAmbientGlow"
            cx="50%"
            cy="48%"
            rx="65%"
            ry="45%"
            fx="50%"
            fy="48%"
          >
            <Stop offset="0%" stopColor="#4A1E75" stopOpacity="0.55" />
            <Stop offset="45%" stopColor="#2A0E49" stopOpacity="0.30" />
            <Stop offset="80%" stopColor="#140824" stopOpacity="0.12" />
            <Stop offset="100%" stopColor="#0B0612" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="#0C0814" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#purpleAmbientGlow)" />
      </Svg>

      {/* Centered Glassmorphic Emblem Card */}
      <View style={styles.centerContainer}>
        <Animated.View
          style={[
            styles.glowRing,
            {
              opacity: glowOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.glassCard,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          {/* Subtle light shimmer sweep */}
          <Animated.View
            style={[
              styles.shimmerBar,
              {
                transform: [
                  { translateX: shimmerTranslate },
                  { rotate: '25deg' },
                ],
              },
            ]}
          />

          {/* Serventica Crisp Logo */}
          <View style={styles.logoRow}>
            <Image
              source={AssetRegistry.top_logo}
              style={styles.logoImage}
              resizeMode="contain"
            />
            {/* Signature Gold Accent Dot */}
            <View style={styles.goldDot} />
          </View>
        </Animated.View>

        {/* Minimal, classy brand tagline */}
        <Animated.View style={[styles.taglineBox, { opacity: taglineOpacity }]}>
          <Text style={styles.taglineText}>
            Instant Services <Text style={styles.taglineBullet}>•</Text> Perfect Craft
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0814',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    width: width * 0.72,
    height: width * 0.72,
    borderRadius: (width * 0.72) / 2,
    backgroundColor: 'rgba(147, 51, 234, 0.18)',
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 20,
  },
  glassCard: {
    paddingHorizontal: 34,
    paddingVertical: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  shimmerBar: {
    position: 'absolute',
    top: -60,
    left: 0,
    width: 36,
    height: 180,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: width * 0.54,
    height: 44,
    tintColor: '#FFFFFF',
  },
  goldDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#ffc107',
    marginLeft: 3,
    marginBottom: 4,
    shadowColor: '#ffc107',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  taglineBox: {
    marginTop: 22,
    alignItems: 'center',
  },
  taglineText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  taglineBullet: {
    color: '#ffc107',
    fontSize: 12,
  },
});
