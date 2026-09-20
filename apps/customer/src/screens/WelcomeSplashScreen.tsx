import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ServenticaTokens } from '../../../../packages/design-system/src/tokens';
import { SlideToStart } from '../../../../packages/design-system/src/components/SlideToStart';

interface WelcomeSplashScreenProps {
  onStart: () => void;
  onExplore?: () => void;
}

const { width } = Dimensions.get('window');

export const WelcomeSplashScreen: React.FC<WelcomeSplashScreenProps> = ({ onStart, onExplore }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        {/* Top Section: Welcome. */}
        <View style={styles.topHeader}>
          <Text style={styles.welcomeText}>
            Welcome<Text style={styles.dotGold}>.</Text>
          </Text>
        </View>

        {/* Center Section: Huge Serven / tica. Wordmark */}
        <View style={styles.centerSection}>
          <View style={styles.wordmarkContainer}>
            <Text style={styles.wordmarkLine1}>Serven</Text>
            <View style={styles.line2Row}>
              {/* Signature vertical connector extending t upwards */}
              <View style={styles.tConnector} />
              {/* Yellow dot on the 'i' */}
              <View style={styles.iDotGold} />
              <Text style={styles.wordmarkLine2}>
                tica<Text style={styles.dotGoldLarge}>.</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Section: Tagline & Slide Interaction */}
        <View style={styles.bottomSection}>
          <Text style={styles.tagline}>
            Turning <Text style={styles.taglineBold}>'Uh-Oh'</Text> into{' '}
            <Text style={styles.taglineGold}>'All Done!'</Text>
          </Text>

          <View style={styles.sliderWrapper}>
            <SlideToStart onSlideComplete={onStart} />
          </View>

          {onExplore && (
            <TouchableOpacity
              onPress={onExplore}
              activeOpacity={0.75}
              style={styles.exploreBtn}
              accessibilityRole="button"
              accessibilityLabel="Explore services without logging in"
            >
              <Text style={styles.exploreText}>
                Explore as Guest <Text style={styles.exploreArrow}>→</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161616',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingTop: 46,
    paddingBottom: 28,
  },
  topHeader: {
    alignItems: 'center',
    marginTop: 10,
  },
  welcomeText: {
    fontSize: 29,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  dotGold: {
    color: '#ffc107',
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginTop: -20,
    paddingLeft: 4,
  },
  wordmarkContainer: {
    width: '100%',
    position: 'relative',
  },
  wordmarkLine1: {
    fontSize: width * 0.24,
    fontFamily: ServenticaTokens.fonts.Black,
    color: '#ffffff',
    lineHeight: width * 0.24,
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  line2Row: {
    position: 'relative',
    marginTop: -width * 0.02,
  },
  wordmarkLine2: {
    fontSize: width * 0.24,
    fontFamily: ServenticaTokens.fonts.Black,
    color: '#ffffff',
    lineHeight: width * 0.24,
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  tConnector: {
    position: 'absolute',
    left: width * 0.365,
    top: -width * 0.16,
    width: width * 0.046,
    height: width * 0.22,
    backgroundColor: '#ffffff',
    zIndex: 5,
  },
  iDotGold: {
    position: 'absolute',
    left: width * 0.170,
    top: width * 0.048,
    width: width * 0.046,
    height: width * 0.046,
    borderRadius: width * 0.023,
    backgroundColor: '#ffc107',
    zIndex: 10,
  },
  dotGoldLarge: {
    color: '#ffc107',
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 13,
    color: '#ffffff',
    fontFamily: ServenticaTokens.fonts.Regular,
    marginBottom: 28,
    textAlign: 'center',
  },
  taglineBold: {
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#ffffff',
  },
  taglineGold: {
    color: '#ffc107',
    fontFamily: ServenticaTokens.fonts.Bold,
  },
  sliderWrapper: {
    width: '100%',
  },
  exploreBtn: {
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  exploreText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    letterSpacing: 0.2,
  },
  exploreArrow: {
    color: '#ffc107',
    fontFamily: ServenticaTokens.fonts.Bold,
  },
});
