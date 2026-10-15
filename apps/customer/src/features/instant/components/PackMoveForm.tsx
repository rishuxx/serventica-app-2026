/**
 * SERVENTICA — Pack & Move Request Form
 * Step 1: Needs | Step 2: Helper Count (1, 2, 3+) | Step 3: Duration
 * Features bold outlined colored vector icons and smooth elevated cards
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Check } from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';
import { PackMoveConfig, PackMoveNeed } from '../types/instant.types';
import {
  BoldPackageIcon,
  BoldTruckIcon,
  BoldDownloadBoxIcon,
  BoldSofaIcon,
  BoldRefreshIcon,
  BoldUsersIcon,
  BoldClockIcon,
} from './InstantBoldIcons';

interface NeedOption {
  id: PackMoveNeed;
  label: string;
  icon: React.FC<{ size?: number; inactive?: boolean }>;
}

const NEED_OPTIONS: NeedOption[] = [
  { id: 'Packing', label: 'Packing Boxes', icon: BoldPackageIcon },
  { id: 'Loading', label: 'Loading Vehicle', icon: BoldTruckIcon },
  { id: 'Unloading', label: 'Unloading', icon: BoldDownloadBoxIcon },
  { id: 'Moving', label: 'Shifting Furniture', icon: BoldSofaIcon },
  { id: 'Rearranging', label: 'Room Rearrange', icon: BoldRefreshIcon },
];

const HELPER_COUNTS = [
  { count: 1, label: '1 Helper', subtext: 'Light shifting / packing' },
  { count: 2, label: '2 Helpers', subtext: 'Heavy furniture / sofa move', popular: true },
  { count: 3, label: '3+ Helpers', subtext: 'Full room shifting / fast work' },
];

const DURATION_OPTIONS = [
  { minutes: 60, label: '1 Hour' },
  { minutes: 120, label: '2 Hours', popular: true },
  { minutes: 180, label: '3 Hours' },
  { minutes: 240, label: '4 Hours' },
];

interface PackMoveFormProps {
  config: PackMoveConfig;
  onChange: (partial: Partial<PackMoveConfig>) => void;
}

export const PackMoveForm: React.FC<PackMoveFormProps> = ({
  config,
  onChange,
}) => {
  const toggleNeed = (need: PackMoveNeed) => {
    let next: PackMoveNeed[];
    if (config.needs.includes(need)) {
      if (config.needs.length === 1) return;
      next = config.needs.filter((n) => n !== need);
    } else {
      next = [...config.needs, need];
    }
    onChange({ needs: next });
  };

  return (
    <View style={styles.container}>
      {/* 1. WHAT DO YOU NEED */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>1</Text>
          <View style={styles.sectionTitleCol}>
            <Text style={styles.sectionTitle}>What do you need?</Text>
            <Text style={styles.sectionSubtitle}>Select moving requirements</Text>
          </View>
        </View>

        <View style={styles.chipsRow}>
          {NEED_OPTIONS.map((item) => {
            const isSelected = config.needs.includes(item.id);
            const IconComp = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.needChip, isSelected && styles.needChipSelected]}
                activeOpacity={0.8}
                onPress={() => toggleNeed(item.id)}
              >
                <View style={styles.chipIconBox}>
                  <IconComp size={20} inactive={!isSelected} />
                </View>
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {item.label}
                </Text>
                {isSelected ? (
                  <View style={styles.checkBadge}>
                    <Check size={11} color="#FFFFFF" strokeWidth={3} />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 2. NUMBER OF HELPERS */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>2</Text>
          <View style={styles.sectionTitleCol}>
            <Text style={styles.sectionTitle}>Number of helpers</Text>
            <Text style={styles.sectionSubtitle}>Specialists dispatched together</Text>
          </View>
        </View>

        <View style={styles.helpersCol}>
          {HELPER_COUNTS.map((item) => {
            const isSelected = config.helperCount === item.count;
            return (
              <TouchableOpacity
                key={item.count}
                style={[styles.helperCard, isSelected && styles.helperCardSelected]}
                activeOpacity={0.8}
                onPress={() => onChange({ helperCount: item.count })}
              >
                <BoldUsersIcon size={24} inactive={!isSelected} />
                <View style={styles.helperInfo}>
                  <View style={styles.helperTitleRow}>
                    <Text style={[styles.helperTitle, isSelected && styles.helperTitleSelected]}>
                      {item.label}
                    </Text>
                    {item.popular ? (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularBadgeText}>RECOMMENDED</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.helperSubtext}>{item.subtext}</Text>
                </View>
                {isSelected ? (
                  <View style={styles.checkCircle}>
                    <Check size={12} color="#FFFFFF" strokeWidth={3} />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3. DURATION */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>3</Text>
          <View style={styles.sectionTitleCol}>
            <Text style={styles.sectionTitle}>Initial duration</Text>
            <Text style={styles.sectionSubtitle}>Extendable in 30-min increments during the job</Text>
          </View>
        </View>

        <View style={styles.durationRow}>
          {DURATION_OPTIONS.map((item) => {
            const isSelected = config.durationMinutes === item.minutes;
            return (
              <TouchableOpacity
                key={item.minutes}
                style={[styles.durationChip, isSelected && styles.durationChipSelected]}
                activeOpacity={0.8}
                onPress={() => onChange({ durationMinutes: item.minutes })}
              >
                <BoldClockIcon size={16} />
                <Text style={[styles.durationChipText, isSelected && styles.durationChipTextSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 4. OPTIONAL INSTRUCTIONS */}
      <View style={styles.sectionCard}>
        <Text style={styles.subSectionTitle}>Floors / Lift availability (Optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g., 2nd floor, service lift available..."
          placeholderTextColor="#94A3B8"
          value={config.specialInstructions}
          onChangeText={(text) => onChange({ specialInstructions: text })}
          multiline
          numberOfLines={2}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 6,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  sectionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Fonts.Bold,
    textAlign: 'center',
    lineHeight: 24,
  },
  sectionTitleCol: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontFamily: Fonts.Bold,
    color: '#1E242B',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.Regular,
    color: '#64748B',
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  needChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  needChipSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  chipIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
    fontFamily: Fonts.SemiBold,
    color: '#334155',
  },
  chipTextSelected: {
    color: '#7C3AED',
    fontFamily: Fonts.Bold,
  },
  checkBadge: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpersCol: {
    gap: 10,
  },
  helperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  helperCardSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  helperInfo: {
    flex: 1,
  },
  helperTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  helperTitle: {
    fontSize: 14,
    fontFamily: Fonts.SemiBold,
    color: '#1E242B',
  },
  helperTitleSelected: {
    color: '#7C3AED',
    fontFamily: Fonts.Bold,
  },
  popularBadge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  popularBadgeText: {
    fontSize: 7.5,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  helperSubtext: {
    fontSize: 11.5,
    fontFamily: Fonts.Regular,
    color: '#64748B',
    marginTop: 2,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    gap: 6,
  },
  durationChipSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  durationChipText: {
    fontSize: 12,
    fontFamily: Fonts.Medium,
    color: '#334155',
  },
  durationChipTextSelected: {
    color: '#7C3AED',
    fontFamily: Fonts.Bold,
  },
  subSectionTitle: {
    fontSize: 14,
    fontFamily: Fonts.Bold,
    color: '#1E242B',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: Fonts.Regular,
    color: '#1E242B',
    minHeight: 56,
  },
});

