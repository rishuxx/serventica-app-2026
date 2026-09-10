import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ImageBackground,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { AssetRegistry } from '../../../services/home.service';

const { width } = Dimensions.get('window');

interface HomeHeroProps {
  onPressCTA?: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({ onPressCTA }) => {
  return (
    <View style={styles.heroWrapper}>
      <ImageBackground
        source={AssetRegistry.hero_background}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
        resizeMode="cover"
      >
        {/* Subtle darkening gradient/overlay for clear text contrast without turning into a black block */}
        <View style={styles.overlay} />

        <View style={styles.contentContainer}>
          {/* Serventica secondary brand text */}
          <View style={styles.brandRow}>
            <Text style={styles.brandSecondary}>Serventica.</Text>
          </View>

          {/* Large, bold hero headline */}
          <View style={styles.headlineSection}>
            <Text style={styles.headlineMain}>
              Sit back and relax,{'\n'}we'll take care of{'\n'}the rest!
            </Text>
            <Text style={styles.headlineSub}>
              Home services, on demand. Any time, any where.
            </Text>
          </View>

          {/* Book a Service CTA button */}
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.85}
            onPress={onPressCTA}
            accessibilityRole="button"
            accessibilityLabel="Book a Service"
          >
            <Text style={styles.ctaText}>Book a Service</Text>
            <ArrowRight size={16} color='#1E242B' strokeWidth={2.4} style={styles.ctaIcon} />
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  heroWrapper: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
  },
  backgroundImage: {
    width: '100%',
    minHeight: 280,
    borderRadius: 30,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  backgroundImageStyle: {
    borderRadius: 30,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.40)',
    borderRadius: 30,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 22,
    justifyContent: 'space-between',
  },
  brandRow: {
    marginBottom: 8,
  },
  brandSecondary: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#ffffff',
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headlineSection: {
    marginBottom: 16,
  },
  headlineMain: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#ffffff',
    lineHeight: 33,
    letterSpacing: -0.4,
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  headlineSub: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 6,
    lineHeight: 18,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 22,
    shadowColor: '#1E242B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#1E242B',
  },
  ctaIcon: {
    marginLeft: 6,
  },
});
