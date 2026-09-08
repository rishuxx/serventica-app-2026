import React, { useCallback } from 'react';
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
  const renderItem = useCallback(({ item }: { item: CategoryItem }) => (
    <CategoryRailItem
      category={item}
      isSelected={selectedCategoryId === item.id}
      onPress={onSelectCategory}
      variant={variant}
      isDarkBackground={isDarkBackground}
    />
  ), [selectedCategoryId, onSelectCategory, variant, isDarkBackground]);

  const keyExtractor = useCallback((item: CategoryItem) => item.id, []);

  return (
    <View style={[styles.wrapper, variant === 'sticky' && styles.stickyWrapper]}>
      <FlatList
        data={categories}
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
  },
  stickyWrapper: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  scrollContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  skeletonItem: {
    minWidth: 64,
    maxWidth: 82,
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 6,
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
