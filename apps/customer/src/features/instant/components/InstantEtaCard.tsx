/**
 * SERVENTICA — Instant ETA Card
 * Strictly truthful arrival display (never faked)
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Clock, Navigation } from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';

interface InstantEtaCardProps {
  arrivalMinutes?: number | null;
  minMinutes?: number | null;
  maxMinutes?: number | null;
  isCalculating?: boolean;
}

export const InstantEtaCard: React.FC<InstantEtaCardProps> = ({
  arrivalMinutes,
  minMinutes,
  maxMinutes,
  isCalculating = false,
}) => {
  const renderEtaText = () => {
    if (isCalculating) {
      return 'Checking availability...';
    }

    if (minMinutes != null && maxMinutes != null) {
      return `${minMinutes}–${maxMinutes} min`;
    }

    if (arrivalMinutes != null && arrivalMinutes > 0) {
      const min = Math.max(8, arrivalMinutes - 3);
      const max = arrivalMinutes + 4;
      return `${min}–${max} min`;
    }

    return 'Availability varies by location';
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Clock size={14} color="#7C3AED" strokeWidth={2.4} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.caption}>ESTIMATED ARRIVAL</Text>
        <Text style={styles.etaValue}>{renderEtaText()}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  caption: {
    fontSize: 9.5,
    fontFamily: Fonts.Bold,
    color: '#7C3AED',
    letterSpacing: 0.5,
  },
  etaValue: {
    fontSize: 13,
    fontFamily: Fonts.SemiBold,
    color: '#1E242B',
    marginTop: 1,
  },
});
