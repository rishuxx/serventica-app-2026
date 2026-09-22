import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  Animated,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

export type BottomNavTab = 'HOME' | 'ORDERS' | 'CATEGORIES' | 'SAVED' | 'PROFILE';

export interface HomeBottomNavProps {
  activeTab: BottomNavTab;
  onSelectTab: (tab: BottomNavTab) => void;
}

interface TabThemeConfig {
  id: BottomNavTab;
  label: string;
  activeStroke: string;
  activeFill: string;
}

const TAB_CONFIGS: Record<BottomNavTab, TabThemeConfig> = {
  HOME: {
    id: 'HOME',
    label: 'Home',
    activeStroke: '#7C3AED',
    activeFill: '#EDE9FE', // Soft purple tint
  },
  ORDERS: {
    id: 'ORDERS',
    label: 'Orders',
    activeStroke: '#7C3AED',
    activeFill: '#EDE9FE',
  },
  CATEGORIES: {
    id: 'CATEGORIES',
    label: 'Categories',
    activeStroke: '#7C3AED',
    activeFill: '#EDE9FE',
  },
  SAVED: {
    id: 'SAVED',
    label: 'Saved',
    activeStroke: '#7C3AED',
    activeFill: '#EDE9FE',
  },
  PROFILE: {
    id: 'PROFILE',
    label: 'Profile',
    activeStroke: '#7C3AED',
    activeFill: '#EDE9FE',
  },
};

const TABS: TabThemeConfig[] = [
  TAB_CONFIGS.HOME,
  TAB_CONFIGS.ORDERS,
  TAB_CONFIGS.CATEGORIES,
  TAB_CONFIGS.SAVED,
  TAB_CONFIGS.PROFILE,
];

// Crisp, refined SVG Icons
const TabSvgIcon: React.FC<{ tab: BottomNavTab; isActive: boolean }> = ({
  tab,
  isActive,
}) => {
  const stroke = isActive ? '#7C3AED' : '#64748B';
  const strokeWidth = isActive ? 2.2 : 1.8;
  const fill = isActive ? '#EDE9FE' : 'none';

  switch (tab) {
    case 'HOME':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Path
            d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20V10.5z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M9 21.5V12h6v9.5"
            fill={isActive ? '#7C3AED' : 'none'}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'ORDERS':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Rect
            x="4"
            y="4.5"
            width="16"
            height="16"
            rx="3.5"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Path
            d="M9 2.5h6a1 1 0 0 1 1 1v1H8v-1a1 1 0 0 1 1-1z"
            fill={isActive ? '#1E242B' : 'none'}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Path
            d="M8.5 10.5h7M8.5 14.5h4.5"
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'CATEGORIES':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Rect
            x="3"
            y="3"
            width="7.5"
            height="7.5"
            rx="2.2"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Rect
            x="13.5"
            y="3"
            width="7.5"
            height="7.5"
            rx="2.2"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Rect
            x="3"
            y="13.5"
            width="7.5"
            height="7.5"
            rx="2.2"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Rect
            x="13.5"
            y="13.5"
            width="7.5"
            height="7.5"
            rx="2.2"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </Svg>
      );

    case 'SAVED':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Path
            d="M19.5 13.572L12 21l-7.5-7.428A5 5 0 1 1 12 6.706a5 5 0 1 1 7.5 6.866z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'PROFILE':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Path
            d="M20 21v-1.5A4.5 4.5 0 0 0 15.5 15h-7A4.5 4.5 0 0 0 4 19.5V21"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
  }
};

export const HomeBottomNav: React.FC<HomeBottomNavProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const insets = useSafeAreaInsets();
  const [rowWidth, setRowWidth] = useState<number>(0);
  const activeIndex = TABS.findIndex((t) => t.id === activeTab);

  // Exact oval pill dimensions
  const PILL_WIDTH = 68;
  const tabWidth = rowWidth > 0 ? rowWidth / TABS.length : 0;

  // Spring physical driver for exact center alignment
  const indicatorCenterX = useRef(new Animated.Value(0)).current;
  const isDragging = useRef(false);

  // Smoothly center the oval pill over the active tab slot
  useEffect(() => {
    if (tabWidth > 0 && !isDragging.current) {
      // Calculate exact center of slot: (index + 0.5) * tabWidth - (PILL_WIDTH / 2)
      const targetLeft = activeIndex * tabWidth + (tabWidth - PILL_WIDTH) / 2;

      Animated.spring(indicatorCenterX, {
        toValue: targetLeft,
        damping: 18,
        stiffness: 260,
        mass: 0.6,
        useNativeDriver: false,
      }).start();
    }
  }, [activeIndex, tabWidth]);

  // iOS-style Hold & Drag to Select PanResponder
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 4,
        onPanResponderGrant: (evt) => {
          isDragging.current = true;
          handleTouch(evt.nativeEvent.locationX);
        },
        onPanResponderMove: (evt) => {
          handleTouch(evt.nativeEvent.locationX);
        },
        onPanResponderRelease: () => {
          isDragging.current = false;
          if (tabWidth > 0) {
            const targetLeft = activeIndex * tabWidth + (tabWidth - PILL_WIDTH) / 2;
            Animated.spring(indicatorCenterX, {
              toValue: targetLeft,
              damping: 18,
              stiffness: 260,
              mass: 0.6,
              useNativeDriver: false,
            }).start();
          }
        },
      }),
    [tabWidth, activeIndex]
  );

  const handleTouch = (localX: number) => {
    if (tabWidth <= 0) return;
    const clampedX = Math.max(0, Math.min(localX, rowWidth));
    const targetIndex = Math.min(Math.floor(clampedX / tabWidth), TABS.length - 1);

    if (targetIndex >= 0 && targetIndex !== activeIndex) {
      onSelectTab(TABS[targetIndex].id);
    }
  };

  return (
    <View
      style={[
        styles.floatingWrapper,
        { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 14 : 10) },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.navCapsule}>
        <View
          style={styles.rowContainer}
          onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
          {...panResponder.panHandlers}
        >
          {/* Perfectly Centered Rounded Oval Pill Indicator */}
          {tabWidth > 0 && (
            <Animated.View
              style={[
                styles.ovalPill,
                {
                  left: indicatorCenterX,
                  width: PILL_WIDTH,
                },
              ]}
            />
          )}

          {/* Interactive Navigation Tabs */}
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabItem}
                activeOpacity={0.88}
                onPress={() => onSelectTab(tab.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={tab.label}
              >
                <View style={styles.iconContainer}>
                  <TabSvgIcon tab={tab.id} isActive={isActive} />
                </View>

                <Text
                  style={[
                    styles.tabLabel,
                    isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 14,
    zIndex: 998,
  },
  navCapsule: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF', // Full solid clean white panel
    borderRadius: 38,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 5,
    paddingHorizontal: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 9,
    overflow: 'hidden',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    width: '100%',
  },
  ovalPill: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    backgroundColor: '#F3E8FF', // Soft lavender purple pill
    borderRadius: 24, // Symmetrical oval pill
    zIndex: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    zIndex: 2,
  },
  iconContainer: {
    width: 32,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
  tabLabelInactive: {
    color: '#64748B',
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  tabLabelActive: {
    color: '#7C3AED', // Royal purple active tab label
    fontFamily: ServenticaTokens.fonts.Bold,
  },
});
