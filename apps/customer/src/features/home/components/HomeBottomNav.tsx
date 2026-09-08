import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {
  Home,
  ClipboardList,
  LayoutGrid,
  Heart,
  User,
} from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

export type BottomNavTab = 'HOME' | 'ORDERS' | 'CATEGORIES' | 'SAVED' | 'PROFILE';

interface HomeBottomNavProps {
  activeTab: BottomNavTab;
  onSelectTab: (tab: BottomNavTab) => void;
}

export const HomeBottomNav: React.FC<HomeBottomNavProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const tabs: { id: BottomNavTab; label: string; Icon: React.ComponentType<any> }[] = [
    { id: 'HOME', label: 'Home', Icon: Home },
    { id: 'ORDERS', label: 'Orders', Icon: ClipboardList },
    { id: 'CATEGORIES', label: 'Categories', Icon: LayoutGrid },
    { id: 'SAVED', label: 'Saved', Icon: Heart },
    { id: 'PROFILE', label: 'Profile', Icon: User },
  ];

  return (
    <View style={styles.navContainer}>
      <View style={styles.row}>
        {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.Icon;
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabItem}
                activeOpacity={0.7}
                onPress={() => onSelectTab(tab.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={tab.label}
              >
                <View style={[styles.iconWrapper, isActive && styles.activeIconWrapper]}>
                  <Icon
                    size={22}
                    color={isActive ? '#111111' : '#777777'}
                    strokeWidth={isActive ? 2.4 : 1.8}
                  />
                </View>
                <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navContainer: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E6',
    paddingTop: 8,
    paddingBottom: 4,
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
    paddingVertical: 4,
    minWidth: 54,
  },
  iconWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 2,
  },
  activeIconWrapper: {
    backgroundColor: '#F1F1EF',
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#777777',
  },
  activeTabLabel: {
    color: '#111111',
    fontWeight: '700',
  },
});
