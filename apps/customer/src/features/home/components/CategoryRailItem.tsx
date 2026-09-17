import React, { useRef } from 'react';
import { StyleSheet, TouchableOpacity, Text, View, Animated } from 'react-native';
import { CategoryItem } from '../../../types/category.types';
import { CategoryIcon } from './CategoryIcon';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

interface CategoryItemProps {
  category: CategoryItem;
  isSelected: boolean;
  onPress: (category: CategoryItem) => void;
  variant?: 'hero' | 'sticky';
  isDarkBackground?: boolean;
}

export const CategoryRailItem: React.FC<CategoryItemProps> = React.memo(({
  category,
  isSelected,
  onPress,
  variant = 'hero',
  isDarkBackground = false,
}) => {
  const pressScale = useRef(new Animated.Value(1)).current;
  
  // Contrast adaptation: when background is dark, use white labels and icons
  const defaultContrastColor = isDarkBackground ? '#FFFFFF' : '#1E242B';
  const defaultSubtextColor = isDarkBackground ? 'rgba(255, 255, 255, 0.92)' : '#222222';
  const defaultUnselectedColor = isDarkBackground ? 'rgba(255, 255, 255, 0.72)' : '#555555';
  
  const iconColor = isSelected ? defaultContrastColor : defaultUnselectedColor;
  const textColor = isSelected ? defaultContrastColor : (isDarkBackground ? defaultSubtextColor : '#444444');

  const label = category.short_name || category.name;

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.92,
      speed: 40,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      speed: 25,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.containerWrapper,
        { transform: [{ scale: pressScale }] },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.container,
          isSelected && (isDarkBackground ? styles.selectedContainerDark : styles.selectedContainerLight),
        ]}
        activeOpacity={0.85}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onPress(category)}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${category.name} service category`}
      >
        <View style={styles.iconWrapper}>
          <CategoryIcon
            name={category.icon || undefined}
            size={21}
            color={iconColor}
            strokeWidth={isSelected ? 1.9 : 1.55}
          />
        </View>
        <Text
          style={[
            styles.label,
            { color: textColor },
            isSelected && styles.selectedLabel,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {isSelected ? (
          <View
            style={[
              styles.activeIndicator,
              { backgroundColor: isDarkBackground ? '#FFFFFF' : '#1E242B' },
            ]}
          />
        ) : (
          <View style={styles.indicatorPlaceholder} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  containerWrapper: {
    marginRight: 4,
  },
  container: {
    minWidth: 68,
    maxWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 14,
    minHeight: 52,
  },
  selectedContainerLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  selectedContainerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
  },
  iconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  label: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    textAlign: 'center',
    letterSpacing: 0,
    lineHeight: 14,
  },
  selectedLabel: {
    fontFamily: ServenticaTokens.fonts.SemiBold,
  },
  activeIndicator: {
    width: 16,
    height: 2.2,
    borderRadius: 1.1,
    marginTop: 3,
  },
  indicatorPlaceholder: {
    width: 16,
    height: 2.2,
    marginTop: 3,
    backgroundColor: 'transparent',
  },
});


