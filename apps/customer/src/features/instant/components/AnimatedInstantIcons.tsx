/**
 * SERVENTICA — Instant Master Service Images & Micro-Animations
 * Displays authentic comic pop-art sticker illustrations for the 4 Instant Services:
 * 1) Helping Hand (Handshake Pop Art Sticker)
 * 2) Road Help (Mechanic Repair Bike Sticker)
 * 3) Laundry (Fresh Wash Laundry Basket Sticker)
 * 4) Pack & Move (Truck & Mover Cargo Sticker)
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet, Image } from 'react-native';
import { InstantImages } from '../../../assets/images/instant';

export interface AnimatedIconProps {
  size?: number;
  inactive?: boolean;
  animated?: boolean;
}

// -------------------------------------------------------------
// 1. HELPING HAND (Pop-Art Handshake Sticker)
// -------------------------------------------------------------
export const AnimatedHelpingHandIcon: React.FC<AnimatedIconProps> = ({
  size = 54,
  inactive = false,
  animated = true,
}) => {
  const tiltAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated || inactive) return;

    const swingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(tiltAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(tiltAnim, {
          toValue: -1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(tiltAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    swingLoop.start();
    return () => swingLoop.stop();
  }, [animated, inactive, tiltAnim]);

  const rotation = tiltAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-5deg', '0deg', '5deg'],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: rotation }],
          opacity: inactive ? 0.4 : 1,
        }}
      >
        <Image
          source={InstantImages.helpingHand}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

// -------------------------------------------------------------
// 2. ROAD HELP (Pop-Art Mechanic Repair Bike Sticker)
// -------------------------------------------------------------
export const AnimatedRoadHelpIcon: React.FC<AnimatedIconProps> = ({
  size = 54,
  inactive = false,
  animated = true,
}) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated || inactive) return;

    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -2,
          duration: 350,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0.5,
          duration: 350,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    bounceLoop.start();
    return () => bounceLoop.stop();
  }, [animated, inactive, bounceAnim]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateY: bounceAnim }],
          opacity: inactive ? 0.4 : 1,
        }}
      >
        <Image
          source={InstantImages.roadHelp}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

// -------------------------------------------------------------
// 3. LAUNDRY (Pop-Art Fresh Wash Basket Sticker)
// -------------------------------------------------------------
export const AnimatedLaundryIcon: React.FC<AnimatedIconProps> = ({
  size = 54,
  inactive = false,
  animated = true,
}) => {
  const swayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated || inactive) return;

    const swayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(swayAnim, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(swayAnim, {
          toValue: -1,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(swayAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    swayLoop.start();
    return () => swayLoop.stop();
  }, [animated, inactive, swayAnim]);

  const rotation = swayAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-4deg', '0deg', '4deg'],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: rotation }],
          opacity: inactive ? 0.4 : 1,
        }}
      >
        <Image
          source={InstantImages.laundry}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

// -------------------------------------------------------------
// 4. PACK & MOVE (Pop-Art Shifting Truck & Mover Sticker)
// -------------------------------------------------------------
export const AnimatedPackMoveIcon: React.FC<AnimatedIconProps> = ({
  size = 54,
  inactive = false,
  animated = true,
}) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated || inactive) return;

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -3,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();
    return () => floatLoop.stop();
  }, [animated, inactive, floatAnim]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateY: floatAnim }],
          opacity: inactive ? 0.4 : 1,
        }}
      >
        <Image
          source={InstantImages.packAndMove}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
