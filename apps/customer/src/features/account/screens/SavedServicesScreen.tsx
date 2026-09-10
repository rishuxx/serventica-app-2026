import React from 'react';
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
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { useSavedServices } from '../../../hooks/useSavedServices';
import { ServiceCard } from '../../categories/components/ServiceCard';

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
  const { savedServices, isLoading, refresh } = useSavedServices();

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
          <ArrowLeft size={20} color='#1E242B' strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Services</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color='#1E242B' />
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
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
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
              onPress={() =>
                onSelectService({
                  id: item.service.id,
                  slug: item.service.slug,
                  name: item.service.name,
                })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={refresh}
          refreshing={isLoading}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFBFA',
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
    borderBottomColor: '#F0F0ED',
  },
  circleBackButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
  },
  headerSpacer: {
    width: 38,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#777777',
    marginTop: 12,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F5F5F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#777777',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  exploreBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#1E242B',
  },
  exploreBtnText: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
