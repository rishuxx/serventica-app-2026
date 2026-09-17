import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { ArrowLeft, ShieldCheck, Inbox, AlertCircle, RefreshCw } from 'lucide-react-native';
import { CategoryItem } from '../../../types/category.types';
import { useCategoryServices } from '../../../hooks/useCategoryServices';
import { useSavedServices } from '../../../hooks/useSavedServices';
import { ServiceCard } from '../components/ServiceCard';
import { ShimmerPlaceholder } from '../../../shared/components/ShimmerPlaceholder';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

interface CategoryScreenProps {
  categorySlug: string;
  categoryId?: string;
  onBack: () => void;
  onSelectService?: (service: { id: string; slug: string; name?: string }) => void;
  onSelectOtherCategory?: (category: CategoryItem) => void;
}

export const CategoryScreen: React.FC<CategoryScreenProps> = ({
  categorySlug,
  categoryId,
  onBack,
  onSelectService,
}) => {
  const targetIdentifier = categoryId || categorySlug;
  const {
    category,
    subcategories,
    services,
    selectedSubcategoryId,
    setSelectedSubcategoryId,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
  } = useCategoryServices(targetIdentifier);

  const { isSaved, toggleSave } = useSavedServices();

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;

    if (isCloseToBottom && hasMore && !isLoadingMore) {
      loadMore();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER ROW */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color="#1E242B" strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {category?.name || 'Category Services'}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {category?.short_description || 'Verified professionals at upfront prices'}
          </Text>
        </View>
      </View>

      {/* ERROR STATE */}
      {error && !isLoading && services.length === 0 ? (
        <View style={styles.centerBox}>
          <AlertCircle size={36} color="#EF4444" strokeWidth={1.8} />
          <Text style={styles.errorTitle}>Couldn't load services</Text>
          <Text style={styles.errorSubtitle}>
            Please check your network connection and try again.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={refresh}
            activeOpacity={0.85}
          >
            <RefreshCw size={15} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading ? (
        /* SKELETON SHIMMER LOADING */
        <View style={styles.skeletonContainer}>
          <View style={styles.skeletonTabRow}>
            {[80, 110, 95, 120].map((w, i) => (
              <ShimmerPlaceholder
                key={i}
                width={w}
                height={32}
                borderRadius={16}
                style={{ marginRight: 8 }}
              />
            ))}
          </View>
          <View style={styles.skeletonGrid}>
            {[1, 2, 3, 4].map((key) => (
              <View key={key} style={styles.skeletonCard}>
                <ShimmerPlaceholder width="100%" height={124} borderRadius={12} style={{ marginBottom: 8 }} />
                <ShimmerPlaceholder width="60%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                <ShimmerPlaceholder width="90%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                <ShimmerPlaceholder width="75%" height={12} borderRadius={4} />
              </View>
            ))}
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={32}
        >
          {/* Subcategory Filter Tabs */}
          {subcategories && subcategories.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContainer}
            >
              <TouchableOpacity
                style={[
                  styles.tabChip,
                  selectedSubcategoryId === 'all' && styles.tabChipActive,
                ]}
                activeOpacity={0.8}
                onPress={() => setSelectedSubcategoryId('all')}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    selectedSubcategoryId === 'all' && styles.tabChipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {subcategories.map((sub) => (
                <TouchableOpacity
                  key={sub.id}
                  style={[
                    styles.tabChip,
                    selectedSubcategoryId === sub.id && styles.tabChipActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedSubcategoryId(sub.id)}
                >
                  <Text
                    style={[
                      styles.tabChipText,
                      selectedSubcategoryId === sub.id && styles.tabChipTextActive,
                    ]}
                  >
                    {sub.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}

          {/* SERVENTICA PROMISE STRIP */}
          <View style={styles.trustBanner}>
            <ShieldCheck size={16} color="#059669" strokeWidth={2} />
            <Text style={styles.trustBannerText}>
              Upfront Pricing · Background Verified Professionals · 30-Day Guarantee
            </Text>
          </View>

          {/* SERVICES 2-COLUMN GRID */}
          {services.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Inbox size={36} color="#9CA3AF" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No services available in this category yet.</Text>
              <Text style={styles.emptySubtitle}>
                We are onboarding verified professionals for this domain.
              </Text>
            </View>
          ) : (
            <View style={styles.servicesGrid}>
              {services.map((srv) => (
                <ServiceCard
                  key={srv.id}
                  service={srv}
                  cardWidth="48%"
                  isSaved={isSaved(srv.id)}
                  onToggleSave={toggleSave}
                  onPress={(s) =>
                    onSelectService?.({
                      id: s.id,
                      slug: s.slug,
                      name: s.name,
                    })
                  }
                />
              ))}
            </View>
          )}

          {/* PAGINATION LOADING INDICATOR */}
          {isLoadingMore ? (
            <View style={styles.loadingMoreBox}>
              <ActivityIndicator size="small" color="#1E242B" />
              <Text style={styles.loadingMoreText}>Loading more services...</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleBox: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
    marginTop: 2,
  },
  scrollContent: {
    paddingVertical: 12,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  tabChipActive: {
    backgroundColor: '#1E242B',
    borderColor: '#1E242B',
  },
  tabChipText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#64748B',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
    fontFamily: ServenticaTokens.fonts.SemiBold,
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    marginHorizontal: 16,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  trustBannerText: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#065F46',
    flex: 1,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E242B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontFamily: ServenticaTokens.fonts.Bold,
    fontSize: 13,
  },
  skeletonContainer: {
    padding: 16,
  },
  skeletonTabRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  skeletonCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  loadingMoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
  },
});
