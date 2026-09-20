import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  PanResponder,
  Animated,
  LayoutChangeEvent,
  TouchableOpacity,
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
  const maxSlide = Math.max(0, trackWidth - thumbSize - padding * 2);

  const triggerCompletion = () => {
    if (isCompletedRef.current) return;
    isCompletedRef.current = true;
    const currentMax = maxSlide > 0 ? maxSlide : 260;
    Animated.timing(slideAnim, {
      toValue: currentMax,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      onSlideComplete();
    });
  };

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
        // If swiped at least 35% across or tapped directly
        if (gestureState.dx >= currentMax * 0.35 || (Math.abs(gestureState.dx) < 12 && Math.abs(gestureState.dy) < 12)) {
          triggerCompletion();
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

  const textOpacity = slideAnim.interpolate({
    inputRange: [0, maxSlide > 0 ? maxSlide * 0.6 : 150, maxSlide > 0 ? maxSlide : 260],
    outputRange: [1, 0.2, 0],
    extrapolate: 'clamp',
  });

  const textTranslateX = slideAnim.interpolate({
    inputRange: [0, maxSlide > 0 ? maxSlide : 260],
    outputRange: [0, 20],
    extrapolate: 'clamp',
  });

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={triggerCompletion}
      style={styles.touchableWrapper}
    >
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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchableWrapper: {
    width: '100%',
  },
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  chevron: {
    color: '#ffb300',
    fontSize: 24,
    fontWeight: '900',
    marginLeft: 2,
    marginTop: -2,
  },
});
