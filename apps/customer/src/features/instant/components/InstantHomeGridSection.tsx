import React, { useRef, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import Svg, { Path, Circle, Polygon, Text as SvgText, G, Line } from 'react-native-svg';
import { Zap, Star, ArrowRight } from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';
import { InstantServiceCatalogItem } from '../types/instant.types';
import { getInstantServiceImage } from '../../../assets/images/instant';

const { width: SCREEN_WIDTH } = Dimensions.get('window');


interface HeroPhrase {
  line1: string;
  line2: string;
  subtitle: string;
}

const HERO_PHRASES: HeroPhrase[] = [
  {
    line1: 'Help when',
    line2: 'you need it.',
    subtitle: 'Verified pros at your door in 10-15 minutes.',
  },
  {
    line1: 'Fast movers',
    line2: 'when you shift.',
    subtitle: 'Extra hands for room shifting, packing & lifting.',
  },
  {
    line1: 'Road help',
    line2: 'where you are.',
    subtitle: 'Quick breakdown recovery & emergency fuel top-up.',
  },
  {
    line1: 'Gas & fuel',
    line2: 'delivered fast.',
    subtitle: 'Emergency petrol & diesel delivered to your spot.',
  },
  {
    line1: 'Fresh laundry',
    line2: 'we pick it up.',
    subtitle: 'Express wash & fold picked up from your doorstep.',
  },
  {
    line1: 'Helping hand',
    line2: 'for any chore.',
    subtitle: 'Everyday chores, repairs & quick household tasks.',
  },
];

// HERO TITLE SECTION (ANIMATED VERTICAL SLIDE TICKER WITH POP-ART CARTOON TITLE & TILTED SUBTITLE)
const HeroTitleSection: React.FC = () => {
  const [index, setIndex] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      // 1. Slide up & fade out current phrase
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -24,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 2. Advance to next phrase and position below view
        setIndex((prev) => (prev + 1) % HERO_PHRASES.length);
        translateY.setValue(24);

        // 3. Spring slide up into view & fade in
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            damping: 14,
            stiffness: 240,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 2800);

    return () => clearInterval(timer);
  }, [translateY, opacity]);

  const phrase = HERO_PHRASES[index];

  return (
    <View style={styles.heroTitleContainer}>
      <View style={styles.titleSvgBox}>
        <Animated.View style={{ transform: [{ translateY }], opacity }}>
          <Svg width={SCREEN_WIDTH - 32} height={136} viewBox="0 0 340 136">
            <G transform="rotate(-2, 170, 68)">
              {/* 1. 3D Shadow layer offset down and right */}
              <SvgText
                textAnchor="middle"
                x="173"
                y="48"
                fill="#000000"
                stroke="#000000"
                strokeWidth={6.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                fontSize={39}
                fontFamily={Fonts.Black}
                fontWeight="900"
                letterSpacing={-0.3}
              >
                {phrase.line1}
              </SvgText>
              <SvgText
                textAnchor="middle"
                x="173"
                y="92"
                fill="#000000"
                stroke="#000000"
                strokeWidth={6.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                fontSize={39}
                fontFamily={Fonts.Black}
                fontWeight="900"
                letterSpacing={-0.3}
              >
                {phrase.line2}
              </SvgText>

              {/* 2. Bold black outline layer */}
              <SvgText
                textAnchor="middle"
                x="170"
                y="44"
                fill="#000000"
                stroke="#000000"
                strokeWidth={5.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                fontSize={39}
                fontFamily={Fonts.Black}
                fontWeight="900"
                letterSpacing={-0.3}
              >
                {phrase.line1}
              </SvgText>
              <SvgText
                textAnchor="middle"
                x="170"
                y="88"
                fill="#000000"
                stroke="#000000"
                strokeWidth={5.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                fontSize={39}
                fontFamily={Fonts.Black}
                fontWeight="900"
                letterSpacing={-0.3}
              >
                {phrase.line2}
              </SvgText>

              {/* 3. Electric yellow face layer */}
              <SvgText
                textAnchor="middle"
                x="170"
                y="44"
                fill="#FFF50F"
                stroke="#000000"
                strokeWidth={1.2}
                strokeLinejoin="round"
                strokeLinecap="round"
                fontSize={39}
                fontFamily={Fonts.Black}
                fontWeight="900"
                letterSpacing={-0.3}
              >
                {phrase.line1}
              </SvgText>
              <SvgText
                textAnchor="middle"
                x="170"
                y="88"
                fill="#FFF50F"
                stroke="#000000"
                strokeWidth={1.2}
                strokeLinejoin="round"
                strokeLinecap="round"
                fontSize={39}
                fontFamily={Fonts.Black}
                fontWeight="900"
                letterSpacing={-0.3}
              >
                {phrase.line2}
              </SvgText>

              {/* 4. Subtitle positioned directly under headline with exact same -2deg angle */}
              <SvgText
                textAnchor="middle"
                x="170"
                y="118"
                fill="#000000"
                fontSize={12.5}
                fontFamily={Fonts.Bold}
                fontWeight="700"
                letterSpacing={-0.1}
              >
                {phrase.subtitle}
              </SvgText>
            </G>
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
};

// Fallback catalog
const DEFAULT_INSTANT_CATALOG: InstantServiceCatalogItem[] = [
  {
    id: 'inst_helping_hand',
    slug: 'helping-hand',
    title: 'Helping Hand',
    subtitle: 'Daily chores, home cleaning\n& general task assistance',
    icon: 'Wrench',
    estimatedArrivalMinutes: 12,
    startingPrice: 59,
    badge: 'Popular',
    instantEnabled: true,
    themeColor: '#7C3AED',
    description: 'On-demand household chores and task assistance',
  },
  {
    id: 'inst_road_help',
    slug: 'road-help',
    title: 'Road Help',
    subtitle: 'Emergency fuel & doorstep\nvehicle breakdown support',
    icon: 'Car',
    estimatedArrivalMinutes: 15,
    startingPrice: 99,
    badge: 'Roadside',
    instantEnabled: true,
    themeColor: '#EF4444',
    description: 'Emergency roadside assistance and breakdown recovery',
  },
  {
    id: 'inst_laundry',
    slug: 'laundry',
    title: 'Laundry',
    subtitle: 'Doorstep express wash, iron\n& same-day fold delivery',
    icon: 'Shirt',
    estimatedArrivalMinutes: 18,
    startingPrice: 149,
    badge: 'Express',
    instantEnabled: true,
    themeColor: '#D97706',
    description: 'Instant pickup for express wash and fold services',
  },
  {
    id: 'inst_pack_move',
    slug: 'pack-move',
    title: 'Pack & Move',
    subtitle: 'Extra verified hands for easy\nroom shifting & luggage',
    icon: 'Package',
    estimatedArrivalMinutes: 20,
    startingPrice: 249,
    badge: 'Multi-helper',
    instantEnabled: true,
    themeColor: '#10B981',
    description: 'Helpers for shifting, loading, and lifting',
  },
];

interface AnimatedCardProps {
  service: InstantServiceCatalogItem;
  onPress: () => void;
}

const AnimatedInstantCard: React.FC<AnimatedCardProps> = ({ service, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const iconScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      damping: 14,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        damping: 18,
        stiffness: 320,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1.1,
        damping: 14,
        stiffness: 280,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 16,
        stiffness: 240,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1,
        damping: 16,
        stiffness: 240,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const etaLabel = service.estimatedArrivalMinutes
    ? `${service.estimatedArrivalMinutes - 3}–${service.estimatedArrivalMinutes + 3}m`
    : '9–15m';

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, styles.cardWrapper]}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.92}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${service.title}, starting from ₹${service.startingPrice}`}
      >
        {/* LEFT: EXTRA LARGE PROMINENT POP-ART ILLUSTRATION (UP TO 4X) */}
        <Animated.View style={[styles.cardImageContainer, { transform: [{ scale: iconScale }] }]}>
          <Image
            source={getInstantServiceImage(service.slug)}
            style={styles.cardImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* DASHED VERTICAL DIVIDER */}
        <View style={styles.dashedDividerWrapper} pointerEvents="none">
          {Array.from({ length: 18 }).map((_, idx) => (
            <View key={idx} style={styles.dashSegment} />
          ))}
        </View>

        {/* RIGHT: TEXT CONTENT, BADGES, ETA & PRICING ALIGNED ON LEFT */}
        <View style={styles.cardContentCol}>
          {/* TOP EYEBROW BADGE */}
          {service.badge && (
            <View style={styles.tagPill}>
              <Text style={styles.tagPillText}>{service.badge}</Text>
            </View>
          )}

          {/* MAIN HEADING - PLACED DIRECTLY UNDER EYEBROW ON LEFT */}
          <Text style={styles.cardTitle} numberOfLines={1}>
            {service.title}
          </Text>

          {/* SUBHEADING - FULL 2 LINES ON LEFT SIDE FOR RICH CARD CONTENT */}
          <Text style={styles.cardSubtitle} numberOfLines={2}>
            {service.subtitle}
          </Text>

          {/* ENHANCED UX DETAIL: RATING & VERIFIED PROS */}
          <View style={styles.metaRow}>
            <View style={styles.ratingBadge}>
              <Star size={10} color="#000000" fill="#000000" />
              <Text style={styles.ratingText}>4.9</Text>
            </View>
            <View style={styles.metaDot} />
            <Text style={styles.metaTrustText}>Verified Pros</Text>
          </View>

          {/* FOOTER ROW: ETA PILL & STARTING PRICE */}
          <View style={styles.cardFooterRow}>
            <View style={styles.etaPill}>
              <Zap size={11} color="#000000" fill="#000000" strokeWidth={2.4} />
              <Text style={styles.etaText}>{etaLabel}</Text>
            </View>

            <View style={styles.priceRow}>
              <View style={styles.priceCol}>
                <Text style={styles.pricePrefix}>From</Text>
                <Text style={styles.priceValue}>₹{service.startingPrice}</Text>
              </View>
              <View style={styles.arrowCircle}>
                <ArrowRight size={13} color="#000000" strokeWidth={2.8} />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface InstantHomeGridSectionProps {
  catalog?: InstantServiceCatalogItem[];
  onSelectService: (service: InstantServiceCatalogItem) => void;
}

export const InstantHomeGridSection: React.FC<InstantHomeGridSectionProps> = ({
  catalog = DEFAULT_INSTANT_CATALOG,
  onSelectService,
}) => {
  const items = catalog && catalog.length > 0 ? catalog : DEFAULT_INSTANT_CATALOG;

  return (
    <View style={styles.container}>
      {/* HERO TITLE: EXACT TITLE FONT WITH 3D SHADOW & INTEGRATED TILTED SUBTITLE */}
      <HeroTitleSection />

      {/* DIVIDER LINE BETWEEN TEXT PART AND CARDS */}
      <View style={styles.dividerLine} />

      {/* 2-COLUMN ELECTRIC YELLOW CARDS (MATCHING USER REFERENCE EXACTLY) */}
      <View style={styles.grid}>
        {items.map((service) => (
          <AnimatedInstantCard
            key={service.id || service.slug}
            service={service}
            onPress={() => onSelectService(service)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#C89FFB', // Vibrant soft lilac canvas matching reference
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 110,
  },
  heroTitleContainer: {
    marginBottom: 4,
    paddingTop: 0,
  },
  titleSvgBox: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    height: 136,
    marginVertical: 0,
  },
  dividerLine: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    marginTop: 6,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'column',
    gap: 14,
  },
  cardWrapper: {
    width: '100%',
  },
  card: {
    width: '100%',
    backgroundColor: '#FFF50F', // Vivid Electric Banana Yellow
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 160,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  cardImageContainer: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: 148,
    height: 148,
  },
  dashedDividerWrapper: {
    width: 2,
    height: 132,
    marginHorizontal: 8,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashSegment: {
    width: 1.8,
    height: 4.5,
    backgroundColor: '#000000',
    opacity: 0.22,
    borderRadius: 1,
  },
  cardContentCol: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 144,
    paddingLeft: 4,
    paddingRight: 2,
  },
  tagPill: {
    backgroundColor: '#FDBDDF', // Bubblegum pink pastel pill
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 3,
  },
  tagPillText: {
    fontSize: 9.5,
    fontFamily: Fonts.Bold,
    color: '#000000',
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: Fonts.Black,
    color: '#000000',
    letterSpacing: -0.3,
    lineHeight: 22,
    alignSelf: 'flex-start',
  },
  cardSubtitle: {
    fontSize: 11.5,
    fontFamily: Fonts.Medium,
    color: '#222222',
    marginTop: 3,
    marginBottom: 4,
    lineHeight: 16,
    alignSelf: 'flex-start',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.07)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 10,
    fontFamily: Fonts.Bold,
    color: '#000000',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#000000',
    opacity: 0.35,
  },
  metaTrustText: {
    fontSize: 10.5,
    fontFamily: Fonts.Bold,
    color: '#000000',
    opacity: 0.7,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#CCB2FC', // Soft lavender purple pill
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  etaText: {
    fontSize: 10.5,
    fontFamily: Fonts.Bold,
    color: '#000000',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceCol: {
    alignItems: 'flex-end',
  },
  pricePrefix: {
    fontSize: 9.5,
    fontFamily: Fonts.Bold,
    color: '#000000',
    lineHeight: 11,
  },
  priceValue: {
    fontSize: 20,
    fontFamily: Fonts.Bold,
    color: '#000000',
    lineHeight: 22,
    letterSpacing: -0.5,
  },
  arrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
