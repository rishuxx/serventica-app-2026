import React, { useRef } from 'react';
import {
  Animated,
  TouchableOpacity,
  TouchableOpacityProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

export interface AnimatedTouchableProps extends TouchableOpacityProps {
  scaleTo?: number;
  containerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * AnimatedTouchable
 * Provides a tactile scale-down micro-interaction on press with smooth spring physics
 * matching high-frequency apps like Blinkit and Zepto.
 */
export const AnimatedTouchable: React.FC<AnimatedTouchableProps> = ({
  scaleTo = 0.96,
  onPress,
  onPressIn,
  onPressOut,
  children,
  style,
  containerStyle,
  disabled,
  ...props
}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = (event: any) => {
    if (disabled) return;
    Animated.spring(scaleValue, {
      toValue: scaleTo,
      damping: 15,
      mass: 0.5,
      stiffness: 280,
      useNativeDriver: true,
    }).start();
    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    if (disabled) return;
    Animated.spring(scaleValue, {
      toValue: 1,
      damping: 12,
      mass: 0.6,
      stiffness: 240,
      useNativeDriver: true,
    }).start();
    onPressOut?.(event);
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleValue }] }, containerStyle]}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        disabled={disabled}
        style={style}
        {...props}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};
