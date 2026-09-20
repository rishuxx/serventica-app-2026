import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
  Image,
  Text,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ServenticaTokens } from '../../../../packages/design-system/src';
import { PhoneNormalizer } from '../../../../packages/utils/src';
import { AssetRegistry } from '../services/home.service';
import { LoginInteractiveSheet } from '../components/LoginInteractiveSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// High-performance static references for login campaign slides
const CAMPAIGN_SLIDES = [
  {
    id: 'washitup',
    image: require('../../../../src/assets/images/LoginPageImages/washitup.webp'),
    alt: 'Wash It Up with Instant Laundry',
  },
  {
    id: 'moverPacker',
    image: require('../../../../src/assets/images/LoginPageImages/moverPacker.webp'),
    alt: 'Packaging or Shifting? Do with Instant',
  },
];

interface CustomerLoginScreenProps {
  onGetOtp: (phone: string) => Promise<void>;
  onGoogleLogin?: () => Promise<void>;
  onExploreGuest?: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
  onBackToSplash?: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const CustomerLoginScreen: React.FC<CustomerLoginScreenProps> = ({
  onGetOtp,
  onGoogleLogin,
  onExploreGuest,
  onOpenTerms,
  onOpenPrivacy,
  isLoading = false,
  errorMessage = null,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [focusedField, setFocusedField] = useState<'phone' | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);

  const cleanDigits = phoneNumber.replace(/[^0-9]/g, '');
  const isValidPhone = cleanDigits.length === 10 && /^[6-9]\d{9}$/.test(cleanDigits);

  // Auto-cycle carousel every 5.5s when sheet is not expanded
  useEffect(() => {
    if (isSheetExpanded) {
      if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
      return;
    }

    autoScrollTimer.current = setInterval(() => {
      setActiveSlideIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % CAMPAIGN_SLIDES.length;
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, 5500);

    return () => {
      if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    };
  }, [isSheetExpanded]);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SCREEN_WIDTH);
      if (index >= 0 && index < CAMPAIGN_SLIDES.length) {
        setActiveSlideIndex(index);
      }
    },
    []
  );

  const handlePhoneChange = (text: string) => {
    setLocalError(null);
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 10) {
      setPhoneNumber(cleaned);
    }
  };

  const handlePressOtp = () => {
    if (isLoading) return;

    const validation = PhoneNormalizer.normalize(phoneNumber);
    if (!validation.isValid) {
      setLocalError(validation.error || 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setLocalError(null);
    onGetOtp(phoneNumber);
  };

  const handleBackdropTap = () => {
    if (isSheetExpanded) {
      setIsSheetExpanded(false);
    }
  };

  const displayedError = localError || errorMessage;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* 1. HIGH-PERFORMANCE OPTIMIZED CAMPAIGN CAROUSEL */}
      <View style={styles.carouselContainer}>
        <FlatList
          ref={flatListRef}
          data={CAMPAIGN_SLIDES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          snapToInterval={SCREEN_WIDTH}
          snapToAlignment="center"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onMomentumScrollEnd={handleScrollEnd}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={2}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleBackdropTap}
              style={styles.slideTouchWrapper}
            >
              <Image
                source={item.image}
                style={styles.slideImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Top Header Controls (Logo & Skip & Page Indicators) */}
      <SafeAreaView style={styles.topSafeArea} edges={['top', 'left', 'right']} pointerEvents="box-none">
        <View style={styles.topBar}>
          <View style={styles.brandContainer}>
            <Image
              source={AssetRegistry.top_logo}
              style={styles.brandLogoImage}
              resizeMode="contain"
            />
          </View>

          {onExploreGuest && (
            <TouchableOpacity
              style={styles.glassSkipButton}
              activeOpacity={0.75}
              onPress={onExploreGuest}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Skip to explore services"
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Carousel Indicators */}
        <View style={styles.paginationDotsRow} pointerEvents="none">
          {CAMPAIGN_SLIDES.map((slide, idx) => (
            <View
              key={slide.id}
              style={[
                styles.dot,
                activeSlideIndex === idx ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>
      </SafeAreaView>

      {/* 2. COMPACT INTERACTIVE TOUCH-RESPONSIVE SHEET COMPONENT */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrapper}
      >
        <LoginInteractiveSheet
          phoneNumber={phoneNumber}
          onChangePhone={handlePhoneChange}
          onGetOtp={handlePressOtp}
          onGoogleLogin={onGoogleLogin}
          onOpenTerms={onOpenTerms}
          onOpenPrivacy={onOpenPrivacy}
          isLoading={isLoading}
          isValidPhone={isValidPhone}
          errorMessage={displayedError}
          focusedField={focusedField}
          setFocusedField={setFocusedField}
          isExpanded={isSheetExpanded}
          onToggleExpand={setIsSheetExpanded}
        />
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6D28D9', // Deep royal purple backdrop matching campaigns
  },

  // 1. CAROUSEL
  carouselContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  slideTouchWrapper: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  slideImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },

  // Top Overlay
  topSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  topBar: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 6 : 8,
    minHeight: 44,
  },
  brandContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoImage: {
    width: 115,
    height: 30,
    tintColor: '#FFFFFF',
  },

  // Skip Button
  glassSkipButton: {
    position: 'absolute',
    right: 0,
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 6 : 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipButtonText: {
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Pagination Indicators
  paginationDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  dot: {
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  activeDot: {
    width: 18,
    opacity: 0.95,
  },
  inactiveDot: {
    width: 6,
    opacity: 0.4,
  },

  // 2. BOTTOM INTERACTIVE SHEET WRAPPER
  sheetWrapper: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
});
