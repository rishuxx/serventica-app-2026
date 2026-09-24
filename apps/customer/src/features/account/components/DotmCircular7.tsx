import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';

export interface DotmCircular7Props {
  size?: number;
  dotSize?: number;
  speed?: number;
  color?: string;
  animated?: boolean;
  style?: ViewStyle;
}

const BASE_OPACITY = 0.08;
const GATE_OPACITY = 0.95;
const GRID_DIM = 7; // 7x7 matrix grid

/** Circular mask test for 7x7 grid centered at (3,3) */
function isWithinCircularMask(row: number, col: number): boolean {
  const r = 3;
  const dx = col - r;
  const dy = row - r;
  return dx * dx + dy * dy <= 10.5;
}

const SAMPLE_STEPS = 48; // Precomputed samples along full [0, 1] cycle for buttery 120fps interpolation

interface AnimatedDotItemProps {
  left: number;
  top: number;
  dotSize: number;
  color: string;
  opacityInterpolation: Animated.AnimatedInterpolation<number>;
}

const AnimatedDotItem: React.FC<AnimatedDotItemProps> = React.memo(({
  left,
  top,
  dotSize,
  color,
  opacityInterpolation,
}) => {
  return (
    <Animated.View
      style={[
        styles.dot,
        {
          left,
          top,
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: color,
          opacity: opacityInterpolation,
        },
      ]}
    />
  );
});

export function DotmCircular7({
  size = 140,
  dotSize = 10,
  speed = 1.8,
  color = '#FFFFFF',
  animated = true,
  style,
}: DotmCircular7Props) {
  const phaseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) {
      phaseAnim.setValue(0);
      return;
    }

    const duration = Math.round(1600 / Math.max(0.2, speed));
    const loop = Animated.loop(
      Animated.timing(phaseAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true, // NATIVE DRIVER: Runs entirely on Android/iOS native render thread at 120fps/display refresh rate
      })
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [animated, speed, phaseAnim]);

  // Pre-calculate positions and native opacity interpolations for each dot in the circular mask
  const dots = useMemo(() => {
    const list: {
      left: number;
      top: number;
      opacityInterpolation: Animated.AnimatedInterpolation<number>;
    }[] = [];

    const step = (size - dotSize) / (GRID_DIM - 1);
    const inputRange: number[] = [];
    for (let s = 0; s <= SAMPLE_STEPS; s++) {
      inputRange.push(s / SAMPLE_STEPS);
    }

    for (let row = 0; row < GRID_DIM; row++) {
      for (let col = 0; col < GRID_DIM; col++) {
        if (isWithinCircularMask(row, col)) {
          const x = col - 3;
          const y = row - 3;
          const ring = Math.sqrt(x * x + y * y);
          const angle = Math.atan2(y, x);

          const outputRange = inputRange.map((phase) => {
            const t = phase * Math.PI * 2;
            const petalWave = 0.5 + 0.5 * Math.cos(5 * angle - t * 1.7);
            const ringWave = 0.5 + 0.5 * Math.cos(ring * 3.3 - t * 1.2);
            const chordWave = 0.5 + 0.5 * Math.cos((x + y) * 1.6 + t * 1.35);

            const petalGate = Math.pow(petalWave, 2.2);
            const blend = 0.68 * petalGate + 0.22 * ringWave + 0.1 * chordWave;
            const opacity = BASE_OPACITY + (GATE_OPACITY - BASE_OPACITY) * blend;
            return Math.min(1, Math.max(BASE_OPACITY, opacity));
          });

          const opacityInterpolation = phaseAnim.interpolate({
            inputRange,
            outputRange,
            extrapolate: 'clamp',
          });

          list.push({
            left: col * step,
            top: row * step,
            opacityInterpolation,
          });
        }
      }
    }
    return list;
  }, [size, dotSize, phaseAnim]);

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {dots.map((dot, index) => (
        <AnimatedDotItem
          key={index}
          left={dot.left}
          top={dot.top}
          dotSize={dotSize}
          color={color}
          opacityInterpolation={dot.opacityInterpolation}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
  },
});

export default DotmCircular7;
