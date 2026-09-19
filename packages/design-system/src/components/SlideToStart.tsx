import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  PanResponder,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { ServenticaTokens } from '../tokens';

interface SlideToStartProps {
  onSlideComplete: () => void;
  title?: string;
}

export const SlideToStart: React.FC<SlideToStartProps> = ({
  onSlideComplete,
  title = 'Slide to Start',
}) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isCompletedRef = useRef(false);

  const thumbSize = 56;
  const padding = 5;
  // Exact slide distance so the thumb reaches the right boundary:
  const maxSlide = Math.max(0, trackWidth - thumbSize - padding * 2);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (isCompletedRef.current) return;
      },
      onPanResponderMove: (_, gestureState) => {
        if (isCompletedRef.current) return;
        const currentMax = maxSlide > 0 ? maxSlide : 260;
        const newX = Math.max(0, Math.min(gestureState.dx, currentMax));
        slideAnim.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isCompletedRef.current) return;
        const currentMax = maxSlide > 0 ? maxSlide : 260;
        // Threshold: 30% of total travel distance or simple tap with dx < 10
        if (gestureState.dx >= currentMax * 0.3 || (Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10)) {
          isCompletedRef.current = true;
          Animated.timing(slideAnim, {
            toValue: currentMax,
            duration: 120,
            useNativeDriver: true,
          }).start(() => {
            onSlideComplete();
          });
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 7,
            tension: 45,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const onLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0) {
      setTrackWidth(width);
    }
  };

  // As the thumb moves across, text opacity gradually fades to 0
  const textOpacity = slideAnim.interpolate({
    inputRange: [0, maxSlide > 0 ? maxSlide * 0.6 : 150, maxSlide > 0 ? maxSlide : 260],
    outputRange: [1, 0.2, 0],
    extrapolate: 'clamp',
  });

  // Subtle shift of text as slider travels
  const textTranslateX = slideAnim.interpolate({
    inputRange: [0, maxSlide > 0 ? maxSlide : 260],
    outputRange: [0, 20],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={styles.track}
      onLayout={onLayout}
      {...panResponder.panHandlers}
    >
      <Animated.Text
        style={[
          styles.title,
          {
            opacity: textOpacity,
            transform: [{ translateX: textTranslateX }],
          },
        ]}
      >
        {title}
      </Animated.Text>
      <Animated.View
        style={[
          styles.thumb,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <Animated.Text style={styles.chevron}>»</Animated.Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 66,
    borderRadius: 33,
    backgroundColor: '#ffb300',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    padding: 5,
    overflow: 'hidden',
  },
  title: {
    color: '#ffffff',
    fontSize: 17,
    fontFamily: ServenticaTokens.fonts.Bold,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  thumb: {
    position: 'absolute',
    left: 5,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1E242B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  chevron: {
    color: '#ff9800',
    fontSize: 24,
    fontWeight: '900',
    marginLeft: 2,
    marginTop: -2,
  },
});
