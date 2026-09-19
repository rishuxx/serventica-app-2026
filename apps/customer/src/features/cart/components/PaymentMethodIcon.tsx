import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Path, Rect, Circle, Polygon, Text as SvgText } from 'react-native-svg';

export type PaymentBrandType =
  | 'RAZORPAY_ONLINE'
  | 'UPI'
  | 'CARDS'
  | 'NETBANKING'
  | 'COD'
  | 'COD_CASH'
  | 'COD_UPI'
  | 'COD_QR'
  | 'GPAY'
  | 'PHONEPE'
  | 'PAYTM'
  | 'BHIM'
  | 'WHATSAPP'
  | 'AMAZONPAY'
  | 'GENERIC_UPI';

interface PaymentMethodIconProps {
  brand: PaymentBrandType;
  size?: number;
}

export const PaymentMethodIcon: React.FC<PaymentMethodIconProps> = ({ brand, size = 36 }) => {
  const iconSize = size * 0.72;

  // 1. GOOGLE PAY (Official Google 'G' 4-color crisp vector)
  if (brand === 'GPAY') {
    return (
      <View style={[styles.badgeContainer, styles.whiteBadge, { width: size, height: size }]}>
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24">
          <Path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <Path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <Path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            fill="#FBBC05"
          />
          <Path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            fill="#EA4335"
          />
        </Svg>
      </View>
    );
  }

  // 2. PHONEPE (Official Purple Badge with white 'पे')
  if (brand === 'PHONEPE') {
    return (
      <View style={[styles.badgeContainer, { width: size, height: size, backgroundColor: '#5F259F' }]}>
        <Svg width={iconSize * 0.95} height={iconSize * 0.95} viewBox="0 0 36 36">
          <Circle cx="18" cy="18" r="17" fill="#5F259F" />
          <SvgText
            x="18"
            y="24"
            fontSize="20"
            fontWeight="bold"
            fill="#FFFFFF"
            textAnchor="middle"
            fontFamily="sans-serif"
          >
            पे
          </SvgText>
        </Svg>
      </View>
    );
  }

  // 3. PAYTM (Authentic Paytm Badge with Cyan 'Pay' + Navy 'tm')
  if (brand === 'PAYTM') {
    return (
      <View style={[styles.badgeContainer, styles.whiteBadge, { width: size, height: size }]}>
        <Svg width={iconSize * 1.1} height={iconSize * 0.75} viewBox="0 0 54 28">
          <Rect x="1" y="2" width="52" height="24" rx="5" fill="#002E6E" />
          <SvgText
            x="19"
            y="18"
            fontSize="13"
            fontWeight="900"
            fill="#00BAF2"
            textAnchor="middle"
            fontFamily="sans-serif"
          >
            Pay
          </SvgText>
          <SvgText
            x="39"
            y="18"
            fontSize="13"
            fontWeight="900"
            fill="#00BAF2"
            textAnchor="middle"
            fontFamily="sans-serif"
          >
            tm
          </SvgText>
        </Svg>
      </View>
    );
  }

  // 4. BHIM UPI (Official NPCI 3-tone layered chevron)
  if (brand === 'BHIM') {
    return (
      <View style={[styles.badgeContainer, styles.whiteBadge, { width: size, height: size }]}>
        <Svg width={iconSize * 1.1} height={iconSize * 0.75} viewBox="0 0 40 24">
          <Polygon points="3,2 17,12 3,22" fill="#097939" />
          <Polygon points="12,2 26,12 12,22" fill="#E86C1D" />
          <Polygon points="21,2 35,12 21,22" fill="#005B9C" />
        </Svg>
      </View>
    );
  }

  // 5. WHATSAPP PAY
  if (brand === 'WHATSAPP') {
    return (
      <View style={[styles.badgeContainer, { width: size, height: size, backgroundColor: '#25D366' }]}>
        <Svg width={iconSize * 0.85} height={iconSize * 0.85} viewBox="0 0 24 24">
          <Path
            d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5 14.1c-.2.6-1.2 1.1-1.7 1.2-.5.1-1 .2-3.1-.7-2.6-1.1-4.2-3.8-4.3-4-.1-.2-1-1.3-1-2.5s.6-1.8.8-2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.4.2.5.7 1.7.7 1.8 0 .2 0 .3-.1.5-.1.2-.2.3-.3.4l-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.4 1.8 2.2 1.2 1.1 2.3 1.4 2.6 1.6.3.1.5.1.7-.1.2-.2.8-.9 1-1.2.2-.3.4-.3.7-.2.3.1 1.8.9 2.1 1 .3.2.5.3.6.4.1.2.1.8-.1 1.4z"
            fill="#FFFFFF"
          />
        </Svg>
      </View>
    );
  }

  // 6. AMAZON PAY
  if (brand === 'AMAZONPAY') {
    return (
      <View style={[styles.badgeContainer, { width: size, height: size, backgroundColor: '#232F3E' }]}>
        <Svg width={iconSize * 0.9} height={iconSize * 0.9} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="10" fill="#232F3E" />
          <Path
            d="M6 14.5c4 2.8 8 2.8 12 0"
            stroke="#FF9900"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <Path
            d="M16.5 13.5l1.8 1.2-1.2 1.8"
            stroke="#FF9900"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </View>
    );
  }

  // 7. CASH PAYMENT (Professional Multi-layer Cash Currency Note with watermark, borders, and crisp ₹ symbol)
  if (brand === 'COD' || brand === 'COD_CASH') {
    return (
      <View style={[styles.badgeContainer, { width: size, height: size, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' }]}>
        <Svg width={iconSize * 0.98} height={iconSize * 0.74} viewBox="0 0 40 28">
          {/* Main Banknote Body */}
          <Rect x="1" y="1" width="38" height="26" rx="4" fill="#10B981" />
          
          {/* Inner Safety Border */}
          <Rect x="3.5" y="3.5" width="33" height="21" rx="3" fill="#059669" />
          
          {/* Guilloche / Dashed Thread Pattern */}
          <Rect
            x="5.5"
            y="5.5"
            width="29"
            height="17"
            rx="2"
            fill="none"
            stroke="#A7F3D0"
            strokeWidth="0.9"
            strokeDasharray="2.5,1.5"
          />

          {/* Central Watermark Vignette */}
          <Circle cx="20" cy="14" r="6.5" fill="#047857" stroke="#34D399" strokeWidth="0.8" />

          {/* Official Indian Rupee Sign */}
          <SvgText
            x="20"
            y="18.5"
            fontSize="12.5"
            fontWeight="bold"
            fill="#FFFFFF"
            textAnchor="middle"
            fontFamily="sans-serif"
          >
            ₹
          </SvgText>

          {/* Corner Currency Rosettes */}
          <Circle cx="7.5" cy="8.5" r="1.5" fill="#6EE7B7" />
          <Circle cx="32.5" cy="8.5" r="1.5" fill="#6EE7B7" />
          <Circle cx="7.5" cy="19.5" r="1.5" fill="#6EE7B7" />
          <Circle cx="32.5" cy="19.5" r="1.5" fill="#6EE7B7" />
        </Svg>
      </View>
    );
  }

  // 7b. SCAN PRO QR CODE (Realistic High-Detail Crisp Authentic QR Matrix)
  if (brand === 'COD_QR') {
    return (
      <View style={[styles.badgeContainer, styles.whiteBadge, { width: size, height: size }]}>
        <Svg width={iconSize * 0.94} height={iconSize * 0.94} viewBox="0 0 36 36">
          {/* Top-Left Finder Pattern (Outer Box, Inner White, Center Core) */}
          <Rect x="2" y="2" width="10" height="10" rx="2" fill="#0F172A" />
          <Rect x="4" y="4" width="6" height="6" rx="1" fill="#FFFFFF" />
          <Rect x="5.5" y="5.5" width="3" height="3" rx="0.5" fill="#0F172A" />

          {/* Top-Right Finder Pattern */}
          <Rect x="24" y="2" width="10" height="10" rx="2" fill="#0F172A" />
          <Rect x="26" y="4" width="6" height="6" rx="1" fill="#FFFFFF" />
          <Rect x="27.5" y="5.5" width="3" height="3" rx="0.5" fill="#0F172A" />

          {/* Bottom-Left Finder Pattern */}
          <Rect x="2" y="24" width="10" height="10" rx="2" fill="#0F172A" />
          <Rect x="4" y="26" width="6" height="6" rx="1" fill="#FFFFFF" />
          <Rect x="5.5" y="27.5" width="3" height="3" rx="0.5" fill="#0F172A" />

          {/* Timing Tracks & Alignment Cells */}
          <Rect x="14" y="3" width="2.5" height="2.5" rx="0.5" fill="#0F172A" />
          <Rect x="19.5" y="3" width="2.5" height="2.5" rx="0.5" fill="#0F172A" />
          <Rect x="14" y="8" width="2.5" height="2.5" rx="0.5" fill="#0F172A" />
          <Rect x="19.5" y="8" width="2.5" height="2.5" rx="0.5" fill="#0F172A" />

          {/* Middle Pattern & Serventica Brand Green Center */}
          <Rect x="3" y="14" width="2.5" height="2.5" rx="0.5" fill="#0F172A" />
          <Rect x="8.5" y="14" width="2.5" height="2.5" rx="0.5" fill="#0F172A" />
          <Rect x="14" y="14" width="8" height="8" rx="1.5" fill="#059669" />
          <Rect x="16.5" y="16.5" width="3" height="3" rx="0.5" fill="#FFFFFF" />
          <Rect x="25" y="14" width="2.5" height="2.5" rx="0.5" fill="#0F172A" />
          <Rect x="30.5" y="14" width="2.5" height="2.5" rx="0.5" fill="#0F172A" />

          {/* Bottom Data Cells */}
          <Rect x="14" y="25" width="2.5" height="2.5" rx="0.5" fill="#0F172A" />
          <Rect x="19.5" y="25" width="2.5" height="2.5" rx="0.5" fill="#0F172A" />
          <Rect x="25" y="20" width="4" height="4" rx="1" fill="#0F172A" />
          <Rect x="30.5" y="25" width="2.5" height="2.5" rx="0.5" fill="#0F172A" />
          <Rect x="14" y="30.5" width="4" height="2.5" rx="0.5" fill="#0F172A" />
          <Rect x="21" y="30.5" width="2.5" height="2.5" rx="0.5" fill="#0F172A" />
          <Rect x="26.5" y="27.5" width="6.5" height="5.5" rx="1" fill="#0F172A" />
        </Svg>
      </View>
    );
  }

  // 7c. POST-SERVICE UPI TO PRO (Official NPCI UPI Emblem)
  if (brand === 'COD_UPI') {
    return (
      <View style={[styles.badgeContainer, styles.whiteBadge, { width: size, height: size }]}>
        <Svg width={iconSize * 1.1} height={iconSize * 0.52} viewBox="0 0 1024 466">
          <Path
            fill="#3d3d3c"
            d="M98.1 340.7h6.3l-5.9 24.5c-.9 3.6-.7 6.4.5 8.2 1.2 1.8 3.4 2.7 6.7 2.7 3.2 0 5.9-.9 8-2.7 2.1-1.8 3.5-4.6 4.4-8.2l5.9-24.5h6.4l-6 25.1c-1.3 5.4-3.6 9.5-7 12.2-3.3 2.7-7.7 4.1-13.1 4.1-5.4 0-9.1-1.3-11.1-4s-2.4-6.8-1.1-12.2l6-25.2zm31.4 40.3 10-41.9 19 24.6c.5.7 1 1.4 1.5 2.2.5.8 1 1.7 1.6 2.7l6.7-27.9h5.9l-10 41.8-19.4-25.1-1.5-2.1c-.5-.8-.9-1.5-1.2-2.4l-6.7 28h-5.9zm44.2 0 9.6-40.3h6.4l-9.6 40.3h-6.4zm15.5 0 9.6-40.3h21.9l-1.3 5.6h-15.5l-2.4 10H217l-1.4 5.7h-15.5l-4.5 18.9h-6.4zm29 0 9.6-40.3h6.4l-9.6 40.3h-6.4zm15.5 0 9.6-40.3h21.9l-1.3 5.6h-15.5l-2.4 10.1h15.5l-1.4 5.7h-15.5l-3.1 13H257l-1.4 5.9h-21.9zm29.3 0 9.6-40.3h8.6c5.6 0 9.5.3 11.6.9 2.1.6 3.9 1.5 5.3 2.9 1.8 1.8 3 4.1 3.5 6.8.5 2.8.3 6-.5 9.5-.9 3.6-2.2 6.7-4 9.5-1.8 2.8-4.1 5-6.8 6.8-2 1.4-4.2 2.3-6.6 2.9-2.3.6-5.8.9-10.4.9H263zm7.8-6h5.4c2.9 0 5.2-.2 6.8-.6 1.6-.4 3-1.1 4.3-2 1.8-1.3 3.3-2.9 4.5-4.9 1.2-1.9 2.1-4.2 2.7-6.8.6-2.6.8-4.8.5-6.7-.3-1.9-1-3.6-2.2-4.9-.9-1-2-1.6-3.5-2-1.5-.4-3.8-.6-7.1-.6h-4.6l-6.8 28.5zm59.7-12.1-4.3 18.1h-6l9.6-40.3h9.7c2.9 0 4.9.2 6.2.5 1.3.3 2.3.8 3.1 1.6 1 .9 1.7 2.2 2 3.8.3 1.6.2 3.3-.2 5.2-.5 1.9-1.2 3.7-2.3 5.3-1.1 1.6-2.4 2.9-3.8 3.8-1.2.7-2.5 1.3-3.9 1.6-1.4.3-3.6.5-6.4.5h-3.7zm1.7-5.4h1.6c3.5 0 6-.4 7.4-1.2 1.4-.8 2.3-2.2 2.8-4.2.5-2.1.2-3.7-.8-4.5-1.1-.9-3.3-1.3-6.6-1.3H335l-2.8 11.2zm40.1 23.5-2-10.4h-15.6l-7 10.4H341l29-41.9 9 41.9h-6.7zm-13.8-15.9h10.9l-1.8-9.2c-.1-.6-.2-1.3-.2-2-.1-.8-.1-1.6-.1-2.5-.4.9-.8 1.7-1.3 2.5-.4.8-.8 1.5-1.2 2.1l-6.3 9.1zm29.7 15.9 4.4-18.4-8-21.8h6.7l5 13.7c.1.4.2.8.4 1.4.2.6.3 1.2.5 1.8l1.2-1.8c.4-.6.8-1.1 1.2-1.6l11.7-13.5h6.4L399 362.5l-4.4 18.4h-6.4zm60.9-19.9c0-.3.1-1.2.3-2.6.1-1.2.2-2.1.3-2.9-.4.9-.8 1.8-1.3 2.8-.5.9-1.1 1.9-1.8 2.8l-15.4 21.5-5-21.9c-.2-.9-.4-1.8-.5-2.6-.1-.8-.2-1.7-.2-2.5-.2.8-.5 1.7-.8 2.7-.3.9-.7 1.9-1.2 2.9l-9 19.8h-5.9l19.3-42 5.5 25.4c.1.4.2 1.1.3 2 .1.9.3 2.1.5 3.5.7-1.2 1.6-2.6 2.8-4.4.3-.5.6-.8.7-1.1l17.4-25.4-.6 42h-5.9l.5-20zm10.6 19.9 9.6-40.3h21.9l-1.3 5.6h-15.5l-2.4 10.1h15.5l-1.4 5.7h-15.5l-3.1 13H483l-1.4 5.9h-21.9zm29.2 0 10-41.9 19 24.6c.5.7 1 1.4 1.5 2.2.5.8 1 1.7 1.6 2.7l6.7-27.9h5.9l-10 41.8-19.4-25.1-1.5-2.1c-.5-.8-.9-1.5-1.2-2.4l-6.7 28h-5.9zm65.1-34.8-8.3 34.7h-6.4l8.3-34.7h-10.4l1.3-5.6h27.2l-1.3 5.6H554zm6.7 26.7 5.7-2.4c.1 1.8.6 3.2 1.7 4.1 1.1.9 2.6 1.4 4.6 1.4 1.9 0 3.5-.5 4.9-1.6 1.4-1.1 2.3-2.5 2.7-4.3.6-2.4-.8-4.5-4.2-6.3-.5-.3-.8-.5-1.1-.6-3.8-2.2-6.2-4.1-7.2-5.9-1-1.8-1.2-3.9-.6-6.4.8-3.3 2.5-5.9 5.2-8 2.7-2 5.7-3.1 9.3-3.1 2.9 0 5.2.6 6.9 1.7 1.7 1.1 2.6 2.8 2.9 4.9l-5.6 2.6c-.5-1.3-1.1-2.2-1.9-2.8-.8-.6-1.8-.9-3-.9-1.7 0-3.2.5-4.4 1.4-1.2.9-2 2.1-2.4 3.7-.6 2.4 1.1 4.7 5 6.8.3.2.5.3.7.4 3.4 1.8 5.7 3.6 6.7 5.4 1 1.8 1.2 3.9.6 6.6-.9 3.8-2.8 6.8-5.7 9.1-2.9 2.2-6.3 3.4-10.3 3.4-3.3 0-5.9-.8-7.7-2.4-2-1.6-2.9-3.9-2.8-6.8zm47.1 8.1 9.6-40.3h6.4l-9.6 40.3h-6.4zm15.6 0 10-41.9 19 24.6c.5.7 1 1.4 1.5 2.2.5.8 1 1.7 1.6 2.7l6.7-27.9h5.9l-10 41.8-19.4-25.1-1.5-2.1c-.5-.8-.9-1.5-1.2-2.4l-6.7 28h-5.9zm65.1-34.8-8.3 34.7h-6.4l8.3-34.7h-10.4l1.3-5.6h27.2l-1.3 5.6h-10.4zm6.9 34.8 9.6-40.3h22l-1.3 5.6h-15.5l-2.4 10.1h15.5l-1.4 5.7h-15.5l-3.1 13h15.5l-1.4 5.9h-22zm39.5-18.1-4.3 18h-6l9.6-40.3h8.9c2.6 0 4.6.2 5.9.5 1.4.3 2.5.9 3.3 1.7 1 1 1.6 2.2 1.9 3.8.3 1.5.2 3.2-.2 5.1-.8 3.2-2.1 5.8-4.1 7.6-2 1.8-4.5 2.9-7.5 3.3l9.1 18.3h-7.2l-8.7-18h-.7zm1.6-5.1h1.2c3.4 0 5.7-.4 7-1.2 1.3-.8 2.2-2.2 2.7-4.3.5-2.2.3-3.8-.7-4.7-1-.9-3.1-1.4-6.3-1.4h-1.2l-2.7 11.6zm18.9 23.2 9.6-40.3h21.9l-1.3 5.6h-15.5l-2.4 10h15.5l-1.4 5.7h-15.5l-4.5 18.9h-6.4zm52.8 0-2-10.4h-15.6l-7 10.4h-6.7l29-41.9 9 41.9h-6.7zm-13.9-15.9h10.9l-1.8-9.2c-.1-.6-.2-1.3-.2-2-.1-.8-.1-1.6-.1-2.5-.4.9-.8 1.7-1.3 2.5-.4.8-.8 1.5-1.2 2.1l-6.3 9.1zm62.2-14.6c-1.4-1.6-3.1-2.8-4.9-3.5-1.8-.8-3.8-1.2-6.1-1.2-4.3 0-8.1 1.4-11.5 4.2-3.4 2.8-5.6 6.5-6.7 11-1 4.3-.6 7.9 1.4 10.8 1.9 2.8 4.9 4.2 8.9 4.2 2.3 0 4.6-.4 6.9-1.3 2.3-.8 4.6-2.1 7-3.8l-1.8 7.4c-2 1.3-4.1 2.2-6.3 2.8-2.2.6-4.4.9-6.8.9-3 0-5.7-.5-8-1.5s-4.2-2.5-5.7-4.5c-1.5-1.9-2.4-4.2-2.8-6.8-.4-2.6-.3-5.4.5-8.4.7-3 1.9-5.7 3.5-8.3 1.6-2.6 3.7-4.9 6.1-6.8 2.4-2 5-3.5 7.8-4.5s5.6-1.5 8.5-1.5c2.3 0 4.4.3 6.4 1 1.9.7 3.7 1.7 5.3 3.1l-1.7 6.7zm.6 30.5 9.6-40.3h21.9l-1.3 5.6h-15.5l-2.4 10.1h15.5l-1.4 5.7H868l-3.1 13h15.5L879 381h-21.9z"
          />
          <Path
            fill="#70706e"
            d="M740.7 305.6h-43.9l61-220.3h43.9l-61 220.3zM717.9 92.2c-3-4.2-7.7-6.3-14.1-6.3H462.6l-11.9 43.2h219.4l-12.8 46.1H481.8v-.1h-43.9l-36.4 131.5h43.9l24.4-88.2h197.3c6.2 0 12-2.1 17.4-6.3 5.4-4.2 9-9.4 10.7-15.6l24.4-88.2c1.9-6.6 1.3-11.9-1.7-16.1zm-342 199.6c-2.4 8.7-10.4 14.8-19.4 14.8H130.2c-6.2 0-10.8-2.1-13.8-6.3-3-4.2-3.7-9.4-1.9-15.6l55.2-198.8h43.9l-49.3 177.6h175.6l49.3-177.6h43.9l-57.2 205.9z"
          />
          <Path fill="#098041" d="M877.5 85.7 933 196.1 816.3 306.5z" />
          <Path fill="#e97626" d="M838.5 85.7 894 196.1 777.2 306.5z" />
        </Svg>
      </View>
    );
  }

  // 8. UPI (Official NPCI UPI Vector Emblem)
  if (brand === 'UPI' || brand === 'GENERIC_UPI') {
    return (
      <View style={[styles.badgeContainer, styles.whiteBadge, { width: size, height: size }]}>
        <Svg width={iconSize * 1.15} height={iconSize * 0.55} viewBox="0 0 1024 466">
          <Path
            fill="#3d3d3c"
            d="M98.1 340.7h6.3l-5.9 24.5c-.9 3.6-.7 6.4.5 8.2 1.2 1.8 3.4 2.7 6.7 2.7 3.2 0 5.9-.9 8-2.7 2.1-1.8 3.5-4.6 4.4-8.2l5.9-24.5h6.4l-6 25.1c-1.3 5.4-3.6 9.5-7 12.2-3.3 2.7-7.7 4.1-13.1 4.1-5.4 0-9.1-1.3-11.1-4s-2.4-6.8-1.1-12.2l6-25.2zm31.4 40.3 10-41.9 19 24.6c.5.7 1 1.4 1.5 2.2.5.8 1 1.7 1.6 2.7l6.7-27.9h5.9l-10 41.8-19.4-25.1-1.5-2.1c-.5-.8-.9-1.5-1.2-2.4l-6.7 28h-5.9zm44.2 0 9.6-40.3h6.4l-9.6 40.3h-6.4zm15.5 0 9.6-40.3h21.9l-1.3 5.6h-15.5l-2.4 10H217l-1.4 5.7h-15.5l-4.5 18.9h-6.4zm29 0 9.6-40.3h6.4l-9.6 40.3h-6.4zm15.5 0 9.6-40.3h21.9l-1.3 5.6h-15.5l-2.4 10.1h15.5l-1.4 5.7h-15.5l-3.1 13H257l-1.4 5.9h-21.9zm29.3 0 9.6-40.3h8.6c5.6 0 9.5.3 11.6.9 2.1.6 3.9 1.5 5.3 2.9 1.8 1.8 3 4.1 3.5 6.8.5 2.8.3 6-.5 9.5-.9 3.6-2.2 6.7-4 9.5-1.8 2.8-4.1 5-6.8 6.8-2 1.4-4.2 2.3-6.6 2.9-2.3.6-5.8.9-10.4.9H263zm7.8-6h5.4c2.9 0 5.2-.2 6.8-.6 1.6-.4 3-1.1 4.3-2 1.8-1.3 3.3-2.9 4.5-4.9 1.2-1.9 2.1-4.2 2.7-6.8.6-2.6.8-4.8.5-6.7-.3-1.9-1-3.6-2.2-4.9-.9-1-2-1.6-3.5-2-1.5-.4-3.8-.6-7.1-.6h-4.6l-6.8 28.5zm59.7-12.1-4.3 18.1h-6l9.6-40.3h9.7c2.9 0 4.9.2 6.2.5 1.3.3 2.3.8 3.1 1.6 1 .9 1.7 2.2 2 3.8.3 1.6.2 3.3-.2 5.2-.5 1.9-1.2 3.7-2.3 5.3-1.1 1.6-2.4 2.9-3.8 3.8-1.2.7-2.5 1.3-3.9 1.6-1.4.3-3.6.5-6.4.5h-3.7zm1.7-5.4h1.6c3.5 0 6-.4 7.4-1.2 1.4-.8 2.3-2.2 2.8-4.2.5-2.1.2-3.7-.8-4.5-1.1-.9-3.3-1.3-6.6-1.3H335l-2.8 11.2zm40.1 23.5-2-10.4h-15.6l-7 10.4H341l29-41.9 9 41.9h-6.7zm-13.8-15.9h10.9l-1.8-9.2c-.1-.6-.2-1.3-.2-2-.1-.8-.1-1.6-.1-2.5-.4.9-.8 1.7-1.3 2.5-.4.8-.8 1.5-1.2 2.1l-6.3 9.1zm29.7 15.9 4.4-18.4-8-21.8h6.7l5 13.7c.1.4.2.8.4 1.4.2.6.3 1.2.5 1.8l1.2-1.8c.4-.6.8-1.1 1.2-1.6l11.7-13.5h6.4L399 362.5l-4.4 18.4h-6.4zm60.9-19.9c0-.3.1-1.2.3-2.6.1-1.2.2-2.1.3-2.9-.4.9-.8 1.8-1.3 2.8-.5.9-1.1 1.9-1.8 2.8l-15.4 21.5-5-21.9c-.2-.9-.4-1.8-.5-2.6-.1-.8-.2-1.7-.2-2.5-.2.8-.5 1.7-.8 2.7-.3.9-.7 1.9-1.2 2.9l-9 19.8h-5.9l19.3-42 5.5 25.4c.1.4.2 1.1.3 2 .1.9.3 2.1.5 3.5.7-1.2 1.6-2.6 2.8-4.4.3-.5.6-.8.7-1.1l17.4-25.4-.6 42h-5.9l.5-20zm10.6 19.9 9.6-40.3h21.9l-1.3 5.6h-15.5l-2.4 10.1h15.5l-1.4 5.7h-15.5l-3.1 13H483l-1.4 5.9h-21.9zm29.2 0 10-41.9 19 24.6c.5.7 1 1.4 1.5 2.2.5.8 1 1.7 1.6 2.7l6.7-27.9h5.9l-10 41.8-19.4-25.1-1.5-2.1c-.5-.8-.9-1.5-1.2-2.4l-6.7 28h-5.9zm65.1-34.8-8.3 34.7h-6.4l8.3-34.7h-10.4l1.3-5.6h27.2l-1.3 5.6H554zm6.7 26.7 5.7-2.4c.1 1.8.6 3.2 1.7 4.1 1.1.9 2.6 1.4 4.6 1.4 1.9 0 3.5-.5 4.9-1.6 1.4-1.1 2.3-2.5 2.7-4.3.6-2.4-.8-4.5-4.2-6.3-.5-.3-.8-.5-1.1-.6-3.8-2.2-6.2-4.1-7.2-5.9-1-1.8-1.2-3.9-.6-6.4.8-3.3 2.5-5.9 5.2-8 2.7-2 5.7-3.1 9.3-3.1 2.9 0 5.2.6 6.9 1.7 1.7 1.1 2.6 2.8 2.9 4.9l-5.6 2.6c-.5-1.3-1.1-2.2-1.9-2.8-.8-.6-1.8-.9-3-.9-1.7 0-3.2.5-4.4 1.4-1.2.9-2 2.1-2.4 3.7-.6 2.4 1.1 4.7 5 6.8.3.2.5.3.7.4 3.4 1.8 5.7 3.6 6.7 5.4 1 1.8 1.2 3.9.6 6.6-.9 3.8-2.8 6.8-5.7 9.1-2.9 2.2-6.3 3.4-10.3 3.4-3.3 0-5.9-.8-7.7-2.4-2-1.6-2.9-3.9-2.8-6.8zm47.1 8.1 9.6-40.3h6.4l-9.6 40.3h-6.4zm15.6 0 10-41.9 19 24.6c.5.7 1 1.4 1.5 2.2.5.8 1 1.7 1.6 2.7l6.7-27.9h5.9l-10 41.8-19.4-25.1-1.5-2.1c-.5-.8-.9-1.5-1.2-2.4l-6.7 28h-5.9zm65.1-34.8-8.3 34.7h-6.4l8.3-34.7h-10.4l1.3-5.6h27.2l-1.3 5.6h-10.4zm6.9 34.8 9.6-40.3h22l-1.3 5.6h-15.5l-2.4 10.1h15.5l-1.4 5.7h-15.5l-3.1 13h15.5l-1.4 5.9h-22zm39.5-18.1-4.3 18h-6l9.6-40.3h8.9c2.6 0 4.6.2 5.9.5 1.4.3 2.5.9 3.3 1.7 1 1 1.6 2.2 1.9 3.8.3 1.5.2 3.2-.2 5.1-.8 3.2-2.1 5.8-4.1 7.6-2 1.8-4.5 2.9-7.5 3.3l9.1 18.3h-7.2l-8.7-18h-.7zm1.6-5.1h1.2c3.4 0 5.7-.4 7-1.2 1.3-.8 2.2-2.2 2.7-4.3.5-2.2.3-3.8-.7-4.7-1-.9-3.1-1.4-6.3-1.4h-1.2l-2.7 11.6zm18.9 23.2 9.6-40.3h21.9l-1.3 5.6h-15.5l-2.4 10h15.5l-1.4 5.7h-15.5l-4.5 18.9h-6.4zm52.8 0-2-10.4h-15.6l-7 10.4h-6.7l29-41.9 9 41.9h-6.7zm-13.9-15.9h10.9l-1.8-9.2c-.1-.6-.2-1.3-.2-2-.1-.8-.1-1.6-.1-2.5-.4.9-.8 1.7-1.3 2.5-.4.8-.8 1.5-1.2 2.1l-6.3 9.1zm62.2-14.6c-1.4-1.6-3.1-2.8-4.9-3.5-1.8-.8-3.8-1.2-6.1-1.2-4.3 0-8.1 1.4-11.5 4.2-3.4 2.8-5.6 6.5-6.7 11-1 4.3-.6 7.9 1.4 10.8 1.9 2.8 4.9 4.2 8.9 4.2 2.3 0 4.6-.4 6.9-1.3 2.3-.8 4.6-2.1 7-3.8l-1.8 7.4c-2 1.3-4.1 2.2-6.3 2.8-2.2.6-4.4.9-6.8.9-3 0-5.7-.5-8-1.5s-4.2-2.5-5.7-4.5c-1.5-1.9-2.4-4.2-2.8-6.8-.4-2.6-.3-5.4.5-8.4.7-3 1.9-5.7 3.5-8.3 1.6-2.6 3.7-4.9 6.1-6.8 2.4-2 5-3.5 7.8-4.5s5.6-1.5 8.5-1.5c2.3 0 4.4.3 6.4 1 1.9.7 3.7 1.7 5.3 3.1l-1.7 6.7zm.6 30.5 9.6-40.3h21.9l-1.3 5.6h-15.5l-2.4 10.1h15.5l-1.4 5.7H868l-3.1 13h15.5L879 381h-21.9z"
          />
          <Path
            fill="#70706e"
            d="M740.7 305.6h-43.9l61-220.3h43.9l-61 220.3zM717.9 92.2c-3-4.2-7.7-6.3-14.1-6.3H462.6l-11.9 43.2h219.4l-12.8 46.1H481.8v-.1h-43.9l-36.4 131.5h43.9l24.4-88.2h197.3c6.2 0 12-2.1 17.4-6.3 5.4-4.2 9-9.4 10.7-15.6l24.4-88.2c1.9-6.6 1.3-11.9-1.7-16.1zm-342 199.6c-2.4 8.7-10.4 14.8-19.4 14.8H130.2c-6.2 0-10.8-2.1-13.8-6.3-3-4.2-3.7-9.4-1.9-15.6l55.2-198.8h43.9l-49.3 177.6h175.6l49.3-177.6h43.9l-57.2 205.9z"
          />
          <Path fill="#098041" d="M877.5 85.7 933 196.1 816.3 306.5z" />
          <Path fill="#e97626" d="M838.5 85.7 894 196.1 777.2 306.5z" />
        </Svg>
      </View>
    );
  }

  // 9. CREDIT & DEBIT CARDS
  if (brand === 'CARDS') {
    return (
      <View style={[styles.badgeContainer, styles.whiteBadge, { width: size, height: size }]}>
        <Svg width={iconSize * 0.95} height={iconSize * 0.75} viewBox="0 0 24 18">
          <Rect x="1" y="1" width="22" height="16" rx="3" fill="#F8FAFC" stroke="#0F172A" strokeWidth="1.6" />
          <Rect x="1" y="4.5" width="22" height="3" fill="#0F172A" />
          <Rect x="3.5" y="10.5" width="4" height="2.5" rx="0.5" fill="#E2E8F0" stroke="#64748B" strokeWidth="0.8" />
          <Path d="M10 11.5H19M10 13H15" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
        </Svg>
      </View>
    );
  }

  // 10. NETBANKING
  if (brand === 'NETBANKING') {
    return (
      <View style={[styles.badgeContainer, styles.whiteBadge, { width: size, height: size }]}>
        <Svg width={iconSize * 0.9} height={iconSize * 0.9} viewBox="0 0 24 24">
          <Path d="M3 21h18M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M12 3L2 8h20L12 3z" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </View>
    );
  }

  // 11. RAZORPAY OFFICIAL BRAND LOGO (Signature Dual-Tone Razor Blade Vector)
  return (
    <View style={[styles.badgeContainer, { width: size, height: size, backgroundColor: '#02042B' }]}>
      <Svg width={iconSize * 0.95} height={iconSize * 0.95} viewBox="0 0 512 512">
        {/* Top/Right primary blue blade facet */}
        <Path
          d="M407.5 48H190.9l-92.4 205.3h105.8L120.7 464l246-218.7H237.3L407.5 48z"
          fill="#0C83FF"
        />
        {/* Upper light blue highlight facet */}
        <Path
          d="M272.5 220H156.9l75.4-156h117.8l-77.6 156z"
          fill="#3395FF"
        />
        {/* Lower acute blue facet */}
        <Path
          d="M178.5 365.5l34.8-82h-74.8l-22.6 54.2 62.6 27.8z"
          fill="#0B72DE"
        />
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
});
