import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

interface BreakerTextProps {
  text: string;
}

export const BreakerText: React.FC<BreakerTextProps> = ({ text }) => {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text style={styles.text}>{text}</Text>
      <View style={styles.line} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    paddingHorizontal: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E7E7E5',
  },
  text: {
    marginHorizontal: 14,
    fontSize: 12.5,
    fontFamily: ServenticaTokens.fonts.PoppinsSemiBold,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
