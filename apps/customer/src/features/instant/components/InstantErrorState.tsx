/**
 * SERVENTICA — Instant Error State Component
 * Calm, trustworthy error screens for No Partners, Unserviceable Location, Network Timeout
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { AlertCircle, RefreshCw, Calendar, ArrowLeft } from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';
import { InstantErrorState as InstantErrorStateType } from '../types/instant.types';

interface InstantErrorStateProps {
  error: InstantErrorStateType;
  onRetry?: () => void;
  onScheduleForLater?: () => void;
  onBackToHub?: () => void;
}

export const InstantErrorState: React.FC<InstantErrorStateProps> = ({
  error,
  onRetry,
  onScheduleForLater,
  onBackToHub,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <AlertCircle size={28} color="#DC2626" strokeWidth={2.4} />
      </View>

      <Text style={styles.title}>{error.title}</Text>
      <Text style={styles.message}>{error.message}</Text>

      <View style={styles.actionsRow}>
        {error.canRetry && onRetry ? (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={onRetry}
            activeOpacity={0.85}
          >
            <RefreshCw size={14} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        ) : null}

        {onScheduleForLater ? (
          <TouchableOpacity
            style={styles.scheduleBtn}
            onPress={onScheduleForLater}
            activeOpacity={0.85}
          >
            <Calendar size={14} color="#1E242B" strokeWidth={2.2} />
            <Text style={styles.scheduleBtnText}>Schedule for Later</Text>
          </TouchableOpacity>
        ) : null}

        {onBackToHub ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBackToHub}
            activeOpacity={0.7}
          >
            <Text style={styles.backBtnText}>Choose Another Service</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginVertical: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: '#1E242B',
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    fontFamily: Fonts.Regular,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  actionsRow: {
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
  },
  retryBtnText: {
    fontSize: 13.5,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
  },
  scheduleBtnText: {
    fontSize: 13.5,
    fontFamily: Fonts.Bold,
    color: '#1E242B',
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.SemiBold,
    color: '#64748B',
  },
});
