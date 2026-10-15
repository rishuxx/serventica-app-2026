/**
 * SERVENTICA — Instant Partner Card
 * Displays assigned pro profile, star rating, vehicle, and direct communication
 */

import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, Linking } from 'react-native';
import { Star, ShieldCheck, Phone, MessageSquare } from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';
import { MatchedPartnerPayload } from '@serventica/types';

interface InstantPartnerCardProps {
  partner: MatchedPartnerPayload['partner'];
  etaMinutes?: number | null;
  onOpenChat?: () => void;
}

export const InstantPartnerCard: React.FC<InstantPartnerCardProps> = ({
  partner,
  etaMinutes,
  onOpenChat,
}) => {
  const handleCall = () => {
    if (partner.phone) {
      Linking.openURL(`tel:${partner.phone}`);
    }
  };

  const handleMessage = () => {
    if (onOpenChat) {
      onOpenChat();
    } else if (partner.phone) {
      Linking.openURL(`sms:${partner.phone}`);
    }
  };

  const vehicleInfo = partner.vehicleDetails || partner.vehicleType;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        {/* AVATAR WITH BADGE */}
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri:
                partner.avatarUrl ||
                'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150',
            }}
            style={styles.avatarImage}
          />
          <View style={styles.verifiedCheckBadge}>
            <ShieldCheck size={12} color="#FFFFFF" strokeWidth={2.6} />
          </View>
        </View>

        {/* INFO */}
        <View style={styles.infoCol}>
          <Text style={styles.partnerName}>{partner.name}</Text>
          <Text style={styles.specializationText}>
            {partner.specialization || 'Certified Serventica Specialist'}
          </Text>

          <View style={styles.ratingVehicleRow}>
            <View style={styles.ratingBadge}>
              <Star size={11} color="#D97706" fill="#D97706" />
              <Text style={styles.ratingText}>{(partner.rating || 4.9).toFixed(1)}</Text>
            </View>

            {vehicleInfo ? (
              <Text style={styles.vehicleText}>• {vehicleInfo}</Text>
            ) : null}
          </View>
        </View>

        {/* ACTIONS */}
        <View style={styles.actionsCol}>
          <TouchableOpacity
            style={styles.actionCircleBtn}
            onPress={handleCall}
            activeOpacity={0.7}
            accessibilityLabel="Call specialist"
          >
            <Phone size={16} color="#7C3AED" strokeWidth={2.4} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCircleBtn}
            onPress={handleMessage}
            activeOpacity={0.7}
            accessibilityLabel="Message specialist"
          >
            <MessageSquare size={16} color="#64748B" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>
      </View>

      {etaMinutes != null && etaMinutes > 0 ? (
        <View style={styles.etaBanner}>
          <Text style={styles.etaBannerText}>
            Arriving in approximately <Text style={styles.etaBold}>{etaMinutes} mins</Text>
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E2E8F0',
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  infoCol: {
    flex: 1,
  },
  partnerName: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: '#1E242B',
  },
  specializationText: {
    fontSize: 11.5,
    fontFamily: Fonts.Medium,
    color: '#64748B',
    marginTop: 2,
  },
  ratingVehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: Fonts.Bold,
    color: '#B45309',
  },
  vehicleText: {
    fontSize: 11,
    fontFamily: Fonts.Regular,
    color: '#64748B',
  },
  actionsCol: {
    flexDirection: 'row',
    gap: 8,
  },
  actionCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  etaBanner: {
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  etaBannerText: {
    fontSize: 12,
    fontFamily: Fonts.Medium,
    color: '#7C3AED',
  },
  etaBold: {
    fontFamily: Fonts.Bold,
  },
});
