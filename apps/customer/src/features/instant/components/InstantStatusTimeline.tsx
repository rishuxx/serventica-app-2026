/**
 * SERVENTICA — Instant Status Timeline
 * Step-by-step progress tracker grounded in backend state machine
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Check, Circle } from 'lucide-react-native';
import { Fonts } from '../../../../../../packages/design-system/src';

interface TimelineStep {
  key: string;
  label: string;
}

const TIMELINE_STEPS: TimelineStep[] = [
  { key: 'REQUEST_RECEIVED', label: 'Request received' },
  { key: 'PARTNER_ASSIGNED', label: 'Professional assigned' },
  { key: 'EN_ROUTE', label: 'On the way' },
  { key: 'ARRIVED_AT_DOORSTEP', label: 'Arrived at doorstep' },
  { key: 'SERVICE_IN_PROGRESS', label: 'Service started' },
  { key: 'COMPLETED', label: 'Completed' },
];

interface InstantStatusTimelineProps {
  currentStatus: string;
}

export const InstantStatusTimeline: React.FC<InstantStatusTimelineProps> = ({
  currentStatus,
}) => {
  // Map booking status to timeline index
  const getActiveIndex = (status: string): number => {
    switch (status) {
      case 'INSTANT_DISPATCHING':
      case 'CREATED':
      case 'SEARCHING_PARTNER':
        return 0;
      case 'PARTNER_ASSIGNED':
      case 'PARTNER_ACCEPTED':
      case 'ACCEPTED':
        return 1;
      case 'PARTNER_EN_ROUTE':
      case 'EN_ROUTE':
        return 2;
      case 'PARTNER_ARRIVED':
      case 'ARRIVED_AT_DOORSTEP':
        return 3;
      case 'SERVICE_STARTED':
      case 'SERVICE_IN_PROGRESS':
        return 4;
      case 'SERVICE_COMPLETED':
      case 'COMPLETED':
      case 'CLOSED':
        return 5;
      default:
        return 1;
    }
  };

  const activeIndex = getActiveIndex(currentStatus);

  return (
    <View style={styles.container}>
      <Text style={styles.timelineTitle}>STATUS TIMELINE</Text>
      <View style={styles.stepsList}>
        {TIMELINE_STEPS.map((step, index) => {
          const isDone = index < activeIndex;
          const isCurrent = index === activeIndex;
          const isPending = index > activeIndex;

          return (
            <View key={step.key} style={styles.stepRow}>
              {/* INDICATOR & LINE */}
              <View style={styles.indicatorCol}>
                <View
                  style={[
                    styles.node,
                    isDone && styles.nodeDone,
                    isCurrent && styles.nodeCurrent,
                    isPending && styles.nodePending,
                  ]}
                >
                  {isDone ? (
                    <Check size={10} color="#FFFFFF" strokeWidth={3} />
                  ) : isCurrent ? (
                    <View style={styles.currentInnerDot} />
                  ) : (
                    <Circle size={6} color="#CBD5E1" fill="#CBD5E1" />
                  )}
                </View>
                {index < TIMELINE_STEPS.length - 1 && (
                  <View
                    style={[
                      styles.connectorLine,
                      index < activeIndex && styles.connectorLineDone,
                    ]}
                  />
                )}
              </View>

              {/* LABEL */}
              <Text
                style={[
                  styles.label,
                  isDone && styles.labelDone,
                  isCurrent && styles.labelCurrent,
                  isPending && styles.labelPending,
                ]}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  timelineTitle: {
    fontSize: 10,
    fontFamily: Fonts.Bold,
    color: '#94A3B8',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  stepsList: {
    gap: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  indicatorCol: {
    alignItems: 'center',
    width: 18,
  },
  node: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDone: {
    backgroundColor: '#059669',
  },
  nodeCurrent: {
    backgroundColor: '#7C3AED',
  },
  nodePending: {
    backgroundColor: '#F1F5F9',
  },
  currentInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  connectorLine: {
    width: 2,
    height: 18,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  connectorLineDone: {
    backgroundColor: '#059669',
  },
  label: {
    fontSize: 12.5,
    marginTop: -1,
  },
  labelDone: {
    fontFamily: Fonts.Medium,
    color: '#1E242B',
  },
  labelCurrent: {
    fontFamily: Fonts.Bold,
    color: '#7C3AED',
  },
  labelPending: {
    fontFamily: Fonts.Regular,
    color: '#94A3B8',
  },
});
