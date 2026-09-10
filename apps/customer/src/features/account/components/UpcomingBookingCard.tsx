import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { Calendar, Clock, MapPin, ChevronRight, UserCheck } from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { BookingRecord } from '../../../../../../packages/types/src';
import { AssetRegistry } from '../../../services/home.service';

interface UpcomingBookingCardProps {
  booking: BookingRecord;
  onPress: () => void;
}

export const UpcomingBookingCard: React.FC<UpcomingBookingCardProps> = ({
  booking,
  onPress,
}) => {
  const imageSource =
    booking.serviceImageUrl && AssetRegistry[booking.serviceImageUrl]
      ? AssetRegistry[booking.serviceImageUrl]
      : AssetRegistry.basic_ac_repair;

  const formattedDate = booking.scheduledDate || 'Scheduled Service';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Active booking for ${booking.serviceName}`}
    >
      <View style={styles.topStatusRow}>
        <View style={styles.statusPill}>
          <View style={styles.livePulseDot} />
          <Text style={styles.statusText}>
            {booking.status.replace(/_/g, ' ')}
          </Text>
        </View>
        <Text style={styles.bookingNumberText}>{booking.bookingNumber}</Text>
      </View>

      <View style={styles.contentRow}>
        <View style={styles.imageBox}>
          <Image source={imageSource} style={styles.serviceImage} resizeMode="contain" />
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.serviceName} numberOfLines={1}>
            {booking.serviceName}
          </Text>

          <View style={styles.metaRow}>
            <Calendar size={13} color="#666666" strokeWidth={2} style={styles.metaIcon} />
            <Text style={styles.metaText}>{formattedDate}</Text>
          </View>

          <View style={styles.metaRow}>
            <MapPin size={13} color="#666666" strokeWidth={2} style={styles.metaIcon} />
            <Text style={styles.metaText} numberOfLines={1}>
              {booking.address.city || booking.address.title}
            </Text>
          </View>
        </View>

        <View style={styles.chevronBox}>
          <ChevronRight size={18} color="#888888" strokeWidth={2.2} />
        </View>
      </View>

      {booking.partner ? (
        <View style={styles.partnerFooter}>
          <UserCheck size={14} color="#059669" strokeWidth={2} />
          <Text style={styles.partnerText}>
            Assigned: <Text style={styles.partnerName}>{booking.partner.name}</Text>
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E8E4',
    shadowColor: '#1E242B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  topStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#059669',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  bookingNumberText: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#888888',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F7F7F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  serviceImage: {
    width: 40,
    height: 40,
  },
  infoCol: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaIcon: {
    marginRight: 6,
  },
  metaText: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#666666',
  },
  chevronBox: {
    paddingLeft: 8,
  },
  partnerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2F2EF',
    gap: 6,
  },
  partnerText: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#555555',
  },
  partnerName: {
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#1E242B',
    fontWeight: '600',
  },
});
