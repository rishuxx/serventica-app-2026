import React from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import {
  Search,
  Mic,
  X,
  ArrowLeft,
} from 'lucide-react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

interface HomeSearchBarProps {
  query: string;
  onChangeQuery: (text: string) => void;
  onClear?: () => void;
  onPressVoice?: () => void;
  onFocus?: () => void;
  onBack?: () => void;
  isFocused?: boolean;
}

export const HomeSearchBar: React.FC<HomeSearchBarProps> = ({
  query,
  onChangeQuery,
  onClear,
  onPressVoice,
  onFocus,
  onBack,
  isFocused,
}) => {
  return (
    <View style={[styles.container, isFocused && styles.containerFocused]}>
      {isFocused && onBack ? (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Back to home"
        >
          <ArrowLeft size={20} color='#1E242B' strokeWidth={1.8} />
        </TouchableOpacity>
      ) : null}

      <View style={[styles.searchBar, isFocused && styles.searchBarFocused]}>
        <Search size={18} color="#171717" strokeWidth={1.8} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder='Search "Electrician", "AC Repair"...'
          placeholderTextColor="#707070"
          value={query}
          onChangeText={onChangeQuery}
          onFocus={onFocus}
          autoFocus={isFocused}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onClear}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Clear search text"
          >
            <X size={17} color="#666666" strokeWidth={1.8} />
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onPressVoice}
              activeOpacity={0.7}
              accessibilityLabel="Voice search"
            >
              <Mic size={18} color="#171717" strokeWidth={1.8} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  containerFocused: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 6 : 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E6',
  },
  backButton: {
    paddingRight: 12,
    paddingLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F7F7F5',
    borderWidth: 1,
    borderColor: '#E8E8E6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  searchBarFocused: {
    borderColor: '#1E242B',
    backgroundColor: '#FFFFFF',
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontFamily: ServenticaTokens.fonts.Medium,
    color: '#1E242B',
    fontWeight: '400',
    paddingVertical: 0,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: '#E6E6E4',
    marginHorizontal: 10,
  },
  actionButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
