import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ServiceCard,
  HorizontalOfferCard,
  mockServices,
  ServiceCardTokens,
  Ribbon,
  FavoriteButton,
} from '@serventica/design-system';

interface ServiceCardShowcaseScreenProps {
  onBack?: () => void;
}

export const ServiceCardShowcaseScreen: React.FC<ServiceCardShowcaseScreenProps> = ({ onBack }) => {
  const { width: screenWidth } = useWindowDimensions();
  const [favoriteState, setFavoriteState] = useState<{ [id: string]: boolean }>({
    'fav-1': false,
    'fav-2': true,
  });

  // Calculate 2-column responsive width
  const horizontalPadding = 16;
  const gridGap = 12;
  const twoColWidth = (screenWidth - horizontalPadding * 2 - gridGap) / 2;

  const toggleFavorite = (id: string) => {
    setFavoriteState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Screen Header */}
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>SERVENTICA CARD SYSTEM</Text>
          <Text style={styles.headerSubtitle}>Production Design-Matched Service Cards</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. VISUAL REFERENCE-MATCHED CARDS (Double Ribbon & Single Ribbon) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>REFERENCE-MATCHED CARDS (GREEN / YELLOW / ORANGE)</Text>
            <Text style={styles.sectionCaption}>Exact drawable gradients, cute corners, & double-ribbon support</Text>
          </View>
          <View style={styles.twoColumnGrid}>
            <ServiceCard service={mockServices[0]} cardWidth={twoColWidth} />
            <ServiceCard service={mockServices[1]} cardWidth={twoColWidth} />
          </View>
        </View>

        {/* 2. PLUMBING (DOUBLE RIBBON) & CLEAN NO-RIBBON CARD */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>FILTERED VS STANDARD CARD</Text>
            <Text style={styles.sectionCaption}>Left: Double ribbon (Green + Orange) • Right: Standard (No ribbon)</Text>
          </View>
          <View style={styles.twoColumnGrid}>
            <ServiceCard service={mockServices[2]} cardWidth={twoColWidth} />
            <ServiceCard service={mockServices[3]} cardWidth={twoColWidth} />
          </View>
        </View>

        {/* 3. RIBBON SYSTEM (ONLY GREEN, YELLOW, & ORANGE PALETTE) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>CUTE ROUNDED RIBBONS (3 CURATED GRADIENTS)</Text>
            <Text style={styles.sectionCaption}>Green (#52DF58→#204921) • Yellow (#FFDD6D→#F37A00) • Orange (#FFA726→#E65100)</Text>
          </View>
          <View style={styles.ribbonRow}>
            <Ribbon colorVariant="green" label="Occasional Decors" />
            <Ribbon colorVariant="green" label="Painting" />
            <Ribbon colorVariant="green" label="Plumbing" />
          </View>
          <View style={[styles.ribbonRow, { marginTop: 10 }]}>
            <Ribbon colorVariant="yellow" label="Serventica Originals" />
            <Ribbon colorVariant="yellow" label="Recommended" />
          </View>
          <View style={[styles.ribbonRow, { marginTop: 10 }]}>
            <Ribbon colorVariant="orange" label="Most Booked Service" />
            <Ribbon colorVariant="orange" label="Booked 2w ago" />
          </View>
        </View>

        {/* 4. CLEAN VECTOR FAVORITE HEARTS (NO GREY CIRCLE) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>FAVORITE STATES (NO GREY CIRCLE BACKGROUND)</Text>
            <Text style={styles.sectionCaption}>Pure vector heart with drop shadow & 44px hit slop</Text>
          </View>
          <View style={styles.favoriteRow}>
            <View style={styles.favoriteItem}>
              <FavoriteButton
                active={favoriteState['fav-1']}
                onPress={() => toggleFavorite('fav-1')}
                size={40}
                iconSize={24}
                outlineColor="#1E293B"
              />
              <Text style={styles.favoriteLabel}>
                {favoriteState['fav-1'] ? 'Active (Filled Red)' : 'Inactive (Clean Outline)'}
              </Text>
            </View>

            <View style={styles.favoriteItem}>
              <FavoriteButton
                active={favoriteState['fav-2']}
                onPress={() => toggleFavorite('fav-2')}
                size={40}
                iconSize={24}
                outlineColor="#1E293B"
              />
              <Text style={styles.favoriteLabel}>
                {favoriteState['fav-2'] ? 'Active (Filled Red)' : 'Inactive (Clean Outline)'}
              </Text>
            </View>
          </View>
        </View>

        {/* 5. CARD SIZES (SMALL / MEDIUM / LARGE) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>CARD SIZES (SMALL / MEDIUM / LARGE)</Text>
            <Text style={styles.sectionCaption}>Responsive geometry scaling</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            <View style={styles.sizeWrapper}>
              <Text style={styles.sizeTag}>Small (140px)</Text>
              <ServiceCard service={mockServices[0]} size="small" />
            </View>
            <View style={styles.sizeWrapper}>
              <Text style={styles.sizeTag}>Medium (165px)</Text>
              <ServiceCard service={mockServices[0]} size="medium" />
            </View>
            <View style={styles.sizeWrapper}>
              <Text style={styles.sizeTag}>Large (200px)</Text>
              <ServiceCard service={mockServices[0]} size="large" />
            </View>
          </ScrollView>
        </View>

        {/* 6. HORIZONTAL FLASH / SHOWCASE / LIMITED OFFER CARDS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>HORIZONTAL OFFER CARDS (FLASH / LIMITED OFFERS)</Text>
            <Text style={styles.sectionCaption}>Exact visual reference matching: Double ribbons, 22px rounded corners, Coolvetica #FFE100 typography</Text>
          </View>
          <View style={styles.horizontalOfferList}>
            {/* Reference 1: Occasional Decors + Serventica Originals (Visiting Free) */}
            <HorizontalOfferCard
              image="https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=800&auto=format&fit=crop"
              ribbon={{ colorVariant: 'green', label: 'Occasional Decors' }}
              secondaryRibbon={{ colorVariant: 'yellow', label: 'Serventica Originals' }}
              favorite={true}
              offerValue="Visiting"
              offerSuffix="Free"
              offerDescription="Get your Place Ready for Celebrations."
              offerTerms="Any Time, Any Where with us"
              width={screenWidth - 64}
            />

            {/* Reference 2: Painting (Single Green Ribbon: #52DF58 -> #204921, 20% OFF) */}
            <View style={{ marginTop: 16 }}>
              <HorizontalOfferCard
                image="https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=800&auto=format&fit=crop"
                ribbon={{ colorVariant: 'green', label: 'Painting' }}
                favorite={true}
                offerValue="20%"
                offerSuffix="OFF"
                offerDescription="Get Flat 20% off on Full house painting"
                offerTerms="with us | T&C Apply."
                width={screenWidth - 64}
              />
            </View>
          </View>
        </View>

        {/* 7. EDGE CASES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>EDGE CASES & CONTENT STRESS TESTS</Text>
            <Text style={styles.sectionCaption}>Long title truncation, single ribbon, and repeat bookings</Text>
          </View>
          <View style={styles.twoColumnGrid}>
            <ServiceCard service={mockServices[5]} cardWidth={twoColWidth} />
            <ServiceCard service={mockServices[6]} cardWidth={twoColWidth} />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    marginRight: 12,
    padding: 6,
  },
  backButtonText: {
    fontSize: 22,
    color: '#1E242B',
    fontWeight: 'bold',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: ServiceCardTokens.typography.fontPrimaryBold,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: ServiceCardTokens.typography.fontPrimaryRegular,
    color: '#64748B',
    marginTop: 2,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 24,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: ServiceCardTokens.typography.fontPrimaryBold,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.3,
  },
  sectionCaption: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  twoColumnGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  ribbonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
    paddingVertical: 8,
  },
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  favoriteLabel: {
    fontSize: 12,
    fontFamily: ServiceCardTokens.typography.fontPrimaryMedium,
    color: '#334155',
  },
  horizontalList: {
    gap: 14,
    paddingRight: 10,
  },
  sizeWrapper: {
    alignItems: 'flex-start',
  },
  sizeTag: {
    fontSize: 11,
    fontFamily: ServiceCardTokens.typography.fontPrimaryBold,
    color: '#64748B',
    marginBottom: 8,
  },
  horizontalOfferList: {
    width: '100%',
    alignItems: 'center',
  },
});
