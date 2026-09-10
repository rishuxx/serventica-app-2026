import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  Search,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { HomeBasicServiceItem } from '../../../types/home.types';
import { AssetRegistry } from '../../../services/home.service';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

interface SearchResultsViewProps {
  query: string;
  results: HomeBasicServiceItem[];
  isSearching: boolean;
  onSelectService?: (service: HomeBasicServiceItem) => void;
  onSelectSuggestedQuery?: (q: string) => void;
}

const POPULAR_SUGGESTIONS = [
  'Electrician',
  'AC Repair',
  'Plumber',
  'RO Filter Purifier',
  'Fan & Cooler',
  'Cleaning',
];

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({
  query,
  results,
  isSearching,
  onSelectService,
  onSelectSuggestedQuery,
}) => {
  const trimmed = query.trim();

  // 1. Loading State
  if (isSearching && results.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color='#1E242B' />
        <Text style={styles.searchingText}>Searching verified services...</Text>
      </View>
    );
  }

  // 2. Empty Query State (Show Recent/Popular suggestions)
  if (!trimmed) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <Sparkles size={16} color='#1E242B' strokeWidth={2.2} />
          <Text style={styles.sectionTitle}>Popular Searches</Text>
        </View>

        <View style={styles.chipsContainer}>
          {POPULAR_SUGGESTIONS.map((item) => (
            <TouchableOpacity
              key={item}
              style={styles.chip}
              activeOpacity={0.7}
              onPress={() => onSelectSuggestedQuery && onSelectSuggestedQuery(item)}
            >
              <Text style={styles.chipText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // 3. No Results State
  if (results.length === 0 && !isSearching) {
    return (
      <View style={styles.noResultsContainer}>
        <Text style={styles.noResultsTitle}>No services found for "{trimmed}"</Text>
        <Text style={styles.noResultsSubtitle}>
          Try checking for typos or search for popular services below:
        </Text>

        <View style={styles.chipsContainer}>
          {POPULAR_SUGGESTIONS.slice(0, 4).map((item) => (
            <TouchableOpacity
              key={item}
              style={styles.chip}
              activeOpacity={0.7}
              onPress={() => onSelectSuggestedQuery && onSelectSuggestedQuery(item)}
            >
              <Text style={styles.chipText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // 4. Real Results List (Fetched from Supabase services table)
  return (
    <View style={styles.container}>
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {results.length} service{results.length > 1 ? 's' : ''} found
        </Text>
        {isSearching ? <ActivityIndicator size="small" color="#666666" /> : null}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const imageSource = AssetRegistry[item.image_url] || AssetRegistry.basic_ac_repair;
          return (
            <TouchableOpacity
              style={styles.resultItem}
              activeOpacity={0.7}
              onPress={() => onSelectService && onSelectService(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, from ₹${item.base_price}`}
            >
              <View style={styles.itemImageContainer}>
                <Image source={imageSource} style={styles.itemImage} resizeMode="contain" />
              </View>

              <View style={styles.itemDetails}>
                {item.category_name ? (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{item.category_name}</Text>
                  </View>
                ) : null}
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemTagline} numberOfLines={1}>
                  {item.short_tagline || item.description}
                </Text>
                <Text style={styles.itemPrice}>From ₹{item.base_price}</Text>
              </View>

              <ArrowRight size={18} color="#8A8A8A" strokeWidth={2} />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  searchingText: {
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#666666',
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
    marginLeft: 6,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#F6F6F4',
    borderWidth: 1,
    borderColor: '#E8E8E6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#171717',
  },
  noResultsContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  noResultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
    marginBottom: 8,
  },
  noResultsSubtitle: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0EE',
    marginBottom: 8,
  },
  resultsCount: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#666666',
  },
  listContent: {
    paddingBottom: 24,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F7F5',
  },
  itemImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F7F7F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemImage: {
    width: 38,
    height: 38,
  },
  itemDetails: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
  },
  itemTagline: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#666666',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
    marginTop: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F2F2F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#555555',
  },
});
