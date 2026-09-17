import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  StatusBar,
  RefreshControl,
  Platform,
  Animated,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { TopHeroSection } from '../components/TopHeroSection';
import { HomeSearchBar } from '../components/HomeSearchBar';
import { SelectLocationScreen } from '../../location/screens/SelectLocationScreen';
import { SearchResultsView } from '../components/SearchResultsView';
import { BreakerText } from '../components/BreakerText';
import { OriginalsSection } from '../components/OriginalsSection';
import { CategoriesSection } from '../components/CategoriesSection';
import { BasicsSection } from '../components/BasicsSection';
import { HomeBottomNav, BottomNavTab } from '../components/HomeBottomNav';
import { CategoryRail } from '../components/CategoryRail';
import { CategoryScreen } from '../../categories/screens/CategoryScreen';
import { ServiceDetailScreen } from '../../services/screens/ServiceDetailScreen';
import { FloatingCartBar } from '../../cart/components/FloatingCartBar';
import { CartDrawerModal } from '../../cart/components/CartDrawerModal';
import { useHome } from '../../../hooks/useHome';
import { useLocation } from '../../../context/LocationContext';
import { useHomeSearch } from '../../../hooks/useHomeSearch';
import { useHomeExperience } from '../../../hooks/useHomeExperience';
import { useServiceETA } from '../../../hooks/useServiceETA';
import { DynamicCatalogSection } from '../components/DynamicCatalogSection';
import { HomeBasicServiceItem } from '../../../types/home.types';
import { CategoryItem } from '../../../types/category.types';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { MapPin, ChevronDown, User, Search } from 'lucide-react-native';
import Svg, { Defs, RadialGradient as SvgRadialGradient, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';
import { getFallbackCategoryTheme } from '../../../repositories/experience.repository';

import { ProfileScreen } from '../../account/screens/ProfileScreen';
import { EditProfileScreen } from '../../account/screens/EditProfileScreen';
import { BookingsScreen } from '../../account/screens/BookingsScreen';
import { BookingDetailScreen } from '../../account/screens/BookingDetailScreen';
import { SavedServicesScreen } from '../../account/screens/SavedServicesScreen';
import { SupportScreen } from '../../account/screens/SupportScreen';
import { NotificationsScreen } from '../../account/screens/NotificationsScreen';
import { ReviewsScreen } from '../../account/screens/ReviewsScreen';
import { ServiceCardShowcaseScreen } from '../../showcase/ServiceCardShowcaseScreen';

import {
  FulfillmentMode,
  FulfillmentAvailabilityState,
} from '../../../../../../packages/types/src';

interface HomeScreenProps {
  onOpenAccount?: () => void;
  onSelectService?: (service: HomeBasicServiceItem) => void;
  initialShowcase?: boolean;
}

export type AccountSubRoute =
  | 'PROFILE'
  | 'EDIT_PROFILE'
  | 'BOOKINGS'
  | 'BOOKING_DETAIL'
  | 'SAVED'
  | 'NOTIFICATIONS'
  | 'SUPPORT'
  | 'REVIEWS'
  | 'SANDBOX'
  | null;

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onOpenAccount,
  onSelectService,
  initialShowcase = false,
}) => {
  const { data, isLoading: isHomeLoading, refresh: refreshHome } = useHome();
  const location = useLocation();
  const search = useHomeSearch();

  const userCoordinates = React.useMemo(() => {
    if (location.activeLocation?.latitude != null && location.activeLocation?.longitude != null) {
      return {
        latitude: location.activeLocation.latitude,
        longitude: location.activeLocation.longitude,
      };
    }
    return null;
  }, [location.activeLocation?.latitude, location.activeLocation?.longitude]);

  const { formattedETA, isCalculating: isETACalculating } = useServiceETA(userCoordinates);

  const {
    categories,
    selectedCategoryId,
    activeCategory,
    activeExperience,
    isLoading: isExpLoading,
    isTransitioning,
    error: expError,
    selectCategory,
    retry: retryExperience,
  } = useHomeExperience();

  const [activeTab, setActiveTab] = useState<BottomNavTab>('HOME');
  const [activeAccountRoute, setActiveAccountRoute] = useState<AccountSubRoute>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [supportBookingContext, setSupportBookingContext] = useState<{ id: string; serviceName: string } | undefined>(undefined);
  const [activeServiceTarget, setActiveServiceTarget] = useState<{ id: string; slug: string; fromCategory?: boolean } | null>(null);
  const [isStickyActive, setIsStickyActive] = useState<boolean>(false);
  const [selectedFulfillmentMode, setSelectedFulfillmentMode] = useState<FulfillmentMode>('INSTANT');

  // Native scroll tracking for triggers
  const scrollY = useRef(new Animated.Value(0)).current;

  // Trigger-based animation value: 0 = hidden offscreen (-160px), 1 = fully in view (0px)
  const stickyAnim = useRef(new Animated.Value(0)).current;
  const stickyActiveRef = useRef(false);

  // Trigger smooth full slide-in when reaching the trigger threshold
  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      // Trigger threshold with hysteresis: slide down past 220px, slide up back before 160px
      if (value > 220 && !stickyActiveRef.current) {
        stickyActiveRef.current = true;
        setIsStickyActive(true);
        Animated.spring(stickyAnim, {
          toValue: 1,
          damping: 20,
          mass: 0.8,
          stiffness: 160,
          useNativeDriver: true,
        }).start();
      } else if (value < 160 && stickyActiveRef.current) {
        stickyActiveRef.current = false;
        setIsStickyActive(false);
        Animated.timing(stickyAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start();
      }
    });
    return () => {
      scrollY.removeListener(listenerId);
    };
  }, [scrollY, stickyAnim]);

  const isSearchActive = search.query.trim().length > 0 || search.isSearchActive;

  // Handle category selection — Persistent Home context switch without page navigation
  const handleCategoryPress = React.useCallback((category: CategoryItem) => {
    selectCategory(category.id);
  }, [selectCategory]);

  const [stickyLayout, setStickyLayout] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Resolve active theme and colors for sticky header inheritance
  const themeFallback = activeCategory?.slug
    ? getFallbackCategoryTheme(activeCategory.slug)
    : null;

  const isDarkSticky =
    activeExperience?.theme?.isDark !== undefined
      ? activeExperience.theme.isDark
      : themeFallback?.isDark !== undefined
      ? themeFallback.isDark
      : false;

  const stickyGradientColors: string[] =
    activeExperience?.hero?.palette?.gradientColors && activeExperience.hero.palette.gradientColors.length >= 2
      ? activeExperience.hero.palette.gradientColors
      : activeExperience?.theme?.gradientColors && activeExperience.theme.gradientColors.length >= 2
      ? activeExperience.theme.gradientColors
      : themeFallback?.gradientColors && themeFallback.gradientColors.length >= 2
      ? themeFallback.gradientColors
      : [
          activeExperience?.theme?.gradientStart || themeFallback?.gradientStart || '#0284C7',
          activeExperience?.theme?.gradientEnd || themeFallback?.gradientEnd || '#38BDF8',
        ];

  const stickyTextColor = isDarkSticky ? '#FFFFFF' : '#1E242B';
  const stickySubtextColor = isDarkSticky ? 'rgba(255, 255, 255, 0.85)' : '#444444';
  const stickyIconColor = isDarkSticky ? '#FFFFFF' : '#1E242B';
  const stickyInputBg = isDarkSticky ? 'rgba(255, 255, 255, 0.20)' : 'rgba(0, 0, 0, 0.06)';
  const stickyInputBorder = isDarkSticky ? 'rgba(255, 255, 255, 0.28)' : 'rgba(0, 0, 0, 0.08)';

  // Smooth slide down from -160 to 0
  const stickyHeaderTranslateY = stickyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-160, 0],
  });

  const stickyHeaderOpacity = stickyAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.9, 1],
  });

  const handleTabSwitch = React.useCallback((tab: BottomNavTab) => {
    setActiveTab(tab);
    if (tab === 'PROFILE') {
      setActiveAccountRoute('PROFILE');
    } else if (tab === 'ORDERS') {
      setActiveAccountRoute('BOOKINGS');
    } else if (tab === 'SAVED') {
      setActiveAccountRoute('SAVED');
    } else if (tab === 'CATEGORIES' || tab === 'HOME') {
      setActiveAccountRoute(null);
    }
  }, []);

  // 2. If activeServiceTarget is set, render full ServiceDetailScreen
  if (activeServiceTarget) {
    return (
      <ServiceDetailScreen
        serviceId={activeServiceTarget.id}
        slug={activeServiceTarget.slug}
        onBack={() => {
          setActiveServiceTarget(null);
        }}
        onContinue={(bookingPayload) => {
          console.log('[Serventica Booking Boundary Established]:', bookingPayload);
        }}
      />
    );
  }

  if (activeAccountRoute === 'EDIT_PROFILE') {
    return (
      <View style={styles.rootContainer}>
        <View style={styles.feedWrapper}>
          <EditProfileScreen
            onBack={() => setActiveAccountRoute('PROFILE')}
          />
        </View>
        <HomeBottomNav
          activeTab={activeTab}
          onSelectTab={handleTabSwitch}
        />
      </View>
    );
  }

  if (activeAccountRoute === 'SANDBOX') {
    return (
      <ServiceCardShowcaseScreen
        onBack={() => {
          setActiveAccountRoute(null);
          setActiveTab('HOME');
        }}
      />
    );
  }

  if (activeAccountRoute === 'BOOKING_DETAIL' && selectedBookingId) {
    return (
      <View style={styles.rootContainer}>
        <View style={styles.feedWrapper}>
          <BookingDetailScreen
            bookingId={selectedBookingId}
            onBack={() => setActiveAccountRoute('BOOKINGS')}
            onGetHelp={(bookingId: string) => {
              setSupportBookingContext({ id: bookingId, serviceName: 'Booking' });
              setActiveAccountRoute('SUPPORT');
            }}
            onBookAgain={(serviceId: string) => {
              setActiveAccountRoute(null);
              setActiveTab('HOME');
              setActiveServiceTarget({ id: serviceId, slug: '', fromCategory: false });
            }}
          />
        </View>
        <HomeBottomNav
          activeTab={activeTab}
          onSelectTab={handleTabSwitch}
        />
      </View>
    );
  }

  if (activeAccountRoute === 'SUPPORT') {
    return (
      <View style={styles.rootContainer}>
        <View style={styles.feedWrapper}>
          <SupportScreen
            onBack={() => setActiveAccountRoute('PROFILE')}
            initialBookingId={supportBookingContext?.id}
          />
        </View>
        <HomeBottomNav
          activeTab={activeTab}
          onSelectTab={handleTabSwitch}
        />
      </View>
    );
  }

  if (activeAccountRoute === 'NOTIFICATIONS') {
    return (
      <View style={styles.rootContainer}>
        <View style={styles.feedWrapper}>
          <NotificationsScreen
            onBack={() => setActiveAccountRoute('PROFILE')}
            onNavigateToBooking={(bookingId) => {
              setSelectedBookingId(bookingId);
              setActiveAccountRoute('BOOKING_DETAIL');
            }}
            onNavigateToServices={() => {
              setActiveAccountRoute(null);
              setActiveTab('HOME');
            }}
          />
        </View>
        <HomeBottomNav
          activeTab={activeTab}
          onSelectTab={handleTabSwitch}
        />
      </View>
    );
  }

  if (activeAccountRoute === 'REVIEWS') {
    return (
      <View style={styles.rootContainer}>
        <View style={styles.feedWrapper}>
          <ReviewsScreen
            onBack={() => setActiveAccountRoute('PROFILE')}
            onExploreServices={() => {
              setActiveAccountRoute(null);
              setActiveTab('HOME');
            }}
          />
        </View>
        <HomeBottomNav
          activeTab={activeTab}
          onSelectTab={handleTabSwitch}
        />
      </View>
    );
  }

  // Render primary tab views
  const renderTabContent = () => {
    if (activeAccountRoute === 'PROFILE') {
      return (
        <ProfileScreen
          onBack={() => {
            setActiveAccountRoute(null);
            setActiveTab('HOME');
          }}
          onNavigateEditProfile={() => setActiveAccountRoute('EDIT_PROFILE')}
          onNavigateBookings={() => {
            setActiveAccountRoute('BOOKINGS');
            setActiveTab('ORDERS');
          }}
          onNavigateBookingDetail={(bookingId: string) => {
            setSelectedBookingId(bookingId);
            setActiveAccountRoute('BOOKING_DETAIL');
          }}
          onNavigateAddresses={location.openSelectLocation}
          onNavigateSavedServices={() => {
            setActiveAccountRoute('SAVED');
            setActiveTab('SAVED');
          }}
          onNavigateReviews={() => setActiveAccountRoute('REVIEWS')}
          onNavigateNotifications={() => setActiveAccountRoute('NOTIFICATIONS')}
          onNavigateSupport={() => {
            setSupportBookingContext(undefined);
            setActiveAccountRoute('SUPPORT');
          }}
          onNavigateSandbox={() => {
            setActiveAccountRoute('SANDBOX');
          }}
        />
      );
    }

    if (activeAccountRoute === 'BOOKINGS') {
      return (
        <BookingsScreen
          onBack={() => {
            setActiveAccountRoute(null);
            setActiveTab('HOME');
          }}
          onSelectBooking={(bookingId: string) => {
            setSelectedBookingId(bookingId);
            setActiveAccountRoute('BOOKING_DETAIL');
          }}
          onExploreServices={() => {
            setActiveAccountRoute(null);
            setActiveTab('HOME');
          }}
        />
      );
    }

    if (activeAccountRoute === 'SAVED') {
      return (
        <SavedServicesScreen
          onBack={() => {
            setActiveAccountRoute(null);
            setActiveTab('HOME');
          }}
          onSelectService={(service) => {
            setActiveAccountRoute(null);
            setActiveServiceTarget({ id: service.id, slug: service.slug, fromCategory: false });
          }}
          onExploreServices={() => {
            setActiveAccountRoute(null);
            setActiveTab('HOME');
          }}
        />
      );
    }

    if (isSearchActive) {
      return (
        <View style={styles.searchResultsContainer}>
          <HomeSearchBar
            query={search.query}
            onChangeQuery={search.setQuery}
            onClear={search.clearSearch}
            onBack={search.closeSearch}
            isFocused={search.isSearchActive}
          />
          <SearchResultsView
            query={search.query}
            results={search.results}
            isSearching={search.isSearching}
            onSelectService={(service) => {
              search.closeSearch();
              if (service.category_id && service.category_id !== selectedCategoryId) {
                selectCategory(service.category_id);
              }
              setActiveServiceTarget({ id: service.id, slug: service.slug, fromCategory: false });
              onSelectService?.(service);
            }}
            onSelectSuggestedQuery={search.setQuery}
          />
        </View>
      );
    }

    return (
      <View style={styles.feedWrapper}>
        <Animated.ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          refreshControl={
            <RefreshControl
              refreshing={isHomeLoading || isExpLoading}
              onRefresh={() => {
                refreshHome();
                retryExperience();
              }}
              tintColor='#1E242B'
              colors={['#1E242B']}
              progressViewOffset={Platform.OS === 'android' ? 60 : 0}
            />
          }
        >
          {/* 1. FULL-WIDTH TOP HERO SECTION (Adaptive palette + Dynamic Hero Image + Embedded Rail) */}
          <TopHeroSection
            shortAddress={location.activeLocation.shortAddress}
            onPressLocation={location.openSelectLocation}
            onPressProfile={() => {
              setActiveAccountRoute('PROFILE');
              setActiveTab('PROFILE');
              onOpenAccount?.();
            }}
            searchQuery={search.query}
            onChangeSearchQuery={search.setQuery}
            onClearSearch={search.clearSearch}
            onFocusSearch={search.openSearch}
            onPressCTA={search.openSearch}
            banners={data?.banners}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={handleCategoryPress}
            heroAsset={data?.heroAsset}
            categoryExperience={activeExperience}
            deliveryTime={formattedETA}
            isCalculatingETA={isETACalculating}
            selectedFulfillmentMode={selectedFulfillmentMode}
            onSelectFulfillmentMode={setSelectedFulfillmentMode}
          />

          {/* 2. DYNAMIC CATEGORY CATALOG SECTION (Replaces white CategoryScreen with seamless in-home feed) */}
          <DynamicCatalogSection
            sections={activeExperience.catalog.sections}
            isLoading={isExpLoading}
            error={expError}
            categoryName={activeCategory.name}
            onSelectService={(service) => {
              setActiveServiceTarget({ id: service.id, slug: service.slug, fromCategory: true });
              onSelectService?.(service as any);
            }}
            onRetry={retryExperience}
          />

          {/* 3. SERVENTICA ORIGINALS (High-Conversion Visual Banners) */}
          {data?.banners && data.banners.length > 0 ? (
            <View style={styles.sectionBlock}>
              <BreakerText text="SERVENTICA ORIGINALS" />
              <OriginalsSection
                banners={data.banners}
                onSelectBanner={(banner) => {
                  if (categories.length > 0) {
                    handleCategoryPress(categories[0]);
                  }
                }}
              />
            </View>
          ) : null}

          {/* 4. CATEGORIES OVERVIEW GRID */}
          <View style={styles.sectionBlock}>
            <BreakerText text="ALL CATEGORIES" />
            <CategoriesSection
              categories={categories as any}
              onSelectCategory={(cat: any) => handleCategoryPress(cat)}
            />
          </View>

          {/* 5. BASICS GRID (Popular Verified Services) */}
          {data?.basics && data.basics.length > 0 ? (
            <View style={styles.sectionBlock}>
              <BreakerText text="POPULAR BASICS" />
              <BasicsSection
                basics={data.basics}
                onSelectService={(service) => {
                  setActiveServiceTarget({ id: service.id, slug: service.slug, fromCategory: false });
                  onSelectService?.(service);
                }}
              />
            </View>
          ) : null}
        </Animated.ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle={activeAccountRoute ? 'dark-content' : 'light-content'} />

      {/* RENDER CURRENT TAB CONTENT */}
      {renderTabContent()}

      {/* 4. HIGH-PERFORMANCE STICKY HEADER SURFACE */}
      {!activeAccountRoute && !isSearchActive && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View
            pointerEvents={isStickyActive ? 'auto' : 'none'}
            style={[
              styles.stickyHeaderSurface,
              {
                backgroundColor: stickyGradientColors[0],
                opacity: stickyHeaderOpacity,
                transform: [{ translateY: stickyHeaderTranslateY }],
              },
            ]}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              if (width > 0 && height > 0) {
                setStickyLayout({ width, height });
              }
            }}
          >
            {/* SVG Gradient matching Top Hero (90deg Linear for Plumbing or Radial Diffusion) */}
            {stickyLayout.width > 0 && stickyLayout.height > 0 ? (
              <Svg
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
                width={stickyLayout.width}
                height={stickyLayout.height}
              >
                <Defs>
                  {activeCategory?.slug === 'plumbing' ? (
                    <SvgLinearGradient
                      id={`stickyHeaderGrad_${activeExperience?.category?.id || 'default'}`}
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      {stickyGradientColors.map((color, index) => {
                        const offsetPercent = `${Math.round((index / (stickyGradientColors.length - 1)) * 100)}%`;
                        return <Stop key={index} offset={offsetPercent} stopColor={color} stopOpacity="1" />;
                      })}
                    </SvgLinearGradient>
                  ) : (
                    <SvgRadialGradient
                      id={`stickyHeaderGrad_${activeExperience?.category?.id || 'default'}`}
                      cx="50%"
                      cy="0%"
                      rx="120%"
                      ry="150%"
                      fx="50%"
                      fy="0%"
                    >
                      {stickyGradientColors.map((color, index) => {
                        const offsetPercent = `${Math.round((index / (stickyGradientColors.length - 1)) * 100)}%`;
                        return <Stop key={index} offset={offsetPercent} stopColor={color} stopOpacity="1" />;
                      })}
                    </SvgRadialGradient>
                  )}
                </Defs>
                <Rect
                  x="0"
                  y="0"
                  width={stickyLayout.width}
                  height={stickyLayout.height}
                  fill={`url(#stickyHeaderGrad_${activeExperience?.category?.id || 'default'})`}
                />
              </Svg>
            ) : null}

            {/* Compact Header Row: Location, Search, Profile */}
            <View style={styles.stickyTopBar}>
              <TouchableOpacity
                style={[
                  styles.stickyLocationBox,
                  {
                    backgroundColor: stickyInputBg,
                    borderColor: stickyInputBorder,
                    borderWidth: 1,
                  },
                ]}
                activeOpacity={0.75}
                onPress={location.openSelectLocation}
              >
                <MapPin size={13} color={stickyIconColor} strokeWidth={2.2} />
                <Text
                  style={[styles.stickyAddressText, { color: stickyTextColor }]}
                  numberOfLines={1}
                >
                  {location.activeLocation.shortAddress}
                </Text>
                <ChevronDown size={13} color={stickyIconColor} strokeWidth={2.2} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.stickySearchButton,
                  {
                    backgroundColor: stickyInputBg,
                    borderColor: stickyInputBorder,
                    borderWidth: 1,
                  },
                ]}
                activeOpacity={0.85}
                onPress={search.openSearch}
              >
                <Search size={14} color={stickySubtextColor} strokeWidth={2} />
                <Text
                  style={[styles.stickySearchPlaceholder, { color: stickySubtextColor }]}
                >
                  Search...
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.stickyProfileBtn,
                  {
                    backgroundColor: stickyInputBg,
                    borderColor: stickyInputBorder,
                    borderWidth: 1,
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  setActiveAccountRoute('PROFILE');
                  setActiveTab('PROFILE');
                  onOpenAccount?.();
                }}
              >
                <User size={15} color={stickyIconColor} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Sticky Monochromatic Category Rail */}
            <CategoryRail
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={handleCategoryPress}
              variant="sticky"
              isDarkBackground={isDarkSticky}
            />
          </Animated.View>
        </View>
      )}

      {/* 5. FULL PRODUCTION SELECT LOCATION SCREEN / MODAL */}
      <Modal
        visible={location.isSelectLocationOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={location.closeSelectLocation}
      >
        <SelectLocationScreen onClose={location.closeSelectLocation} />
      </Modal>

      {/* 7. CART CHECKOUT & EXPRESS SCHEDULING DRAWER */}
      <CartDrawerModal
        onProceedToBooking={(bookingData) => {
          console.log('[Serventica Quick Booking Submitted]:', bookingData);
        }}
        onSelectService={(service) => {
          setActiveServiceTarget({
            id: service.id,
            slug: service.slug || '',
            fromCategory: false,
          });
        }}
      />

      {/* 8. BOTTOM NAVIGATION */}
      <HomeBottomNav
        activeTab={activeTab}
        onSelectTab={handleTabSwitch}
      />

      {/* 9. PERSISTENT FLOATING QUICK-COMMERCE CART BAR (rendered on top of bottom nav for touch priority) */}
      {!activeAccountRoute && !isSearchActive && (
        <FloatingCartBar />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  feedWrapper: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 72, // Space for BottomNav
  },
  sectionBlock: {
    marginBottom: 8,
  },
  searchResultsContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? 36 : 48,
  },

  // STICKY HEADER STYLING (Liquid smooth curved bottom corners matching Hero)
  stickyHeaderSurface: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 4 : 44,
    paddingBottom: 8,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    elevation: 0,
    zIndex: 9999,
  },
  stickyTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 8,
  },
  stickyLocationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f6f6',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 150,
    gap: 4,
  },
  stickyAddressText: {
    fontSize: 12,
    color: '#1E242B',
    fontFamily: ServenticaTokens.fonts.SemiBold,
    flexShrink: 1,
  },
  stickySearchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f6f6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  stickySearchPlaceholder: {
    fontSize: 13,
    color: '#888888',
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  stickyProfileBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f6f6f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
