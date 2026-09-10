import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ArrowLeft, Star, MessageSquare } from 'lucide-react-native';
import { accountRepository } from '../../../repositories/account.repository';
import { ServiceReviewRecord } from '@serventica/types';

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
    } catch (err: any) {
      Alert.alert('Error', 'Unable to load your reviews at this time.');
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
            size={15}
            color={star <= rating ? '#EAB308' : '#D1D5DB'}
            fill={star <= rating ? '#EAB308' : 'transparent'}
            strokeWidth={1.5}
            style={{ marginRight: 2 }}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={22} color='#1E242B' strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reviews</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color='#1E242B' />
          <Text style={styles.loadingText}>Loading reviews...</Text>
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Star size={32} color="#999999" strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>No reviews yet</Text>
          <Text style={styles.emptySubtitle}>
            Once a booked service is completed, you can rate and review your experience with our verified professionals.
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
          data={reviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.reviewCard}>
              <View style={styles.cardTopRow}>
                <Text style={styles.serviceName}>Home Service #{item.serviceId.slice(0, 6)}</Text>
                {renderStars(item.rating)}
              </View>

              {item.reviewText ? (
                <View style={styles.commentContainer}>
                  <MessageSquare size={14} color="#777777" strokeWidth={1.5} style={{ marginRight: 6, marginTop: 2 }} />
                  <Text style={styles.commentText}>{item.reviewText}</Text>
                </View>
              ) : null}

              <Text style={styles.dateText}>
                Reviewed on{' '}
                {new Date(item.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: 'Coolvetica',
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
    fontFamily: 'Coolvetica',
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
    fontFamily: 'Coolvetica',
    fontSize: 18,
    color: '#1E242B',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: 'Coolvetica',
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
    fontFamily: 'Coolvetica',
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
    fontFamily: 'Coolvetica',
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
    fontFamily: 'Coolvetica',
    fontSize: 13,
    color: '#444444',
    lineHeight: 18,
  },
  dateText: {
    fontFamily: 'Coolvetica',
    fontSize: 12,
    color: '#999999',
  },
});
