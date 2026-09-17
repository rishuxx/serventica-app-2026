import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { DateAvailability } from '../../../../../../packages/types/src';

interface DateSelectorProps {
  dates: DateAvailability[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  isLoading?: boolean;
}

export const DateSelector: React.FC<DateSelectorProps> = ({
  dates,
  selectedDate,
  onSelectDate,
  isLoading,
}) => {
  if (isLoading && (!dates || dates.length === 0)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#1E242B" />
        <Text style={styles.loadingText}>Finding available dates...</Text>
      </View>
    );
  }

  if (!dates || dates.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No appointments currently available for this service.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollList}
    >
      {dates.map((item) => {
        const isSelected = selectedDate === item.date;
        const isDisabled = !item.isAvailable;

        let subLabel = item.dayName.toUpperCase();
        if (item.isToday) subLabel = 'TODAY';
        else if (item.isTomorrow) subLabel = 'TOMORROW';

        return (
          <TouchableOpacity
            key={item.date}
            style={[
              styles.dateCard,
              isSelected && styles.dateCardActive,
              isDisabled && styles.dateCardDisabled,
            ]}
            onPress={() => {
              if (!isDisabled) {
                onSelectDate(item.date);
              }
            }}
            disabled={isDisabled}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${item.dayName} ${item.monthName} ${item.dayNumber}, ${
              isDisabled ? 'Unavailable' : isSelected ? 'Selected' : 'Available'
            }`}
          >
            <Text
              style={[
                styles.dayLabel,
                isSelected && styles.dayLabelActive,
                isDisabled && styles.textDisabled,
              ]}
            >
              {item.dayNumber} {item.monthName}
            </Text>
            <Text
              style={[
                styles.subLabel,
                isSelected && styles.subLabelActive,
                isDisabled && styles.textDisabled,
              ]}
            >
              {subLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollList: {
    paddingVertical: 4,
    gap: 8,
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
    paddingVertical: 12,
  },
  emptyText: {
    fontFamily: 'Lexend-Regular',
    fontSize: 13,
    color: '#94A3B8',
  },
  dateCard: {
    width: 90,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCardActive: {
    backgroundColor: '#1E242B',
    borderColor: '#1E242B',
  },
  dateCardDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.5,
  },
  dayLabel: {
    fontFamily: 'Lexend-SemiBold',
    fontSize: 13,
    color: '#0F172A',
  },
  dayLabelActive: {
    color: '#FFFFFF',
  },
  subLabel: {
    fontFamily: 'Lexend-Medium',
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    letterSpacing: 0.4,
  },
  subLabelActive: {
    color: '#FCF403',
  },
  textDisabled: {
    color: '#94A3B8',
  },
});
