import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { ArrowLeft, ShieldCheck, ChevronRight } from 'lucide-react-native';
import { CategoryItem, CategoryHierarchyPayload, ServiceDetailItem } from '../../../types/category.types';
import { categoryService, INITIAL_DISCOVERY_CATEGORIES } from '../../../services/category.service';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { ServiceCard } from '../components/ServiceCard';

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
  onSelectOtherCategory,
}) => {
  const [data, setData] = useState<CategoryHierarchyPayload | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  // If user selected "all-services" / "More", render full catalog modal view
  const isFullCatalogView = categorySlug === 'all-services';

  const fetchCategoryData = () => {
    setIsLoading(true);
    setHasError(false);
    // Prefer lookup by id if provided, else slug
    const targetIdentifier = categoryId || categorySlug;
    categoryService
      .getCategoryHierarchy(targetIdentifier)
      .then((payload) => {
        setData(payload);
        setIsLoading(false);
      })
      .catch(() => {
        setHasError(true);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchCategoryData();
  }, [categorySlug, categoryId]);

  const filteredServices = (data?.services || []).filter((srv) => {
    if (activeSubcategory === 'all') return true;
    const cleanSub = activeSubcategory.replace('-sub', '').toLowerCase();
    return (
      srv.slug.toLowerCase().includes(cleanSub) ||
      srv.name.toLowerCase().includes(cleanSub) ||
      (srv.subcategory_id && srv.subcategory_id === activeSubcategory)
    );
  });

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
          accessibilityLabel="Back to home"
        >
          <ArrowLeft size={20} color='#1E242B' strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isFullCatalogView ? 'All Categories & Services' : data?.category.name || 'Category'}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {isFullCatalogView ? 'Explore complete Serventica directory' : 'Verified professionals at upfront prices'}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color='#1E242B' />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      ) : hasError ? (
        <View style={styles.loadingBox}>
          <Text style={styles.errorTitle}>Unable to load services.</Text>
          <Text style={styles.errorSubtitle}>Please check your internet connection and try again.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCategoryData} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : isFullCatalogView ? (
        /* FULL DIRECTORY OF CATEGORIES (Tapped 'More') */
        <ScrollView contentContainerStyle={styles.catalogContent}>
          <Text style={styles.catalogIntro}>
            Select a service domain to browse subcategories, pricing, and book on-demand technicians:
          </Text>
          {INITIAL_DISCOVERY_CATEGORIES.filter((c) => c.slug !== 'all-services').map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.catalogItem}
              activeOpacity={0.8}
              onPress={() => onSelectOtherCategory?.(cat)}
            >
              <View style={styles.catalogItemLeft}>
                <Text style={styles.catalogItemTitle}>{cat.name}</Text>
                <Text style={styles.catalogItemDesc} numberOfLines={2}>
                  {cat.description}
                </Text>
              </View>
              <ChevronRight size={18} color="#999999" strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        /* CATEGORY HIERARCHY DRILLDOWN VIEW */
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Subcategory Filter Tabs */}
          {data?.subcategories && data.subcategories.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subTabsContainer}
            >
              <TouchableOpacity
                style={[
                  styles.subTabPill,
                  activeSubcategory === 'all' && styles.subTabPillActive,
                ]}
                onPress={() => setActiveSubcategory('all')}
                accessibilityRole="button"
                accessibilityLabel="Show all services"
              >
                <Text
                  style={[
                    styles.subTabText,
                    activeSubcategory === 'all' && styles.subTabTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {data.subcategories.map((sub) => (
                <TouchableOpacity
                  key={sub.id}
                  style={[
                    styles.subTabPill,
                    activeSubcategory === sub.slug && styles.subTabPillActive,
                  ]}
                  onPress={() => setActiveSubcategory(sub.slug)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${sub.short_name || sub.name}`}
                >
                  <Text
                    style={[
                      styles.subTabText,
                      activeSubcategory === sub.slug && styles.subTabTextActive,
                    ]}
                  >
                    {sub.short_name || sub.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}

          {/* Guarantee banner */}
          <View style={styles.guaranteePill}>
            <ShieldCheck size={16} color="#059669" strokeWidth={2} />
            <Text style={styles.guaranteeText}>
              Serventica Assured · Fixed pricing · Background verified partners
            </Text>
          </View>

          {/* Service Cards List */}
          <View style={styles.servicesList}>
            {filteredServices.length > 0 ? (
              filteredServices.map((srv) => (
                <ServiceCard
                  key={srv.id}
                  service={srv}
                  onPress={(item) =>
                    onSelectService?.({
                      id: item.id,
                      slug: item.slug,
                      name: item.name,
                    })
                  }
                />
              ))
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No services available right now.</Text>
                <Text style={styles.emptyDesc}>
                  We are expanding operational coverage for this subcategory in your sector.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleBox: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
    letterSpacing: 0,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#777777',
    marginTop: 1,
    letterSpacing: 0,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#777777',
    marginTop: 10,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#777777',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#1E242B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    fontWeight: '600',
  },
  catalogContent: {
    padding: 16,
    paddingBottom: 40,
  },
  catalogIntro: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#666666',
    marginBottom: 16,
    lineHeight: 18,
  },
  catalogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fafaf9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e7e7e5',
    marginBottom: 10,
  },
  catalogItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  catalogItemTitle: {
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
    letterSpacing: 0,
    marginBottom: 3,
  },
  catalogItemDesc: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#777777',
    lineHeight: 16,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  subTabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  subTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f4',
    marginRight: 8,
  },
  subTabPillActive: {
    backgroundColor: '#1E242B',
  },
  subTabText: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#666666',
    letterSpacing: 0,
  },
  subTabTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  guaranteePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    marginHorizontal: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  guaranteeText: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#065f46',
    marginLeft: 6,
    flex: 1,
  },
  servicesList: {
    paddingHorizontal: 16,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
    shadowColor: '#1E242B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 14,
  },
  taglineBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 5,
  },
  taglineText: {
    fontSize: 10,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#92400e',
    fontWeight: '600',
  },
  serviceName: {
    fontSize: 15.5,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
    letterSpacing: 0,
    marginBottom: 4,
  },
  serviceDesc: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#666666',
    lineHeight: 16,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  ratingText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E242B',
    marginLeft: 3,
  },
  reviewsCount: {
    fontSize: 11,
    color: '#888888',
    marginLeft: 2,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#666666',
    marginLeft: 3,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceSymbol: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E242B',
  },
  priceAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E242B',
    marginLeft: 1,
  },
  priceSuffix: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#777777',
    marginLeft: 4,
  },
  actionCol: {
    alignItems: 'center',
  },
  bookButton: {
    backgroundColor: '#1E242B',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 18,
  },
  bookButtonText: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#777777',
    textAlign: 'center',
    lineHeight: 17,
  },
});
