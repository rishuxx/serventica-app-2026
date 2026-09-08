export const Fonts = {
  Regular: 'Poppins-Regular',
  Medium: 'Poppins-Medium',
  Light: 'Poppins-Light',
  SemiBold: 'Poppins-SemiBold',
  Bold: 'Poppins-Bold',
  ExtraBold: 'Poppins-ExtraBold',
  Coolvetica: 'Coolvetica-Regular',
  CoolveticaRegular: 'Coolvetica-Regular',
  CoolveticaCondensed: 'Coolvetica-Condensed',
  CoolveticaCompress: 'Coolvetica-Compress',
  CoolveticaCremed: 'Coolvetica-Cremed',
  OkraBold: 'Okra-Bold',
  OkraMedium: 'Okra-Medium',
} as const;

export const ServenticaTokens = {
  theme: 'light' as const,
  colors: {
    splashBackground: '#141414',
    splashText: '#ffffff',
    splashDot: '#ffcc00',
    splashTaglineWhite: '#ffffff',
    splashTaglineGold: '#ffcc00',

    loginBackground: '#fcfbf7',
    loginSurface: '#ffffff',
    loginBorder: '#e2e5dc',
    loginBorderFocused: '#ffb300',

    brandGoldPrimary: '#ffb300',
    brandGoldSecondary: '#ffcc00',
    brandGoldStart: '#ffa000',
    brandGoldEnd: '#ffc107',

    bottomNavBackground: '#ffa600',
    bottomNavActiveIcon: '#ffffff',
    bottomNavInactiveIcon: 'rgba(255, 255, 255, 0.65)',

    textPrimary: '#1a1a1a',
    textSecondary: '#666666',
    textMuted: '#9e9e9e',
    textLink: '#4a90e2',

    divider: '#d8dcd2',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  radii: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    pill: 9999,
  },
  fonts: Fonts,
} as const;
