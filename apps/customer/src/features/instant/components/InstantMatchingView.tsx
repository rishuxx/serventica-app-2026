/**
 * SERVENTICA — Instant Matching Screen (Option A: Interactive Map Radar)
 * Premium live map backdrop with expanding glowing radar ripples & simulated nearby pro signals
 */

import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Zap, MapPin, RefreshCw, Calendar, ArrowLeft, AlertCircle, ShieldCheck, Smartphone } from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';
import { MatchingState } from '../types/instant.types';
import { LiveTrackingMap } from '../../account/components/LiveTrackingMap';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface InstantMatchingViewProps {
  matchingState: MatchingState;
  serviceTitle: string;
  addressLine: string;
  onRetry: () => void;
  onScheduleForLater: () => void;
  onChangeService: () => void;
  onCancel: () => void;
  onOpenSandbox?: () => void;
}

export const InstantMatchingView: React.FC<InstantMatchingViewProps> = ({
  matchingState,
  serviceTitle,
  addressLine,
  onRetry,
  onScheduleForLater,
  onChangeService,
  onCancel,
  onOpenSandbox,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 16
  );
  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 16 : 24
  );

  // Wave ripple animations
  const wave1Anim = useRef(new Animated.Value(0)).current;
  const wave2Anim = useRef(new Animated.Value(0)).current;
  const wave3Anim = useRef(new Animated.Value(0)).current;

  // Dot blip animations
  const dotPulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (matchingState === 'SEARCHING' || matchingState === 'RETRYING') {
      const createWaveAnimation = (anim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 2400,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        );
      };

      const anim1 = createWaveAnimation(wave1Anim, 0);
      const anim2 = createWaveAnimation(wave2Anim, 800);
      const anim3 = createWaveAnimation(wave3Anim, 1600);

      const dotAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(dotPulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(dotPulseAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      anim1.start();
      anim2.start();
      anim3.start();
      dotAnim.start();

      return () => {
        anim1.stop();
        anim2.stop();
        anim3.stop();
        dotAnim.stop();
      };
    }
  }, [matchingState, wave1Anim, wave2Anim, wave3Anim, dotPulseAnim]);

  const renderWaveRing = (anim: Animated.Value) => {
    const scale = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 3.2],
    });
    const opacity = anim.interpolate({
      inputRange: [0, 0.35, 1],
      outputRange: [0.8, 0.4, 0],
    });

    return (
      <Animated.View
        style={[
          styles.radarRing,
          {
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
    );
  };

  const isUnavailable = matchingState === 'UNAVAILABLE';
  const isFound = matchingState === 'FOUND';

  return (
    <View style={styles.rootContainer}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={Platform.OS === 'android'}
      />

      {/* 1. MAP BACKGROUND SURFACE */}
      <View style={StyleSheet.absoluteFill}>
        <LiveTrackingMap
          status="MATCHING"
          userAddressLine={addressLine}
          customerLat={30.316494}
          customerLon={78.032191}
          isLiveGps={false}
          isBackdropOnly={true}
        />
        {/* Soft Radial Vignette Overlay */}
        <View style={styles.mapOverlay} />
      </View>

      {/* 2. TOP FLOATING NAVIGATION BAR */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: topInset + 8,
            paddingLeft: Math.max(insets.left, 16),
            paddingRight: Math.max(insets.right, 16),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          activeOpacity={0.8}
        >
          <ArrowLeft size={18} color="#1E242B" />
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <View style={styles.wavePill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.wavePillText}>
            {matchingState === 'RETRYING' ? 'LIVE RADAR • ALL AREAS' : 'LIVE DISPATCH • ALL REGIONS'}
          </Text>
        </View>
      </View>

      {/* 3. CENTER EXPANDING RADAR PULSE OVER THE MAP */}
      <View style={styles.radarCenterArea}>
        {!isUnavailable && !isFound && (
          <>
            {renderWaveRing(wave1Anim)}
            {renderWaveRing(wave2Anim)}
            {renderWaveRing(wave3Anim)}

            {/* Simulated Nearby Available Pro Signals */}
            <Animated.View style={[styles.nearbyProDot, styles.proDot1, { opacity: dotPulseAnim }]} />
            <Animated.View style={[styles.nearbyProDot, styles.proDot2, { opacity: dotPulseAnim }]} />
            <Animated.View style={[styles.nearbyProDot, styles.proDot3, { opacity: dotPulseAnim }]} />
          </>
        )}

        {/* Center Target Orb */}
        <View
          style={[
            styles.centerOrb,
            isUnavailable && styles.centerOrbUnavailable,
            isFound && styles.centerOrbFound,
          ]}
        >
          {isUnavailable ? (
            <AlertCircle size={38} color="#DC2626" strokeWidth={2.4} />
          ) : isFound ? (
            <Zap size={38} color="#10B981" strokeWidth={2.6} />
          ) : (
            <Zap size={38} color="#7C3AED" strokeWidth={2.8} />
          )}
        </View>
      </View>

      {/* 4. BOTTOM LUXURY STATUS SHEET */}
      <View
        style={[
          styles.bottomSheetCard,
          {
            paddingBottom: bottomInset + 12,
            paddingLeft: Math.max(insets.left, 22),
            paddingRight: Math.max(insets.right, 22),
          },
        ]}
      >
        <View style={styles.dragHandle} />

        <View style={styles.statusHeaderRow}>
          <View style={styles.statusTextCol}>
            <Text style={styles.mainHeadline}>
              {isFound
                ? 'Professional Found!'
                : isUnavailable
                ? "No specialist available"
                : matchingState === 'RETRYING'
                ? 'Still finding someone nearby...'
                : 'Finding a professional nearby'}
            </Text>
            <Text style={styles.subHeadline}>
              {isFound
                ? 'Securing booking and dispatching specialist'
                : isUnavailable
                ? 'All certified specialists are currently serving other homes. Zero charge has been applied.'
                : matchingState === 'RETRYING'
                ? 'Broadcasting to second wave of available pros'
                : `Connecting with top-rated specialists for ${serviceTitle}`}
            </Text>
          </View>
        </View>

        {/* LOCATION & SERVICE CHIPS */}
        <View style={styles.infoRow}>
          <View style={styles.chipPill}>
            <MapPin size={13} color="#7C3AED" strokeWidth={2.4} />
            <Text style={styles.chipText} numberOfLines={1}>
              {addressLine}
            </Text>
          </View>
          <View style={styles.chipPill}>
            <ShieldCheck size={13} color="#059669" strokeWidth={2.4} />
            <Text style={[styles.chipText, { color: '#059669' }]}>Hold Secured</Text>
          </View>
        </View>

        {/* ACTIONS */}
        {isUnavailable ? (
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={onRetry}
              activeOpacity={0.85}
            >
              <RefreshCw size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.primaryActionBtnText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={onScheduleForLater}
              activeOpacity={0.85}
            >
              <Calendar size={16} color="#1E242B" strokeWidth={2.2} />
              <Text style={styles.secondaryActionBtnText}>Schedule for Later</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tertiaryActionBtn}
              onPress={onChangeService}
              activeOpacity={0.7}
            >
              <Text style={styles.tertiaryActionBtnText}>Change Service</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.timerFooterRow}>
            <Text style={styles.timerNotice}>
              ⏱️ Waiting for nearby specialist acceptance
            </Text>
            {onOpenSandbox && (
              <TouchableOpacity
                style={styles.sandboxTestingBtn}
                onPress={onOpenSandbox}
                activeOpacity={0.8}
              >
                <Smartphone size={15} color="#7C3AED" strokeWidth={2.4} />
                <Text style={styles.sandboxTestingBtnText}>Open Partner App (Sandbox Accept)</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(248, 250, 252, 0.45)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  cancelText: {
    fontSize: 13,
    fontFamily: Fonts.Bold,
    color: '#1E242B',
  },
  wavePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    gap: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  wavePillText: {
    fontSize: 11,
    fontFamily: Fonts.Bold,
    color: '#7C3AED',
    letterSpacing: 0.5,
  },
  radarCenterArea: {
    alignSelf: 'center',
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 0.75,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  radarRing: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.32,
    height: SCREEN_WIDTH * 0.32,
    borderRadius: (SCREEN_WIDTH * 0.32) / 2,
    borderWidth: 2.5,
    borderColor: '#7C3AED',
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  nearbyProDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F59E0B',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  proDot1: {
    top: 30,
    left: 45,
  },
  proDot2: {
    bottom: 40,
    right: 50,
  },
  proDot3: {
    top: 60,
    right: 35,
  },
  centerOrb: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
    borderColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  centerOrbUnavailable: {
    borderColor: '#DC2626',
  },
  centerOrbFound: {
    borderColor: '#10B981',
  },
  bottomSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  statusHeaderRow: {
    marginBottom: 14,
  },
  statusTextCol: {
    alignItems: 'center',
  },
  mainHeadline: {
    fontSize: 20,
    fontFamily: Fonts.Bold,
    color: '#1E242B',
    textAlign: 'center',
  },
  subHeadline: {
    fontSize: 13,
    fontFamily: Fonts.Regular,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 10,
  },
  chipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  chipText: {
    fontSize: 11.5,
    fontFamily: Fonts.Medium,
    color: '#334155',
  },
  actionsGrid: {
    gap: 10,
    marginTop: 12,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
  },
  secondaryActionBtnText: {
    fontSize: 14,
    fontFamily: Fonts.Bold,
    color: '#1E242B',
  },
  tertiaryActionBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  tertiaryActionBtnText: {
    fontSize: 13,
    fontFamily: Fonts.SemiBold,
    color: '#64748B',
  },
  timerFooterRow: {
    alignItems: 'center',
    paddingTop: 8,
    gap: 10,
  },
  timerNotice: {
    fontSize: 12,
    fontFamily: Fonts.Medium,
    color: '#94A3B8',
  },
  sandboxTestingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
  },
  sandboxTestingBtnText: {
    fontSize: 13,
    fontFamily: Fonts.Bold,
    color: '#7C3AED',
  },
});
