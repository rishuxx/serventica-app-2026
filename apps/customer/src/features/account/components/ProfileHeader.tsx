import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { UserRound, ChevronRight, Pencil } from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';
import { CustomerProfile } from '../../../../../../packages/types/src';

interface ProfileHeaderProps {
  profile: CustomerProfile | null;
  phone?: string | null;
  email?: string | null;
  onEditPress: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  phone,
  email,
  onEditPress,
}) => {
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Serventica Member';
  
  // Deterministic Initials Avatar
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');

  return (
    <View style={styles.headerCard}>
      <View style={styles.topRow}>
        <View style={styles.avatarContainer}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.initialsAvatar}>
              <Text style={styles.initialsText}>{initials || 'S'}</Text>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.nameText} numberOfLines={1}>
            {fullName}
          </Text>
          {phone ? (
            <Text style={styles.phoneText} numberOfLines={1}>
              {phone}
            </Text>
          ) : null}
          {email && email.trim().length > 0 ? (
            <Text style={styles.emailText} numberOfLines={1}>
              {email}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={onEditPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Edit Profile"
        >
          <Pencil size={15} color='#1E242B' strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0ED',
    shadowColor: '#1E242B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 14,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F3',
  },
  initialsAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1E4B29',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 22,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 20,
    fontFamily: ServenticaTokens.fonts.Coolvetica,
    color: '#1E242B',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  phoneText: {
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#444444',
    marginBottom: 3,
  },
  emailText: {
    fontSize: 13.5,
    fontFamily: ServenticaTokens.fonts.Regular,
    color: '#666666',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7F7F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#E8E8E6',
  },
});
