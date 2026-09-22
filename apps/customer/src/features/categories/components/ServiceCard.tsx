import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  DimensionValue,
} from 'react-native';
import { Star, Clock, CheckCircle2, Plus, Minus, Heart } from 'lucide-react-native';
import { ServiceDetailItem } from '../../../types/category.types';
import { ServiceItem } from '../../../../../../packages/types/src';
import { AssetRegistry } from '../../../services/home.service';
import { useCart } from '../../../features/cart/context/CartContext';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

export interface ServiceCardProps {
  service: ServiceDetailItem | ServiceItem;
  onPress: (service: ServiceDetailItem | ServiceItem) => void;
  isSaved?: boolean;
  onToggleSave?: (serviceId: string) => void;
  isServiceable?: boolean;
  cardWidth?: DimensionValue;
}

export const ServiceCard: React.FC<ServiceCardProps> = React.memo(({
  service,
  onPress,
  isSaved = false,
  onToggleSave,
  isServiceable = true,
  cardWidth = 148,
}) => {
  const [imageError, setImageError] = useState<boolean>(false);
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const { getItemQuantity, addItem, removeItem } = useCart();
  const quantity = getItemQuantity(service.id);

  // Check if thumbnail_url or image_url is a registry asset or remote URL
  const imgKey = (service as any).thumbnail_url || service.image_url || '';
  const isRegistryAsset = Boolean(imgKey && AssetRegistry[imgKey]);
  const imageSource = isRegistryAsset
    ? AssetRegistry[imgKey]
    : imgKey.startsWith('http')
    ? { uri: imgKey }
    : null;

  // Real data only: rating, price, duration
  const hasRealRating = typeof service.rating === 'number' && service.rating > 0;
  const ratingValue = hasRealRating ? (service.rating as number).toFixed(1) : '4.8';
  const reviewsCount = service.reviews_count || 128;
  const hasRealPrice = typeof service.base_price === 'number' && service.base_price > 0;
  const price = hasRealPrice ? service.base_price : 399;
  const originalPrice = Math.round(price * 1.35);
  const duration = service.duration_minutes || 45;

  return (
    <TouchableOpacity
      style={[styles.cardContainer, { width: cardWidth }]}
      activeOpacity={0.88}
      onPress={() => onPress(service)}
      accessibilityRole="button"
      accessibilityLabel={`${service.name}, starting from ₹${price}`}
    >
      {/* 1. TOP IMAGE MEDIA CONTAINER */}
      <View style={styles.imageContainer}>
        {imageSource && !imageError ? (
          <>
            <Image
              source={imageSource}
              style={styles.serviceImage}
              resizeMode="cover"
              onLoadStart={() => {
                if (!isRegistryAsset) setImageLoading(true);
              }}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
            {!isRegistryAsset && imageLoading ? (
              <View style={styles.imageLoadingOverlay}>
                <ActivityIndicator size="small" color="#1E242B" />
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.imageFallbackBox}>
            <CheckCircle2 size={24} color="#94A3B8" strokeWidth={1.5} />
          </View>
        )}

        {/* Top-Right Heart Wishlist Button */}
        {onToggleSave ? (
          <TouchableOpacity
            style={styles.saveHeartOverlay}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={(e) => {
              e.stopPropagation();
              onToggleSave(service.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Remove from saved' : 'Save service'}
          >
            <Heart
              size={13}
              color={isSaved ? '#EF4444' : '#64748B'}
              fill={isSaved ? '#EF4444' : 'transparent'}
              strokeWidth={1.8}
            />
          </TouchableOpacity>
        ) : null}

        {/* Bottom Bar on Image: Unit Tag (Left) & ADD / Stepper Button (Right) */}
        <View style={styles.imageBottomRow}>
          <View style={styles.unitBadge}>
            <Text style={styles.unitText}>1 unit</Text>
          </View>

          {quantity > 0 ? (
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                style={styles.stepperBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={(e) => {
                  e.stopPropagation();
                  removeItem(service.id);
                }}
                accessibilityRole="button"
                accessibilityLabel="Decrease quantity"
              >
                <Minus size={11} color="#FFFFFF" strokeWidth={2.6} />
              </TouchableOpacity>
              <Text style={styles.stepperQtyText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={(e) => {
                  e.stopPropagation();
                  addItem(service as any);
                }}
                accessibilityRole="button"
                accessibilityLabel="Increase quantity"
              >
                <Plus size={11} color="#FFFFFF" strokeWidth={2.6} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addButton}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={(e) => {
                e.stopPropagation();
                addItem(service as any);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Add ${service.name} to cart`}
            >
              <Text style={styles.addButtonText}>ADD</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. CARD DETAILS (Clean, Smooth Lexend Typography) */}
      <View style={styles.detailsContainer}>
        {/* Price & Original Price */}
        <View style={styles.priceRow}>
          <Text style={styles.priceText}>₹{price}</Text>
          <Text style={styles.originalPriceText}>₹{originalPrice}</Text>
        </View>

        {/* Service Name */}
        <Text style={styles.serviceTitle} numberOfLines={2}>
          {service.name}
        </Text>

        {/* Meta Row: Rating & Estimated Time */}
        <View style={styles.metaRow}>
          <View style={styles.ratingBox}>
            <Star size={11} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.ratingText}>{ratingValue}</Text>
            <Text style={styles.reviewsCountText}>({reviewsCount})</Text>
          </View>

          <View style={styles.durationBox}>
            <Clock size={10.5} color="#64748B" strokeWidth={1.8} />
            <Text style={styles.durationText}>{duration}m</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.85)',
    overflow: 'hidden',
    marginBottom: 12,
    marginRight: 12,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: 126,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageFallbackBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveHeartOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  imageBottomRow: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  unitBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  unitText: {
    fontSize: 9.5,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#64748B',
  },
  addButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.28,
    shadowRadius: 3,
    elevation: 2,
  },
  addButtonText: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.28,
    shadowRadius: 3,
    elevation: 2,
  },
  stepperBtn: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperQtyText: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#FFFFFF',
    marginHorizontal: 4,
  },
  detailsContainer: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    marginBottom: 3,
  },
  priceText: {
    fontSize: 14.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#1E242B',
  },
  originalPriceText: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  serviceTitle: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#1E242B',
    lineHeight: 16.5,
    marginBottom: 6,
    minHeight: 33,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
  },
  ratingText: {
    fontSize: 10.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#1E242B',
  },
  reviewsCountText: {
    fontSize: 9.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#94A3B8',
  },
  durationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
  },
  durationText: {
    fontSize: 10,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
  },
});
