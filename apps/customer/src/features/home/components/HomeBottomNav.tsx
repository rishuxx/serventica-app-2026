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
  activeFill: string;
  activePillBg: string;
  activeBorder: string;
  activeStroke: string;
  labelColor: string;
}

const TAB_CONFIGS: Record<BottomNavTab, TabThemeConfig> = {
  HOME: {
    id: 'HOME',
    label: 'Home',
    activeFill: '#FACC15', // Vibrant Gold
    activePillBg: 'rgba(250, 204, 21, 0.22)',
    activeBorder: 'rgba(250, 204, 21, 0.40)',
    activeStroke: '#111111',
    labelColor: '#111111',
  },
  ORDERS: {
    id: 'ORDERS',
    label: 'Orders',
    activeFill: '#38BDF8', // Cyan / Notes Blue
    activePillBg: 'rgba(56, 189, 248, 0.20)',
    activeBorder: 'rgba(56, 189, 248, 0.45)',
    activeStroke: '#0C4A6E',
    labelColor: '#111111',
  },
  CATEGORIES: {
    id: 'CATEGORIES',
    label: 'Categories',
    activeFill: '#A855F7', // Deep Purple / Catalog
    activePillBg: 'rgba(168, 85, 247, 0.20)',
    activeBorder: 'rgba(168, 85, 247, 0.45)',
    activeStroke: '#3B0764',
    labelColor: '#111111',
  },
  SAVED: {
    id: 'SAVED',
    label: 'Saved',
    activeFill: '#F43F5E', // Reddish Pink / Rose Heart
    activePillBg: 'rgba(244, 63, 94, 0.20)',
    activeBorder: 'rgba(244, 63, 94, 0.45)',
    activeStroke: '#881337',
    labelColor: '#111111',
  },
  PROFILE: {
    id: 'PROFILE',
    label: 'Profile',
    activeFill: '#10B981', // Emerald Teal / User
    activePillBg: 'rgba(16, 185, 129, 0.20)',
    activeBorder: 'rgba(16, 185, 129, 0.45)',
    activeStroke: '#064E3B',
    labelColor: '#111111',
  },
};

// Crisp SVG Icons with thematic active fills and high-contrast dark inactive strokes
const TabSvgIcon: React.FC<{ tab: BottomNavTab; isActive: boolean; theme: TabThemeConfig }> = ({
  tab,
  isActive,
  theme,
}) => {
  const stroke = isActive ? theme.activeStroke : '#475569';
  const strokeWidth = isActive ? 2.2 : 1.9;
  const fill = isActive ? theme.activeFill : 'none';

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
            fill={isActive ? '#FFFFFF' : 'none'}
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
            rx="3"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Path
            d="M9 2.5h6a1 1 0 0 1 1 1v1H8v-1a1 1 0 0 1 1-1z"
            fill={isActive ? '#FFFFFF' : 'none'}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Path
            d="M8.5 10.5h7M8.5 14.5h4.5"
            fill="none"
            stroke={isActive ? '#FFFFFF' : stroke}
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
            rx="2"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Rect
            x="13.5"
            y="3"
            width="7.5"
            height="7.5"
            rx="2"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Rect
            x="3"
            y="13.5"
            width="7.5"
            height="7.5"
            rx="2"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <Rect
            x="13.5"
            y="13.5"
            width="7.5"
            height="7.5"
            rx="2"
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
            fill="none"
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

// Fluid animated Tab Button with spring physics, scale pop, and dedicated color pill
const FluidNavTabButton: React.FC<{
  tabConfig: TabThemeConfig;
  isActive: boolean;
  onPress: () => void;
}> = ({ tabConfig, isActive, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 0.94)).current;
  const pillOpacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const iconTranslateY = useRef(new Animated.Value(isActive ? -2 : 0)).current;

  useEffect(() => {
    if (isActive) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.08,
          friction: 4,
          tension: 180,
          useNativeDriver: true,
        }),
        Animated.timing(pillOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(iconTranslateY, {
          toValue: -2,
          friction: 5,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 150,
          useNativeDriver: true,
        }).start();
      });
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(pillOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(iconTranslateY, {
          toValue: 0,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isActive]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.88,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: isActive ? 1 : 0.96,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      style={styles.tabItem}
      activeOpacity={0.85}
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
            transform: [
              { scale: scaleAnim },
              { translateY: iconTranslateY },
            ],
          },
        ]}
      >
        {/* Animated fluid color pill background */}
        <Animated.View
          style={[
            styles.activePillBackground,
            {
              backgroundColor: tabConfig.activePillBg,
              borderColor: tabConfig.activeBorder,
              opacity: pillOpacity,
            },
          ]}
        />
        <TabSvgIcon tab={tabConfig.id} isActive={isActive} theme={tabConfig} />
      </Animated.View>

      <Text
        style={[
          styles.tabLabel,
          isActive && {
            color: '#111111',
            fontFamily: ServenticaTokens.fonts.Bold,
            fontWeight: '700',
          },
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
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 18 : 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
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
    width: 48,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
    position: 'relative',
  },
  activePillBackground: {
    ...StyleSheet.absoluteFill,
    borderRadius: 15,
    borderWidth: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#64748B',
    letterSpacing: 0,
  },
});
