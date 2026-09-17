export const Fonts = {
  // Pure Poppins font family across entire application
  Regular: 'Poppins-Regular',
  Medium: 'Poppins-Medium',
  Light: 'Poppins-Light',
  SemiBold: 'Poppins-SemiBold',
  Bold: 'Poppins-Bold',
  ExtraBold: 'Poppins-ExtraBold',

  // Explicit mappings for all legacy and named tokens to Poppins
  SFProRegular: 'Poppins-Regular',
  SFProMedium: 'Poppins-Medium',
  SFProBold: 'Poppins-Bold',
  SFProSemiBold: 'Poppins-SemiBold',

  PoppinsRegular: 'Poppins-Regular',
  PoppinsMedium: 'Poppins-Medium',
  PoppinsSemiBold: 'Poppins-SemiBold',
  PoppinsBold: 'Poppins-Bold',

  // Headings & Brand
  Heading: 'Poppins-Bold',
  SubHeading: 'Poppins-SemiBold',
  Title: 'Poppins-Bold',
  Body: 'Poppins-Regular',
  BodyMedium: 'Poppins-Medium',
  BodyBold: 'Poppins-SemiBold',

  // Display Typography
  Coolvetica: 'Poppins-Bold',
  CoolveticaRegular: 'Poppins-Regular',
  CoolveticaCondensed: 'Poppins-SemiBold',
  CoolveticaCompress: 'Poppins-Bold',
  CoolveticaCremed: 'Poppins-Medium',

  // Legacy mappings
  OkraBold: 'Poppins-Bold',
  OkraMedium: 'Poppins-Medium',
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

    textPrimary: '#1E242B', // Universal soft light-black shade of grey
    textDark: '#1E242B',
    textSecondary: '#5E6672',
    textMuted: '#94A3B8',
    textLink: '#3B82F6',

    buttonDark: '#262B34', // Soft graphite dark button background
    surfaceDark: '#262B34',
    borderDark: '#333842',

    divider: '#E2E8F0',
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
