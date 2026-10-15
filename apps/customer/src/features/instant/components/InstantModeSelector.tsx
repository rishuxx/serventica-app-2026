/**
 * SERVENTICA — Instant Mode Selector
 * Premium adaptive segmented selector between ⚡ INSTANT and 📅 SCHEDULE
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { Zap, Calendar } from 'lucide-react-native';
import { Fonts, ServenticaTokens } from '../../../../../../packages/design-system/src';

interface InstantModeSelectorProps {
  currentMode: 'INSTANT' | 'SCHEDULED';
  onSelectMode: (mode: 'INSTANT' | 'SCHEDULED') => void;
  instantSubtitle?: string;
}

export const InstantModeSelector: React.FC<InstantModeSelectorProps> = ({
  currentMode,
  onSelectMode,
  instantSubtitle = 'Available nearby',
}) => {
  const isInstant = currentMode === 'INSTANT';

  return (
    <View style={styles.container}>
      {/* ⚡ INSTANT OPTION */}
      <TouchableOpacity
        style={[
          styles.segmentButton,
          isInstant && styles.activeInstantButton,
        ]}
        activeOpacity={0.85}
        onPress={() => onSelectMode('INSTANT')}
        accessibilityRole="button"
        accessibilityLabel="Instant fulfillment mode, get help now"
      >
        <View style={styles.iconTitleRow}>
          <View style={[styles.iconBadge, isInstant && styles.activeInstantIconBadge]}>
            <Zap size={14} color={isInstant ? '#FFFFFF' : '#7C3AED'} strokeWidth={2.5} />
          </View>
          <Text style={[styles.segmentLabel, isInstant && styles.activeInstantLabel]}>
            INSTANT
          </Text>
        </View>
        <Text style={[styles.subtitle, isInstant && styles.activeSubtitle]}>
          {instantSubtitle}
        </Text>
      </TouchableOpacity>

      {/* 📅 SCHEDULE OPTION */}
      <TouchableOpacity
        style={[
          styles.segmentButton,
          !isInstant && styles.activeScheduleButton,
        ]}
        activeOpacity={0.85}
        onPress={() => onSelectMode('SCHEDULED')}
        accessibilityRole="button"
        accessibilityLabel="Schedule for later fulfillment mode"
      >
        <View style={styles.iconTitleRow}>
          <View style={[styles.iconBadge, !isInstant && styles.activeScheduleIconBadge]}>
            <Calendar size={14} color={!isInstant ? '#FFFFFF' : '#64748B'} strokeWidth={2.2} />
          </View>
          <Text style={[styles.segmentLabel, !isInstant && styles.activeScheduleLabel]}>
            SCHEDULE
          </Text>
        </View>
        <Text style={[styles.subtitle, !isInstant && styles.activeSubtitle]}>
          Pick a date & slot
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeInstantButton: {
    backgroundColor: '#7C3AED',
    ...Platform.select({
      ios: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.28,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  activeScheduleButton: {
    backgroundColor: '#1E242B',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeInstantIconBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  activeScheduleIconBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  segmentLabel: {
    fontSize: 12.5,
    fontFamily: Fonts.Bold,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  activeInstantLabel: {
    color: '#FFFFFF',
  },
  activeScheduleLabel: {
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 10.5,
    fontFamily: Fonts.Medium,
    color: '#94A3B8',
    marginTop: 2,
  },
  activeSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
});
