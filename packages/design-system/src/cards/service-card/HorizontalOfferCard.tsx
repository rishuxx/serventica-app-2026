import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
  Dimensions,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Ribbon } from './Ribbon';
import { FavoriteButton } from './FavoriteButton';
import { ServiceRibbon, RibbonColorVariant } from './types';
import { ServiceCardTokens } from './tokens';

export interface HorizontalOfferCardProps {
  image: string | number;
  width?: number;
  height?: number;
  ribbon?: ServiceRibbon;
  secondaryRibbon?: ServiceRibbon;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  offerValue?: string;
  offerSuffix?: string;
  offerDescription?: string;
  offerTerms?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const { width: defaultScreenWidth } = Dimensions.get('window');

export const HorizontalOfferCard: React.FC<HorizontalOfferCardProps> = React.memo(({
  image,
  width,
  height,
  ribbon,
  secondaryRibbon,
  favorite = true,
  onToggleFavorite,
  offerValue = 'Visiting',
  offerSuffix = 'Free',
  offerDescription = 'Get your Place Ready for Celebrations.',
  offerTerms = 'Any Time, Any Where with us',
  onPress,
  style,
}) => {
  const [isFavorite, setIsFavorite] = useState<boolean>(favorite);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Aspect ratio matching reference: ~340 x 195 (width-to-height ~ 1.74)
  const cardWidth = width || defaultScreenWidth - 32;
  const cardHeight = height || Math.round(cardWidth * 0.58);

  const handleFavoriteToggle = () => {
    setIsFavorite((prev) => !prev);
    onToggleFavorite?.();
  };

  const imageSource = typeof image === 'string' ? { uri: image } : image;

  return (
    <TouchableOpacity
      style={[
        styles.cardContainer,
        {
          width: cardWidth,
          height: cardHeight,
        },
        style,
      ]}
      activeOpacity={0.92}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Offer: ${offerValue} ${offerSuffix}, ${offerDescription}`}
    >
      {/* 1. Background Cover Image */}
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

      {/* 2. Full Surface Readability Vignette Gradient (Smooth progressive transition from bottom to top) */}
      <Svg width={cardWidth} height={cardHeight} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="horizontalCardVignette" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#000000" stopOpacity="0.08" />
            <Stop offset="25%" stopColor="#000000" stopOpacity="0.02" />
            <Stop offset="50%" stopColor="#000000" stopOpacity="0.18" />
            <Stop offset="70%" stopColor="#000000" stopOpacity="0.48" />
            <Stop offset="88%" stopColor="#000000" stopOpacity="0.75" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.88" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={cardWidth} height={cardHeight} fill="url(#horizontalCardVignette)" />
      </Svg>

      {/* 3. Top-Left Ribbon Stack (Compact, Adaptive, Rounded) */}
      {ribbon || secondaryRibbon ? (
        <View style={styles.ribbonWrapper}>
          {ribbon ? (
            <Ribbon
              type={ribbon.type}
              colorVariant={ribbon.colorVariant}
              label={ribbon.label}
              scale={0.90}
            />
          ) : null}
          {secondaryRibbon ? (
            <View style={styles.secondaryRibbonRow}>
              <Ribbon
                type={secondaryRibbon.type}
                colorVariant={secondaryRibbon.colorVariant}
                label={secondaryRibbon.label}
                scale={0.90}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {/* 4. Top-Right Vector Favorite Heart (No Grey Circle Background) */}
      <View style={styles.favoriteWrapper}>
        <FavoriteButton
          active={isFavorite}
          onPress={handleFavoriteToggle}
          size={38}
          iconSize={22}
        />
      </View>

      {/* 5. Bottom Offer & Typography Content (Coolvetica Display + SF Pro Body) */}
      <View style={styles.bottomContent}>
        <View style={styles.headlineRow}>
          <Text style={styles.offerValueText}>{offerValue}</Text>
          {offerSuffix ? <Text style={styles.offerSuffixText}>{' ' + offerSuffix}</Text> : null}
        </View>

        {offerDescription ? (
          <Text style={styles.descriptionText} numberOfLines={1}>
            {offerDescription}
          </Text>
        ) : null}

        {offerTerms ? (
          <Text style={styles.termsText} numberOfLines={1}>
            {offerTerms}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#1E242B',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 24, 27, 0.4)',
  },
  ribbonWrapper: {
    position: 'absolute',
    top: 9,
    left: 0,
    zIndex: 10,
  },
  secondaryRibbonRow: {
    marginTop: 4,
  },
  favoriteWrapper: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  bottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 14,
    zIndex: 5,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  offerValueText: {
    color: '#FFE100', // Reference Yellow
    fontFamily: ServiceCardTokens.typography.fontDisplay, // Coolvetica
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -1,
    includeFontPadding: false,
  },
  offerSuffixText: {
    color: '#FFFFFF',
    fontFamily: ServiceCardTokens.typography.fontDisplay, // Coolvetica
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  descriptionText: {
    color: '#FFFFFF',
    fontFamily: ServiceCardTokens.typography.fontPrimaryBold, // SF Pro Bold
    fontSize: 14.5,
    lineHeight: 18.5,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  termsText: {
    color: '#CBD5E1',
    fontFamily: ServiceCardTokens.typography.fontPrimaryMedium, // SF Pro Medium
    fontSize: 12.5,
    lineHeight: 16.5,
    letterSpacing: -0.2,
    marginTop: 1.5,
    opacity: 0.95,
  },
});
