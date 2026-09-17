import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import Svg, { Defs, RadialGradient as SvgRadialGradient, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';
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

import { CategoryItem } from '../../../types/category.types';
import { HomeHeroAsset } from '../../../types/home.types';
import { CategoryExperience } from '../../../types/experience.types';
import { getFallbackCategoryTheme, getFallbackCategoryHero } from '../../../repositories/experience.repository';
import { CategoryRail, CategoryRailSkeleton } from './CategoryRail';

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
  categories?: CategoryItem[];
  selectedCategoryId?: string | null;
  onSelectCategory?: (category: CategoryItem) => void;
  heroAsset?: HomeHeroAsset;
  categoryExperience?: CategoryExperience;
  deliveryTime?: string;
  isCalculatingETA?: boolean;
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
  categories = [],
  selectedCategoryId = null,
  onSelectCategory = () => {},
  heroAsset,
  categoryExperience,
  deliveryTime = '20 minutes',
  isCalculatingETA = false,
}) => {
  const [upperLayout, setUpperLayout] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Animation drivers for buttery smooth context transition
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const themeFallback = categoryExperience?.category.slug
    ? getFallbackCategoryTheme(categoryExperience.category.slug)
    : null;

  const activeHero = categoryExperience?.hero;
  const gradientStart = activeHero ? activeHero.palette.gradientStart : (heroAsset?.gradient_start || '#0284C7');
  const gradientEnd = activeHero ? activeHero.palette.gradientEnd : (heroAsset?.gradient_end || '#38BDF8');

  const currentCategorySlug = categoryExperience?.category?.slug;
  const isAcAppliances = !currentCategorySlug || currentCategorySlug === 'ac-appliances';

  const isDark =
    isAcAppliances
      ? true
      : categoryExperience?.theme?.isDark !== undefined
      ? categoryExperience.theme.isDark
      : themeFallback?.isDark !== undefined
      ? themeFallback.isDark
      : activeHero
      ? activeHero.palette.isDark
      : (heroAsset?.is_dark ?? true);

  const gradientColors: string[] =
    activeHero?.palette.gradientColors && activeHero.palette.gradientColors.length >= 2
      ? activeHero.palette.gradientColors
      : categoryExperience?.theme?.gradientColors && categoryExperience.theme.gradientColors.length >= 2
      ? categoryExperience.theme.gradientColors
      : themeFallback?.gradientColors && themeFallback.gradientColors.length >= 2
      ? themeFallback.gradientColors
      : [gradientStart, gradientEnd];

  const textColor = isDark ? '#FFFFFF' : '#1E242B';
  const textSubColor = isDark ? 'rgba(255, 255, 255, 0.90)' : '#222222';
  const iconColor = isDark ? '#FFFFFF' : '#1E242B';
  const logoTint = isDark ? '#FFFFFF' : '#1E242B';
  const profileBg = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)';
  const profileBorder = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.12)';

  // Resolve hero image asset
  const fallbackHero = categoryExperience?.category ? getFallbackCategoryHero(categoryExperience.category) : null;
  const currentSlug = categoryExperience?.category?.slug;
  const categorySpecificKey =
    currentSlug === 'electrical'
      ? 'hero_electrical'
      : currentSlug === 'painting'
      ? 'hero_painting'
      : currentSlug === 'cleaning'
      ? 'hero_cleaning'
      : currentSlug === 'plumbing'
      ? 'hero_plumbing'
      : currentSlug === 'ac-appliances'
      ? 'hero_background'
      : currentSlug === 'home-decor'
      ? 'hero_homedecors'
      : null;

  const heroImageKey = categorySpecificKey || activeHero?.imageUrl || fallbackHero?.imageUrl || heroAsset?.image_url;
  const heroImageSource =
    heroImageKey && AssetRegistry[heroImageKey]
      ? AssetRegistry[heroImageKey]
      : fallbackHero?.imageUrl && AssetRegistry[fallbackHero.imageUrl]
      ? AssetRegistry[fallbackHero.imageUrl]
      : AssetRegistry.hero_gardener;

  // Animate content smoothly whenever category context updates
  useEffect(() => {
    fadeAnim.setValue(0.5);
    slideAnim.setValue(6);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [categoryExperience?.category.id]);

  const activeTitle = activeHero?.title || heroAsset?.headline || 'Hire us';
  const activeSubtitle = activeHero?.subtitle || heroAsset?.subheadline || 'let your garden bloom with us hire your personal Gardener for monthly';
  const activeCTA = activeHero?.ctaLabel || heroAsset?.cta_label || 'Shop Now';

  return (
    <View style={styles.heroContainer}>
      {/* ========================================================================= */}
      {/* 1. UPPER HERO SECTION — BLINKIT-STYLE SMOOTH MULTI-COLOR SVG GRADIENT   */}
      {/* Contains: Logo, ETA, Location, Profile, Search Bar & Category Navigation  */}
      {/* ========================================================================= */}
      <View
        style={[styles.upperAdaptiveSection, { backgroundColor: gradientColors[0] }]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0) {
            setUpperLayout({ width, height });
          }
        }}
      >
        {/* Full-bleed SVG Background Layer (Supports 90deg Linear or Ultra-smooth Radial Diffusion) */}
        {upperLayout.width > 0 && upperLayout.height > 0 ? (
          <Svg
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            width={upperLayout.width}
            height={upperLayout.height}
          >
            <Defs>
              {currentSlug === 'plumbing' ? (
                <SvgLinearGradient
                  id={`upperHeroGrad_${categoryExperience?.category.id || 'default'}`}
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  {gradientColors.map((color, index) => {
                    const offsetPercent = `${Math.round((index / (gradientColors.length - 1)) * 100)}%`;
                    return <Stop key={index} offset={offsetPercent} stopColor={color} stopOpacity="1" />;
                  })}
                </SvgLinearGradient>
              ) : (
                <SvgRadialGradient
                  id={`upperHeroGrad_${categoryExperience?.category.id || 'default'}`}
                  cx="50%"
                  cy="0%"
                  rx="110%"
                  ry="130%"
                  fx="50%"
                  fy="0%"
                >
                  {gradientColors.map((color, index) => {
                    const offsetPercent = `${Math.round((index / (gradientColors.length - 1)) * 100)}%`;
                    return <Stop key={index} offset={offsetPercent} stopColor={color} stopOpacity="1" />;
                  })}
                </SvgRadialGradient>
              )}
            </Defs>
            <Rect x="0" y="0" width={upperLayout.width} height={upperLayout.height} fill={`url(#upperHeroGrad_${categoryExperience?.category.id || 'default'})`} />
          </Svg>
        ) : null}

        {/* ROW 1: SERVENTICA LOGO AT THE VERY TOP CENTER */}
        <View style={styles.logoHeaderRow}>
          <Image
            source={AssetRegistry.top_logo}
            style={[styles.logoImage, { tintColor: logoTint }]}
            resizeMode="contain"
          />
        </View>

        {/* ROW 2: DELIVERY TIME + LOCATION (LEFT) & USER ACCOUNT (RIGHT) */}
        <View style={styles.locationRow}>
          <View style={styles.locationLeftColumn}>
            {/* Delivery Time Badge with Electric Zap Icon & 24px text */}
            <View style={styles.deliveryTimeContainer}>
              <Zap size={18} color={iconColor} fill={iconColor} style={styles.electricIcon} />
              <Text style={[styles.deliveryTimeHighlight, { color: textColor }]}>
                {deliveryTime}
              </Text>
            </View>

            {/* Location Area: High-priority dedicated touch target with no overlap */}
            <TouchableOpacity
              style={styles.locationContainer}
              activeOpacity={0.7}
              onPress={onPressLocation}
              accessibilityRole="button"
              accessibilityLabel={`Delivery Location: ${shortAddress}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MapPin size={14} color={iconColor} strokeWidth={2.4} style={styles.pinIcon} />
              <Text
                style={[styles.addressText, { color: textSubColor }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {shortAddress}
              </Text>
              <ChevronDown size={14} color={iconColor} strokeWidth={2.4} style={styles.chevronIcon} />
            </TouchableOpacity>
          </View>

          {/* Profile User Icon */}
          <TouchableOpacity
            style={[styles.profileButton, { backgroundColor: profileBg, borderColor: profileBorder }]}
            activeOpacity={0.7}
            onPress={onPressProfile}
            accessibilityRole="button"
            accessibilityLabel="Customer Account and Profile"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <User size={18} color={iconColor} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        {/* ROW 3: SEARCH BAR (Crisp Clean Surface on Adaptive Background) */}
        <View style={styles.searchBarWrapper}>
          <TouchableOpacity
            style={styles.searchBar}
            activeOpacity={0.88}
            onPress={onFocusSearch}
            accessibilityRole="search"
            accessibilityLabel="Search services and categories"
          >
            <Search size={17} color="#666666" strokeWidth={2.0} style={styles.searchIcon} />
            <View style={styles.inputHitBox}>
              <Text
                style={[
                  styles.inputText,
                  searchQuery.length > 0 && styles.inputTextActive,
                ]}
                numberOfLines={1}
              >
                {searchQuery || `Search in ${categoryExperience?.category.name || 'Serventica'}...`}
              </Text>
            </View>

            {searchQuery.length > 0 ? (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={onClearSearch}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Clear search text"
              >
                <X size={16} color='#1E242B' strokeWidth={2.0} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={onPressVoice}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Voice search"
              >
                <Mic size={17} color="#555555" strokeWidth={2.0} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        {/* ROW 4: ALL CATEGORIES HORIZONTAL NAVIGATION RAIL (With adaptive light/dark contrast) */}
        <View style={styles.categoryRailWrapper}>
          {categories && categories.length > 0 ? (
            <CategoryRail
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={onSelectCategory}
              variant="hero"
              isDarkBackground={isDark}
            />
          ) : (
            <CategoryRailSkeleton isDarkBackground={isDark} />
          )}
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 2. LOWER HERO IMAGE SECTION — SUPABASE / DELIVERED HERO IMAGE ONLY        */}
      {/* Contains: Dynamic Crossfade Image + Category Marketing Copy + Context CTA */}
      {/* ========================================================================= */}
      <View style={styles.lowerImageHeroSection}>
        <Animated.Image
          source={heroImageSource}
          style={[styles.lowerHeroBackgroundImage, { opacity: fadeAnim }]}
          resizeMode="cover"
        />

        {/* Animated Marketing Copy + Context CTA */}
        <Animated.View
          style={[
            styles.lowerHeroContentBox,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.heroTitle} numberOfLines={2}>
            {activeTitle}
          </Text>

          {activeSubtitle ? (
            <Text style={styles.heroDescription} numberOfLines={2}>
              {activeSubtitle}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.shopNowButton,
              categoryExperience?.theme?.buttonColor
                ? { backgroundColor: categoryExperience.theme.buttonColor }
                : null,
            ]}
            activeOpacity={0.85}
            onPress={onPressCTA}
            accessibilityRole="button"
            accessibilityLabel={activeCTA}
          >
            <Text
              style={[
                styles.shopNowText,
                categoryExperience?.theme?.buttonTextColor
                  ? { color: categoryExperience.theme.buttonTextColor }
                  : null,
              ]}
            >
              {activeCTA}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heroContainer: {
    width: '100%',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  upperAdaptiveSection: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 6 : 10,
    paddingBottom: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  logoHeaderRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoImage: {
    width: 98,
    height: 20,
    tintColor: '#FFFFFF',
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
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#FFFFFF',
    lineHeight: 28,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  pinIcon: {
    marginRight: 4,
  },
  addressText: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: 'rgba(255, 255, 255, 0.92)',
    maxWidth: '85%',
  },
  chevronIcon: {
    marginLeft: 3,
  },
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarWrapper: {
    width: '100%',
    marginBottom: 10,
  },
  searchBar: {
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: '#1E242B',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
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
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#888888',
  },
  inputTextActive: {
    color: '#1E242B',
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  actionButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryRailWrapper: {
    width: '100%',
    marginTop: 2,
    marginBottom: 2,
  },
  sectionDividerLine: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  lowerImageHeroSection: {
    width: '100%',
    height: 310,
    position: 'relative',
    justifyContent: 'flex-end',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#0a1622',
  },
  lowerHeroBackgroundImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  lowerHeroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  lowerHeroContentBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  heroTitle: {
    fontSize: 23,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 4,
  },
  heroDescription: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  shopNowButton: {
    backgroundColor: '#fac420', // Warm golden yellow #fac420
    paddingHorizontal: 24,
    paddingVertical: 9,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E242B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  shopNowText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
  },
});
