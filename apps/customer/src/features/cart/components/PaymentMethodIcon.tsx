import React, { useState } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import Svg, { Path, Rect, Circle, Polygon } from 'react-native-svg';
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

const BRAND_IMAGE_URIS: Record<PaymentBrandType, string> = {
  NAVI: 'https://cdn.iconscout.com/icon/free/png-512/free-navi-logo-icon-download-in-svg-png-gif-file-formats--brand-social-media-pack-logos-icons-3215462.png',
  GOOGLE_PAY: 'https://cdn.iconscout.com/icon/free/png-512/free-google-pay-logo-icon-download-in-svg-png-gif-file-formats--brand-social-media-card-pack-logos-icons-3215446.png',
  PHONEPE: 'https://cdn.iconscout.com/icon/free/png-512/free-phonepe-logo-icon-download-in-svg-png-gif-file-formats--brand-social-media-pack-logos-icons-3215468.png',
  PAYTM: 'https://cdn.iconscout.com/icon/free/png-512/free-paytm-logo-icon-download-in-svg-png-gif-file-formats--brand-social-media-pack-logos-icons-3215466.png',
  YONO_SBI: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/SBI-Logo.svg/512px-SBI-Logo.svg.png',
  UPI_ADD: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/UPI-Logo-vector.svg/512px-UPI-Logo-vector.svg.png',
  CARDS_ADD: 'https://cdn-icons-png.flaticon.com/512/9334/9334629.png',
  PLUXEE: 'https://cdn.brandfetch.io/id_XvG3XzN/theme/dark/logo.png',
  AMAZON_PAY: 'https://cdn-icons-png.flaticon.com/512/5968/5968269.png',
  MOBIKWIK: 'https://cdn.iconscout.com/icon/free/png-512/free-mobikwik-logo-icon-download-in-svg-png-gif-file-formats--brand-social-media-pack-logos-icons-3215460.png',
  WALLET: 'https://cdn-icons-png.flaticon.com/512/60/60484.png',
  COD: 'https://cdn-icons-png.flaticon.com/512/2489/2489756.png',
};

export const PaymentMethodIcon: React.FC<PaymentMethodIconProps> = ({ brand, size = 36 }) => {
  const [imageError, setImageError] = useState<boolean>(false);
  const iconSize = size * 0.72;

  // 1. CASH ON DELIVERY (COD) - Dedicated Cash & Currency Notes Icon
  if (brand === 'COD') {
    return (
      <View style={[styles.badgeContainer, styles.whiteBadge, { width: size, height: size }]}>
        {!imageError ? (
          <Image
            source={{ uri: BRAND_IMAGE_URIS.COD }}
            style={{ width: iconSize, height: iconSize }}
            resizeMode="contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <Svg width={iconSize * 0.9} height={iconSize * 0.9} viewBox="0 0 24 24">
            <Rect x="2" y="6" width="20" height="12" rx="2.5" fill="#10B981" />
            <Circle cx="12" cy="12" r="3" fill="#FFFFFF" />
            <Path d="M5 9h2M17 15h2" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
          </Svg>
        )}
      </View>
    );
  }

  // 2. NAVI UPI
  if (brand === 'NAVI') {
    return (
      <View style={[styles.badgeContainer, { width: size, height: size, backgroundColor: '#180B3A' }]}>
        {!imageError ? (
          <Image
            source={{ uri: BRAND_IMAGE_URIS.NAVI }}
            style={{ width: iconSize * 1.1, height: iconSize * 1.1, borderRadius: 6 }}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <Svg width={iconSize * 0.95} height={iconSize * 0.95} viewBox="0 0 24 24">
            <Path
              d="M4.5 18.5V8C4.5 7.2 5.2 6.5 6 6.5C6.8 6.5 7.5 7.2 7.5 8V18.5"
              stroke="#00D09C"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <Path
              d="M7.5 12.5C8.8 9.8 11.2 8.5 13.8 8.5C16.8 8.5 18.5 10.5 18.5 13.5V18.5"
              stroke="#00D09C"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M13.5 5.5H18.5V10.5M18.5 5.5L13.5 10.5"
              stroke="#00D09C"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        )}
      </View>
    );
  }

  // 3. GOOGLE PAY UPI
  if (brand === 'GOOGLE_PAY') {
    return (
      <View style={[styles.badgeContainer, styles.whiteBadge, { width: size, height: size }]}>
        {!imageError ? (
          <Image
            source={{ uri: BRAND_IMAGE_URIS.GOOGLE_PAY }}
            style={{ width: iconSize * 0.95, height: iconSize * 0.95 }}
            resizeMode="contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <Svg width={iconSize * 1.05} height={iconSize * 0.8} viewBox="0 0 36 28">
            <Path
              d="M12 4C7.6 4 4 7.6 4 12C4 16.4 7.6 20 12 20H15.5V15.5H12C10.1 15.5 8.5 13.9 8.5 12C8.5 10.1 10.1 8.5 12 8.5H19.5V4H12Z"
              fill="#4285F4"
            />
            <Path
              d="M12 24C16.4 24 20 20.4 20 16V12.5H15.5V16C15.5 17.9 13.9 19.5 12 19.5C10.1 19.5 8.5 17.9 8.5 16H4C4 20.4 7.6 24 12 24Z"
              fill="#34A853"
            />
            <Path
              d="M24 4C19.6 4 16 7.6 16 12V15.5H20.5V12C20.5 10.1 22.1 8.5 24 8.5C25.9 8.5 27.5 10.1 27.5 12H32C32 7.6 28.4 4 24 4Z"
              fill="#EA4335"
            />
            <Path
              d="M24 24C28.4 24 32 20.4 32 16C32 11.6 28.4 8 24 8H20.5V12.5H24C25.9 12.5 27.5 14.1 27.5 16C27.5 17.9 25.9 19.5 24 19.5H16.5V24H24Z"
              fill="#FBBC05"
            />
          </Svg>
        )}
      </View>
    );
  }

  // 4. CARDS (Add credit or debit cards)
  if (brand === 'CARDS_ADD') {
    return (
      <View style={[styles.badgeContainer, styles.whiteBadge, { width: size, height: size }]}>
        <Svg width={iconSize * 1.05} height={iconSize * 0.8} viewBox="0 0 26 20">
          <Rect x="1.5" y="2" width="23" height="16" rx="3.5" fill="none" stroke="#1E242B" strokeWidth="1.8" />
          <Rect x="1.5" y="6.5" width="23" height="3.5" fill="#1E242B" />
          <Rect x="4.5" y="12.5" width="4.5" height="3" rx="0.6" fill="#1E242B" />
          <Path d="M12.5 13H20M12.5 15H17" stroke="#1E242B" strokeWidth="1.2" strokeLinecap="round" />
        </Svg>
      </View>
    );
  }

  // 5. PLUXEE
  if (brand === 'PLUXEE') {
    return (
      <View style={[styles.badgeContainer, styles.whiteBadge, { width: size, height: size }]}>
        <View style={styles.pluxeeWrap}>
          <Text style={styles.pluxeeText}>pluxee</Text>
          <View style={styles.pluxeeDot} />
        </View>
      </View>
    );
  }

  // 6. YONO SBI
  if (brand === 'YONO_SBI') {
    return (
      <View style={[styles.badgeContainer, { width: size, height: size, backgroundColor: '#540C52' }]}>
        <Text style={styles.yonoText}>yono</Text>
        <View style={styles.sbiBadge}>
          <Text style={styles.sbiText}>SBI</Text>
        </View>
      </View>
    );
  }

  // 7. UPI ADD
  if (brand === 'UPI_ADD') {
    return (
      <View style={[styles.badgeContainer, styles.whiteBadge, { width: size, height: size }]}>
        {!imageError ? (
          <Image
            source={{ uri: BRAND_IMAGE_URIS.UPI_ADD }}
            style={{ width: iconSize * 1.1, height: iconSize * 0.65 }}
            resizeMode="contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <Svg width={iconSize * 1.25} height={iconSize * 0.75} viewBox="0 0 40 22">
            <Polygon points="3,2 12,11 3,20" fill="#097939" />
            <Polygon points="10,2 19,11 10,20" fill="#E86C1D" />
            <Path d="M21 5.5H24.5V13C24.5 14.7 23.3 16 21.5 16H20.5V13.8H21.5C22.2 13.8 22.8 13.2 22.8 12.5V5.5H21V5.5Z" fill="#2E3192" />
            <Path d="M26 5.5H30.5C32.2 5.5 33.5 6.8 33.5 8.5C33.5 10.2 32.2 11.5 30.5 11.5H27.8V16H26V5.5ZM27.8 9.7H30.5C31.2 9.7 31.7 9.2 31.7 8.5C31.7 7.8 31.2 7.3 30.5 7.3H27.8V9.7Z" fill="#2E3192" />
            <Path d="M35 5.5H37V16H35V5.5Z" fill="#2E3192" />
          </Svg>
        )}
      </View>
    );
  }

  // 8. AMAZON PAY
  if (brand === 'AMAZON_PAY') {
    return (
      <View style={[styles.badgeContainer, styles.whiteBadge, { width: size, height: size }]}>
        <View style={styles.amazonDarkCircle}>
          <Text style={styles.amazonPayText}>pay</Text>
          <Svg width={14} height={4} viewBox="0 0 14 4" style={{ marginTop: -1 }}>
            <Path d="M1 1C4.5 3.8 9.5 3.8 13 1" stroke="#FF9900" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          </Svg>
        </View>
      </View>
    );
  }

  // 9. MOBIKWIK
  if (brand === 'MOBIKWIK') {
    return (
      <View style={[styles.badgeContainer, styles.whiteBadge, { width: size, height: size }]}>
        {!imageError ? (
          <Image
            source={{ uri: BRAND_IMAGE_URIS.MOBIKWIK }}
            style={{ width: iconSize * 0.9, height: iconSize * 0.9 }}
            resizeMode="contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.mobikwikCircle}>
            <Svg width={15} height={15} viewBox="0 0 24 24">
              <Path
                d="M4 18V6L9 14L12 9L15 14L20 6V18"
                stroke="#FFFFFF"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </View>
        )}
      </View>
    );
  }

  // 10. PHONEPE
  if (brand === 'PHONEPE') {
    return (
      <View style={[styles.badgeContainer, { width: size, height: size, backgroundColor: '#5F259F' }]}>
        {!imageError ? (
          <Image
            source={{ uri: BRAND_IMAGE_URIS.PHONEPE }}
            style={{ width: iconSize * 1.1, height: iconSize * 1.1, borderRadius: 6 }}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <Svg width={iconSize * 0.9} height={iconSize * 0.9} viewBox="0 0 24 24">
            <Path
              d="M7 6h8c1.6 0 2.8 1.2 2.8 2.8s-1.2 2.8-2.8 2.8H11v6.4H7V6zm4 3.4v2h3.8c.6 0 1-.4 1-1s-.4-1-1-1H11z"
              fill="#FFFFFF"
            />
          </Svg>
        )}
      </View>
    );
  }

  // 11. PAYTM
  if (brand === 'PAYTM') {
    return (
      <View style={[styles.badgeContainer, { width: size, height: size, backgroundColor: '#002E6E' }]}>
        {!imageError ? (
          <Image
            source={{ uri: BRAND_IMAGE_URIS.PAYTM }}
            style={{ width: iconSize * 1.1, height: iconSize * 1.1, borderRadius: 6 }}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <Svg width={iconSize * 0.95} height={iconSize * 0.95} viewBox="0 0 32 32">
            <Path d="M5 10h6v3H8.5v9H5V10z" fill="#00BAF2" />
            <Path d="M13 10h3.5l3.5 6 3.5-6H27v12h-3.5v-6.5l-3.5 6.5h-2l-3.5-6.5V22H13V10z" fill="#00BAF2" />
          </Svg>
        )}
      </View>
    );
  }

  // 12. WALLET
  return (
    <View style={[styles.badgeContainer, { width: size, height: size, backgroundColor: '#EA580C' }]}>
      <Svg width={iconSize * 0.85} height={iconSize * 0.85} viewBox="0 0 24 24">
        <Rect x="2" y="5" width="20" height="14" rx="3" fill="#FB923C" />
        <Path d="M2 9h20" stroke="#FED7AA" strokeWidth="1.5" />
        <Circle cx="17" cy="13" r="1.8" fill="#FFFFFF" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  whiteBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8ECF2',
  },
  pluxeeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pluxeeText: {
    fontSize: 8.5,
    fontFamily: ServenticaTokens.fonts.PoppinsBold,
    fontWeight: '800',
    color: '#0D1730',
    letterSpacing: -0.4,
  },
  pluxeeDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 1.75,
    backgroundColor: '#E23744',
    marginLeft: 1,
    marginTop: -4,
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
    paddingHorizontal: 2.5,
    borderRadius: 2,
    marginTop: 1.5,
  },
  sbiText: {
    fontSize: 5.5,
    fontFamily: ServenticaTokens.fonts.PoppinsBold,
    fontWeight: '800',
    color: '#002D62',
    lineHeight: 6.5,
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
    fontSize: 8,
    fontFamily: ServenticaTokens.fonts.PoppinsBold,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    lineHeight: 9,
  },
  mobikwikCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0070CD',
    alignItems: 'center',
    justifyContent: 'center',
  },
});



