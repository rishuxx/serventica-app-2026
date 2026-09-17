import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { RibbonType, RibbonColorVariant } from './types';
import { ribbonConfig, ribbonColorGradients } from './ribbon.config';
import { ServiceCardTokens } from './tokens';

interface RibbonProps {
  type?: RibbonType;
  colorVariant?: RibbonColorVariant;
  label?: string;
  scale?: number;
}

export const Ribbon: React.FC<RibbonProps> = React.memo(({
  type,
  colorVariant,
  label,
  scale = 1.0,
}) => {
  const resolvedVariant: RibbonColorVariant =
    colorVariant ||
    (type && ribbonConfig[type]?.colorVariant) ||
    'green';

  const styleConfig = ribbonColorGradients[resolvedVariant];
  const displayLabel =
    label ||
    (type && ribbonConfig[type]?.label) ||
    styleConfig.defaultLabel ||
    'Serventica';

  // Sizing optimized for genuine ribbon purpose (compact, non-intrusive to card imagery):
  // Height: ~17px base, Notch: 4.5px. Flush straight left edge (0 radius)
  const baseHeight = 17 * scale;
  const notchDepth = 4.5 * scale;

  // Exact adaptive width based on display label character count:
  // SF Pro Bold / SemiBold at fontSize (8.5 * scale) with letterSpacing -0.3 averages ~4.8px per char
  const charWidth = 4.8 * scale;
  const approxTextWidth = displayLabel.length * charWidth;
  const leftPadding = 6 * scale;
  const rightPadding = 4 * scale;
  const ribbonWidth = leftPadding + approxTextWidth + rightPadding + notchDepth;

  const H = baseHeight;
  const W = ribbonWidth;
  const n = notchDepth;

  const gradId = `ribbonGrad_${resolvedVariant}_${Math.round(scale * 100)}`;

  // Path with straight/flush left edge (no rounded corner on head) and flag tail on right:
  const pathData = `
    M 0,0
    L ${W},0
    L ${W - n},${H / 2}
    L ${W},${H}
    L 0,${H}
    Z
  `;

  return (
    <View style={[styles.container, { height: H, width: W }]}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={styleConfig.gradientStart} stopOpacity={styleConfig.fillAlpha || 0.9} />
            <Stop offset="80%" stopColor={styleConfig.gradientEnd} stopOpacity={styleConfig.fillAlpha || 0.9} />
          </LinearGradient>
        </Defs>
        <Path d={pathData} fill={`url(#${gradId})`} />
      </Svg>

      <View style={[styles.textWrapper, { paddingLeft: leftPadding, paddingRight: rightPadding + notchDepth }]}>
        <Text
          style={[
            styles.labelText,
            {
              fontSize: 8.5 * scale,
              lineHeight: H,
              color: styleConfig.textColor,
            },
          ]}
          numberOfLines={1}
        >
          {displayLabel}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  textWrapper: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelText: {
    fontFamily: ServiceCardTokens.typography.fontPrimarySemiBold, // Poppins-SemiBold
    letterSpacing: -0.4, // -4 user requested tracking (in RN -0.4pt)
    textAlign: 'center',
    includeFontPadding: false,
  },
});
