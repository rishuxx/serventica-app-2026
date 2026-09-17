import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Star, Clock, ChevronRight, CheckCircle2, Plus, Minus } from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { ServiceDetailItem } from '../../../types/category.types';
import { AssetRegistry } from '../../../services/home.service';
import { useCart } from '../../../features/cart/context/CartContext';
import { AnimatedTouchable } from '../../../shared/components/AnimatedTouchable';

interface ServiceCardProps {
  service: ServiceDetailItem;
  onPress: (service: ServiceDetailItem) => void;
  isServiceable?: boolean;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onPress,
  isServiceable = true,
}) => {
  const [imageError, setImageError] = useState<boolean>(false);
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const { getItemQuantity, addItem, removeItem } = useCart();
  const quantity = getItemQuantity(service.id);

  // Check if image_url is a registry key or remote URL
  const imgKey = service.image_url || '';
  const isRegistryAsset = Boolean(imgKey && AssetRegistry[imgKey]);
  const imageSource = isRegistryAsset
    ? AssetRegistry[imgKey]
    : imgKey.startsWith('http')
    ? { uri: imgKey }
    : null;

  // Real data only: only display ratings if valid number > 0
  const hasRealRating = typeof service.rating === 'number' && service.rating > 0;
  // Real data only: only display price if > 0
  const hasRealPrice = typeof service.base_price === 'number' && service.base_price > 0;
  // Real data only: only display duration if > 0
  const hasRealDuration = typeof service.duration_minutes === 'number' && service.duration_minutes > 0;

  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardContent}>
        {/* Left Info Column & Image (Click to View Details) */}
        <TouchableOpacity
          style={styles.infoCol}
          activeOpacity={0.8}
          onPress={() => onPress(service)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${service.name}${hasRealPrice ? `, starting from ₹${service.base_price}` : ''}`}
        >
          {service.short_tagline ? (
            <View style={styles.taglineBadge}>
              <Text style={styles.taglineText} numberOfLines={1}>
                {service.short_tagline}
              </Text>
            </View>
          ) : null}

          <Text style={styles.serviceName} numberOfLines={2}>
            {service.name}
          </Text>

          {service.description ? (
            <Text style={styles.serviceDescription} numberOfLines={2}>
              {service.description}
            </Text>
          ) : null}

          {/* Meta Information: Rating + Duration (Real data only) */}
          <View style={styles.metaRow}>
            {hasRealRating ? (
              <View style={styles.ratingBox}>
                <Star size={11} color="#F59E0B" fill="#F59E0B" />
                <Text style={styles.ratingText}>{service.rating.toFixed(1)}</Text>
                {service.reviews_count ? (
                  <Text style={styles.reviewsCount}>({service.reviews_count})</Text>
                ) : null}
              </View>
            ) : null}

            {hasRealDuration ? (
              <View style={styles.durationBox}>
                <Clock size={11} color="#64748B" strokeWidth={1.8} />
                <Text style={styles.durationText}>{service.duration_minutes} mins</Text>
              </View>
            ) : null}
          </View>

          {/* Pricing Row (Real data only) */}
          {hasRealPrice ? (
            <View style={styles.priceRow}>
              <Text style={styles.priceFromLabel}>From</Text>
              <Text style={styles.priceCurrency}>₹</Text>
              <Text style={styles.priceValue}>{service.base_price}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {/* Right Visual Image & Action Column */}
        <View style={styles.imageActionCol}>
          <TouchableOpacity
            style={styles.imageWrapper}
            activeOpacity={0.8}
            onPress={() => onPress(service)}
          >
            {imageSource && !imageError ? (
              <>
                <Image
                  source={imageSource}
                  style={styles.serviceImage}
                  resizeMode="contain"
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
                    <ActivityIndicator size="small" color='#1E242B' />
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.imageFallbackBox}>
                <CheckCircle2 size={24} color="#888888" strokeWidth={1.5} />
              </View>
            )}
          </TouchableOpacity>

          {/* Quick-Commerce Direct Stepper / Add Button */}
          {quantity > 0 ? (
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                style={styles.stepperSubBtn}
                activeOpacity={0.7}
                onPress={() => removeItem(service.id)}
              >
                <Minus size={13} color="#1E242B" strokeWidth={2.4} />
              </TouchableOpacity>
              <Text style={styles.stepperQtyText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.stepperSubBtn}
                activeOpacity={0.7}
                onPress={() => addItem(service)}
              >
                <Plus size={13} color="#1E242B" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.8}
              onPress={() => addItem(service)}
            >
              <Text style={styles.actionButtonText}>ADD</Text>
              <Plus size={12} color="#1E242B" strokeWidth={2.6} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8e8e6',
    marginBottom: 12,
    padding: 14,
    shadowColor: '#1E242B',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
    marginRight: 14,
  },
  taglineBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f5f5f4',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 4,
    marginBottom: 6,
  },
  taglineText: {
    fontSize: 10,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#333333',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  serviceName: {
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#1E242B',
    lineHeight: 20,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#5E6672',
    lineHeight: 16,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E242B',
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  reviewsCount: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: ServenticaTokens.fonts.Regular,
  },
  durationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  durationText: {
    fontSize: 11.5,
    color: '#5E6672',
    fontFamily: ServenticaTokens.fonts.Regular,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  priceFromLabel: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#94A3B8',
  },
  priceCurrency: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E242B',
    fontFamily: ServenticaTokens.fonts.Bold,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E242B',
    fontFamily: ServenticaTokens.fonts.Bold,
  },
  imageActionCol: {
    alignItems: 'center',
    width: 84,
  },
  imageWrapper: {
    width: 78,
    height: 72,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceImage: {
    width: '88%',
    height: '88%',
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageFallbackBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    minHeight: 32,
    width: '100%',
    gap: 4,
    borderWidth: 1,
    borderColor: '#D8DCE3',
    shadowColor: '#1E242B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionButtonText: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
    fontWeight: '700',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 32,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepperSubBtn: {
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperQtyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E242B',
    fontFamily: ServenticaTokens.fonts.Bold,
  },
});
