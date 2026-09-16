import React from 'react';
import { TouchableOpacity, StyleSheet, GestureResponderEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ServiceCardTokens } from './tokens';

interface FavoriteButtonProps {
  active?: boolean;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  accessibilityLabel?: string;
  outlineColor?: string;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = React.memo(({
  active = false,
  onPress,
  size = 36,
  iconSize = 20,
  accessibilityLabel = 'Toggle favorite',
  outlineColor = '#FFFFFF',
}) => {
  const handlePress = (e: GestureResponderEvent) => {
    // Stop propagation so touching the heart does not trigger card navigation
    e.stopPropagation();
    onPress?.();
  };

  const heartPath =
    'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          width: size,
          height: size,
        },
      ]}
      activeOpacity={0.7}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        style={styles.svgDropShadow}
      >
        {active ? (
          <Path
            d={heartPath}
            fill={ServiceCardTokens.colors.favoriteActive}
            stroke="#FFFFFF"
            strokeWidth={0.8}
          />
        ) : (
          <Path
            d={heartPath}
            fill="none"
            stroke={outlineColor}
            strokeWidth={2.2}
          />
        )}
      </Svg>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'transparent', // No grey circle background
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  svgDropShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
  },
});
