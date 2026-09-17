import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
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

  // 2. Loading Shimmer Skeleton state when switching categories
  if (isLoading && sections.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeaderRow}>
          <ShimmerPlaceholder width={180} height={22} borderRadius={6} />
          <View style={{ height: 6 }} />
          <ShimmerPlaceholder width={100} height={14} borderRadius={4} />
        </View>
        <View style={styles.cardsList}>
          {[1, 2, 3].map((key) => (
            <View key={key} style={styles.shimmerCardContainer}>
              <View style={{ flex: 1, marginRight: 14 }}>
                <ShimmerPlaceholder width="85%" height={18} borderRadius={6} style={{ marginBottom: 8 }} />
                <ShimmerPlaceholder width="95%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                <ShimmerPlaceholder width="60%" height={14} borderRadius={4} style={{ marginBottom: 12 }} />
                <ShimmerPlaceholder width={80} height={18} borderRadius={6} />
              </View>
              <View style={{ alignItems: 'center' }}>
                <ShimmerPlaceholder width={78} height={72} borderRadius={12} style={{ marginBottom: 8 }} />
                <ShimmerPlaceholder width={78} height={28} borderRadius={14} />
              </View>
            </View>
          ))}
        </View>
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
      {sections.map((section) => (
        <View key={section.id} style={styles.sectionBlock}>
          {/* Section Header */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionSubtitle}>
              {section.services.length} {section.services.length === 1 ? 'service' : 'services'} available
            </Text>
          </View>

          {/* Service Cards List */}
          <View style={styles.cardsList}>
            {section.services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onPress={() => onSelectService(service)}
                isServiceable={true}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: 16,
    paddingBottom: 24,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
  },
  sectionSubtitle: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#5E6672',
    marginTop: 2,
  },
  cardsList: {
    paddingHorizontal: 16,
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 30,
  },
  skeletonHeader: {
    width: 140,
    height: 18,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 16,
  },
  skeletonCard: {
    width: '100%',
    height: 110,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#374151',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
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
    fontWeight: '600',
    color: '#FFFFFF',
  },
  shimmerCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E8E6',
    marginBottom: 12,
    padding: 14,
  },
});
