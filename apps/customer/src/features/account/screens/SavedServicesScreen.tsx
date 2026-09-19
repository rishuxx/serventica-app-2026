import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { ArrowLeft, Heart } from 'lucide-react-native';
import { useSavedServices } from '../../../hooks/useSavedServices';
import { ServiceCard } from '../../categories/components/ServiceCard';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { SavedServiceItem } from '../../../../../../packages/types/src';

interface SavedServicesScreenProps {
  onBack: () => void;
  onSelectService: (service: { id: string; slug: string; name: string }) => void;
  onExploreServices: () => void;
}

export const SavedServicesScreen: React.FC<SavedServicesScreenProps> = ({
  onBack,
  onSelectService,
  onExploreServices,
}) => {
  const { savedServices, isLoading, refresh, toggleSave } = useSavedServices();

  const keyExtractor = useCallback((item: SavedServiceItem) => item.id, []);

  const renderItem = useCallback(({ item }: { item: SavedServiceItem }) => (
    <ServiceCard
      service={{
        id: item.service.id,
        category_id: '',
        name: item.service.name,
        slug: item.service.slug,
        description: item.service.description,
        pricing_type: 'FIXED',
        base_price: item.service.basePrice,
        duration_minutes: item.service.durationMinutes,
        is_active: true,
        rating: item.service.rating,
        reviews_count: item.service.reviewsCount,
        image_url: item.service.imageUrl,
      }}
      cardWidth="48%"
      isSaved={true}
      onToggleSave={toggleSave}
      onPress={() =>
        onSelectService({
          id: item.service.id,
          slug: item.service.slug,
          name: item.service.name,
        })
      }
    />
  ), [toggleSave, onSelectService]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.circleBackButton}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color="#1E242B" strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Services</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading && savedServices.length === 0 ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#1E242B" />
          <Text style={styles.loadingText}>Loading saved services...</Text>
        </View>
      ) : savedServices.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIconCircle}>
            <Heart size={32} color="#888888" strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>Save services you use often</Text>
          <Text style={styles.emptySubtitle}>
            Bookmark recurring home cleaning, AC maintenance, or repair services for fast single-tap bookings.
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={onExploreServices}
            activeOpacity={0.85}
          >
            <Text style={styles.exploreBtnText}>Explore Services</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={savedServices}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={refresh}
          refreshing={isLoading}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 14,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  circleBackButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
  },
  headerSpacer: {
    width: 38,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  exploreBtn: {
    backgroundColor: '#1E242B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.SemiBold,
  },
  listContent: {
    paddingVertical: 14,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
});
