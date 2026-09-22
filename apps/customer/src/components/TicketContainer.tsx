import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';

const NOTCH_R = 11; // radius of the side cutouts
const CUT_STRIP = 22; // height of the perforation strip
const CORNER_R = 20; // corner radius of the ticket card

export interface TicketContainerProps {
  top: React.ReactNode; // content above the cut
  bottom: React.ReactNode; // content below the cut
  backgroundColor?: string;
  lineColor?: string;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  activeOpacity?: number;
  accessibilityLabel?: string;
}

export const TicketContainer: React.FC<TicketContainerProps> = ({
  top,
  bottom,
  backgroundColor = '#FFFFFF',
  lineColor = '#D8DCE2',
  borderColor = '#ECEEF2',
  style,
  onPress,
  activeOpacity = 0.88,
  accessibilityLabel,
}) => {
  const [w, setW] = useState(0);
  const [topH, setTopH] = useState(0);
  const [cardH, setCardH] = useState(0);

  const cutY = topH + CUT_STRIP / 2;
  const r = NOTCH_R;
  const cr = CORNER_R;

  // Exact rounded rectangle path with side semicircle cutouts
  const d =
    `M ${cr} 0 ` +
    `H ${w - cr} ` +
    `Q ${w} 0 ${w} ${cr} ` +
    `V ${cutY - r} ` +
    `A ${r} ${r} 0 0 0 ${w} ${cutY + r} ` + // right-edge cutout
    `V ${cardH - cr} ` +
    `Q ${w} ${cardH} ${w - cr} ${cardH} ` +
    `H ${cr} ` +
    `Q 0 ${cardH} 0 ${cardH - cr} ` +
    `V ${cutY + r} ` +
    `A ${r} ${r} 0 0 0 0 ${cutY - r} ` + // left-edge cutout
    `V ${cr} ` +
    `Q 0 0 ${cr} 0 Z`;

  const ready = w > 0 && cardH > 0 && topH > 0;

  const content = (
    <View
      style={[styles.innerContainer, style]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setW(width);
        setCardH(height);
      }}
    >
      {ready && (
        <Svg
          style={StyleSheet.absoluteFill}
          width={w}
          height={cardH}
          pointerEvents="none"
        >
          <Path
            d={d}
            fill={backgroundColor}
            stroke={borderColor}
            strokeWidth={1}
          />
        </Svg>
      )}

      {/* Top Section */}
      <View
        style={styles.topSection}
        onLayout={(e) => setTopH(e.nativeEvent.layout.height)}
      >
        {top}
      </View>

      {/* Perforation Cut Strip */}
      <View style={styles.cutStrip}>
        {ready ? (
          <Svg height={2} width={w - (NOTCH_R * 2 + 16)}>
            <Line
              x1="0"
              y1="1"
              x2={w - (NOTCH_R * 2 + 16)}
              y2="1"
              stroke={lineColor}
              strokeWidth="1.5"
              strokeDasharray="4, 5"
            />
          </Svg>
        ) : (
          <View style={[styles.fallbackLine, { borderColor: lineColor }]} />
        )}
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>{bottom}</View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={activeOpacity}
        onPress={onPress}
        style={styles.cardWrapper}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.cardWrapper}>{content}</View>;
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 16,
    borderRadius: CORNER_R,
  },
  innerContainer: {
    position: 'relative',
    borderRadius: CORNER_R,
    overflow: 'hidden',
  },
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 2,
  },
  cutStrip: {
    height: CUT_STRIP,
    paddingHorizontal: NOTCH_R + 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallbackLine: {
    width: '100%',
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  bottomSection: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 16,
  },
});
