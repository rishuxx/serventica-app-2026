import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { ArrowLeft, HelpCircle, Copy, Check } from 'lucide-react-native';
import { Fonts, ServenticaTokens } from '../../../../../../packages/design-system/src';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// 3 Snap Positions (Distance from TOP of screen)
const TOP_INSET = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44;
export const SNAP_EXPANDED = TOP_INSET + 8; // 3) Full Expanded (top of screen)
export const SNAP_MID = SCREEN_HEIGHT - (Platform.OS === 'android' ? 425 : 445); // 2) Mid (up to assigning verified servs)
export const SNAP_MINIMIZED = SCREEN_HEIGHT - (Platform.OS === 'android' ? 64 : 74); // 1) Absolute Bottom (peek header row only)
export const SNAP_COLLAPSED = SNAP_MID; // Alias for backwards compatibility

export type SheetSnapState = 'minimized' | 'mid' | 'expanded';

interface ExpandableOrderBottomSheetProps {
  bookingNumber: string;
  onBack: () => void;
  onGetHelp: () => void;
  children: React.ReactNode;
  initialSnap?: SheetSnapState;
  initialExpanded?: boolean;
  animatedPanY?: Animated.Value;
}

export const ExpandableOrderBottomSheet: React.FC<ExpandableOrderBottomSheetProps> = ({
  bookingNumber,
  onBack,
  onGetHelp,
  children,
  initialSnap = 'mid',
  initialExpanded = false,
  animatedPanY,
}) => {
  const getInitialSnapValue = () => {
    if (initialExpanded) return SNAP_EXPANDED;
    if (initialSnap === 'minimized') return SNAP_MINIMIZED;
    if (initialSnap === 'expanded') return SNAP_EXPANDED;
    return SNAP_MID;
  };

  const initialSnapVal = getInitialSnapValue();
  const internalPanY = useRef(new Animated.Value(initialSnapVal)).current;
  const panY = animatedPanY || internalPanY;
  const currentSnap = useRef<number>(initialSnapVal);
  const [snapState, setSnapState] = useState<SheetSnapState>(initialExpanded ? 'expanded' : initialSnap);
  const [copied, setCopied] = useState<boolean>(false);
  const isExpanded = snapState === 'expanded';

  const snapTo = (toValue: number) => {
    Animated.spring(panY, {
      toValue,
      friction: 8,
      tension: 60,
      useNativeDriver: false,
    }).start(() => {
      currentSnap.current = toValue;
      if (toValue === SNAP_EXPANDED) setSnapState('expanded');
      else if (toValue === SNAP_MINIMIZED) setSnapState('minimized');
      else setSnapState('mid');
    });
  };

  const toggleExpand = () => {
    if (currentSnap.current === SNAP_MINIMIZED) {
      snapTo(SNAP_MID);
    } else if (currentSnap.current === SNAP_MID) {
      snapTo(SNAP_EXPANDED);
    } else {
      snapTo(SNAP_MID);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Capture vertical drags
        return Math.abs(gestureState.dy) > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        panY.extractOffset();
      },
      onPanResponderMove: (_, gestureState) => {
        const currentPos = currentSnap.current + gestureState.dy;
        if (currentPos < SNAP_EXPANDED - 20) {
          panY.setValue(gestureState.dy * 0.2);
        } else if (currentPos > SNAP_MINIMIZED + 30) {
          panY.setValue(gestureState.dy * 0.2);
        } else {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        panY.flattenOffset();
        const releasedAt = currentSnap.current + gestureState.dy;
        const midTopThreshold = (SNAP_EXPANDED + SNAP_MID) / 2;
        const midBottomThreshold = (SNAP_MID + SNAP_MINIMIZED) / 2;

        // Fast upward fling
        if (gestureState.vy < -0.6) {
          if (currentSnap.current === SNAP_MINIMIZED && releasedAt > midTopThreshold) {
            snapTo(SNAP_MID);
          } else {
            snapTo(SNAP_EXPANDED);
          }
        }
        // Fast downward fling
        else if (gestureState.vy > 0.6) {
          if (currentSnap.current === SNAP_EXPANDED && releasedAt < midBottomThreshold) {
            snapTo(SNAP_MID);
          } else {
            snapTo(SNAP_MINIMIZED);
          }
        }
        // Distance-based closest snap
        else {
          if (releasedAt < midTopThreshold) {
            snapTo(SNAP_EXPANDED);
          } else if (releasedAt < midBottomThreshold) {
            snapTo(SNAP_MID);
          } else {
            snapTo(SNAP_MINIMIZED);
          }
        }
      },
    })
  ).current;

  const handleCopyBookingId = async () => {
    try {
      const Clipboard = require('react-native').Clipboard;
      if (Clipboard?.setString) {
        Clipboard.setString(bookingNumber);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Animated.View
      style={[
        styles.sheetContainer,
        {
          top: panY,
          height: SCREEN_HEIGHT - SNAP_EXPANDED,
        },
      ]}
    >
      {/* DRAG HANDLE BAR (CAPTURES GESTURES & TAP TO TOGGLE) */}
      <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={toggleExpand}
          style={styles.dragIndicatorTouch}
          hitSlop={{ top: 12, bottom: 12, left: 50, right: 50 }}
        >
          <View style={styles.dragIndicator} />
        </TouchableOpacity>

        {/* FLOATING HEADER ROW: Back Button | Booking ID Pill | Help Button */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={onBack}
            activeOpacity={0.75}
            accessibilityLabel="Back to Orders"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={18} color="#1E293B" strokeWidth={2.4} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bookingIdPill}
            onPress={handleCopyBookingId}
            activeOpacity={0.75}
            accessibilityLabel={`Booking ID ${bookingNumber}. Tap to copy.`}
          >
            <Text style={styles.bookingIdLabel}>Booking ID</Text>
            <View style={styles.bookingIdValueRow}>
              <Text style={styles.bookingIdText}>{bookingNumber}</Text>
              {copied ? (
                <Check size={13} color="#16A34A" strokeWidth={2.6} />
              ) : (
                <Copy size={13} color="#64748B" strokeWidth={2} />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.circleBtn}
            onPress={onGetHelp}
            activeOpacity={0.75}
            accessibilityLabel="Get customer support"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <HelpCircle size={18} color="#1E293B" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>
      </View>

      {/* SCROLLABLE SHEET CONTENT */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        scrollEnabled={isExpanded}
      >
        <TouchableOpacity
          activeOpacity={isExpanded ? 1 : 0.9}
          onPress={() => {
            if (!isExpanded) snapTo(SNAP_EXPANDED);
          }}
          disabled={isExpanded}
        >
          {children}
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
    zIndex: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dragHandleArea: {
    width: '100%',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  dragIndicatorTouch: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  dragIndicator: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingIdPill: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingIdLabel: {
    fontSize: 10,
    fontFamily: Fonts.Medium,
    color: '#64748B',
    marginBottom: 1,
  },
  bookingIdValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bookingIdText: {
    fontSize: 13,
    fontFamily: Fonts.Bold,
    color: '#0F172A',
    letterSpacing: 0.4,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
    gap: 14,
  },
});

export default ExpandableOrderBottomSheet;
