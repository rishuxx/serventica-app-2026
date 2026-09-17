import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { ServiceCard } from '../../categories/components/ServiceCard';
import { CatalogSectionData } from '../../../types/experience.types';
import { ServiceDetailItem } from '../../../types/category.types';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { Inbox, AlertCircle, RefreshCw } from 'lucide-react-native';
import { ShimmerPlaceholder } from '../../../shared/components/ShimmerPlaceholder';

interface DynamicCatalogSectionProps {
  sections: CatalogSectionData[];
  isLoading: boolean;
  error: string | null;
  categoryName: string;
  onSelectService: (service: ServiceDetailItem) => void;
  onRetry: () => void;
}

export const DynamicCatalogSection: React.FC<DynamicCatalogSectionProps> = React.memo(({
  sections,
  isLoading,
  error,
  categoryName,
  onSelectService,
  onRetry,
}) => {
  // 1. Error state
  if (error && sections.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={32} color="#EF4444" strokeWidth={1.8} style={styles.errorIcon} />
        <Text style={styles.errorTitle}>Unable to load services</Text>
        <Text style={styles.errorSubtitle}>
          We couldn't connect to our catalog. Please check your network.
        </Text>
        <TouchableOpacity style={styles.retryButton} activeOpacity={0.8} onPress={onRetry}>
          <RefreshCw size={15} color="#FFFFFF" style={styles.retryIcon} />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 2. Loading Shimmer Skeleton state
  if (isLoading && sections.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeaderRow}>
          <ShimmerPlaceholder width={160} height={20} borderRadius={6} />
          <View style={{ height: 6 }} />
          <ShimmerPlaceholder width={90} height={13} borderRadius={4} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalCardsList}
        >
          {[1, 2, 3].map((key) => (
            <View key={key} style={styles.shimmerVerticalCard}>
              <ShimmerPlaceholder width={136} height={124} borderRadius={12} style={{ marginBottom: 8 }} />
              <ShimmerPlaceholder width={80} height={16} borderRadius={4} style={{ marginBottom: 6 }} />
              <ShimmerPlaceholder width={120} height={14} borderRadius={4} style={{ marginBottom: 6 }} />
              <ShimmerPlaceholder width={90} height={12} borderRadius={4} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // 3. Empty state
  if (!isLoading && sections.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Inbox size={34} color="#9CA3AF" strokeWidth={1.6} />
        <Text style={styles.emptyTitle}>No services available yet</Text>
        <Text style={styles.emptySubtitle}>
          We are onboarding certified {categoryName} professionals in your area soon.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Breaker Divider & Label right below Hero Banner */}
      {sections.length > 0 && (
        <View style={styles.topBreakerContainer}>
          <View style={styles.breakerLine} />
          <Text style={styles.breakerText}>MOST ORDERED & RECOMMENDED</Text>
          <View style={styles.breakerLine} />
        </View>
      )}

      {sections.map((section, index) => (
        <View key={section.id} style={styles.sectionBlock}>
          {/* Section Header */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionSubtitle}>
              {section.services.length} {section.services.length === 1 ? 'service' : 'services'} available
            </Text>
          </View>

          {/* Service Cards Horizontal Carousel (Quick-Commerce Layout) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalCardsList}
          >
            {section.services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                cardWidth={140}
                onPress={() => onSelectService(service)}
                isServiceable={true}
              />
            ))}
          </ScrollView>

          {/* Slim Thin Divider after every section (except last) */}
          {index < sections.length - 1 && (
            <View style={styles.dividerContainer}>
              <View style={styles.slimDivider} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: 12,
    paddingBottom: 24,
  },
  topBreakerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: 2,
  },
  breakerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  breakerText: {
    marginHorizontal: 12,
    fontSize: 10.5,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  dividerContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  slimDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.07)',
    width: '100%',
  },
  sectionHeaderRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
    marginTop: 2,
  },
  horizontalCardsList: {
    paddingHorizontal: 16,
    paddingRight: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#374151',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  errorIcon: {
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
    marginTop: 12,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#5E6672',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262B34',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  retryIcon: {
    marginRight: 6,
  },
  retryText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#FFFFFF',
  },
  shimmerVerticalCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E8E6',
    marginRight: 12,
    padding: 8,
  },
});
