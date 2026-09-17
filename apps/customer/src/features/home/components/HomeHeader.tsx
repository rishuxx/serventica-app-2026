import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  MapPin,
  ChevronDown,
  User,
} from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

interface HomeHeaderProps {
  shortAddress: string;
  onPressLocation: () => void;
  onPressProfile?: () => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  shortAddress,
  onPressLocation,
  onPressProfile,
}) => {
  return (
    <View style={styles.headerContainer}>
      {/* Location Area: Left side, clean minimal text, NO dark pill, NO border */}
      <TouchableOpacity
        style={styles.locationContainer}
        activeOpacity={0.7}
        onPress={onPressLocation}
        accessibilityRole="button"
        accessibilityLabel={`Delivery Location: ${shortAddress}`}
      >
        <View style={styles.brandRow}>
          <Text style={styles.brandText}>
            Serventica<Text style={styles.brandDot}>.</Text>
          </Text>
        </View>

        <View style={styles.addressRow}>
          <MapPin size={14} color="#171717" strokeWidth={2.4} style={styles.pinIcon} />
          <Text
            style={styles.addressText}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {shortAddress}
          </Text>
          <ChevronDown size={14} color="#171717" strokeWidth={2.2} style={styles.chevronIcon} />
        </View>
      </TouchableOpacity>

      {/* Profile Icon: Right side, clean neutral surface */}
      <TouchableOpacity
        style={styles.profileButton}
        activeOpacity={0.8}
        onPress={onPressProfile}
        accessibilityRole="button"
        accessibilityLabel="Customer Account and Profile"
      >
        <User size={20} color="#171717" strokeWidth={2.2} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
  },
  locationContainer: {
    flex: 1,
    marginRight: 12,
  },
  brandRow: {
    marginBottom: 2,
  },
  brandText: {
    fontSize: 20,
    fontFamily: ServenticaTokens.fonts.Bold,
    color: '#1E242B',
    letterSpacing: 0,
  },
  brandDot: {
    color: '#1E242B',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinIcon: {
    marginRight: 4,
  },
  addressText: {
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.SemiBold,
    color: '#171717',
    maxWidth: '85%',
    letterSpacing: 0,
  },
  chevronIcon: {
    marginLeft: 3,
  },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F6F6F4',
    borderWidth: 1,
    borderColor: '#E8E8E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
