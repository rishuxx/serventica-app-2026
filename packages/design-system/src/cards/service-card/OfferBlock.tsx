import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ServiceCardTokens } from './tokens';

interface OfferBlockProps {
  value?: string;
  suffix?: string;
  description?: string;
  terms?: string;
  offerFontSize?: number;
}

export const OfferBlock: React.FC<OfferBlockProps> = React.memo(({
  value = '50%',
  suffix = 'OFF',
  description,
  terms,
  offerFontSize = 21,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.headlineRow}>
        <Text
          style={[
            styles.valueText,
            {
              fontSize: offerFontSize,
              lineHeight: offerFontSize * 1.1,
            },
          ]}
        >
          {value}
        </Text>
        {suffix ? (
          <Text
            style={[
              styles.suffixText,
              {
                fontSize: offerFontSize * 0.52,
                lineHeight: offerFontSize * 1.1,
              },
            ]}
          >
            {' ' + suffix}
          </Text>
        ) : null}
      </View>

      {description ? (
        <Text style={styles.descriptionText} numberOfLines={1}>
          {description}
        </Text>
      ) : null}

      {terms ? (
        <Text style={styles.termsText} numberOfLines={1}>
          {terms}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 2,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  valueText: {
    color: ServiceCardTokens.colors.accentYellowVibrant,
    fontFamily: ServiceCardTokens.typography.fontDisplay,
    fontWeight: '800',
    includeFontPadding: false,
  },
  suffixText: {
    color: ServiceCardTokens.colors.white,
    fontFamily: ServiceCardTokens.typography.fontDisplay,
    fontWeight: '700',
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  descriptionText: {
    color: ServiceCardTokens.colors.white,
    fontFamily: ServiceCardTokens.typography.fontPrimaryMedium,
    fontSize: 10,
    lineHeight: 13,
    opacity: 0.95,
    marginTop: 1,
  },
  termsText: {
    color: ServiceCardTokens.colors.white,
    fontFamily: ServiceCardTokens.typography.fontPrimaryRegular,
    fontSize: 8.5,
    lineHeight: 11,
    opacity: 0.8,
    marginTop: 1,
  },
});
