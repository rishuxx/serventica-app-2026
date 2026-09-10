import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { ClipboardList, MapPin, Heart } from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

interface QuickActionsProps {
  onPressBookings: () => void;
  onPressAddresses: () => void;
  onPressSaved: () => void;
  activeBookingsCount?: number;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onPressBookings,
  onPressAddresses,
  onPressSaved,
  activeBookingsCount = 0,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={onPressBookings}
        accessibilityRole="button"
        accessibilityLabel="View Bookings"
      >
        <View style={styles.iconBox}>
          <ClipboardList size={24} color='#1E242B' strokeWidth={1.8} />
          {activeBookingsCount > 0 ? <View style={styles.badgeDot} /> : null}
        </View>
        <Text style={styles.cardTitle}>Bookings</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={onPressAddresses}
        accessibilityRole="button"
        accessibilityLabel="Saved Addresses"
      >
        <View style={styles.iconBox}>
          <MapPin size={24} color='#1E242B' strokeWidth={1.8} />
        </View>
        <Text style={styles.cardTitle}>Addresses</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={onPressSaved}
        accessibilityRole="button"
        accessibilityLabel="Saved Services"
      >
        <View style={styles.iconBox}>
          <Heart size={24} color='#1E242B' strokeWidth={1.8} />
        </View>
        <Text style={styles.cardTitle}>Saved</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0F0ED',
    shadowColor: '#1E242B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  cardTitle: {
    fontSize: 14.5,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  cardSub: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#777777',
    textAlign: 'center',
  },
});
