import React, { useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Ribbon } from './Ribbon';
import { FavoriteButton } from './FavoriteButton';
import { BrandBlock } from './BrandBlock';
import { OfferBlock } from './OfferBlock';
import { ServiceRibbon, ServiceBranding, ServiceOffer, ServiceCardSize } from './types';
import { ServiceCardTokens } from './tokens';

interface ServiceCardMediaProps {
  image: string | number;
  width: number;
  height: number;
  ribbon?: ServiceRibbon;
  secondaryRibbon?: ServiceRibbon;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  branding?: ServiceBranding;
  offer?: ServiceOffer;
  size?: ServiceCardSize;
}

export const ServiceCardMedia: React.FC<ServiceCardMediaProps> = React.memo(({
  image,
  width,
  height,
  ribbon,
  secondaryRibbon,
  favorite,
  onToggleFavorite,
  branding,
  offer,
  size = 'medium',
}) => {
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const sizeTokens = ServiceCardTokens.sizes[size];
  const imageSource = typeof image === 'string' ? { uri: image } : image;

  const hasOverlayText = Boolean(branding || offer);

  return (
    <View style={[styles.container, { width, height }]}>
      {/* 1. Base Service Image */}
      <Image
        source={hasError ? require('../../assets/placeholder-card.png') : imageSource}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setHasError(true);
        }}
      />

      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={ServiceCardTokens.colors.accentYellow} />
        </View>
      ) : null}

      {/* 2. Media Bottom Readability Gradient (Progressive smooth bottom to top) */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="bottomShadowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#000000" stopOpacity="0.04" />
            <Stop offset="25%" stopColor="#000000" stopOpacity="0.01" />
            <Stop offset="50%" stopColor="#000000" stopOpacity="0.16" />
            <Stop offset="72%" stopColor="#000000" stopOpacity="0.52" />
            <Stop offset="90%" stopColor="#000000" stopOpacity="0.78" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.88" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#bottomShadowGrad)" />
      </Svg>

      {/* 3. Ribbons (Top-Left) - Supports Stacked Double Ribbon like Occasional Decors + Serventica Originals */}
      {ribbon || secondaryRibbon ? (
        <View style={styles.ribbonWrapper}>
          {ribbon ? (
            <Ribbon
              type={ribbon.type}
              colorVariant={ribbon.colorVariant}
              label={ribbon.label}
              scale={sizeTokens.ribbonScale}
            />
          ) : null}
          {secondaryRibbon ? (
            <View style={styles.secondaryRibbonRow}>
              <Ribbon
                type={secondaryRibbon.type}
                colorVariant={secondaryRibbon.colorVariant}
                label={secondaryRibbon.label}
                scale={sizeTokens.ribbonScale}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {/* 4. Favorite Button (Top-Right, clean without background) */}
      <View style={styles.favoriteWrapper}>
        <FavoriteButton
          active={favorite}
          onPress={onToggleFavorite}
          size={sizeTokens.favoriteSize}
          iconSize={sizeTokens.favoriteIconSize}
        />
      </View>

      {/* 5. Overlay Content (BrandBlock + OfferBlock at bottom) */}
      {hasOverlayText ? (
        <View style={styles.overlayContent}>
          {branding ? (
            <BrandBlock
              brand={branding.brand}
              highlight={branding.highlight}
              brandFontSize={sizeTokens.brandFontSize}
              highlightFontSize={sizeTokens.highlightFontSize}
            />
          ) : null}

          {offer ? (
            <OfferBlock
              value={offer.value}
              suffix={offer.suffix}
              description={offer.description}
              terms={offer.terms}
              offerFontSize={sizeTokens.offerFontSize}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: ServiceCardTokens.radius.media,
    overflow: 'hidden',
    backgroundColor: ServiceCardTokens.colors.imagePlaceholder,
    position: 'relative',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 243, 246, 0.4)',
  },
  ribbonWrapper: {
    position: 'absolute',
    top: 7,
    left: 0,
    zIndex: 5,
  },
  secondaryRibbonRow: {
    marginTop: 3.5,
  },
  favoriteWrapper: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 10,
  },
  overlayContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 6,
    zIndex: 4,
  },
});
