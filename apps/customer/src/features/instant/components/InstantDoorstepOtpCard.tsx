/**
 * SERVENTICA — Instant Doorstep OTP Card
 * Displays the 4-digit PIN for partner verification on arrival
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { KeyRound, ShieldAlert } from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';

interface InstantDoorstepOtpCardProps {
  otp: string;
  partnerName?: string;
}

export const InstantDoorstepOtpCard: React.FC<InstantDoorstepOtpCardProps> = ({
  otp,
  partnerName = 'your specialist',
}) => {
  const digits = (otp || '4821').split('');

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <KeyRound size={16} color="#7C3AED" strokeWidth={2.4} />
        </View>
        <View style={styles.titleCol}>
          <Text style={styles.cardTitle}>Doorstep Start Code</Text>
          <Text style={styles.cardSubtitle}>
            Share this 4-digit code with {partnerName} to begin
          </Text>
        </View>
      </View>

      {/* 4 DIGIT BOXES */}
      <View style={styles.digitsRow}>
        {digits.map((digit, index) => (
          <View key={index} style={styles.digitBox}>
            <Text style={styles.digitText}>{digit}</Text>
          </View>
        ))}
      </View>

      <View style={styles.safetyRow}>
        <ShieldAlert size={12} color="#64748B" strokeWidth={2.2} />
        <Text style={styles.safetyText}>
          Do not share this code until your specialist is at your doorstep.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14.5,
    fontFamily: Fonts.Bold,
    color: '#1E242B',
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.Regular,
    color: '#64748B',
    marginTop: 1,
  },
  digitsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 16,
  },
  digitBox: {
    width: 52,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#F5F3FF',
    borderWidth: 2,
    borderColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize: 26,
    fontFamily: Fonts.Bold,
    color: '#7C3AED',
  },
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  safetyText: {
    fontSize: 11,
    fontFamily: Fonts.Regular,
    color: '#64748B',
  },
});
