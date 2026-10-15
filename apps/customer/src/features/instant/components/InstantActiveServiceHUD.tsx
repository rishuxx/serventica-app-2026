/**
 * SERVENTICA — Instant Active Service HUD
 * Displays live countdown timer during SERVICE_IN_PROGRESS with quick extension trigger
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Clock, Plus, Zap, CheckCircle2 } from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';

interface InstantActiveServiceHUDProps {
  remainingSeconds: number;
  onOpenExtension: () => void;
  canExtend?: boolean;
}

export const InstantActiveServiceHUD: React.FC<InstantActiveServiceHUDProps> = ({
  remainingSeconds,
  onOpenExtension,
  canExtend = true,
}) => {
  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = remainingSeconds > 0 && remainingSeconds < 600; // < 10 mins

  return (
    <View style={[styles.container, isLowTime && styles.containerLowTime]}>
      {/* LEFT: TIMER */}
      <View style={styles.timerCol}>
        <View style={styles.liveHeaderRow}>
          <View style={[styles.pulseDot, isLowTime && styles.pulseDotRed]} />
          <Text style={[styles.liveLabel, isLowTime && styles.liveLabelRed]}>
            SERVICE IN PROGRESS
          </Text>
        </View>

        <View style={styles.timeValueRow}>
          <Clock size={18} color={isLowTime ? '#DC2626' : '#7C3AED'} strokeWidth={2.4} />
          <Text style={[styles.timerDigits, isLowTime && styles.timerDigitsRed]}>
            {remainingSeconds > 0 ? formatTime(remainingSeconds) : '00:00'}
          </Text>
          <Text style={styles.remainingUnit}>remaining</Text>
        </View>
      </View>

      {/* RIGHT: EXTENSION CTA */}
      {canExtend ? (
        <TouchableOpacity
          style={styles.extendBtn}
          activeOpacity={0.85}
          onPress={onOpenExtension}
        >
          <Plus size={14} color="#7C3AED" strokeWidth={2.6} />
          <Text style={styles.extendBtnText}>+30 Min</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  containerLowTime: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },
  timerCol: {
    flex: 1,
  },
  liveHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7C3AED',
  },
  pulseDotRed: {
    backgroundColor: '#DC2626',
  },
  liveLabel: {
    fontSize: 9.5,
    fontFamily: Fonts.Bold,
    color: '#7C3AED',
    letterSpacing: 0.5,
  },
  liveLabelRed: {
    color: '#DC2626',
  },
  timeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerDigits: {
    fontSize: 22,
    fontFamily: Fonts.Bold,
    color: '#1E242B',
  },
  timerDigitsRed: {
    color: '#DC2626',
  },
  remainingUnit: {
    fontSize: 12,
    fontFamily: Fonts.Regular,
    color: '#64748B',
    marginTop: 4,
  },
  extendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  extendBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.Bold,
    color: '#7C3AED',
  },
});
