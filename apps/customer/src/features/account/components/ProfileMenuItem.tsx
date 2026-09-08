import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

export interface ProfileMenuItemProps {
  label: string;
  sublabel?: string;
  badge?: string | number;
  Icon: React.ComponentType<any>;
  onPress: () => void;
  isDestructive?: boolean;
  hideChevron?: boolean;
}

export const ProfileMenuItem: React.FC<ProfileMenuItemProps> = ({
  label,
  sublabel,
  badge,
  Icon,
  onPress,
  isDestructive = false,
  hideChevron = false,
}) => {
  return (
    <TouchableOpacity
      style={styles.itemContainer}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.iconBox, isDestructive && styles.destructiveIconBox]}>
        <Icon
          size={21}
          color={isDestructive ? '#DC2626' : '#111111'}
          strokeWidth={1.8}
        />
      </View>

      <View style={styles.textContainer}>
        <Text style={[styles.labelText, isDestructive && styles.destructiveText]}>
          {label}
        </Text>
      </View>

      {badge !== undefined && badge !== null ? (
        <View style={styles.badgePill}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}

      {!hideChevron ? (
        <ChevronRight size={18} color="#BBBBBB" strokeWidth={2.0} />
      ) : null}
    </TouchableOpacity>
  );
};

interface ProfileSectionProps {
  title?: string;
  children: React.ReactNode;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({ title, children }) => {
  return (
    <View style={styles.sectionContainer}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0ED',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F7F5',
  },
  iconBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  destructiveIconBox: {
    backgroundColor: 'transparent',
  },
  textContainer: {
    flex: 1,
  },
  labelText: {
    fontSize: 16,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#111111',
    letterSpacing: 0.1,
  },
  sublabelText: {
    fontSize: 12,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#777777',
    marginTop: 2,
  },
  destructiveText: {
    color: '#DC2626',
  },
  badgePill: {
    backgroundColor: '#1E4B29',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
