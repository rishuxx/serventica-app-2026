import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ServiceCardTokens } from './tokens';

interface BrandBlockProps {
  brand?: string;
  highlight?: string;
  brandFontSize?: number;
  highlightFontSize?: number;
}

export const BrandBlock: React.FC<BrandBlockProps> = React.memo(({
  brand = 'Serventica.',
  highlight = 'Originals',
  brandFontSize = 11,
  highlightFontSize = 20,
}) => {
  return (
    <View style={styles.container}>
      {brand ? (
        <Text
          style={[
            styles.brandText,
            {
              fontSize: brandFontSize,
            },
          ]}
          numberOfLines={1}
        >
          {brand}
        </Text>
      ) : null}
      {highlight ? (
        <Text
          style={[
            styles.highlightText,
            {
              fontSize: highlightFontSize,
              lineHeight: highlightFontSize * 1.05,
            },
          ]}
          numberOfLines={1}
        >
          {highlight}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  brandText: {
    color: ServiceCardTokens.colors.white,
    fontFamily: ServiceCardTokens.typography.fontDisplay,
    letterSpacing: -0.5,
    opacity: 0.95,
  },
  highlightText: {
    color: ServiceCardTokens.colors.accentYellowVibrant,
    fontFamily: ServiceCardTokens.typography.fontDisplay,
    letterSpacing: -1,
    includeFontPadding: false,
  },
});
