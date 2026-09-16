import React, { useState } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { ServiceCardMedia } from './ServiceCardMedia';
import { ServiceCardDetails } from './ServiceCardDetails';
import { ServiceCardData, ServiceCardSize, ServiceCardVariant } from './types';
import { ServiceCardTokens } from './tokens';

export interface ServiceCardProps {
  service: ServiceCardData;
  size?: ServiceCardSize;
  variant?: ServiceCardVariant;
  cardWidth?: number;
  onPress?: (service: ServiceCardData) => void;
  onToggleFavorite?: (serviceId: string, currentStatus: boolean) => void;
  style?: StyleProp<ViewStyle>;
}

export const ServiceCard: React.FC<ServiceCardProps> = React.memo(({
  service,
  size = 'medium',
  variant = 'default',
  cardWidth,
  onPress,
  onToggleFavorite,
  style,
}) => {
  const [isFavorite, setIsFavorite] = useState<boolean>(Boolean(service.favorite));

  // Determine width based on prop or preset size tokens
  const width = cardWidth || ServiceCardTokens.sizes[size].width;
  const mediaHeight = Math.round(width / ServiceCardTokens.media.aspectRatio);

  const handleFavoriteToggle = () => {
    const nextState = !isFavorite;
    setIsFavorite(nextState);
    onToggleFavorite?.(service.id, isFavorite);
  };

  return (
    <TouchableOpacity
      style={[
        styles.cardContainer,
        {
          width,
        },
        style,
      ]}
      activeOpacity={0.88}
      onPress={() => onPress?.(service)}
      accessibilityRole="button"
      accessibilityLabel={`Service: ${service.name}`}
    >
      {/* 1. Media surface */}
      <ServiceCardMedia
        image={service.image}
        width={width}
        height={mediaHeight}
        ribbon={service.ribbon}
        secondaryRibbon={service.secondaryRibbon}
        favorite={isFavorite}
        onToggleFavorite={handleFavoriteToggle}
        branding={service.branding}
        offer={service.offer}
        size={size}
      />

      {/* 2. Details below media */}
      <ServiceCardDetails
        title={service.name}
        rating={service.rating}
        reviewCount={service.reviewCount}
        categories={service.categories}
        price={service.price}
        originalPrice={service.originalPrice}
        durationMinutes={service.durationMinutes}
        size={size}
      />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: 'transparent',
    borderRadius: ServiceCardTokens.radius.card,
  },
});
