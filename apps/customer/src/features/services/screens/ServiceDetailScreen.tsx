import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import {
  ArrowLeft,
  Star,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  MapPin,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react-native';
import { useServiceDetail } from '../../../hooks/useServiceDetail';
import { useLocation } from '../../../context/LocationContext';
import { AssetRegistry } from '../../../services/home.service';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

export interface ServiceDetailScreenProps {
  serviceId?: string;
  slug?: string;
  onBack: () => void;
  onContinue?: (bookingPayload: {
    serviceId: string;
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
  const { service, isLoading, hasError, refresh } = useServiceDetail(serviceId, slug);
  const { activeLocation, serviceability } = useLocation();

  // Evaluate Serviceability against the active location
  const isAvailable = serviceability ? serviceability.isServiceable : true;
  const zoneName = serviceability?.zoneName || activeLocation.city || 'your area';

  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.topBackHeader}>
          <TouchableOpacity
            style={styles.circleBackButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color='#1E242B' strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color='#1E242B' />
          <Text style={styles.loadingText}>Loading service details...</Text>
        </View>
      </View>
    );
  }

  if (hasError || !service) {
    return (
      <View style={styles.stateContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.topBackHeader}>
          <TouchableOpacity
            style={styles.circleBackButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color='#1E242B' strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>Unable to load this service.</Text>
          <Text style={styles.errorSubtitle}>
            Please verify your network connection or try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh} activeOpacity={0.85}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Resolve Service Image
  const imgKey = service.image_url || '';
  const isRegistryAsset = Boolean(imgKey && AssetRegistry[imgKey]);
  const imageSource = isRegistryAsset
    ? AssetRegistry[imgKey]
    : imgKey.startsWith('http')
    ? { uri: imgKey }
    : null;

  const hasRealPrice = typeof service.base_price === 'number' && service.base_price > 0;
  const hasRealDuration = typeof service.duration_minutes === 'number' && service.duration_minutes > 0;
  const hasRealRating = typeof service.rating === 'number' && service.rating > 0;

  const handleContinue = () => {
    if (onContinue) {
      onContinue({
        serviceId: service.id,
        locationId: (activeLocation as any).id || undefined,
        serviceAreaId: serviceability?.serviceAreaId,
      });
    }
  };

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="dark-content" />

      {/* FIXED TOP HEADER */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.circleBackButton}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color='#1E242B' strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle} numberOfLines={1}>
          {service.name}
        </Text>
        <View style={styles.headerSpacer} />
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
              <CheckCircle2 size={40} color="#888888" strokeWidth={1.5} />
            </View>
          )}
        </View>

        {/* SERVICE MAIN TITLE & SUMMARY */}
        <View style={styles.mainInfoBlock}>
          {service.short_tagline ? (
            <View style={styles.taglinePill}>
              <Text style={styles.taglineText}>{service.short_tagline}</Text>
            </View>
          ) : null}

          <Text style={styles.serviceTitle}>{service.name}</Text>

          {service.description ? (
            <Text style={styles.serviceShortDesc}>
              {service.description}
            </Text>
          ) : null}

          {/* RATING & DURATION BADGES (Real data only) */}
          <View style={styles.badgeRow}>
            {hasRealRating ? (
              <View style={styles.metricBadge}>
                <Star size={13} color='#1E242B' fill='#1E242B' />
                <Text style={styles.metricBoldText}>{service.rating.toFixed(1)}</Text>
                {service.reviews_count ? (
                  <Text style={styles.metricDimText}>({service.reviews_count} reviews)</Text>
                ) : null}
              </View>
            ) : null}

            {hasRealDuration ? (
              <View style={styles.metricBadge}>
                <Clock size={13} color="#555555" strokeWidth={2} />
                <Text style={styles.metricNormalText}>{service.duration_minutes} mins</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ACTIVE LOCATION & SERVICEABILITY STATUS BADGE */}
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
              <AlertTriangle size={16} color="#d97706" strokeWidth={2.2} />
            )}
          </View>
          <View style={styles.serviceabilityTextBox}>
            <Text
              style={[
                styles.serviceabilityStatusTitle,
                !isAvailable && styles.serviceabilityStatusTitleWarning,
              ]}
            >
              {isAvailable ? 'Available in your area' : 'Currently unavailable in this area'}
            </Text>
            <Text style={styles.serviceabilityAddressSub} numberOfLines={1}>
              {activeLocation.shortAddress}
            </Text>
          </View>
        </View>

        {/* SERVENTICA PROMISE STRIP */}
        <View style={styles.promiseCard}>
          <ShieldCheck size={18} color="#059669" strokeWidth={2} />
          <View style={styles.promiseContent}>
            <Text style={styles.promiseHeading}>Serventica Assured</Text>
            <Text style={styles.promiseSubtitle}>
              Background verified technicians · Transparent upfront pricing · Post-service warranty
            </Text>
          </View>
        </View>

        {/* WHAT'S INCLUDED */}
        {service.included_items && service.included_items.length > 0 ? (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>What's included</Text>
            <View style={styles.itemsList}>
              {service.included_items.map((item, index) => (
                <View key={`inc_${index}`} style={styles.itemRow}>
                  <CheckCircle2 size={16} color="#059669" strokeWidth={2} style={styles.itemIcon} />
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* WHAT'S NOT INCLUDED */}
        {service.excluded_items && service.excluded_items.length > 0 ? (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>What's excluded</Text>
            <View style={styles.itemsList}>
              {service.excluded_items.map((item, index) => (
                <View key={`exc_${index}`} style={styles.itemRow}>
                  <XCircle size={16} color="#9ca3af" strokeWidth={1.8} style={styles.itemIcon} />
                  <Text style={styles.itemTextDim}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* FIXED BOTTOM CTA BAR */}
      <View style={styles.bottomBar}>
        <View style={styles.priceContainer}>
          {hasRealPrice ? (
            <>
              <Text style={styles.bottomPriceLabel}>Starting from</Text>
              <View style={styles.bottomPriceRow}>
                <Text style={styles.bottomPriceCurrency}>₹</Text>
                <Text style={styles.bottomPriceValue}>{service.base_price}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.bottomPriceLabel}>Transparent Pricing</Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.ctaButton,
            !isAvailable && styles.ctaButtonDisabled,
          ]}
          onPress={handleContinue}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isAvailable ? `Book ${service.name}` : 'Service unavailable'}
          disabled={!isAvailable}
        >
          <Text style={styles.ctaButtonText}>
            {isAvailable ? 'Continue' : 'Unavailable'}
          </Text>
          {isAvailable ? (
            <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.4} />
          ) : null}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  stateContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topBackHeader: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 14,
    paddingBottom: 10,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#666666',
    marginTop: 12,
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
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: ServenticaTokens.fonts.Regular,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0ed',
    backgroundColor: '#ffffff',
  },
  circleBackButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBarTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  headerSpacer: {
    width: 38,
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
    backgroundColor: '#f8f8f7',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ebebe8',
  },
  heroImage: {
    width: '75%',
    height: '85%',
  },
  heroPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e7e7e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainInfoBlock: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
  },
  taglinePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#f4f4f3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  taglineText: {
    fontSize: 10.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#444444',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  serviceTitle: {
    fontSize: 22,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
    lineHeight: 26,
    marginBottom: 8,
  },
  serviceShortDesc: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#666666',
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
    backgroundColor: '#f7f7f6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  metricBoldText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E242B',
    fontFamily: ServenticaTokens.fonts.Regular,
  },
  metricDimText: {
    fontSize: 11,
    color: '#777777',
    fontFamily: ServenticaTokens.fonts.Regular,
  },
  metricNormalText: {
    fontSize: 12,
    color: '#444444',
    fontFamily: ServenticaTokens.fonts.Regular,
    fontWeight: '500',
  },
  serviceabilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  serviceabilityBannerWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
  },
  serviceabilityIconBox: {
    marginRight: 10,
  },
  serviceabilityTextBox: {
    flex: 1,
  },
  serviceabilityStatusTitle: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    fontWeight: '700',
    color: '#065f46',
  },
  serviceabilityStatusTitleWarning: {
    color: '#b45309',
  },
  serviceabilityAddressSub: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#4b5563',
    marginTop: 1,
  },
  promiseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafaf9',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e7e7e5',
  },
  promiseContent: {
    marginLeft: 10,
    flex: 1,
  },
  promiseHeading: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
    marginBottom: 2,
  },
  promiseSubtitle: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#666666',
    lineHeight: 15,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 22,
  },
  sectionHeading: {
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
    marginBottom: 12,
  },
  itemsList: {
    backgroundColor: '#fafaf9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ededeb',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 7,
  },
  itemIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  itemText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#222222',
    lineHeight: 18,
  },
  itemTextDim: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#777777',
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 16 : 30,
    borderTopWidth: 1,
    borderTopColor: '#f0f0ed',
    shadowColor: '#1E242B',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  priceContainer: {
    justifyContent: 'center',
  },
  bottomPriceLabel: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#777777',
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
    marginLeft: 2,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E242B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    minHeight: 46,
    gap: 4,
  },
  ctaButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  ctaButtonText: {
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#ffffff',
    fontWeight: '600',
  },
});
