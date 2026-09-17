import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle, G, Text as SvgText } from 'react-native-svg';

export type PaymentBrandType = 'UPI' | 'GOOGLE_PAY' | 'PHONEPE' | 'PAYTM' | 'CARDS' | 'WALLET' | 'COD';

interface PaymentMethodIconProps {
  brand: PaymentBrandType;
  size?: number;
}

export const PaymentMethodIcon: React.FC<PaymentMethodIconProps> = ({ brand, size = 26 }) => {
  if (brand === 'GOOGLE_PAY' || brand === 'UPI') {
    return (
      <View style={[styles.iconBox, { width: size, height: size }]}>
        <Svg width={size * 0.85} height={size * 0.85} viewBox="0 0 48 48">
          {/* Google G multi-color logo */}
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
      <View style={[styles.iconBox, styles.phonePeBg, { width: size, height: size, borderRadius: size / 4 }]}>
        <Svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="11" fill="#5F259F" />
          {/* Stylized 'पे' symbol */}
          <Path
            d="M8 7h7c1.5 0 2.5 1 2.5 2.5s-1 2.5-2.5 2.5H11v5H8V7zm3 3v2h4c.6 0 1-.4 1-1s-.4-1-1-1h-4z"
            fill="#FFFFFF"
          />
        </Svg>
      </View>
    );
  }

  if (brand === 'PAYTM') {
    return (
      <View style={[styles.iconBox, styles.paytmBg, { width: size, height: size, borderRadius: size / 4 }]}>
        <Svg width={size * 0.8} height={size * 0.8} viewBox="0 0 32 32">
          <Rect width="32" height="32" rx="6" fill="#002E6E" />
          <Path d="M6 11h6v3H9.5v7H6V11z" fill="#00BAF2" />
          <Path d="M14 11h3.5l3.5 6 3.5-6H28v10h-3.5v-6l-3.5 6h-2l-3.5-6v6H14V11z" fill="#00BAF2" />
        </Svg>
      </View>
    );
  }

  if (brand === 'CARDS') {
    return (
      <View style={[styles.iconBox, styles.cardBg, { width: size, height: size, borderRadius: size / 4 }]}>
        <Svg width={size * 0.9} height={size * 0.65} viewBox="0 0 36 24">
          <Rect width="36" height="24" rx="4" fill="#1E242B" />
          {/* Mastercard overlapping circles */}
          <Circle cx="14" cy="12" r="6.5" fill="#EB001B" />
          <Circle cx="22" cy="12" r="6.5" fill="#F79E1B" fillOpacity="0.9" />
        </Svg>
      </View>
    );
  }

  if (brand === 'WALLET') {
    return (
      <View style={[styles.iconBox, styles.walletBg, { width: size, height: size, borderRadius: size / 4 }]}>
        <Svg width={size * 0.75} height={size * 0.75} viewBox="0 0 24 24">
          <Rect x="2" y="5" width="20" height="14" rx="3" fill="#D97706" />
          <Path d="M2 9h20" stroke="#FDE68A" strokeWidth="1.5" />
          <Circle cx="17" cy="13" r="1.8" fill="#FDE68A" />
        </Svg>
      </View>
    );
  }

  // COD (Cash on Delivery / Pay After Service)
  return (
    <View style={[styles.iconBox, styles.codBg, { width: size, height: size, borderRadius: size / 4 }]}>
      <Svg width={size * 0.8} height={size * 0.8} viewBox="0 0 24 24">
        <Rect x="2" y="6" width="20" height="12" rx="2.5" fill="#059669" />
        <Circle cx="12" cy="12" r="3" fill="#A7F3D0" />
        <Path d="M4 9h2M18 15h2" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  iconBox: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  phonePeBg: {
    backgroundColor: '#5F259F',
  },
  paytmBg: {
    backgroundColor: '#002E6E',
  },
  cardBg: {
    backgroundColor: '#1E242B',
  },
  walletBg: {
    backgroundColor: '#FEF3C7',
  },
  codBg: {
    backgroundColor: '#ECFDF5',
  },
});
