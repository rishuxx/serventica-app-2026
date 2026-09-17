export const Fonts = {
  // Pure Lexend font family across entire application
  Regular: 'Lexend-VariableFont_wght',
  Medium: 'Lexend-VariableFont_wght',
  Light: 'Lexend-VariableFont_wght',
  SemiBold: 'Lexend-VariableFont_wght',
  Bold: 'Lexend-VariableFont_wght',
  ExtraBold: 'Lexend-VariableFont_wght',

  // Explicit mappings for all legacy and named tokens to Lexend
  SFProRegular: 'Lexend-VariableFont_wght',
  SFProMedium: 'Lexend-VariableFont_wght',
  SFProBold: 'Lexend-VariableFont_wght',
  SFProSemiBold: 'Lexend-VariableFont_wght',

  PoppinsRegular: 'Lexend-VariableFont_wght',
  PoppinsMedium: 'Lexend-VariableFont_wght',
  PoppinsSemiBold: 'Lexend-VariableFont_wght',
  PoppinsBold: 'Lexend-VariableFont_wght',

  // Headings & Brand
  Heading: 'Lexend-VariableFont_wght',
  SubHeading: 'Lexend-VariableFont_wght',
  Title: 'Lexend-VariableFont_wght',
  Body: 'Lexend-VariableFont_wght',
  BodyMedium: 'Lexend-VariableFont_wght',
  BodyBold: 'Lexend-VariableFont_wght',

  // Display Typography
  Coolvetica: 'Lexend-VariableFont_wght',
  CoolveticaRegular: 'Lexend-VariableFont_wght',
  CoolveticaCondensed: 'Lexend-VariableFont_wght',
  CoolveticaCompress: 'Lexend-VariableFont_wght',
  CoolveticaCremed: 'Lexend-VariableFont_wght',

  // Legacy mappings
  OkraBold: 'Lexend-VariableFont_wght',
  OkraMedium: 'Lexend-VariableFont_wght',
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
