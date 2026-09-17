import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, StyleProp, ViewStyle, DimensionValue } from 'react-native';

interface ShimmerPlaceholderProps {
  width: DimensionValue;
  height: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const ShimmerPlaceholder: React.FC<ShimmerPlaceholderProps> = ({
  width,
  height,
  borderRadius = 12,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.38, 0.85],
  });

  return (
    <View style={[{ width, height, borderRadius, overflow: 'hidden', backgroundColor: '#F1F3F5' }, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: '#E2E8F0',
            opacity,
          },
        ]}
      />
    </View>
  );
};
