import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Path, Rect, Circle, G, Polygon } from 'react-native-svg';
import { ServenticaTokens } from '../../../../../../packages/design-system/src';

export type PaymentBrandType =
  | 'NAVI'
  | 'GOOGLE_PAY'
  | 'PHONEPE'
  | 'PAYTM'
  | 'YONO_SBI'
  | 'UPI_ADD'
  | 'CARDS_ADD'
  | 'PLUXEE'
  | 'AMAZON_PAY'
  | 'MOBIKWIK'
  | 'WALLET'
  | 'COD';

interface PaymentMethodIconProps {
  brand: PaymentBrandType;
  size?: number;
}

export const PaymentMethodIcon: React.FC<PaymentMethodIconProps> = ({ brand, size = 36 }) => {
  const iconSize = size * 0.65;

  if (brand === 'NAVI') {
    return (
      <View style={[styles.badgeContainer, { width: size, height: size, backgroundColor: '#1A0E38' }]}>
        <Svg width={iconSize * 0.9} height={iconSize * 0.9} viewBox="0 0 24 24">
          <Path d="M4 18V6l7 7V6h2v12l-7-7v7H4z" fill="#00D09C" />
          <Path d="M15 11l4-4v11h-2V9.8l-2 2V11z" fill="#00D09C" />
        </Svg>
      </View>
    );
  }

  if (brand === 'GOOGLE_PAY') {
    return (
      <View style={[styles.badgeContainer, styles.whiteBadge, { width: size, height: size }]}>
        <Svg width={iconSize * 1.05} height={iconSize * 1.05} viewBox="0 0 48 48">
          <Path
            fill="#4285F4"
            d="M43.6 20.5H42V20H24v8h11.3C33.7 32.3 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20c11 0 19.7-8 19.7-20 0-1.2-.1-2.4-.3-3.5z"
          />
          <Path
            fill="#34A853"
            d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"
          />
          <Path
            fill="#FBBC05"
            d="M24 44c5.2 0 10-1.9 13.5-5.2l-6.2-5.1c-2 1.4-4.5 2.3-7.3 2.3-5.2 0-9.6-3.5-11.2-8.3l-6.5 5C9.5 39.4 16.2 44 24 44z"
          />
          <Path
            fill="#EA4335"
            d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.2 5.1C41.2 35.1 44 29.9 44 24c0-1.2-.1-2.4-.4-3.5z"
          />
        </Svg>
      </View>
    );
  }

  if (brand === 'PHONEPE') {
    return (
      <View style={[styles.badgeContainer, { width: size, height: size, backgroundColor: '#5F259F' }]}>
        <Svg width={iconSize * 0.9} height={iconSize * 0.9} viewBox="0 0 24 24">
          <Path
            d="M7 6h8c1.6 0 2.8 1.2 2.8 2.8s-1.2 2.8-2.8 2.8H11v6.4H7V6zm4 3.4v2h3.8c.6 0 1-.4 1-1s-.4-1-1-1H11z"
            fill="#FFFFFF"
          />
        </Svg>
      </View>
    );
  }

  if (brand === 'PAYTM') {
    return (
      <View style={[styles.badgeContainer, { width: size, height: size, backgroundColor: '#002E6E' }]}>
        <Svg width={iconSize * 0.95} height={iconSize * 0.95} viewBox="0 0 32 32">
          <Path d="M5 10h6v3H8.5v9H5V10z" fill="#00BAF2" />
          <Path d="M13 10h3.5l3.5 6 3.5-6H27v12h-3.5v-6.5l-3.5 6.5h-2l-3.5-6.5V22H13V10z" fill="#00BAF2" />
        </Svg>
      </View>
    );
  }

  if (brand === 'YONO_SBI') {
    return (
      <View style={[styles.badgeContainer, { width: size, height: size, backgroundColor: '#520B50' }]}>
        <Text style={styles.yonoText}>yono</Text>
        <View style={styles.sbiBadge}>
          <Text style={styles.sbiText}>SBI</Text>
        </View>
      </View>
    );
  }

  if (brand === 'UPI_ADD') {
    return (
      <View style={[styles.badgeContainer, styles.whiteBadge, { width: size, height: size }]}>
        <Svg width={iconSize * 1.2} height={iconSize * 0.75} viewBox="0 0 36 20">
          <Polygon points="3,2 11,10 3,18" fill="#097939" />
          <Polygon points="9,2 17,10 9,18" fill="#E86C1D" />
          <Path d="M19 5h3v7a3 3 0 0 1-3 3h-1v-2h1a1 1 0 0 0 1-1V5h-1V5z" fill="#2E3192" />
          <Path d="M24 5h4v4h-2v4h-2V5z" fill="#2E3192" />
          <Path d="M30 5h2v8h-2V5z" fill="#2E3192" />
        </Svg>
      </View>
    );
  }

  if (brand === 'CARDS_ADD') {
    return (
      <View style={[styles.badgeContainer, styles.whiteBadge, { width: size, height: size }]}>
        <Svg width={iconSize * 1.05} height={iconSize * 0.75} viewBox="0 0 24 18">
          <Rect x="1" y="1" width="22" height="16" rx="3" fill="none" stroke="#2D3748" strokeWidth="1.6" />
          <Rect x="1" y="5" width="22" height="3" fill="#2D3748" />
          <Rect x="3.5" y="11" width="4.5" height="2.5" rx="0.5" fill="#2D3748" />
        </Svg>
      </View>
    );
  }

  if (brand === 'PLUXEE') {
    return (
      <View style={[styles.badgeContainer, styles.whiteBadge, { width: size, height: size }]}>
        <Text style={styles.pluxeeText}>pluxee</Text>
      </View>
    );
  }

  if (brand === 'AMAZON_PAY') {
    return (
      <View style={[styles.badgeContainer, styles.whiteBadge, { width: size, height: size }]}>
        <View style={styles.amazonDarkCircle}>
          <Text style={styles.amazonPayText}>pay</Text>
        </View>
      </View>
    );
  }

  if (brand === 'MOBIKWIK') {
    return (
      <View style={[styles.badgeContainer, styles.whiteBadge, { width: size, height: size }]}>
        <View style={styles.mobikwikCircle}>
          <Text style={styles.mobikwikText}>M</Text>
        </View>
      </View>
    );
  }

  if (brand === 'WALLET') {
    return (
      <View style={[styles.badgeContainer, { width: size, height: size, backgroundColor: '#EA580C' }]}>
        <Svg width={iconSize * 0.85} height={iconSize * 0.85} viewBox="0 0 24 24">
          <Rect x="2" y="5" width="20" height="14" rx="3" fill="#FB923C" />
          <Path d="M2 9h20" stroke="#FED7AA" strokeWidth="1.5" />
          <Circle cx="17" cy="13" r="1.8" fill="#FFFFFF" />
        </Svg>
      </View>
    );
  }

  // COD (Cash on Delivery)
  return (
    <View style={[styles.badgeContainer, { width: size, height: size, backgroundColor: '#059669' }]}>
      <Svg width={iconSize * 0.9} height={iconSize * 0.9} viewBox="0 0 24 24">
        <Rect x="2" y="6" width="20" height="12" rx="2.5" fill="#10B981" />
        <Circle cx="12" cy="12" r="3" fill="#FFFFFF" />
        <Path d="M5 9h2M17 15h2" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  whiteBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8ECF2',
  },
  yonoText: {
    fontSize: 7.5,
    fontFamily: ServenticaTokens.fonts.PoppinsBold,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 8,
  },
  sbiBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 2,
    borderRadius: 2,
    marginTop: 1,
  },
  sbiText: {
    fontSize: 5.5,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '800',
    color: '#00A4E4',
    lineHeight: 6,
  },
  pluxeeText: {
    fontSize: 8.5,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '800',
    color: '#0D1730',
    letterSpacing: -0.4,
  },
  amazonDarkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#131921',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amazonPayText: {
    fontSize: 7.5,
    fontFamily: ServenticaTokens.fonts.SFProBold,
    fontWeight: '800',
    color: '#FF9900',
    letterSpacing: -0.2,
  },
  mobikwikCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0070CD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobikwikText: {
    fontSize: 11,
    fontFamily: ServenticaTokens.fonts.PoppinsBold,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});

