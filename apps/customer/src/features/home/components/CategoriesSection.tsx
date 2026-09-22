import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { HomeCategoryItem } from '../../../types/home.types';
import { AssetRegistry } from '../../../services/home.service';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40 - 24) / 3;

interface CategoriesSectionProps {
  categories: HomeCategoryItem[];
  onSelectCategory?: (category: HomeCategoryItem) => void;
}

export const CategoriesSection: React.FC<CategoriesSectionProps> = React.memo(({
  categories,
  onSelectCategory,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {categories.slice(0, 3).map((category, index) => {
          const imageSource = AssetRegistry[category.image_url] || AssetRegistry.category_services;
          const key = category.id ? `home_cat_sec_${category.id}` : `home_cat_sec_${index}`;
          return (
            <View key={key} style={styles.cardWrapper}>
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => onSelectCategory && onSelectCategory(category)}
                accessibilityLabel={category.name}
              >
                <Image source={imageSource} style={styles.cardImage} resizeMode="cover" />
              </TouchableOpacity>
              <Text style={styles.categoryTitle}>{category.name}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardWrapper: {
    width: CARD_WIDTH,
    alignItems: 'center',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.48,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    shadowColor: '#1E242B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 8,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  categoryTitle: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#1E242B',
    textAlign: 'center',
    marginTop: 2,
  },
});
