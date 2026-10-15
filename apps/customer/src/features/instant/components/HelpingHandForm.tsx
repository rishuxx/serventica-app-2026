/**
 * SERVENTICA — Helping Hand Request Form
 * Step 1: Tasks | Step 2: Policy-governed duration | Step 3: Custom notes
 * Features bold outlined colored vector icons and smooth elevated cards
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Check } from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';
import { HelpingHandTask, HelpingHandConfig } from '../types/instant.types';
import {
  BoldCleaningIcon,
  BoldDishesIcon,
  BoldChefHatIcon,
  BoldPackageIcon,
  BoldMovingLiftingIcon,
  BoldClosetIcon,
  BoldToolsIcon,
  BoldClockIcon,
} from './InstantBoldIcons';

interface TaskOption {
  id: HelpingHandTask;
  label: string;
  icon: React.FC<{ size?: number; inactive?: boolean }>;
}

const TASK_OPTIONS: TaskOption[] = [
  { id: 'Cleaning', label: 'Cleaning', icon: BoldCleaningIcon },
  { id: 'Dishwashing', label: 'Dishwashing', icon: BoldDishesIcon },
  { id: 'Cooking assistance', label: 'Cooking Prep', icon: BoldChefHatIcon },
  { id: 'Packing', label: 'Packing Items', icon: BoldPackageIcon },
  { id: 'Moving items', label: 'Moving / Lifting', icon: BoldMovingLiftingIcon },
  { id: 'Organizing', label: 'Organizing Closet', icon: BoldClosetIcon },
  { id: 'Other', label: 'Other Tasks', icon: BoldToolsIcon },
];

const DURATION_OPTIONS = [
  { minutes: 30, label: '30 min', priceHint: '₹30' },
  { minutes: 60, label: '1 hour', priceHint: '₹59', popular: true },
  { minutes: 90, label: '1.5 hours', priceHint: '₹89' },
  { minutes: 120, label: '2 hours', priceHint: '₹118' },
  { minutes: 150, label: '2.5 hours', priceHint: '₹148' },
  { minutes: 180, label: '3 hours', priceHint: '₹177' },
  { minutes: 210, label: '3.5 hours', priceHint: '₹207' },
  { minutes: 240, label: '4 hours', priceHint: '₹236' },
];

interface HelpingHandFormProps {
  config: HelpingHandConfig;
  onChange: (partial: Partial<HelpingHandConfig>) => void;
}

export const HelpingHandForm: React.FC<HelpingHandFormProps> = ({
  config,
  onChange,
}) => {
  const toggleTask = (task: HelpingHandTask) => {
    let next: HelpingHandTask[];
    if (config.selectedTasks.includes(task)) {
      if (config.selectedTasks.length === 1) return; // Keep at least one
      next = config.selectedTasks.filter((t) => t !== task);
    } else {
      next = [...config.selectedTasks, task];
    }
    onChange({ selectedTasks: next });
  };

  return (
    <View style={styles.container}>
      {/* SECTION 1: WHAT DO YOU NEED HELP WITH */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>1</Text>
          <View style={styles.sectionTitleCol}>
            <Text style={styles.sectionTitle}>What do you need help with?</Text>
            <Text style={styles.sectionSubtitle}>Select all tasks you want the specialist to assist with</Text>
          </View>
        </View>

        <View style={styles.chipsGrid}>
          {TASK_OPTIONS.map((item) => {
            const isSelected = config.selectedTasks.includes(item.id);
            const IconComp = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.taskChip, isSelected && styles.taskChipSelected]}
                activeOpacity={0.8}
                onPress={() => toggleTask(item.id)}
              >
                <View style={[styles.chipIconBox, !isSelected && styles.chipIconBoxInactive]}>
                  <IconComp size={20} inactive={!isSelected} />
                </View>
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {item.label}
                </Text>
                {isSelected ? (
                  <View style={styles.checkCircle}>
                    <Check size={11} color="#FFFFFF" strokeWidth={3} />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* SECTION 2: ESTIMATED DURATION */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>2</Text>
          <View style={styles.sectionTitleCol}>
            <Text style={styles.sectionTitle}>Select duration</Text>
            <Text style={styles.sectionSubtitle}>You can extend during the service if needed</Text>
          </View>
        </View>

        <View style={styles.durationGrid}>
          {DURATION_OPTIONS.map((item) => {
            const isSelected = config.durationMinutes === item.minutes;
            return (
              <TouchableOpacity
                key={item.minutes}
                style={[styles.durationCard, isSelected && styles.durationCardSelected]}
                activeOpacity={0.8}
                onPress={() => onChange({ durationMinutes: item.minutes })}
              >
                {item.popular ? (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>POPULAR</Text>
                  </View>
                ) : null}
                <BoldClockIcon size={18} inactive={!isSelected} />
                <Text style={[styles.durationLabel, isSelected && styles.durationLabelSelected]}>
                  {item.label}
                </Text>
                <Text style={[styles.durationPrice, isSelected && styles.durationPriceSelected]}>
                  {item.priceHint}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* SECTION 3: OPTIONAL NOTES */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>3</Text>
          <View style={styles.sectionTitleCol}>
            <Text style={styles.sectionTitle}>Special instructions (Optional)</Text>
            <Text style={styles.sectionSubtitle}>e.g., "Bring cleaning wipes", "Gate code 1234"</Text>
          </View>
        </View>

        <TextInput
          style={styles.textInput}
          placeholder="Add any specific details for your specialist..."
          placeholderTextColor="#94A3B8"
          value={config.customTaskNote}
          onChangeText={(text) => onChange({ customTaskNote: text })}
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
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  taskChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    gap: 8,
  },
  taskChipSelected: {
    backgroundColor: '#F5F3FF',
    borderColor: '#7C3AED',
  },
  chipIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipIconBoxInactive: {
    opacity: 0.9,
  },
  chipText: {
    fontSize: 13,
    fontFamily: Fonts.SemiBold,
    color: '#64748B',
  },
  chipTextSelected: {
    color: '#7C3AED',
    fontFamily: Fonts.Bold,
  },
  checkCircle: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationCard: {
    width: '23%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    position: 'relative',
  },
  durationCardSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  popularBadgeText: {
    fontSize: 7.5,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  durationLabel: {
    fontSize: 11.5,
    fontFamily: Fonts.SemiBold,
    color: '#334155',
    marginTop: 4,
    textAlign: 'center',
  },
  durationLabelSelected: {
    color: '#7C3AED',
    fontFamily: Fonts.Bold,
  },
  durationPrice: {
    fontSize: 11,
    fontFamily: Fonts.SemiBold,
    color: '#64748B',
    marginTop: 2,
  },
  durationPriceSelected: {
    color: '#7C3AED',
    fontFamily: Fonts.Bold,
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

