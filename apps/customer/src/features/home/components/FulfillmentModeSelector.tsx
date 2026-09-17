import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Zap, Calendar } from 'lucide-react-native';
import {
  FulfillmentMode,
  FulfillmentAvailabilityState,
} from '../../../../../../packages/types/src';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { CategoryThemeData } from '../../../types/experience.types';

interface FulfillmentModeSelectorProps {
  selectedMode: FulfillmentMode;
  instantState: FulfillmentAvailabilityState;
  scheduledState: FulfillmentAvailabilityState;
  instantEtaText?: string;
  scheduledSlotText?: string;
  theme?: CategoryThemeData | null;
  onSelectMode: (mode: FulfillmentMode) => void;
}

export const FulfillmentModeSelector: React.FC<FulfillmentModeSelectorProps> = React.memo(({
  selectedMode,
  instantState,
  scheduledState,
  instantEtaText = 'Get instant service',
  scheduledSlotText = 'Pick your time',
  theme,
  onSelectMode,
}) => {
  const isInstantActive = selectedMode === 'INSTANT';
  const isScheduledActive = selectedMode === 'SCHEDULED';

  const isInstantDisabled =
    instantState === 'UNAVAILABLE' ||
    instantState === 'SERVICE_NOT_SUPPORTED' ||
    instantState === 'OUTSIDE_SERVICE_AREA';

  const isScheduledDisabled =
    scheduledState === 'UNAVAILABLE' ||
    scheduledState === 'SERVICE_NOT_SUPPORTED' ||
    scheduledState === 'OUTSIDE_SERVICE_AREA';

  // Animation scales for interactive micro-interactions
  const instantScale = useRef(new Animated.Value(1)).current;
  const scheduleScale = useRef(new Animated.Value(1)).current;

  // Pulse animation on active icon
  useEffect(() => {
    if (isInstantActive) {
      Animated.sequence([
        Animated.timing(instantScale, {
          toValue: 1.25,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(instantScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (isScheduledActive) {
      Animated.sequence([
        Animated.timing(scheduleScale, {
          toValue: 1.25,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scheduleScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectedMode]);

  return (
    <View style={styles.container}>
      {/* 1. INSTANT PILL */}
      <TouchableOpacity
        style={[
          styles.pillButton,
          isInstantActive && styles.pillButtonActive,
          isInstantDisabled && styles.pillButtonDisabled,
        ]}
        activeOpacity={0.85}
        onPress={() => {
          if (!isInstantDisabled) {
            onSelectMode('INSTANT');
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={`Instant Mode, ${isInstantActive ? 'Selected' : 'Tap to select'}`}
        accessibilityState={{ selected: isInstantActive, disabled: isInstantDisabled }}
      >
        <Animated.View
          style={[
            styles.iconWrapper,
            { transform: [{ scale: instantScale }] },
          ]}
        >
          <Zap
            size={18}
            color="#FAC420"
            fill={isInstantActive ? '#FAC420' : 'none'}
            strokeWidth={2.4}
          />
        </Animated.View>

        <View style={styles.textColumn}>
          <Text
            style={[
              styles.pillTitle,
              isInstantActive && styles.pillTitleActive,
            ]}
          >
            INSTANT
          </Text>
          <Text style={styles.pillSubtitle} numberOfLines={1}>
            Get instant service
          </Text>
        </View>

        {instantState === 'LOADING' && (
          <ActivityIndicator
            size="small"
            color="#FAC420"
            style={styles.loadingSpinner}
          />
        )}
      </TouchableOpacity>

      {/* 2. SCHEDULE PILL */}
      <TouchableOpacity
        style={[
          styles.pillButton,
          isScheduledActive && styles.pillButtonActive,
          isScheduledDisabled && styles.pillButtonDisabled,
        ]}
        activeOpacity={0.85}
        onPress={() => {
          if (!isScheduledDisabled) {
            onSelectMode('SCHEDULED');
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={`Schedule Mode, ${isScheduledActive ? 'Selected' : 'Tap to select'}`}
        accessibilityState={{ selected: isScheduledActive, disabled: isScheduledDisabled }}
      >
        <Animated.View
          style={[
            styles.iconWrapper,
            { transform: [{ scale: scheduleScale }] },
          ]}
        >
          <Calendar
            size={18}
            color={isScheduledActive ? '#FAC420' : '#64748B'}
            strokeWidth={2.4}
          />
        </Animated.View>

        <View style={styles.textColumn}>
          <Text
            style={[
              styles.pillTitle,
              isScheduledActive && styles.pillTitleActive,
            ]}
          >
            SCHEDULE
          </Text>
          <Text style={styles.pillSubtitle} numberOfLines={1}>
            Pick your time
          </Text>
        </View>

        {scheduledState === 'LOADING' && (
          <ActivityIndicator
            size="small"
            color="#FAC420"
            style={styles.loadingSpinner}
          />
        )}
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 12,
  },
  pillButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
    gap: 10,
  },
  pillButtonActive: {
    borderColor: '#FAC420',
    backgroundColor: '#FFFFFF',
    shadowColor: '#FAC420',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3.5,
  },
  pillButtonDisabled: {
    opacity: 0.5,
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  pillTitle: {
    fontSize: 13,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#475569',
    letterSpacing: 0.5,
  },
  pillTitleActive: {
    color: '#0F172A',
    fontFamily: ServenticaTokens.fonts.Bold,
  },
  pillSubtitle: {
    fontSize: 10.5,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#64748B',
    marginTop: 1,
  },
  loadingSpinner: {
    transform: [{ scale: 0.7 }],
  },
});
