import React, { useCallback, useRef, useEffect } from 'react';
import { StyleSheet, FlatList, View } from 'react-native';
import { CategoryItem } from '../../../types/category.types';
import { CategoryRailItem } from './CategoryRailItem';

interface CategoryRailProps {
  categories: CategoryItem[];
  selectedCategoryId: string | null;
  onSelectCategory: (category: CategoryItem) => void;
  variant?: 'hero' | 'sticky';
  isDarkBackground?: boolean;
}

export const CategoryRail: React.FC<CategoryRailProps> = React.memo(({
  categories,
  selectedCategoryId,
  onSelectCategory,
  variant = 'hero',
  isDarkBackground = false,
}) => {
  const flatListRef = useRef<FlatList>(null);

  // Strictly filter out any isolated appliance subcategory buttons from the rail
  const displayCategories = React.useMemo(() => {
    const isSeparateAppliance = (cat: CategoryItem) => {
      const slug = (cat.slug || '').toLowerCase().trim();
      const name = (cat.name || '').toLowerCase().trim();
      if (slug === 'ac-appliances' || name.includes('& appliance') || name.includes('& appliances')) {
        return false;
      }
      if (slug === 'ac' || slug === 'ac-repair' || slug === 'air-conditioner' || name === 'ac' || name === 'air conditioner') {
        return true;
      }
      return (
        slug.includes('refrigerator') ||
        slug.includes('fridge') ||
        slug.includes('washing') ||
        slug.includes('television') ||
        slug === 'tv' ||
        slug.includes('microwave') ||
        slug.includes('chimney') ||
        slug.includes('geyser') ||
        name.includes('refrigerator') ||
        name.includes('fridge') ||
        name.includes('washing') ||
        name.includes('television') ||
        name === 'tv' ||
        name.includes('microwave') ||
        name.includes('chimney') ||
        name.includes('geyser')
      );
    };

    return categories.filter((cat) => !isSeparateAppliance(cat));
  }, [categories]);

  // Smoothly center the active category in the viewport when selectedCategoryId changes
  useEffect(() => {
    if (!selectedCategoryId || !displayCategories.length) return;
    const targetIndex = displayCategories.findIndex((c) => c.id === selectedCategoryId || c.slug === selectedCategoryId);
    if (targetIndex !== -1 && flatListRef.current) {
      try {
        flatListRef.current.scrollToIndex({
          index: targetIndex,
          animated: true,
          viewPosition: 0.5,
        });
      } catch (_) {
        // Handled by onScrollToIndexFailed
      }
    }
  }, [selectedCategoryId, displayCategories]);

  const handleItemPress = useCallback((category: CategoryItem) => {
    const index = displayCategories.findIndex((c) => c.id === category.id);
    if (index !== -1 && flatListRef.current) {
      try {
        flatListRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
      } catch (_) {
        // Safe fallback
      }
    }
    onSelectCategory(category);
  }, [displayCategories, onSelectCategory]);

  const renderItem = useCallback(({ item }: { item: CategoryItem }) => (
    <CategoryRailItem
      category={item}
      isSelected={selectedCategoryId === item.id || selectedCategoryId === item.slug}
      onPress={handleItemPress}
      variant={variant}
      isDarkBackground={isDarkBackground}
    />
  ), [selectedCategoryId, handleItemPress, variant, isDarkBackground]);

  const keyExtractor = useCallback((item: CategoryItem) => item.id, []);

  return (
    <View style={[styles.wrapper, variant === 'sticky' && styles.stickyWrapper]}>
      <FlatList
        ref={flatListRef}
        data={displayCategories}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        nestedScrollEnabled={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={5}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
              viewPosition: 0.5,
            });
          }, 60);
        }}
      />
    </View>
  );
});

export const CategoryRailSkeleton: React.FC<{ isDarkBackground?: boolean }> = React.memo(({ isDarkBackground = false }) => {
  const placeholderColor = isDarkBackground ? 'rgba(255, 255, 255, 0.18)' : '#ECECEC';
  const textColor = isDarkBackground ? 'rgba(255, 255, 255, 0.12)' : '#E0E0E0';

  return (
    <View style={styles.wrapper}>
      <View style={[styles.scrollContent, { flexDirection: 'row' }]}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={[styles.skeletonItem, { backgroundColor: 'transparent' }]}>
            <View style={[styles.skeletonIcon, { backgroundColor: placeholderColor }]} />
            <View style={[styles.skeletonLabel, { backgroundColor: textColor }]} />
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    paddingVertical: 2,
    position: 'relative',
  },
  stickyWrapper: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    paddingHorizontal: 8,
  },
  scrollContent: {
    paddingHorizontal: 10,
    alignItems: 'center',
    position: 'relative',
  },
  skeletonItem: {
    minWidth: 68,
    maxWidth: 88,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginRight: 4,
  },
  skeletonIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginBottom: 5,
  },
  skeletonLabel: {
    width: 44,
    height: 10,
    borderRadius: 5,
  },
});


