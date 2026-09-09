import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Star, Clock, ChevronRight, CheckCircle2 } from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { ServiceDetailItem } from '../../../types/category.types';
import { AssetRegistry } from '../../../services/home.service';

interface ServiceCardProps {
  service: ServiceDetailItem;
  onPress: (service: ServiceDetailItem) => void;
  isServiceable?: boolean;
}

export const ServiceCard: React.FC<ServiceCardProps> = React.memo(({
  service,
  onPress,
  isServiceable = true,
}) => {
  const [imageError, setImageError] = useState<boolean>(false);
  const [imageLoading, setImageLoading] = useState<boolean>(false);

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
    <TouchableOpacity
      style={styles.cardContainer}
      activeOpacity={0.88}
      onPress={() => onPress(service)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${service.name}${hasRealPrice ? `, starting from ₹${service.base_price}` : ''}`}
    >
      <View style={styles.cardContent}>
        {/* Left Info Column */}
        <View style={styles.infoCol}>
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
                <Star size={11} color="#111111" fill="#111111" />
                <Text style={styles.ratingText}>{service.rating.toFixed(1)}</Text>
                {service.reviews_count ? (
                  <Text style={styles.reviewsCount}>({service.reviews_count})</Text>
                ) : null}
              </View>
            ) : null}

            {hasRealDuration ? (
              <View style={styles.durationBox}>
                <Clock size={11} color="#666666" strokeWidth={1.8} />
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
        </View>

        {/* Right Visual Image & Action Column */}
        <View style={styles.imageActionCol}>
          <View style={styles.imageWrapper}>
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
                    <ActivityIndicator size="small" color="#111111" />
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.imageFallbackBox}>
                <CheckCircle2 size={24} color="#888888" strokeWidth={1.5} />
              </View>
            )}
          </View>

          <View style={styles.actionButton}>
            <Text style={styles.actionButtonText}>View</Text>
            <ChevronRight size={13} color="#FFFFFF" strokeWidth={2.2} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e8e8e6',
    marginBottom: 12,
    padding: 14,
    shadowColor: '#000000',
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
    letterSpacing: 0.4,
  },
  serviceName: {
    fontSize: 15.5,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#111111',
    letterSpacing: 0,
    lineHeight: 19,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#666666',
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
    color: '#111111',
    fontFamily: ServenticaTokens.fonts.Regular,
  },
  reviewsCount: {
    fontSize: 10.5,
    color: '#888888',
    fontFamily: ServenticaTokens.fonts.Regular,
  },
  durationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  durationText: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#666666',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceFromLabel: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#777777',
    marginRight: 4,
  },
  priceCurrency: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111111',
    marginLeft: 1,
  },
  imageActionCol: {
    alignItems: 'center',
    width: 84,
  },
  imageWrapper: {
    width: 78,
    height: 72,
    backgroundColor: '#f8f8f7',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0ed',
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
    backgroundColor: '#111111',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    minHeight: 32,
    width: '100%',
    gap: 2,
  },
  actionButtonText: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
