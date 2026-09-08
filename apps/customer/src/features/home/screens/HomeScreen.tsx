import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  StatusBar,
  RefreshControl,
  Platform,
} from 'react-native';
import { TopHeroSection } from '../components/TopHeroSection';
import { HomeSearchBar } from '../components/HomeSearchBar';
import { LocationModal } from '../components/LocationModal';
import { SearchResultsView } from '../components/SearchResultsView';
import { BreakerText } from '../components/BreakerText';
import { OriginalsSection } from '../components/OriginalsSection';
import { CategoriesSection } from '../components/CategoriesSection';
import { BasicsSection } from '../components/BasicsSection';
import { HomeBottomNav, BottomNavTab } from '../components/HomeBottomNav';
import { useHome } from '../../../hooks/useHome';
import { useHomeLocation } from '../../../hooks/useHomeLocation';
import { useHomeSearch } from '../../../hooks/useHomeSearch';
import { HomeBasicServiceItem } from '../../../types/home.types';

interface HomeScreenProps {
  onOpenAccount?: () => void;
  onSelectService?: (service: HomeBasicServiceItem) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onOpenAccount,
  onSelectService,
}) => {
  const { data, isLoading, refresh } = useHome();
  const location = useHomeLocation();
  const search = useHomeSearch();
  const [activeTab, setActiveTab] = useState<BottomNavTab>('HOME');

  const isSearchActive = search.query.trim().length > 0 || search.isSearchActive;

  return (
    <View style={styles.rootContainer}>
      <StatusBar
        barStyle={isSearchActive ? 'dark-content' : 'light-content'}
      />

      {isSearchActive ? (
        /* DEDICATED SEARCH OVERLAY VIEW */
        <View style={styles.searchOverlayContainer}>
          <HomeSearchBar
            query={search.query}
            onChangeQuery={search.setQuery}
            onClear={search.clearSearch}
            onBack={search.closeSearch}
            isFocused={true}
          />
          <SearchResultsView
            query={search.query}
            results={search.results}
            isSearching={search.isSearching}
            onSelectService={onSelectService}
            onSelectSuggestedQuery={search.setQuery}
          />
        </View>
      ) : (
        /* MAIN FEED WITH FULL-WIDTH IMMERSIVE TOP HERO */
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refresh}
              tintColor="#111111"
              colors={['#111111']}
              progressViewOffset={Platform.OS === 'android' ? 60 : 0}
            />
          }
        >
          {/* 1. FULL-WIDTH TOP HERO SECTION
                 - Complete edge-to-edge background photograph (100% width, no side margins)
                 - Top square (radius 0), bottom rounded (radius 34)
                 - Overlaid White Location Row (No dark pill, no glass)
                 - Overlaid Search Bar (White surface)
                 - Overlaid White Serventica Brand
                 - Overlaid Large White Headline & Soft White Subtitle
                 - Overlaid White/Black CTA Button
          */}
          <TopHeroSection
            shortAddress={location.shortAddress}
            onPressLocation={location.openAddressModal}
            onPressProfile={onOpenAccount}
            searchQuery={search.query}
            onChangeSearchQuery={search.setQuery}
            onClearSearch={search.clearSearch}
            onFocusSearch={search.openSearch}
            onPressCTA={search.openSearch}
            banners={data?.banners}
          />

          {/* 2. SERVENTICA ORIGINALS (Promotional Carousel) */}
          {data?.banners && data.banners.length > 0 ? (
            <View style={styles.sectionBlock}>
              <BreakerText text="SERVENTICA ORIGINALS" />
              <OriginalsSection banners={data.banners} />
            </View>
          ) : null}

          {/* 3. CATEGORIES (3 PILLARS: Services, Repairs, OnDemand) */}
          {data?.categories && data.categories.length > 0 ? (
            <View style={styles.sectionBlock}>
              <BreakerText text="CATEGORIES" />
              <CategoriesSection categories={data.categories} />
            </View>
          ) : null}

          {/* 4. BASICS GRID (Popular Verified Services) */}
          {data?.basics && data.basics.length > 0 ? (
            <View style={styles.sectionBlock}>
              <BreakerText text="BASICS" />
              <BasicsSection
                basics={data.basics}
                onSelectService={onSelectService}
              />
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* 5. EXPANDABLE LOCATION MODAL */}
      <LocationModal
        visible={location.isAddressModalOpen}
        onClose={location.closeAddressModal}
        fullAddress={location.fullAddress}
        city={location.city}
        onRefreshLocation={location.refreshLocation}
      />

      {/* 6. MONOCHROMATIC BOTTOM NAVIGATION */}
      <HomeBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  searchOverlayContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 28,
  },
  sectionBlock: {
    marginBottom: 4,
  },
});
