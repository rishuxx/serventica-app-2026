/**
 * SERVENTICA — Road Help Request Form
 * Fuel Assistance & Vehicle Breakdown with backend-fixed fuel limits
 * Features bold outlined colored vector icons and smooth elevated cards
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Check, Info } from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';
import {
  RoadHelpConfig,
  RoadHelpSubservice,
  FuelType,
  VehicleType,
  BreakdownIssue,
} from '../types/instant.types';
import {
  BoldFuelPumpIcon,
  BoldBreakdownIcon,
  BoldTyreIcon,
  BoldBatteryIcon,
  BoldBikeIcon,
  BoldCarIcon,
  BoldTruckIcon,
} from './InstantBoldIcons';

interface SubserviceTab {
  id: RoadHelpSubservice;
  label: string;
  icon: React.FC<{ size?: number; inactive?: boolean }>;
}

const SUBSERVICE_TABS: SubserviceTab[] = [
  { id: 'FUEL', label: 'Fuel Top-Up', icon: BoldFuelPumpIcon },
  { id: 'BREAKDOWN', label: 'Breakdown', icon: BoldBreakdownIcon },
  { id: 'FLAT_TYRE', label: 'Flat Tyre', icon: BoldTyreIcon },
  { id: 'BATTERY', label: 'Battery Jump', icon: BoldBatteryIcon },
];

interface VehicleOption {
  id: VehicleType;
  label: string;
  icon: React.FC<{ size?: number; inactive?: boolean }>;
}

const VEHICLE_TYPES: VehicleOption[] = [
  { id: 'BIKE', label: 'Motorcycle', icon: BoldBikeIcon },
  { id: 'SCOOTER', label: 'Scooter', icon: BoldBikeIcon },
  { id: 'CAR', label: 'Sedan/Hatch', icon: BoldCarIcon },
  { id: 'SUV', label: 'SUV', icon: BoldTruckIcon },
  { id: 'OTHER', label: 'Other', icon: BoldTruckIcon },
];

const BREAKDOWN_ISSUES: BreakdownIssue[] = [
  'Cannot start',
  'Flat tyre',
  'Battery issue',
  'Engine issue',
  'Overheating',
  'Other',
];

interface RoadHelpFormProps {
  config: RoadHelpConfig;
  onChange: (partial: Partial<RoadHelpConfig>) => void;
}

export const RoadHelpForm: React.FC<RoadHelpFormProps> = ({
  config,
  onChange,
}) => {
  const isFuel = config.subservice === 'FUEL';

  return (
    <View style={styles.container}>
      {/* 1. SELECT ROADSIDE ISSUE CATEGORY */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>1</Text>
          <View style={styles.sectionTitleCol}>
            <Text style={styles.sectionTitle}>What roadside assistance do you need?</Text>
            <Text style={styles.sectionSubtitle}>Specialist dispatched with required roadside equipment</Text>
          </View>
        </View>

        <View style={styles.tabGrid}>
          {SUBSERVICE_TABS.map((tab) => {
            const isSelected = config.subservice === tab.id;
            const TabIcon = tab.icon;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabButton, isSelected && styles.tabButtonSelected]}
                activeOpacity={0.8}
                onPress={() => onChange({ subservice: tab.id })}
              >
                <View style={styles.tabIconBox}>
                  <TabIcon size={22} inactive={!isSelected} />
                </View>
                <Text style={[styles.tabLabel, isSelected && styles.tabLabelSelected]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 2. SPECIFIC FLOW BASED ON SELECTION */}
      <View style={styles.sectionCard}>
        {isFuel ? (
          <View style={styles.fuelContainer}>
            <View style={styles.fuelNoticeCard}>
              <Info size={18} color="#4F46E5" strokeWidth={2.4} />
              <View style={styles.noticeTextCol}>
                <Text style={styles.noticeTitle}>Emergency Fuel Delivery</Text>
                <Text style={styles.noticeBody}>
                  "Fuel top-up" • Up to 1 litre. Designed to help you reach a nearby fuel station.
                </Text>
              </View>
            </View>

            <Text style={styles.subSectionTitle}>Select Fuel Type</Text>
            <View style={styles.fuelTypeRow}>
              {(['PETROL', 'DIESEL'] as FuelType[]).map((fuel) => {
                const isSelected = config.fuelType === fuel;
                return (
                  <TouchableOpacity
                    key={fuel}
                    style={[styles.fuelChip, isSelected && styles.fuelChipSelected]}
                    activeOpacity={0.8}
                    onPress={() => onChange({ fuelType: fuel })}
                  >
                    <BoldFuelPumpIcon size={20} inactive={!isSelected} />
                    <Text style={[styles.fuelText, isSelected && styles.fuelTextSelected]}>
                      {fuel === 'PETROL' ? 'Petrol (1L)' : 'Diesel (1L)'}
                    </Text>
                    {isSelected ? (
                      <View style={styles.fuelCheck}>
                        <Check size={11} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.breakdownContainer}>
            <Text style={styles.subSectionTitle}>Vehicle Type</Text>
            <View style={styles.vehicleRow}>
              {VEHICLE_TYPES.map((v) => {
                const isSelected = config.vehicleType === v.id;
                const VehIcon = v.icon;
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}
                    activeOpacity={0.8}
                    onPress={() => onChange({ vehicleType: v.id })}
                  >
                    <View style={styles.vehicleIconBox}>
                      <VehIcon size={20} inactive={!isSelected} />
                    </View>
                    <Text style={[styles.vehicleLabel, isSelected && styles.vehicleLabelSelected]}>
                      {v.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.subSectionTitle, { marginTop: 18 }]}>What happened?</Text>
            <View style={styles.issueChipsRow}>
              {BREAKDOWN_ISSUES.map((issue) => {
                const isSelected = config.breakdownIssue === issue;
                return (
                  <TouchableOpacity
                    key={issue}
                    style={[styles.issueChip, isSelected && styles.issueChipSelected]}
                    activeOpacity={0.8}
                    onPress={() => onChange({ breakdownIssue: issue })}
                  >
                    <Text style={[styles.issueChipText, isSelected && styles.issueChipTextSelected]}>
                      {issue}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* 3. OPTIONAL NOTES */}
      <View style={styles.sectionCard}>
        <Text style={styles.subSectionTitle}>Describe your location / problem</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g., Near Rajpur Road petrol pump, car won't crank..."
          placeholderTextColor="#94A3B8"
          value={config.issueDescription}
          onChangeText={(text) => onChange({ issueDescription: text })}
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
  tabGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
  },
  tabButtonSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  tabIconBox: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: Fonts.Medium,
    color: '#475569',
  },
  tabLabelSelected: {
    fontFamily: Fonts.Bold,
    color: '#7C3AED',
  },
  fuelContainer: {
    marginTop: 2,
  },
  fuelNoticeCard: {
    flexDirection: 'row',
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginBottom: 16,
  },
  noticeTextCol: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 13,
    fontFamily: Fonts.Bold,
    color: '#5B21B6',
  },
  noticeBody: {
    fontSize: 12,
    fontFamily: Fonts.Regular,
    color: '#6D28D9',
    marginTop: 2,
    lineHeight: 16,
  },
  subSectionTitle: {
    fontSize: 14,
    fontFamily: Fonts.Bold,
    color: '#1E242B',
    marginBottom: 10,
  },
  fuelTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fuelChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
    justifyContent: 'center',
  },
  fuelChipSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  fuelText: {
    fontSize: 13,
    fontFamily: Fonts.SemiBold,
    color: '#334155',
  },
  fuelTextSelected: {
    fontFamily: Fonts.Bold,
    color: '#7C3AED',
  },
  fuelCheck: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownContainer: {
    marginTop: 2,
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  vehicleCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
  },
  vehicleCardSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  vehicleIconBox: {
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleLabel: {
    fontSize: 10,
    fontFamily: Fonts.Medium,
    color: '#475569',
    textAlign: 'center',
  },
  vehicleLabelSelected: {
    fontFamily: Fonts.Bold,
    color: '#7C3AED',
  },
  issueChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  issueChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  issueChipSelected: {
    backgroundColor: '#F5F3FF',
    borderColor: '#7C3AED',
  },
  issueChipText: {
    fontSize: 12.5,
    fontFamily: Fonts.Medium,
    color: '#334155',
  },
  issueChipTextSelected: {
    color: '#7C3AED',
    fontFamily: Fonts.SemiBold,
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

