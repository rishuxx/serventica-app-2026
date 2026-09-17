import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Sun, Sunset, Moon, Clock } from 'lucide-react-native';
import { TimeSlot } from '../../../../../../packages/types/src';

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  groupedSlots: {
    morning: TimeSlot[];
    afternoon: TimeSlot[];
    evening: TimeSlot[];
  };
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
  isLoading?: boolean;
}

type PeriodTab = 'MORNING' | 'AFTERNOON' | 'EVENING';

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  slots,
  groupedSlots,
  selectedSlot,
  onSelectSlot,
  isLoading,
}) => {
  // Default to first period that has available slots
  const [activeTab, setActiveTab] = useState<PeriodTab>(() => {
    if (groupedSlots.morning.some((s) => s.available)) return 'MORNING';
    if (groupedSlots.afternoon.some((s) => s.available)) return 'AFTERNOON';
    return 'EVENING';
  });

  if (isLoading && (!slots || slots.length === 0)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#1E242B" />
        <Text style={styles.loadingText}>Checking real-time partner slots...</Text>
      </View>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Clock size={20} color="#94A3B8" />
        <Text style={styles.emptyText}>No available time slots on this date.</Text>
        <Text style={styles.emptySubText}>Please select another date above.</Text>
      </View>
    );
  }

  const currentPeriodSlots =
    activeTab === 'MORNING'
      ? groupedSlots.morning
      : activeTab === 'AFTERNOON'
      ? groupedSlots.afternoon
      : groupedSlots.evening;

  return (
    <View style={styles.container}>
      {/* Period Selector Tabs (Morning / Afternoon / Evening) */}
      <View style={styles.periodPillBar}>
        <TouchableOpacity
          style={[styles.periodSegment, activeTab === 'MORNING' && styles.periodSegmentActive]}
          onPress={() => setActiveTab('MORNING')}
          activeOpacity={0.8}
        >
          <Sun size={13} color={activeTab === 'MORNING' ? '#FFFFFF' : '#475569'} />
          <Text style={[styles.periodText, activeTab === 'MORNING' && styles.periodTextActive]}>
            Morning ({groupedSlots.morning.filter((s) => s.available).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.periodSegment, activeTab === 'AFTERNOON' && styles.periodSegmentActive]}
          onPress={() => setActiveTab('AFTERNOON')}
          activeOpacity={0.8}
        >
          <Sunset size={13} color={activeTab === 'AFTERNOON' ? '#FFFFFF' : '#475569'} />
          <Text style={[styles.periodText, activeTab === 'AFTERNOON' && styles.periodTextActive]}>
            Afternoon ({groupedSlots.afternoon.filter((s) => s.available).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.periodSegment, activeTab === 'EVENING' && styles.periodSegmentActive]}
          onPress={() => setActiveTab('EVENING')}
          activeOpacity={0.8}
        >
          <Moon size={13} color={activeTab === 'EVENING' ? '#FFFFFF' : '#475569'} />
          <Text style={[styles.periodText, activeTab === 'EVENING' && styles.periodTextActive]}>
            Evening ({groupedSlots.evening.filter((s) => s.available).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Slots Grid Container */}
      <View style={styles.slotsCardBox}>
        {currentPeriodSlots.length === 0 ? (
          <View style={styles.noPeriodSlotsBox}>
            <Text style={styles.noPeriodSlotsText}>No slots in this period. Check other times.</Text>
          </View>
        ) : (
          <View style={styles.slotsGridContainer}>
            {currentPeriodSlots.map((slot) => {
              const isSelected = selectedSlot?.id === slot.id;
              const isAvailable = slot.available && slot.remainingCapacity > 0;

              return (
                <TouchableOpacity
                  key={slot.id}
                  style={[
                    styles.slotChipItem,
                    isSelected && styles.slotChipItemActive,
                    !isAvailable && styles.slotChipItemDisabled,
                  ]}
                  onPress={() => {
                    if (isAvailable) {
                      onSelectSlot(slot);
                    }
                  }}
                  disabled={!isAvailable}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`${slot.startTimeFormatted} to ${slot.endTimeFormatted}, ${
                    !isAvailable ? 'Full' : isSelected ? 'Selected' : 'Available'
                  }`}
                >
                  <Text
                    style={[
                      styles.slotChipLabel,
                      isSelected && styles.slotChipLabelActive,
                      !isAvailable && styles.slotChipLabelDisabled,
                    ]}
                  >
                    {slot.startTimeFormatted}
                  </Text>
                  {isAvailable && slot.remainingCapacity === 1 && (
                    <Text style={[styles.urgencyText, isSelected && styles.urgencyTextActive]}>
                      1 left
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  loadingText: {
    fontFamily: 'Lexend-Regular',
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 18,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontFamily: 'Lexend-Medium',
    fontSize: 13,
    color: '#475569',
    marginTop: 6,
  },
  emptySubText: {
    fontFamily: 'Lexend-Regular',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  periodPillBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    gap: 4,
    marginBottom: 10,
  },
  periodSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  periodSegmentActive: {
    backgroundColor: '#1E242B',
  },
  periodText: {
    fontFamily: 'Lexend-Medium',
    fontSize: 11,
    color: '#475569',
  },
  periodTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Lexend-SemiBold',
  },
  slotsCardBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  noPeriodSlotsBox: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  noPeriodSlotsText: {
    fontFamily: 'Lexend-Regular',
    fontSize: 12,
    color: '#94A3B8',
  },
  slotsGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotChipItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    minWidth: '29%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotChipItemActive: {
    backgroundColor: '#1E242B',
    borderColor: '#1E242B',
  },
  slotChipItemDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.45,
  },
  slotChipLabel: {
    fontFamily: 'Lexend-Medium',
    fontSize: 12,
    color: '#1E242B',
  },
  slotChipLabelActive: {
    color: '#FFFFFF',
    fontFamily: 'Lexend-SemiBold',
  },
  slotChipLabelDisabled: {
    color: '#94A3B8',
  },
  urgencyText: {
    fontFamily: 'Lexend-Regular',
    fontSize: 9,
    color: '#EA580C',
    marginTop: 1,
  },
  urgencyTextActive: {
    color: '#FCF403',
  },
});
