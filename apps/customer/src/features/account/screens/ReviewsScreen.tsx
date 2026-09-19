import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { ArrowLeft, Star, MessageSquare } from 'lucide-react-native';
import { accountRepository } from '../../../repositories/account.repository';
import { ServiceReviewRecord } from '@serventica/types';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

interface ReviewsScreenProps {
  onBack: () => void;
  onExploreServices: () => void;
}

export const ReviewsScreen: React.FC<ReviewsScreenProps> = ({
  onBack,
  onExploreServices,
}) => {
  const [reviews, setReviews] = useState<ServiceReviewRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setIsLoading(true);
      const data = await accountRepository.getUserReviews();
      setReviews(data);
    } catch (e) {
      console.warn('Failed to load reviews', e);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            color="#FFB800"
            fill={star <= rating ? '#FFB800' : 'transparent'}
            style={{ marginRight: 2 }}
          />
        ))}
      </View>
    );
  };

  const keyExtractor = useCallback((item: ServiceReviewRecord) => item.id, []);

  const renderReviewItem = useCallback(({ item }: { item: ServiceReviewRecord }) => (
    <View style={styles.reviewCard}>
      <View style={styles.cardTopRow}>
        <Text style={styles.serviceName}>{item.serviceName}</Text>
        {renderStars(item.rating)}
      </View>
      {item.comment ? (
        <View style={styles.commentContainer}>
          <Text style={styles.commentText}>"{item.comment}"</Text>
        </View>
      ) : null}
      <Text style={styles.dateText}>{item.createdAt}</Text>
    </View>
  ), []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#1E242B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reviews</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color="#1E242B" />
          <Text style={styles.loadingText}>Loading reviews...</Text>
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <MessageSquare size={32} color="#999999" />
          </View>
          <Text style={styles.emptyTitle}>No Reviews Yet</Text>
          <Text style={styles.emptySubtitle}>
            When you complete bookings and review our service partners, your feedback will appear here.
          </Text>
          <TouchableOpacity style={styles.exploreBtn} onPress={onExploreServices}>
            <Text style={styles.exploreBtnText}>Book a Service</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={keyExtractor}
          renderItem={renderReviewItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
    backgroundColor: '#FAF9F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: '#FAF9F6',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: ServenticaTokens.fonts.Bold,
    fontSize: 20,
    color: '#1E242B',
    letterSpacing: 0.3,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontFamily: ServenticaTokens.fonts.Regular,
    fontSize: 14,
    color: '#777777',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F7F7F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: ServenticaTokens.fonts.Bold,
    fontSize: 18,
    color: '#1E242B',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: ServenticaTokens.fonts.Regular,
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  exploreBtn: {
    backgroundColor: '#1E242B',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
  },
  exploreBtnText: {
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  serviceName: {
    fontFamily: ServenticaTokens.fonts.SemiBold,
    fontSize: 16,
    color: '#1E242B',
    fontWeight: '500',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F8F7',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  commentText: {
    flex: 1,
    fontFamily: ServenticaTokens.fonts.Regular,
    fontSize: 13,
    color: '#444444',
    lineHeight: 18,
  },
  dateText: {
    fontFamily: ServenticaTokens.fonts.Regular,
    fontSize: 12,
    color: '#999999',
  },
});
