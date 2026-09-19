import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from 'react-native';
import { HomeBannerItem } from '../../../types/home.types';
import { AssetRegistry } from '../../../services/home.service';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

interface OriginalsSectionProps {
  banners: HomeBannerItem[];
  onSelectBanner?: (banner: HomeBannerItem) => void;
}

export const OriginalsSection: React.FC<OriginalsSectionProps> = React.memo(({
  banners,
  onSelectBanner,
}) => {
  const keyExtractor = useCallback((item: HomeBannerItem) => item.id, []);

  const renderItem = useCallback(({ item }: { item: HomeBannerItem }) => {
    const imageSource = AssetRegistry[item.image_url] || AssetRegistry.banner_gardener;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => onSelectBanner && onSelectBanner(item)}
        accessibilityLabel={item.title}
      >
        <Image source={imageSource} style={styles.bannerImage} resizeMode="cover" />
      </TouchableOpacity>
    );
  }, [onSelectBanner]);

  return (
    <View style={styles.container}>
      <FlatList
        data={banners}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        snapToInterval={CARD_WIDTH + 14}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 14,
  },
  card: {
    width: CARD_WIDTH,
    height: 195,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#262626',
    position: 'relative',
    shadowColor: '#1E242B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  favoriteBadge: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  heartIcon: {
    fontSize: 16,
  },
  overlayContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  greenBadge: {
    backgroundColor: '#15803d',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orangeBadge: {
    backgroundColor: '#d97706',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: ServenticaTokens.fonts.Bold,
  },
  titleText: {
    color: '#eab308',
    fontSize: 22,
    fontFamily: ServenticaTokens.fonts.Bold,
    letterSpacing: 0,
  },
  subtitleText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Regular,
    marginTop: 2,
    lineHeight: 16,
  },
});
