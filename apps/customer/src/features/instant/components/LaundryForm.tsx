/**
 * SERVENTICA — Laundry Request Form
 * "Instant Pickup" with transparent weight policy notice
 * Features bold outlined colored vector icons and smooth elevated cards
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { AlertCircle, Check } from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';
import { LaundryConfig } from '../types/instant.types';
import {
  BoldShirtIcon,
  BoldScaleIcon,
} from './InstantBoldIcons';

const LOAD_OPTIONS = [
  { id: 'LIGHT', label: 'Light Load (~3 kg)', approxKg: 3, hint: '10–12 garments' },
  { id: 'MEDIUM', label: 'Standard Load (~6 kg)', approxKg: 6, hint: '18–22 garments', popular: true },
  { id: 'HEAVY', label: 'Heavy Load (~10+ kg)', approxKg: 10, hint: '30+ garments or beddings' },
];

const CLOTHING_TYPES = [
  'Daily Wear / Cotton',
  'Formal Shirts / Trousers',
  'Bedsheets & Linens',
  'Delicates / Woollens',
];

interface LaundryFormProps {
  config: LaundryConfig;
  onChange: (partial: Partial<LaundryConfig>) => void;
}

export const LaundryForm: React.FC<LaundryFormProps> = ({
  config,
  onChange,
}) => {
  const toggleType = (item: string) => {
    let next: string[];
    if (config.clothingTypes.includes(item)) {
      if (config.clothingTypes.length === 1) return;
      next = config.clothingTypes.filter((t) => t !== item);
    } else {
      next = [...config.clothingTypes, item];
    }
    onChange({ clothingTypes: next });
  };

  return (
    <View style={styles.container}>
      {/* 1. HERO NOTICE: INSTANT PICKUP ONLY */}
      <View style={styles.instantPickupBanner}>
        <View style={styles.bannerIcon}>
          <BoldShirtIcon size={26} />
        </View>
        <View style={styles.bannerTextCol}>
          <Text style={styles.bannerTitle}>Instant Doorstep Pickup</Text>
          <Text style={styles.bannerSubtitle}>
            A specialist arrives in 15–20 minutes to weigh & collect your laundry for express processing.
          </Text>
        </View>
      </View>

      {/* 2. APPROXIMATE LOAD SELECTION */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>1</Text>
          <View style={styles.sectionTitleCol}>
            <Text style={styles.sectionTitle}>Approximate laundry load</Text>
            <Text style={styles.sectionSubtitle}>Select estimated weight for pickup dispatch</Text>
          </View>
        </View>

        <View style={styles.loadCardsCol}>
          {LOAD_OPTIONS.map((item) => {
            const isSelected = config.approxLoadKg === item.approxKg;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.loadCard, isSelected && styles.loadCardSelected]}
                activeOpacity={0.8}
                onPress={() => onChange({ approxLoadKg: item.approxKg, loadLabel: item.label })}
              >
                <BoldScaleIcon size={22} />
                <View style={styles.loadInfoCol}>
                  <View style={styles.loadHeaderRow}>
                    <Text style={[styles.loadTitle, isSelected && styles.loadTitleSelected]}>
                      {item.label}
                    </Text>
                    {item.popular ? (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularBadgeText}>POPULAR</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.loadHint}>{item.hint}</Text>
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

      {/* 3. CLOTHING TYPES */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>2</Text>
          <View style={styles.sectionTitleCol}>
            <Text style={styles.sectionTitle}>Clothing / Items Included</Text>
            <Text style={styles.sectionSubtitle}>Select category of garments</Text>
          </View>
        </View>

        <View style={styles.typesRow}>
          {CLOTHING_TYPES.map((type) => {
            const isSelected = config.clothingTypes.includes(type);
            return (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, isSelected && styles.typeChipSelected]}
                activeOpacity={0.8}
                onPress={() => toggleType(type)}
              >
                <Text style={[styles.typeChipText, isSelected && styles.typeChipTextSelected]}>
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 4. MANDATORY POLICY NOTICE */}
      <View style={styles.policyCard}>
        <AlertCircle size={18} color="#7C3AED" strokeWidth={2.4} />
        <Text style={styles.policyText}>
          Final price will be calculated after verified quantity according to the pricing policy.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 6,
  },
  instantPickupBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    gap: 12,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontFamily: Fonts.Bold,
    color: '#1E242B',
  },
  bannerSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.Regular,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
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
  loadCardsCol: {
    gap: 10,
  },
  loadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  loadCardSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  loadInfoCol: {
    flex: 1,
  },
  loadHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loadTitle: {
    fontSize: 13.5,
    fontFamily: Fonts.SemiBold,
    color: '#1E242B',
  },
  loadTitleSelected: {
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
    fontSize: 8,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  loadHint: {
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
  typesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  typeChipSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  typeChipText: {
    fontSize: 12.5,
    fontFamily: Fonts.Medium,
    color: '#334155',
  },
  typeChipTextSelected: {
    color: '#7C3AED',
    fontFamily: Fonts.Bold,
  },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  policyText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.Medium,
    color: '#475569',
    lineHeight: 16,
  },
});

