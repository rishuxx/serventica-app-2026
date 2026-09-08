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
import { useHome } from '../../../hooks/useHome';
import { useLocation } from '../../../context/LocationContext';
import { useHomeSearch } from '../../../hooks/useHomeSearch';
import { useHomeExperience } from '../../../hooks/useHomeExperience';
import { DynamicCatalogSection } from '../components/DynamicCatalogSection';
import { HomeBasicServiceItem } from '../../../types/home.types';
import { CategoryItem } from '../../../types/category.types';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { MapPin, ChevronDown, User, Search } from 'lucide-react-native';

import { ProfileScreen } from '../../account/screens/ProfileScreen';
import { EditProfileScreen } from '../../account/screens/EditProfileScreen';
import { BookingsScreen } from '../../account/screens/BookingsScreen';
import { BookingDetailScreen } from '../../account/screens/BookingDetailScreen';
import { SavedServicesScreen } from '../../account/screens/SavedServicesScreen';
import { SupportScreen } from '../../account/screens/SupportScreen';
import { NotificationsScreen } from '../../account/screens/NotificationsScreen';
import { ReviewsScreen } from '../../account/screens/ReviewsScreen';

interface HomeScreenProps {
  onOpenAccount?: () => void;
  onSelectService?: (service: HomeBasicServiceItem) => void;
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
  | null;

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onOpenAccount,
  onSelectService,
}) => {
  const { data, isLoading: isHomeLoading, refresh: refreshHome } = useHome();
  const location = useLocation();
  const search = useHomeSearch();
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

  // Scroll offset driving smooth 60fps collapse and sticky header
  const scrollY = useRef(new Animated.Value(0)).current;

  // Track scroll position to ensure sticky header never receives touches when invisible at top
  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      if (value > 220 && !isStickyActive) {
        setIsStickyActive(true);
      } else if (value <= 220 && isStickyActive) {
        setIsStickyActive(false);
      }
    });
    return () => {
      scrollY.removeListener(listenerId);
    };
  }, [isStickyActive]);

  const isSearchActive = search.query.trim().length > 0 || search.isSearchActive;

  // Handle category selection — Persistent Home context switch without page navigation
  const handleCategoryPress = (category: CategoryItem) => {
    selectCategory(category.id);
  };

  // Sticky Category Header Interpolations:
  // Fades in smoothly as user scrolls past hero threshold (~240px)
  const stickyHeaderOpacity = scrollY.interpolate({
    inputRange: [240, 280],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const stickyHeaderTranslateY = scrollY.interpolate({
    inputRange: [240, 280],
    outputRange: [-15, 0],
    extrapolate: 'clamp',
  });

  // 1. Account / Profile Sub-Routes Routing (Bookings, Profile, Edit, Saved, Support, Reviews, Notifications)
  if (activeAccountRoute === 'PROFILE') {
    return (
      <ProfileScreen
        onBack={() => {
          setActiveAccountRoute(null);
          setActiveTab('HOME');
        }}
        onNavigateEditProfile={() => setActiveAccountRoute('EDIT_PROFILE')}
        onNavigateBookings={() => setActiveAccountRoute('BOOKINGS')}
        onNavigateBookingDetail={(bookingId: string) => {
          setSelectedBookingId(bookingId);
          setActiveAccountRoute('BOOKING_DETAIL');
        }}
        onNavigateAddresses={location.openSelectLocation}
        onNavigateSavedServices={() => setActiveAccountRoute('SAVED')}
        onNavigateReviews={() => setActiveAccountRoute('REVIEWS')}
        onNavigateNotifications={() => setActiveAccountRoute('NOTIFICATIONS')}
        onNavigateSupport={() => {
          setSupportBookingContext(undefined);
          setActiveAccountRoute('SUPPORT');
        }}
      />
    );
  }

  if (activeAccountRoute === 'EDIT_PROFILE') {
    return (
      <EditProfileScreen
        onBack={() => setActiveAccountRoute('PROFILE')}
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

  if (activeAccountRoute === 'BOOKING_DETAIL' && selectedBookingId) {
    return (
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

  if (activeAccountRoute === 'SUPPORT') {
    return (
      <SupportScreen
        onBack={() => setActiveAccountRoute('PROFILE')}
        initialBookingId={supportBookingContext?.id}
      />
    );
  }

  if (activeAccountRoute === 'NOTIFICATIONS') {
    return (
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
    );
  }

  if (activeAccountRoute === 'REVIEWS') {
    return (
      <ReviewsScreen
        onBack={() => setActiveAccountRoute('PROFILE')}
        onExploreServices={() => {
          setActiveAccountRoute(null);
          setActiveTab('HOME');
        }}
      />
    );
  }

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

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" />

      {/* CONDITIONAL BODY: FULL SEARCH EXPERIENCE OR STANDARD DISCOVERY FEED */}
      {isSearchActive ? (
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
      ) : (
        /* MAIN FEED WITH PERSISTENT COMMERCE SHELL & DYNAMIC CATEGORY CONTEXT */
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
                tintColor="#111111"
                colors={['#111111']}
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

          {/* 5. STICKY COMPACT DISCOVERY HEADER (Appears smoothly when scrolling down) */}
          <Animated.View
            pointerEvents={isStickyActive ? 'auto' : 'none'}
            style={[
              styles.stickyHeaderSurface,
              {
                opacity: stickyHeaderOpacity,
                transform: [{ translateY: stickyHeaderTranslateY }],
              },
            ]}
          >
            {/* Compact Header Row: Location, Search, Profile */}
            <View style={styles.stickyTopBar}>
              <TouchableOpacity
                style={styles.stickyLocationBox}
                activeOpacity={0.75}
                onPress={location.openSelectLocation}
              >
                <MapPin size={13} color="#111111" strokeWidth={2.2} />
                <Text style={styles.stickyAddressText} numberOfLines={1}>
                  {location.activeLocation.shortAddress}
                </Text>
                <ChevronDown size={13} color="#111111" strokeWidth={2.2} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stickySearchButton}
                activeOpacity={0.85}
                onPress={search.openSearch}
              >
                <Search size={14} color="#666666" strokeWidth={2} />
                <Text style={styles.stickySearchPlaceholder}>Search...</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stickyProfileBtn}
                activeOpacity={0.8}
                onPress={() => {
                  setActiveAccountRoute('PROFILE');
                  onOpenAccount?.();
                }}
              >
                <User size={15} color="#111111" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Sticky Monochromatic Category Rail */}
            <CategoryRail
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={handleCategoryPress}
              variant="sticky"
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

      {/* 6. MONOCHROMATIC BOTTOM NAVIGATION */}
      <HomeBottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'PROFILE') {
            setActiveAccountRoute('PROFILE');
            setActiveTab('PROFILE');
          } else if (tab === 'ORDERS') {
            setActiveAccountRoute('BOOKINGS');
            setActiveTab('ORDERS');
          } else if (tab === 'SAVED') {
            setActiveAccountRoute('SAVED');
            setActiveTab('SAVED');
          } else if (tab === 'CATEGORIES') {
            setActiveAccountRoute(null);
            setActiveTab('HOME');
          } else if (tab === 'HOME') {
            setActiveAccountRoute(null);
            setActiveTab('HOME');
          }
        }}
      />
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

  // STICKY HEADER STYLING (Pixel-perfect 60fps collapse surface)
  stickyHeaderSurface: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? 34 : 46,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    zIndex: 9999,
  },
  stickyTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
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
    fontWeight: '600',
    color: '#111111',
    fontFamily: ServenticaTokens.fonts.Medium,
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
