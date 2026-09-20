import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Star,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  MapPin,
  AlertTriangle,
  Heart,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { useServiceDetails } from '../../../hooks/useServiceDetails';
import { useLocation } from '../../../context/LocationContext';
import { useCart } from '../../../features/cart/context/CartContext';
import { AssetRegistry } from '../../../services/home.service';
import { ShimmerPlaceholder } from '../../../shared/components/ShimmerPlaceholder';

export interface ServiceDetailScreenProps {
  serviceId?: string;
  slug?: string;
  onBack: () => void;
  onContinue?: (bookingPayload: {
    serviceId: string;
    variantId?: string;
    price: number;
    durationMinutes: number;
    locationId?: string;
    serviceAreaId?: string;
  }) => void;
}

export const ServiceDetailScreen: React.FC<ServiceDetailScreenProps> = ({
  serviceId,
  slug,
  onBack,
  onContinue,
}) => {
  const insets = useSafeAreaInsets();
  const targetIdentifier = slug || serviceId;
  const {
    details,
    selectedVariant,
    setSelectedVariant,
    isSaved,
    isSaving,
    isLoading,
    error,
    toggleSave,
    refresh,
    calculatedPrice,
    calculatedDuration,
  } = useServiceDetails(targetIdentifier);

  const { activeLocation, serviceability } = useLocation();
  const { addItem, openCartDrawer } = useCart();
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Evaluate Serviceability
  const isAvailable = serviceability ? serviceability.isServiceable : true;

  const headerSafeStyle = {
    paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 16) + 8,
  };

  const handleBookNow = () => {
    if (!details?.service) return;

    if (onContinue) {
      onContinue({
        serviceId: details.service.id,
        variantId: selectedVariant?.id,
        price: calculatedPrice,
        durationMinutes: calculatedDuration,
      });
    } else {
      // Add to cart with variant context and open drawer
      addItem({
        ...details.service,
        base_price: calculatedPrice,
        duration_minutes: calculatedDuration,
      } as any);
      openCartDrawer();
      onBack();
    }
  };

  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.headerBar, headerSafeStyle]}>
          <TouchableOpacity
            style={styles.circleBackButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color="#1E242B" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <ShimmerPlaceholder width="100%" height={220} borderRadius={16} style={{ marginBottom: 16 }} />
          <ShimmerPlaceholder width="70%" height={24} borderRadius={6} style={{ marginBottom: 10 }} />
          <ShimmerPlaceholder width="95%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
          <ShimmerPlaceholder width="80%" height={16} borderRadius={4} style={{ marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <ShimmerPlaceholder width={80} height={28} borderRadius={6} />
            <ShimmerPlaceholder width={90} height={28} borderRadius={6} />
          </View>
          <ShimmerPlaceholder width="100%" height={90} borderRadius={12} style={{ marginBottom: 16 }} />
          <ShimmerPlaceholder width="100%" height={140} borderRadius={12} />
        </ScrollView>
      </View>
    );
  }

  if (error || !details || !details.service) {
    return (
      <View style={styles.stateContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.headerBar, headerSafeStyle]}>
          <TouchableOpacity
            style={styles.circleBackButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color="#1E242B" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <AlertCircle size={40} color="#EF4444" strokeWidth={1.8} />
          <Text style={styles.errorTitle}>Couldn't load this service.</Text>
          <Text style={styles.errorSubtitle}>
            {error || 'This service is currently unavailable. Please verify your connection or try again.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh} activeOpacity={0.85}>
            <RefreshCw size={15} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { service, category, variants, inclusions, exclusions, faqs, ratingSummary } = details;

  // Resolve Service Image
  const imgKey = service.thumbnail_url || service.hero_image_url || service.image_url || '';
  const isRegistryAsset = Boolean(imgKey && AssetRegistry[imgKey]);
  const imageSource = isRegistryAsset
    ? AssetRegistry[imgKey]
    : imgKey.startsWith('http')
    ? { uri: imgKey }
    : null;

  const hasRealRating = ratingSummary.averageRating > 0;
  const hasRealPrice = calculatedPrice > 0;

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="dark-content" />

      {/* FIXED TOP HEADER */}
      <View style={[styles.headerBar, headerSafeStyle]}>
        <TouchableOpacity
          style={styles.circleBackButton}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color="#1E242B" strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle} numberOfLines={1}>
          {service.name}
        </Text>
        <TouchableOpacity
          style={styles.circleSaveButton}
          onPress={toggleSave}
          disabled={isSaving}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={isSaved ? 'Remove from saved' : 'Save service'}
        >
          <Heart
            size={19}
            color={isSaved ? '#EF4444' : '#1E242B'}
            fill={isSaved ? '#EF4444' : 'transparent'}
            strokeWidth={2}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO IMAGE CONTAINER */}
        <View style={styles.heroImageContainer}>
          {imageSource ? (
            <Image
              source={imageSource}
              style={styles.heroImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <CheckCircle2 size={44} color="#94A3B8" strokeWidth={1.5} />
            </View>
          )}
        </View>

        {/* SERVICE MAIN TITLE & SUMMARY */}
        <View style={styles.mainInfoBlock}>
          {category ? (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{category.name}</Text>
            </View>
          ) : null}

          <Text style={styles.serviceTitle}>{service.name}</Text>

          {service.description ? (
            <Text style={styles.serviceShortDesc}>{service.description}</Text>
          ) : null}

          {/* RATING & DURATION BADGES */}
          <View style={styles.badgeRow}>
            {hasRealRating ? (
              <View style={styles.metricBadge}>
                <Star size={13} color="#F59E0B" fill="#F59E0B" />
                <Text style={styles.metricBoldText}>
                  {ratingSummary.averageRating.toFixed(1)}
                </Text>
                {ratingSummary.reviewsCount > 0 ? (
                  <Text style={styles.metricDimText}>
                    ({ratingSummary.reviewsCount} reviews)
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.metricBadge}>
                <Text style={styles.newBadgeText}>No reviews yet</Text>
              </View>
            )}

            <View style={styles.metricBadge}>
              <Clock size={13} color="#555555" strokeWidth={2} />
              <Text style={styles.metricNormalText}>{calculatedDuration} mins</Text>
            </View>
          </View>
        </View>

        {/* ACTIVE LOCATION & SERVICEABILITY BANNER */}
        <View
          style={[
            styles.serviceabilityBanner,
            !isAvailable && styles.serviceabilityBannerWarning,
          ]}
        >
          <View style={styles.serviceabilityIconBox}>
            {isAvailable ? (
              <MapPin size={16} color="#059669" strokeWidth={2.2} />
            ) : (
              <AlertTriangle size={16} color="#D97706" strokeWidth={2.2} />
            )}
          </View>
          <View style={styles.serviceabilityTextBox}>
            <Text
              style={[
                styles.serviceabilityStatusTitle,
                !isAvailable && styles.serviceabilityStatusTitleWarning,
              ]}
            >
              {isAvailable ? 'Available at your location' : 'Currently unavailable in this zone'}
            </Text>
            <Text style={styles.serviceabilityAddressSub} numberOfLines={1}>
              {activeLocation.shortAddress}
            </Text>
          </View>
        </View>

        {/* SELECTABLE PACKAGES / VARIANTS */}
        {variants && variants.length > 0 ? (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Select Package</Text>
            <Text style={styles.sectionSubheading}>
              Choose the option that fits your home requirement
            </Text>
            <View style={styles.variantsList}>
              {variants.map((variant) => {
                const isSelected = selectedVariant?.id === variant.id;
                return (
                  <TouchableOpacity
                    key={variant.id}
                    style={[
                      styles.variantCard,
                      isSelected && styles.variantCardSelected,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setSelectedVariant(variant)}
                  >
                    <View style={styles.variantTopRow}>
                      <View style={styles.variantLeft}>
                        <View
                          style={[
                            styles.radioCircle,
                            isSelected && styles.radioCircleSelected,
                          ]}
                        >
                          {isSelected ? <View style={styles.radioDot} /> : null}
                        </View>
                        <Text style={styles.variantName}>{variant.name}</Text>
                      </View>
                      <Text style={styles.variantPrice}>₹{variant.price}</Text>
                    </View>

                    {variant.description ? (
                      <Text style={styles.variantDescription}>
                        {variant.description}
                      </Text>
                    ) : null}

                    <View style={styles.variantMetaRow}>
                      <Clock size={11} color="#64748B" strokeWidth={1.8} />
                      <Text style={styles.variantDuration}>
                        {variant.duration_minutes} mins
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* SERVENTICA ASSURANCE */}
        <View style={styles.promiseCard}>
          <ShieldCheck size={20} color="#059669" strokeWidth={2} />
          <View style={styles.promiseContent}>
            <Text style={styles.promiseHeading}>Serventica Assured</Text>
            <Text style={styles.promiseSubtitle}>
              Background verified professionals · 100% upfront pricing · 30-day post-service warranty
            </Text>
          </View>
        </View>

        {/* WHAT'S INCLUDED */}
        {inclusions && inclusions.length > 0 ? (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>What's included</Text>
            <View style={styles.itemsList}>
              {inclusions.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <CheckCircle2 size={16} color="#059669" strokeWidth={2} style={styles.itemIcon} />
                  <View style={styles.itemTextCol}>
                    <Text style={styles.itemText}>{item.title}</Text>
                    {item.description ? (
                      <Text style={styles.itemSubtext}>{item.description}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* WHAT'S EXCLUDED */}
        {exclusions && exclusions.length > 0 ? (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>What's not included</Text>
            <View style={styles.itemsList}>
              {exclusions.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <XCircle size={16} color="#94A3B8" strokeWidth={1.8} style={styles.itemIcon} />
                  <View style={styles.itemTextCol}>
                    <Text style={styles.itemTextDim}>{item.title}</Text>
                    {item.description ? (
                      <Text style={styles.itemSubtextDim}>{item.description}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* FREQUENTLY ASKED QUESTIONS */}
        {faqs && faqs.length > 0 ? (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Frequently Asked Questions</Text>
            <View style={styles.faqList}>
              {faqs.map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                return (
                  <TouchableOpacity
                    key={faq.id}
                    style={styles.faqCard}
                    activeOpacity={0.8}
                    onPress={() =>
                      setExpandedFaqId(isExpanded ? null : faq.id)
                    }
                  >
                    <View style={styles.faqQuestionRow}>
                      <Text style={styles.faqQuestionText}>{faq.question}</Text>
                      {isExpanded ? (
                        <ChevronUp size={16} color="#1E242B" />
                      ) : (
                        <ChevronDown size={16} color="#64748B" />
                      )}
                    </View>
                    {isExpanded ? (
                      <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* FIXED BOTTOM STICKY CTA BAR */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 14 : 12),
          },
        ]}
      >
        <View style={styles.priceContainer}>
          {hasRealPrice ? (
            <>
              <Text style={styles.bottomPriceLabel}>
                {selectedVariant ? 'Selected Package' : 'Starting from'}
              </Text>
              <View style={styles.bottomPriceRow}>
                <Text style={styles.bottomPriceCurrency}>₹</Text>
                <Text style={styles.bottomPriceValue}>{calculatedPrice}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.bottomPriceLabel}>Transparent Pricing</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.ctaButton, !isAvailable && styles.ctaButtonDisabled]}
          onPress={handleBookNow}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Book Now"
        >
          <Text style={styles.ctaButtonText}>
            {hasRealPrice ? `Book for ₹${calculatedPrice}` : 'Book Now'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  stateContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  circleBackButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleSaveButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E242B',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  heroImageContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  heroImage: {
    width: '80%',
    height: 190,
  },
  heroPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainInfoBlock: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  serviceTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E242B',
    lineHeight: 28,
    marginBottom: 6,
  },
  serviceShortDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  metricBoldText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E242B',
  },
  metricDimText: {
    fontSize: 11,
    color: '#64748B',
  },
  metricNormalText: {
    fontSize: 12,
    color: '#1E242B',
    fontWeight: '600',
  },
  newBadgeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  serviceabilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    gap: 10,
  },
  serviceabilityBannerWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
  },
  serviceabilityIconBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceabilityTextBox: {
    flex: 1,
  },
  serviceabilityStatusTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  serviceabilityStatusTitleWarning: {
    color: '#B45309',
  },
  serviceabilityAddressSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  sectionContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E242B',
  },
  sectionSubheading: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 10,
  },
  variantsList: {
    gap: 10,
  },
  variantCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  variantCardSelected: {
    borderColor: '#1E242B',
    backgroundColor: '#F8FAFC',
  },
  variantTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  variantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#1E242B',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E242B',
  },
  variantName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E242B',
    flex: 1,
  },
  variantPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E242B',
  },
  variantDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginLeft: 26,
    marginTop: 2,
    marginBottom: 6,
  },
  variantMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 26,
  },
  variantDuration: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  promiseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    gap: 12,
  },
  promiseContent: {
    flex: 1,
  },
  promiseHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E242B',
  },
  promiseSubtitle: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginTop: 2,
  },
  itemsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  itemIcon: {
    marginTop: 2,
  },
  itemTextCol: {
    flex: 1,
  },
  itemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E242B',
    lineHeight: 18,
  },
  itemSubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  itemTextDim: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  itemSubtextDim: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  faqList: {
    marginTop: 8,
    gap: 8,
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  faqQuestionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E242B',
    flex: 1,
  },
  faqAnswerText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 6,
  },
  priceContainer: {
    justifyContent: 'center',
  },
  bottomPriceLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  bottomPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bottomPriceCurrency: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E242B',
  },
  bottomPriceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E242B',
  },
  ctaButton: {
    backgroundColor: '#1E242B',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E242B',
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 13,
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
    fontWeight: '700',
    fontSize: 13,
  },
});
