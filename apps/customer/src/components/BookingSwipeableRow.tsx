import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Animated,
  PanResponder,
  LayoutChangeEvent,
  Vibration,
  Platform,
} from 'react-native';
import { Trash2, Archive } from 'lucide-react-native';
import { triggerHaptic } from '../hooks/useEventHaptics';

interface BookingSwipeableRowProps {
  children: React.ReactNode;
  onSwipeDelete: () => void;
  onSwipeArchive: () => void;
}

const REVEAL_THRESHOLD = 64; // Threshold to settle icon in revealed state
const EXTREME_THRESHOLD = 180; // Extreme threshold to immediately trigger action on full swipe

export const BookingSwipeableRow: React.FC<BookingSwipeableRowProps> = ({
  children,
  onSwipeDelete,
  onSwipeArchive,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const cardHeight = useRef(new Animated.Value(1)).current; // 1 = fully open, 0 = collapsed
  const [rowHeight, setRowHeight] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  // Vibration threshold flags to ensure Haptics vibrate once per boundary cross
  const hasTriggeredRevealRef = useRef(false);
  const hasTriggeredExtremeRef = useRef(false);
  const swipeDirectionRef = useRef<'left' | 'right' | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture horizontal swipes exceeding threshold
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderGrant: () => {
        setIsSwiping(true);
        hasTriggeredRevealRef.current = false;
        hasTriggeredExtremeRef.current = false;
        swipeDirectionRef.current = null;
      },
      onPanResponderMove: (_, gestureState) => {
        const dx = gestureState.dx;
        translateX.setValue(dx);

        const absDx = Math.abs(dx);
        const direction = dx < 0 ? 'left' : 'right';

        if (swipeDirectionRef.current !== direction) {
          swipeDirectionRef.current = direction;
          hasTriggeredRevealRef.current = false;
          hasTriggeredExtremeRef.current = false;
        }

        // Vibration boundary check 1: Crossing Reveal threshold (~64px)
        if (absDx >= REVEAL_THRESHOLD && !hasTriggeredRevealRef.current) {
          hasTriggeredRevealRef.current = true;
          try {
            triggerHaptic('impactLight');
          } catch (e) {
            Vibration.vibrate(20);
          }
        } else if (absDx < REVEAL_THRESHOLD && hasTriggeredRevealRef.current) {
          hasTriggeredRevealRef.current = false;
        }

        // Vibration boundary check 2: Crossing Extreme threshold (~180px)
        if (absDx >= EXTREME_THRESHOLD && !hasTriggeredExtremeRef.current) {
          hasTriggeredExtremeRef.current = true;
          try {
            triggerHaptic('impactMedium');
          } catch (e) {
            Vibration.vibrate(40);
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        setIsSwiping(false);
        const dx = gestureState.dx;
        const absDx = Math.abs(dx);

        if (dx < -EXTREME_THRESHOLD) {
          // Extreme swipe left -> Immediately trigger Delete confirmation
          Animated.spring(translateX, {
            toValue: -80,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }).start();
          onSwipeDelete();
        } else if (dx > EXTREME_THRESHOLD) {
          // Extreme swipe right -> Immediately trigger Archive
          Animated.spring(translateX, {
            toValue: 80,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }).start();
          onSwipeArchive();
        } else if (dx < -REVEAL_THRESHOLD) {
          // Settle open to reveal delete button (-80px)
          Animated.spring(translateX, {
            toValue: -80,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }).start();
        } else if (dx > REVEAL_THRESHOLD) {
          // Settle open to reveal archive button (+80px)
          Animated.spring(translateX, {
            toValue: 80,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }).start();
        } else {
          // Spring back to closed center (0px)
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 12,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        setIsSwiping(false);
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const resetSwipe = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    if (!rowHeight) {
      setRowHeight(e.nativeEvent.layout.height);
    }
  };

  // Interpolate button scaling & opacity for smooth reveal physics
  const leftIconScale = translateX.interpolate({
    inputRange: [0, REVEAL_THRESHOLD, EXTREME_THRESHOLD],
    outputRange: [0.6, 1, 1.25],
    extrapolate: 'clamp',
  });

  const leftIconOpacity = translateX.interpolate({
    inputRange: [0, 20, REVEAL_THRESHOLD],
    outputRange: [0, 0.4, 1],
    extrapolate: 'clamp',
  });

  const rightIconScale = translateX.interpolate({
    inputRange: [-EXTREME_THRESHOLD, -REVEAL_THRESHOLD, 0],
    outputRange: [1.25, 1, 0.6],
    extrapolate: 'clamp',
  });

  const rightIconOpacity = translateX.interpolate({
    inputRange: [-REVEAL_THRESHOLD, -20, 0],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* BACKGROUND ACTIONS LAYER (BEHIND CARD AT Z-INDEX 1) */}
      <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]}>
        {/* Left Side: Single Green Circular Archive Icon (rendered ONLY when swiping RIGHT) */}
        <Animated.View
          style={[
            styles.actionWrapperLeft,
            {
              opacity: leftIconOpacity,
              transform: [{ scale: leftIconScale }],
            },
          ]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.archiveCircleBtn}
            activeOpacity={0.8}
            onPress={() => {
              resetSwipe();
              onSwipeArchive();
            }}
          >
            <Archive size={22} color="#FFFFFF" strokeWidth={2.4} />
          </TouchableOpacity>
        </Animated.View>

        {/* Right Side: Single Red Circular Delete Icon (rendered ONLY when swiping LEFT) */}
        <Animated.View
          style={[
            styles.actionWrapperRight,
            {
              opacity: rightIconOpacity,
              transform: [{ scale: rightIconScale }],
            },
          ]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.deleteCircleBtn}
            activeOpacity={0.8}
            onPress={() => {
              onSwipeDelete();
            }}
          >
            <Trash2 size={22} color="#FFFFFF" strokeWidth={2.4} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* FOREGROUND CARD LAYER (OPAQUE AT Z-INDEX 2 WITH BACKGROUND COLOR) */}
      <Animated.View
        style={[
          styles.foregroundCard,
          { transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 0,
  },
  foregroundCard: {
    zIndex: 2,
    elevation: 2,
  },
  actionWrapperLeft: {
    position: 'absolute',
    left: 14,
    top: 0,
    bottom: 16, // Align vertically centered with card body
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  actionWrapperRight: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 16, // Align vertically centered with card body
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  archiveCircleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#10B981', // Clean Emerald Green
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  deleteCircleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DC2626', // Clean Red
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
});
