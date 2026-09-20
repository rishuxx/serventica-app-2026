import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
  G,
  Path,
  Circle,
} from 'react-native-svg';
import { ServenticaTokens } from '../../../../packages/design-system/src/tokens';

interface WelcomeSplashScreenProps {
  onFinish?: () => void;
}

const { width, height } = Dimensions.get('window');

// Curated subtle tips / status insights for the bottom section
const SPLASH_TIPS = [
  'Verified pros at your doorstep in minutes',
  'Craftsmanship backed by Serventica guarantee',
  'Transparent pricing, zero hidden charges',
  'Precision diagnostics & instant resolution',
];

export const WelcomeSplashScreen: React.FC<WelcomeSplashScreenProps> = ({ onFinish }) => {
  // Motion Drivers
  const contentFade = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const glassGlow = useRef(new Animated.Value(0.4)).current;
  const shimmerTranslate = useRef(new Animated.Value(-160)).current;
  const tipIndex = useRef(Math.floor(Math.random() * SPLASH_TIPS.length)).current;

  useEffect(() => {
    // 1. Entrance animation (Apple-style smooth cinematic fade & spring)
    Animated.parallel([
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Continuous Glass reflection breathing shimmer
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerTranslate, {
          toValue: 260,
          duration: 1700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(900),
        Animated.timing(shimmerTranslate, {
          toValue: -160,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerLoop.start();

    // 3. Subtle ambient glow pulsing
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glassGlow, {
          toValue: 0.85,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glassGlow, {
          toValue: 0.4,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    glowLoop.start();

    return () => {
      shimmerLoop.stop();
      glowLoop.stop();
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Full Solid Purple Gradient Background */}
      <Svg
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        width={width}
        height={height}
      >
        <Defs>
          <SvgLinearGradient
            id="fullPurpleGradient"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <Stop offset="0%" stopColor="#431371" stopOpacity="1" />
            <Stop offset="35%" stopColor="#2D0B52" stopOpacity="1" />
            <Stop offset="70%" stopColor="#1B0533" stopOpacity="1" />
            <Stop offset="100%" stopColor="#0F031E" stopOpacity="1" />
          </SvgLinearGradient>

          {/* Glass emblem subtle top-light reflection */}
          <SvgLinearGradient
            id="glassHighlight"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.30" />
            <Stop offset="40%" stopColor="#ffffff" stopOpacity="0.10" />
            <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
          </SvgLinearGradient>
        </Defs>

        <Rect x="0" y="0" width={width} height={height} fill="url(#fullPurpleGradient)" />
      </Svg>

      {/* Main Content Area */}
      <Animated.View style={[styles.mainContent, { opacity: contentFade }]}>
        {/* CENTER: Apple-style Glassmorphic Serventica Vector Logo */}
        <View style={styles.centerSection}>
          <Animated.View
            style={[
              styles.ambientAura,
              {
                opacity: glassGlow,
                transform: [{ scale: logoScale }],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.glassCard,
              {
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            {/* Shimmer light sweep across the glass */}
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

            {/* Crisp Vector Logo from ServenticaLogo.svg */}
            <Svg
              viewBox="0 0 220.48 34.98"
              width={168}
              height={27}
              style={styles.svgLogo}
            >
              <Defs>
                <SvgLinearGradient id="logoFrostGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#EDE9FE" stopOpacity="0.94" />
                </SvgLinearGradient>
              </Defs>
              <G id="ServenticaWordmark">
                {/* S */}
                <Path
                  fill="url(#logoFrostGrad)"
                  d="M19.39,10.75c-.17-1.68-.77-2.93-1.83-3.75-1.05-.82-2.61-1.23-4.69-1.23-1.94,0-3.4.33-4.39.99-.99.66-1.48,1.61-1.48,2.86,0,1.05.39,1.89,1.16,2.52.77.62,2.08,1.17,3.92,1.63,1.87.46,3.66.91,5.35,1.36s3.15.95,4.37,1.5c.72.33,1.4.71,2.02,1.13.62.43,1.17.95,1.63,1.58.46.62.82,1.37,1.09,2.22.26.86.39,1.86.39,3.01,0,1.81-.32,3.36-.96,4.66-.64,1.3-1.55,2.38-2.71,3.23-1.17.86-2.55,1.49-4.14,1.9-1.6.41-3.35.62-5.25.62-2.04,0-3.9-.22-5.57-.67s-3.12-1.13-4.34-2.05c-1.22-.92-2.17-2.06-2.86-3.43-.69-1.36-1.05-2.97-1.09-4.81h6.61c.07,1.68.75,3,2.05,3.97,1.3.97,3.05,1.46,5.25,1.46,2.04,0,3.61-.4,4.71-1.21,1.1-.81,1.65-1.95,1.65-3.43,0-.49-.07-.94-.22-1.33-.15-.4-.41-.76-.79-1.11-.38-.35-.9-.66-1.55-.94-.66-.28-1.5-.53-2.52-.76-2.04-.46-3.76-.86-5.16-1.21-1.4-.35-2.67-.78-3.82-1.31-1.78-.79-3.13-1.82-4.07-3.08-.94-1.27-1.41-2.94-1.41-5.01,0-1.48.25-2.84.74-4.07s1.24-2.29,2.24-3.18c1-.89,2.25-1.58,3.75-2.07,1.5-.49,3.25-.74,5.25-.74s3.91.26,5.53.79c1.61.53,2.97,1.27,4.07,2.22,1.1.95,1.96,2.09,2.56,3.4.61,1.32.94,2.76,1.01,4.34h-6.51Z"
                />
                {/* e */}
                <Path
                  fill="url(#logoFrostGrad)"
                  d="M33.59,23.38c.1,1.84.63,3.31,1.6,4.39.97,1.09,2.24,1.63,3.82,1.63,1.05,0,1.98-.24,2.79-.72.81-.48,1.32-1.14,1.55-2h6.61c-.76,2.5-2.07,4.42-3.95,5.77-1.87,1.35-4.11,2.02-6.71,2.02-8.09,0-12.14-4.41-12.14-13.22,0-1.87.26-3.57.79-5.08.53-1.51,1.29-2.81,2.29-3.9,1-1.09,2.23-1.92,3.68-2.49,1.45-.58,3.11-.86,4.98-.86,3.75,0,6.59,1.2,8.51,3.6,1.92,2.4,2.89,6.02,2.89,10.85h-16.72ZM43.71,19.34c-.03-.89-.19-1.67-.47-2.34-.28-.67-.65-1.23-1.11-1.68-.46-.44-.99-.77-1.58-.99-.59-.21-1.2-.32-1.83-.32-1.28,0-2.39.47-3.33,1.41s-1.47,2.24-1.6,3.92h9.92Z"
                />
                {/* r */}
                <Path
                  fill="url(#logoFrostGrad)"
                  d="M51.5,33.84V9.57h6.02v2.91c.53-.82,1.08-1.46,1.65-1.92.58-.46,1.17-.81,1.78-1.06.61-.25,1.23-.4,1.85-.47.62-.07,1.27-.1,1.92-.1h.84v6.56c-.59-.1-1.18-.15-1.78-.15-3.91,0-5.87,1.96-5.87,5.87v12.63h-6.41Z"
                />
                {/* v */}
                <Path
                  fill="url(#logoFrostGrad)"
                  d="M73.85,33.84l-8.68-24.27h7.15l5.08,16.03,5.13-16.03h6.76l-8.73,24.27h-6.71Z"
                />
                {/* e */}
                <Path
                  fill="url(#logoFrostGrad)"
                  d="M94.17,23.38c.1,1.84.63,3.31,1.6,4.39.97,1.09,2.24,1.63,3.82,1.63,1.05,0,1.98-.24,2.79-.72.81-.48,1.32-1.14,1.55-2h6.61c-.76,2.5-2.07,4.42-3.95,5.77-1.87,1.35-4.11,2.02-6.71,2.02-8.09,0-12.14-4.41-12.14-13.22,0-1.87.26-3.57.79-5.08.53-1.51,1.29-2.81,2.29-3.9,1-1.09,2.23-1.92,3.68-2.49,1.45-.58,3.11-.86,4.98-.86,3.75,0,6.59,1.2,8.51,3.6,1.92,2.4,2.89,6.02,2.89,10.85h-16.72ZM104.29,19.34c-.03-.89-.19-1.67-.47-2.34-.28-.67-.65-1.23-1.11-1.68-.46-.44-.99-.77-1.58-.99-.59-.21-1.2-.32-1.83-.32-1.28,0-2.39.47-3.33,1.41s-1.47,2.24-1.6,3.92h9.92Z"
                />
                {/* n */}
                <Path
                  fill="url(#logoFrostGrad)"
                  d="M127.62,33.84v-14.7c0-1.87-.31-3.14-.94-3.8-.62-.66-1.69-.99-3.21-.99-3.32,0-4.98,1.86-4.98,5.57v13.91h-6.41V9.57h6.12v3.55c.76-1.38,1.76-2.42,3.01-3.13,1.25-.71,2.86-1.06,4.83-1.06,1.15,0,2.22.17,3.21.52.99.35,1.83.86,2.54,1.55.71.69,1.27,1.54,1.68,2.54.41,1,.62,2.16.62,3.48v16.82h-6.46Z"
                />
                {/* t */}
                <Path
                  fill="url(#logoFrostGrad)"
                  d="M149.62,17.86h5.97v6.91c0,1.28-.19,2.51-.57,3.68-.38,1.17-.97,2.2-1.78,3.11-.81.9-1.83,1.62-3.06,2.15-1.23.53-2.71.79-4.42.79s-3.29-.26-4.54-.79c-1.25-.53-2.28-1.23-3.08-2.12-.81-.89-1.39-1.92-1.75-3.11-.36-1.18-.54-2.43-.54-3.75V3.01h6.31v6.56h13.42v4.54h-13.42v9.96c0,1.55.29,2.74.86,3.58.57.84,1.52,1.26,2.84,1.26s2.23-.41,2.84-1.23c.61-.82.91-1.99.91-3.5v-6.31Z"
                />
                {/* i */}
                <Path
                  fill="url(#logoFrostGrad)"
                  d="M157.32,6.66V.69h6.41v5.97h-6.41ZM157.32,33.84V9.57h6.41v24.27h-6.41Z"
                />
                {/* c */}
                <Path
                  fill="url(#logoFrostGrad)"
                  d="M187.46,25.06c-.17,1.41-.57,2.7-1.21,3.85-.64,1.15-1.46,2.14-2.44,2.96-.99.82-2.11,1.46-3.38,1.92-1.27.46-2.64.69-4.12.69-1.64,0-3.15-.27-4.51-.81-1.37-.54-2.54-1.36-3.53-2.47-.99-1.1-1.75-2.47-2.29-4.09-.54-1.63-.81-3.53-.81-5.7s.27-4.04.81-5.62c.54-1.58,1.31-2.87,2.29-3.87.99-1,2.18-1.75,3.58-2.24,1.4-.49,2.95-.74,4.66-.74,1.58,0,3.02.21,4.32.64,1.3.43,2.43,1.05,3.4,1.87.97.82,1.73,1.81,2.29,2.96.56,1.15.89,2.43.99,3.85h-6.46c-.17-1.25-.67-2.23-1.5-2.94-.84-.71-1.87-1.06-3.08-1.06-.69,0-1.33.12-1.92.35-.59.23-1.11.62-1.55,1.16-.44.54-.8,1.27-1.06,2.17-.26.9-.4,2.01-.4,3.33,0,2.66.48,4.64,1.43,5.92s2.06,1.92,3.31,1.92,2.32-.35,3.21-1.04c.89-.69,1.4-1.69,1.53-3.01h6.46Z"
                />
                {/* a */}
                <Path
                  fill="url(#logoFrostGrad)"
                  d="M203.49,33.84c-.2-.62-.33-1.35-.39-2.17-.76.86-1.76,1.54-3.01,2.05-1.25.51-2.7.76-4.34.76-2.79,0-4.84-.62-6.14-1.85-1.3-1.23-1.95-2.84-1.95-4.81,0-1.74.28-3.13.84-4.17.56-1.04,1.33-1.85,2.32-2.44.99-.59,2.16-1.03,3.53-1.31,1.36-.28,2.85-.53,4.46-.76,1.61-.23,2.7-.53,3.26-.91.56-.38.84-.99.84-1.85,0-.79-.37-1.41-1.11-1.85-.74-.44-1.74-.67-2.99-.67-1.48,0-2.54.33-3.18.99-.64.66-1.04,1.53-1.21,2.61h-5.97c.03-1.25.24-2.4.62-3.45.38-1.05.99-1.96,1.83-2.71.84-.76,1.93-1.34,3.28-1.75,1.35-.41,2.99-.62,4.93-.62s3.53.21,4.86.64c1.33.43,2.4,1.04,3.21,1.85.81.81,1.39,1.81,1.75,3.01.36,1.2.54,2.56.54,4.07v15.34h-5.97ZM203.05,21.95c-.33.33-.81.59-1.43.79-.62.2-1.53.41-2.71.64-1.84.36-3.11.82-3.8,1.38-.69.56-1.04,1.37-1.04,2.42,0,1.81,1.04,2.71,3.11,2.71.82,0,1.59-.14,2.29-.42.71-.28,1.32-.66,1.83-1.13.51-.48.92-1.04,1.23-1.68s.47-1.32.47-2.05l.05-2.66Z"
                />
                {/* Yellow dot on the right */}
                <Circle cx="216.75" cy="29.9" r="3.73" fill="#F59E0B" />
              </G>
            </Svg>
          </Animated.View>
        </View>

        {/* BOTTOM: Minimal Divider + Extra Small Tips / Status Line */}
        <View style={styles.bottomSection}>
          <View style={styles.dividerLine} />
          <Text style={styles.tipText} numberOfLines={1}>
            {SPLASH_TIPS[tipIndex]}
          </Text>
          <Text style={styles.subVersionText}>SERVENTICA • VERSION 1.0</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B0533',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ambientAura: {
    position: 'absolute',
    width: 220,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(168, 85, 247, 0.28)',
    shadowColor: '#c084fc',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 50,
    elevation: 24,
  },
  glassCard: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  shimmerBar: {
    position: 'absolute',
    top: -50,
    left: 0,
    width: 28,
    height: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  svgLogo: {
    alignSelf: 'center',
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 8,
  },
  dividerLine: {
    width: 44,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    marginBottom: 14,
  },
  tipText: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: 'rgba(255, 255, 255, 0.70)',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  subVersionText: {
    fontSize: 9,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
