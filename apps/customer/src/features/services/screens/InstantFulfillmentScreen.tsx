import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Share2,
  Star,
  Trash2,
  Zap,
  CheckCircle2,
} from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { useCart } from '../../../features/cart/context/CartContext';
import { useLocation } from '../../../context/LocationContext';
import { useServiceETA } from '../../../hooks/useServiceETA';

interface HourlyDurationOption {
  id: string;
  durationLabel: string;
  price: number;
  originalPrice: number;
  savings: number;
}

const HOURLY_DURATIONS: HourlyDurationOption[] = [
  { id: '0.5hr', durationLabel: '0.5 hr', price: 30, originalPrice: 125, savings: 95 },
  { id: '1hr', durationLabel: '1 hr', price: 59, originalPrice: 250, savings: 191 },
  { id: '1.5hr', durationLabel: '1.5 hr', price: 89, originalPrice: 375, savings: 286 },
  { id: '2hr', durationLabel: '2 hr', price: 118, originalPrice: 500, savings: 382 },
];

const CATEGORY_TASK_MAP: Record<string, { title: string; time: string; icon: string }[]> = {
  'ac-appliances': [
    { title: 'AC Filter Clean', time: '20 mins', icon: '❄️' },
    { title: 'Gas Leak Check', time: '15 mins', icon: '🔍' },
    { title: 'Cooling Coil Wash', time: '30 mins', icon: '🧼' },
    { title: 'Drain Pipe Flush', time: '15 mins', icon: '🚿' },
    { title: 'Appliance Diagnostics', time: '25 mins', icon: '⚙️' },
    { title: 'Outdoor Unit Clean', time: '30 mins', icon: '🌀' },
    { title: 'Wiring Inspection', time: '20 mins', icon: '⚡' },
    { title: 'Quick Gas Top-up', time: '25 mins', icon: '💨' },
  ],
  'electrician': [
    { title: 'Switchboard Repair', time: '20 mins', icon: '🔌' },
    { title: 'MCB Tripping Fix', time: '25 mins', icon: '⚡' },
    { title: 'Fan Installation', time: '30 mins', icon: '🌀' },
    { title: 'Light Fitting', time: '15 mins', icon: '💡' },
    { title: 'Wiring Short-Circuit', time: '35 mins', icon: '🧯' },
    { title: 'Inverter Diagnostics', time: '20 mins', icon: '🔋' },
    { title: 'Socket Replacement', time: '15 mins', icon: '🔌' },
    { title: 'Appliance Connection', time: '20 mins', icon: '🛠️' },
  ],
  'plumbing': [
    { title: 'Tap Leakage Fix', time: '15 mins', icon: '🚰' },
    { title: 'Drain Unclogging', time: '30 mins', icon: '🚿' },
    { title: 'Washbasin Fitting', time: '25 mins', icon: '🧼' },
    { title: 'Flush Tank Repair', time: '20 mins', icon: '🚽' },
    { title: 'Water Motor Check', time: '25 mins', icon: '⚙️' },
    { title: 'Shower Head Fix', time: '15 mins', icon: '🚿' },
    { title: 'Pipe Line Jointing', time: '35 mins', icon: '🔧' },
    { title: 'Gasket & Valve Repl.', time: '20 mins', icon: '🔩' },
  ],
  'default': [
    { title: 'Bathroom Cleaning', time: '40 mins', icon: '🛁' },
    { title: 'Utensils', time: '20 mins', icon: '🍽️' },
    { title: 'Balcony Cleaning', time: '30 mins', icon: '🪴' },
    { title: 'Fan Dusting', time: '20 mins', icon: '🌀' },
    { title: 'Sweeping & Mopping', time: '30 mins', icon: '🧹' },
    { title: 'Dusting & Wiping', time: '30 mins', icon: '🧽' },
    { title: 'Kitchen Cleaning', time: '30 mins', icon: '🍳' },
    { title: 'Window Cleaning', time: '25 mins', icon: '🪟' },
  ],
};

interface InstantFulfillmentScreenProps {
  onBack: () => void;
  categoryName?: string;
  categorySlug?: string;
}

export const InstantFulfillmentScreen: React.FC<InstantFulfillmentScreenProps> = ({
  onBack,
  categoryName = 'Cleaning & Househelp',
  categorySlug = 'home-cleaning',
}) => {
  const { addItem, openCartDrawer } = useCart();
  const { activeLocation } = useLocation();

  const userCoordinates = React.useMemo(() => {
    if (activeLocation?.latitude != null && activeLocation?.longitude != null) {
      return { latitude: activeLocation.latitude, longitude: activeLocation.longitude };
    }
    return null;
  }, [activeLocation?.latitude, activeLocation?.longitude]);

  const { formattedETA } = useServiceETA(userCoordinates);

  const [selectedDurationId, setSelectedDurationId] = useState<string>('0.5hr');
  const [isAdded, setIsAdded] = useState<boolean>(true);

  const selectedDuration = HOURLY_DURATIONS.find((d) => d.id === selectedDurationId) || HOURLY_DURATIONS[0];
  const activeTasks = CATEGORY_TASK_MAP[categorySlug] || CATEGORY_TASK_MAP.default;

  const handleToggleAdd = (duration: HourlyDurationOption) => {
    setSelectedDurationId(duration.id);
    setIsAdded(true);
    addItem({
      id: `instant_${categorySlug}_${duration.id}`,
      name: `${categoryName} (${duration.durationLabel})`,
      base_price: duration.price,
      duration_minutes: duration.id === '0.5hr' ? 30 : duration.id === '1hr' ? 60 : duration.id === '1.5hr' ? 90 : 120,
      image_url: 'service_cleaning',
    } as any);
  };

  const handleGoToCart = () => {
    openCartDrawer();
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 1. GREEN HERO BANNER */}
        <View style={styles.heroBanner}>
          {/* Top Nav Bar */}
          <View style={styles.topNavBar}>
            <TouchableOpacity style={styles.circleBtn} onPress={onBack} activeOpacity={0.8}>
              <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.circleBtn} activeOpacity={0.8}>
              <Share2 size={18} color="#FFFFFF" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          {/* Hero Content */}
          <View style={styles.heroContentRow}>
            <View style={styles.heroTextCol}>
              <View style={styles.badgePill}>
                <Zap size={11} color="#FFFFFF" fill="#FFFFFF" />
                <Text style={styles.badgePillText}>{categoryName.toUpperCase()} • INSTANT</Text>
              </View>

              <Text style={styles.heroHeading}>
                One visit.{'\n'}Everything{'\n'}handled.
              </Text>

              <View style={styles.instantDispatchTag}>
                <Zap size={12} color="#FAC420" fill="#FAC420" />
                <Text style={styles.instantDispatchText}>⚡ Arrives in ~{formattedETA || '15-20 mins'}</Text>
              </View>
            </View>

            {/* Right illustration / Avatar visual */}
            <View style={styles.heroImageWrapper}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80',
                }}
                style={styles.heroAvatarImage}
                resizeMode="cover"
              />
            </View>
          </View>
        </View>

        {/* 2. TITLE & RATING */}
        <View style={styles.mainInfoSection}>
          <Text style={styles.serviceTitle}>{categoryName}</Text>

          <View style={styles.ratingRow}>
            <Star size={15} color="#FAC420" fill="#FAC420" />
            <Text style={styles.ratingText}>4.9 (237.7k ratings) • Serventica Verified</Text>
          </View>

          {/* 3. DURATION TILES HORIZONTAL CAROUSEL */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.durationsRow}>
            {HOURLY_DURATIONS.map((dur) => {
              const isSelected = selectedDurationId === dur.id && isAdded;
              return (
                <View
                  key={dur.id}
                  style={[
                    styles.durationCard,
                    isSelected && styles.durationCardSelected,
                  ]}
                >
                  <Text style={styles.durationCardLabel}>{dur.durationLabel}</Text>

                  <View style={styles.priceRow}>
                    <Text style={styles.priceMain}>₹{dur.price}</Text>
                    <Text style={styles.priceOriginal}>₹{dur.originalPrice}</Text>
                  </View>

                  <Text style={styles.savingsText}>Save ₹{dur.savings}</Text>

                  {isSelected ? (
                    <TouchableOpacity
                      style={styles.addedBtn}
                      activeOpacity={0.8}
                      onPress={() => setIsAdded(false)}
                    >
                      <Text style={styles.addedBtnText}>ADDED</Text>
                      <Trash2 size={13} color="#FFFFFF" strokeWidth={2.4} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.bookBtn}
                      activeOpacity={0.8}
                      onPress={() => handleToggleAdd(dur)}
                    >
                      <Text style={styles.bookBtnText}>BOOK</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* 4. ONE BOOKING COUNTLESS TASKS */}
          <View style={styles.divider} />

          <View style={styles.pitchSection}>
            <Text style={styles.sectionHeading}>One Booking. Countless Tasks.</Text>
            <Text style={styles.sectionDesc}>
              Let our certified professionals take care of your {categoryName.toLowerCase()} requirements while you focus on work, family, and everything else.
            </Text>
          </View>

          {/* 5. ESTIMATION GRID */}
          <View style={styles.estimationHeader}>
            <Text style={styles.estimationTitle}>How long does it take?</Text>
            <Text style={styles.howDoneLink}>How it's done?</Text>
          </View>
          <Text style={styles.subEstimation}>Task breakdown for standard requirements</Text>

          <View style={styles.tasksGrid}>
            {activeTasks.map((task, idx) => (
              <View key={idx} style={styles.taskCard}>
                <View style={styles.taskIconCircle}>
                  <Text style={{ fontSize: 24 }}>{task.icon}</Text>
                </View>
                <Text style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>
                <View style={styles.taskTimeBadge}>
                  <Text style={styles.taskTimeText}>{task.time}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* 6. WHY CUSTOMERS LOVE HOURLY */}
          <View style={styles.divider} />
          <Text style={styles.sectionHeading}>Why Customers Love Serventica Instant</Text>

          <View style={styles.benefitList}>
            <View style={styles.benefitItem}>
              <CheckCircle2 size={18} color="#059669" strokeWidth={2.4} />
              <Text style={styles.benefitText}>Book only the help you need</Text>
            </View>

            <View style={styles.benefitItem}>
              <CheckCircle2 size={18} color="#059669" strokeWidth={2.4} />
              <Text style={styles.benefitText}>Express ~{formattedETA || '20m'} doorstep arrival</Text>
            </View>

            <View style={styles.benefitItem}>
              <CheckCircle2 size={18} color="#059669" strokeWidth={2.4} />
              <Text style={styles.benefitText}>Background-verified & certified technicians</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* STICKY BOTTOM GO TO CART BAR */}
      <View style={styles.bottomBar}>
        <View style={styles.cartCountCol}>
          <Text style={styles.cartItemCountText}>🧺 1 service selected</Text>
          <Text style={styles.cartServiceLabel}>Instant • {selectedDuration.durationLabel} (₹{selectedDuration.price})</Text>
        </View>

        <TouchableOpacity style={styles.goToCartButton} onPress={handleGoToCart} activeOpacity={0.88}>
          <Text style={styles.goToCartButtonText}>Go to cart</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  heroBanner: {
    backgroundColor: '#0A7E44',
    paddingTop: 14,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTextCol: {
    flex: 1,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  badgePillText: {
    fontSize: 10,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  heroHeading: {
    fontSize: 28,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#FFFFFF',
    lineHeight: 34,
    marginBottom: 12,
  },
  instantDispatchTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#054D29',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    alignSelf: 'flex-start',
    gap: 5,
  },
  instantDispatchText: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#FAC420',
  },
  heroImageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroAvatarImage: {
    width: '100%',
    height: '100%',
  },
  mainInfoSection: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  serviceTitle: {
    fontSize: 24,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 18,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#64748B',
  },
  durationsRow: {
    gap: 12,
    paddingBottom: 8,
  },
  durationCard: {
    width: 124,
    backgroundColor: '#F8FCFA',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#D1EAE0',
    padding: 12,
    alignItems: 'center',
  },
  durationCardSelected: {
    borderColor: '#0A7E44',
    backgroundColor: '#EDF9F3',
  },
  durationCardLabel: {
    fontSize: 18,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    marginBottom: 2,
  },
  priceMain: {
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
  },
  priceOriginal: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  savingsText: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#0A7E44',
    marginBottom: 10,
  },
  addedBtn: {
    width: '100%',
    backgroundColor: '#0A7E44',
    paddingVertical: 7,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addedBtnText: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  bookBtn: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0A7E44',
    paddingVertical: 6,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookBtnText: {
    fontSize: 11.5,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#0A7E44',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 20,
  },
  pitchSection: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 17,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
    marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
    lineHeight: 19,
  },
  estimationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  estimationTitle: {
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
  },
  howDoneLink: {
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#0A7E44',
  },
  subEstimation: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#94A3B8',
    marginTop: 2,
    marginBottom: 14,
  },
  tasksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  taskCard: {
    width: '22%',
    alignItems: 'center',
  },
  taskIconCircle: {
    width: 62,
    height: 62,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskTitle: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#1E242B',
    textAlign: 'center',
    lineHeight: 14,
    minHeight: 28,
  },
  taskTimeBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  taskTimeText: {
    fontSize: 9.5,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#64748B',
  },
  benefitList: {
    marginTop: 12,
    gap: 10,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#334155',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  cartCountCol: {
    flex: 1,
  },
  cartItemCountText: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
  },
  cartServiceLabel: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#64748B',
    marginTop: 1,
  },
  goToCartButton: {
    backgroundColor: '#0A7E44',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  goToCartButtonText: {
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#FFFFFF',
  },
});
