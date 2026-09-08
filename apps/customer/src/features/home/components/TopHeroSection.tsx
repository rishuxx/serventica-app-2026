import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import {
  MapPin,
  ChevronDown,
  User,
  Search,
  Mic,
  X,
  Zap,
} from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { AssetRegistry } from '../../../services/home.service';
import { HomeBannerItem } from '../../../types/home.types';

interface TopHeroSectionProps {
  shortAddress: string;
  onPressLocation: () => void;
  onPressProfile?: () => void;
  searchQuery: string;
  onChangeSearchQuery: (text: string) => void;
  onClearSearch?: () => void;
  onFocusSearch?: () => void;
  onPressVoice?: () => void;
  onPressCTA?: () => void;
  banners?: HomeBannerItem[];
}

export const TopHeroSection: React.FC<TopHeroSectionProps> = ({
  shortAddress,
  onPressLocation,
  onPressProfile,
  searchQuery,
  onChangeSearchQuery,
  onClearSearch,
  onFocusSearch,
  onPressVoice,
  onPressCTA,
  banners,
}) => {
  // Dynamic hero presentation container (runs primary hero message, ads, announcements)
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const heroSlides = [
    {
      title: 'Sit Back & Relax',
      description: "We'll take care of all your home needs",
      ctaText: 'Shop Now',
    },
    ...(banners && banners.length > 0
      ? banners.map((b) => ({
        title: b.title,
        description: b.subtitle || 'Expert services right at your doorstep',
        ctaText: b.cta_label || 'Shop Now',
      }))
      : [
        {
          title: 'Expert Home Help',
          description: 'Top-rated professionals on demand',
          ctaText: 'Book Now',
        },
        {
          title: 'Occasional Decors',
          description: 'Get your space ready for celebrations',
          ctaText: 'Explore',
        },
      ]),
  ];

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  const currentSlide = heroSlides[activeSlideIndex] || heroSlides[0];

  return (
    <View style={styles.heroContainer}>
      {/* 1. Full-width background image covering the complete top area */}
      <Image
        source={AssetRegistry.hero_background}
        style={styles.heroBackgroundImage}
        resizeMode="cover"
      />

      {/* 2. Soft subtle overlay preserving crystal clear neon lines */}
      <View style={styles.heroOverlay} />

      {/* 3. Hero content layer */}
      <View style={styles.contentLayer}>
        {/* STATIC HEADER AREA: Pinned at top so dynamic hero slides never move it */}
        <View style={styles.staticHeaderArea}>
          {/* ROW 1: SERVENTICA LOGO AT THE VERY TOP CENTER */}
          <View style={styles.logoHeaderRow}>
            <Image
              source={AssetRegistry.top_logo}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* ROW 2: DELIVERY TIME + LOCATION (LEFT) & USER ACCOUNT (RIGHT) */}
          <View style={styles.locationRow}>
            <View style={styles.locationLeftColumn}>
              {/* Delivery Time Badge with Electric Zap Icon & 24px text */}
              <View style={styles.deliveryTimeContainer}>
                <Zap size={18} color="#FFFFFF" fill="#FFFFFF" style={styles.electricIcon} />
                <Text style={styles.deliveryTimeHighlight}>20 minutes</Text>
              </View>

              {/* Location Area: Small, compact address */}
              <TouchableOpacity
                style={styles.locationContainer}
                activeOpacity={0.7}
                onPress={onPressLocation}
                accessibilityRole="button"
                accessibilityLabel={`Delivery Location: ${shortAddress}`}
              >
                <MapPin size={13} color="#FFFFFF" strokeWidth={2.2} style={styles.pinIcon} />
                <Text
                  style={styles.addressText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {shortAddress}
                </Text>
                <ChevronDown size={13} color="#FFFFFF" strokeWidth={2.2} style={styles.chevronIcon} />
              </TouchableOpacity>
            </View>

            {/* Profile User Icon */}
            <TouchableOpacity
              style={styles.profileButton}
              activeOpacity={0.8}
              onPress={onPressProfile}
              accessibilityRole="button"
              accessibilityLabel="Customer Account and Profile"
            >
              <User size={16} color="#FFFFFF" strokeWidth={2.0} />
            </TouchableOpacity>
          </View>

          {/* ROW 3: SEARCH BAR (Translucent frosted glass style) */}
          <View style={styles.searchBarWrapper}>
            <View style={styles.searchBar}>
              <Search size={17} color="#FFFFFF" strokeWidth={2.0} style={styles.searchIcon} />
              <TouchableOpacity
                style={styles.inputHitBox}
                activeOpacity={0.85}
                onPress={onFocusSearch}
              >
                <Text
                  style={[
                    styles.inputText,
                    searchQuery.length > 0 && styles.inputTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {searchQuery || "Search for 'Painting'"}
                </Text>
              </TouchableOpacity>

              {searchQuery.length > 0 ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={onClearSearch}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Clear search text"
                >
                  <X size={16} color="#FFFFFF" strokeWidth={2.0} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={onPressVoice}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Voice search"
                >
                  <Mic size={17} color="#FFFFFF" strokeWidth={2.0} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ROW 4: THIN SEPARATOR LINE WITH GAP AFTER SEARCH BAR */}
          <View style={styles.heroDividerLine} />
        </View>

        {/* ROW 5: DYNAMIC HERO CONTAINER (Runs Ads, Promos, Title, Description, CTA) */}
        <View style={styles.dynamicHeroBox}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {currentSlide.title}
          </Text>

          {currentSlide.description ? (
            <Text style={styles.heroDescription} numberOfLines={2}>
              {currentSlide.description}
            </Text>
          ) : null}

          {/* Small compact Shop Now CTA */}
          <TouchableOpacity
            style={styles.shopNowButton}
            activeOpacity={0.85}
            onPress={onPressCTA}
            accessibilityRole="button"
            accessibilityLabel={currentSlide.ctaText}
          >
            <Text style={styles.shopNowText}>{currentSlide.ctaText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heroContainer: {
    width: '100%',
    minHeight: 480,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#0a1622',
  },
  heroBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: 520,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  contentLayer: {
    width: '100%',
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 4 : 8,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  staticHeaderArea: {
    width: '100%',
  },
  logoHeaderRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoImage: {
    width: 98,
    height: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  locationLeftColumn: {
    flex: 1,
    marginRight: 12,
  },
  deliveryTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
  },
  electricIcon: {
    marginRight: 6,
    marginTop: -2,
  },
  deliveryTimeHighlight: {
    fontSize: 24,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#FFFFFF',
    letterSpacing: 0,
    lineHeight: 28,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  pinIcon: {
    marginRight: 4,
  },
  addressText: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: 'rgba(255, 255, 255, 0.95)',
    maxWidth: '85%',
    letterSpacing: 0,
  },
  chevronIcon: {
    marginLeft: 3,
  },
  profileButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarWrapper: {
    width: '100%',
    marginBottom: 14,
  },
  searchBar: {
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  inputHitBox: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  inputText: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: 'rgba(255, 255, 255, 0.92)',
    letterSpacing: 0,
  },
  inputTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  actionButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroDividerLine: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 20,
  },
  dynamicHeroBox: {
    width: '100%',
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 10,
  },
  heroTitle: {
    fontSize: 25,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: 0,
    marginBottom: 6,
  },
  heroDescription: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: 'rgba(255, 255, 255, 0.92)',
    textAlign: 'center',
    lineHeight: 19,
    letterSpacing: 0,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  shopNowButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopNowText: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#FFFFFF',
    letterSpacing: 0,
  },
});
