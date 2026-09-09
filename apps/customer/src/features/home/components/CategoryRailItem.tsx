import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
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
  const isHero = variant === 'hero';
  
  // Contrast adaptation: when background is dark, use white labels, icons & indicators
  const defaultContrastColor = isDarkBackground ? '#FFFFFF' : '#111111';
  const defaultSubtextColor = isDarkBackground ? 'rgba(255, 255, 255, 0.90)' : '#222222';
  const defaultUnselectedColor = isDarkBackground ? 'rgba(255, 255, 255, 0.75)' : '#555555';
  
  const iconColor = isSelected ? defaultContrastColor : defaultUnselectedColor;
  const textColor = isSelected ? defaultContrastColor : (isDarkBackground ? defaultSubtextColor : '#444444');

  const label = category.short_name || category.name;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected && (isDarkBackground ? styles.selectedContainerDark : styles.selectedContainerLight),
      ]}
      activeOpacity={0.75}
      onPress={() => onPress(category)}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityLabel={`${category.name} service category`}
    >
      <View style={styles.iconWrapper}>
        <CategoryIcon
          name={category.icon}
          size={21}
          color={iconColor}
          strokeWidth={1.65}
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
      {isSelected && (
        <View
          style={[
            styles.activeIndicator,
            { backgroundColor: isDarkBackground ? '#FFFFFF' : '#111111' },
          ]}
        />
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    minWidth: 64,
    maxWidth: 82,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 6,
    marginRight: 4,
    borderRadius: 12,
    minHeight: 48, // Accessible touch target > 44px
  },
  selectedContainerLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.07)',
  },
  selectedContainerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
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
    fontWeight: '600',
  },
  activeIndicator: {
    width: 16,
    height: 2,
    borderRadius: 1,
    marginTop: 3,
  },
});
