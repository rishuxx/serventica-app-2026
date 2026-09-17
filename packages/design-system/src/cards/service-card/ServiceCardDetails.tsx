import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ServiceCardTokens } from './tokens';
import { ServiceCardSize } from './types';

interface ServiceCardDetailsProps {
  title: string;
  rating?: number;
  reviewCount?: number;
  categories?: string[];
  price?: number;
  originalPrice?: number;
  durationMinutes?: number;
  size?: ServiceCardSize;
}

export const ServiceCardDetails: React.FC<ServiceCardDetailsProps> = React.memo(({
  title,
  rating,
  reviewCount,
  categories,
  price,
  originalPrice,
  durationMinutes,
  size = 'medium',
}) => {
  const sizeTokens = ServiceCardTokens.sizes[size];

  const starPath =
    'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z';

  return (
    <View style={styles.container}>
      {/* 1. Title & Rating Row */}
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.titleText,
            {
              fontSize: sizeTokens.titleFontSize,
            },
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>

        {typeof rating === 'number' && rating > 0 ? (
          <View style={styles.ratingBadge}>
            <Svg width={10} height={10} viewBox="0 0 24 24" style={styles.starIcon}>
              <Path d={starPath} fill={ServiceCardTokens.colors.starGold} />
            </Svg>
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>

      {/* 2. Category & Duration Metadata Row */}
      {categories && categories.length > 0 ? (
        <Text
          style={[
            styles.metaText,
            {
              fontSize: sizeTokens.metaFontSize,
            },
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {categories.slice(0, 2).join(' • ')}
          {durationMinutes ? ` • ${durationMinutes} mins` : ''}
        </Text>
      ) : null}

      {/* 3. Real Price & Discount Row */}
      {typeof price === 'number' && price > 0 ? (
        <View style={styles.priceRow}>
          <Text style={styles.priceFromLabel}>From</Text>
          <Text style={styles.priceCurrency}>₹</Text>
          <Text style={styles.priceText}>{price}</Text>
          {typeof originalPrice === 'number' && originalPrice > price ? (
            <>
              <Text style={styles.originalPriceText}>₹{originalPrice}</Text>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF
                </Text>
              </View>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingHorizontal: 2,
    paddingBottom: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  titleText: {
    flex: 1,
    color: ServiceCardTokens.colors.textPrimary,
    fontFamily: ServiceCardTokens.typography.fontPrimaryBold,
    fontWeight: '700',
    letterSpacing: -0.25,
    includeFontPadding: false,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 5.5,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#FEF3C7',
  },
  starIcon: {
    marginBottom: 0.5,
  },
  ratingText: {
    color: '#92400E',
    fontFamily: ServiceCardTokens.typography.fontPrimaryBold,
    fontSize: 10,
    fontWeight: '800',
    includeFontPadding: false,
  },
  metaText: {
    color: ServiceCardTokens.colors.textSecondary,
    fontFamily: ServiceCardTokens.typography.fontPrimaryRegular,
    marginTop: 2.5,
    letterSpacing: -0.15,
    includeFontPadding: false,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  priceFromLabel: {
    color: ServiceCardTokens.colors.textMuted,
    fontFamily: ServiceCardTokens.typography.fontPrimaryRegular,
    fontSize: 10,
    marginRight: 1,
  },
  priceCurrency: {
    color: ServiceCardTokens.colors.textPrimary,
    fontFamily: ServiceCardTokens.typography.fontPrimaryBold,
    fontSize: 11,
    fontWeight: '800',
  },
  priceText: {
    color: ServiceCardTokens.colors.textPrimary,
    fontFamily: ServiceCardTokens.typography.fontPrimaryBold,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  originalPriceText: {
    color: ServiceCardTokens.colors.textMuted,
    fontFamily: ServiceCardTokens.typography.fontPrimaryRegular,
    fontSize: 11,
    textDecorationLine: 'line-through',
    marginLeft: 3,
  },
  discountBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 4,
  },
  discountText: {
    color: '#059669',
    fontFamily: ServiceCardTokens.typography.fontPrimaryBold,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
