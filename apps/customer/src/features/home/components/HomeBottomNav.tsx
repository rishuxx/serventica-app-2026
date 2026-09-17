import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
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
    activeStroke: '#1E242B',
    activeFill: '#FAC420', // Serventica warm gold
  },
  ORDERS: {
    id: 'ORDERS',
    label: 'Orders',
    activeStroke: '#1E242B',
    activeFill: '#FAC420',
  },
  CATEGORIES: {
    id: 'CATEGORIES',
    label: 'Categories',
    activeStroke: '#1E242B',
    activeFill: '#FAC420',
  },
  SAVED: {
    id: 'SAVED',
    label: 'Saved',
    activeStroke: '#1E242B',
    activeFill: '#FAC420',
  },
  PROFILE: {
    id: 'PROFILE',
    label: 'Profile',
    activeStroke: '#1E242B',
    activeFill: '#FAC420',
  },
};

// Crisp, refined SVG Icons with light glass aesthetics
const TabSvgIcon: React.FC<{ tab: BottomNavTab; isActive: boolean; theme: TabThemeConfig }> = ({
  tab,
  isActive,
  theme,
}) => {
  const stroke = isActive ? '#1E242B' : '#64748B';
  const strokeWidth = isActive ? 2.2 : 1.8;
  const fill = isActive ? '#FAC420' : 'none';

  switch (tab) {
    case 'HOME':
      return (
        <Svg width={21} height={21} viewBox="0 0 24 24">
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
            fill={isActive ? '#1E242B' : 'none'}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'ORDERS':
      return (
        <Svg width={21} height={21} viewBox="0 0 24 24">
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
        <Svg width={21} height={21} viewBox="0 0 24 24">
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
        <Svg width={21} height={21} viewBox="0 0 24 24">
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
        <Svg width={21} height={21} viewBox="0 0 24 24">
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

const FluidNavTabButton: React.FC<{
  tabConfig: TabThemeConfig;
  isActive: boolean;
  onPress: () => void;
}> = ({ tabConfig, isActive, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      friction: 6,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 250,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      style={styles.tabItem}
      activeOpacity={0.88}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={tabConfig.label}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <TabSvgIcon tab={tabConfig.id} isActive={isActive} theme={tabConfig} />
      </Animated.View>

      <Text
        style={[
          styles.tabLabel,
          isActive ? styles.tabLabelActive : styles.tabLabelInactive,
        ]}
      >
        {tabConfig.label}
      </Text>
    </TouchableOpacity>
  );
};

export const HomeBottomNav: React.FC<HomeBottomNavProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const tabs: TabThemeConfig[] = [
    TAB_CONFIGS.HOME,
    TAB_CONFIGS.ORDERS,
    TAB_CONFIGS.CATEGORIES,
    TAB_CONFIGS.SAVED,
    TAB_CONFIGS.PROFILE,
  ];

  return (
    <View style={styles.navContainer}>
      <View style={styles.row}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <FluidNavTabButton
              key={tab.id}
              tabConfig={tab}
              isActive={isActive}
              onPress={() => onSelectTab(tab.id)}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 18 : 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minWidth: 58,
  },
  iconContainer: {
    width: 46,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0,
  },
  tabLabelInactive: {
    color: '#64748B',
    fontFamily: ServenticaTokens.fonts.Medium,
  },
  tabLabelActive: {
    color: '#1E242B',
    fontFamily: ServenticaTokens.fonts.Bold,
  },
});
