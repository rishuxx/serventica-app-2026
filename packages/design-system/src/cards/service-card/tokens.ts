import { Fonts } from '../../tokens';

export const ServiceCardTokens = {
  colors: {
    // Brand greens for ribbon
    ribbonGreenStart: '#208535',
    ribbonGreenEnd: '#135c24',
    ribbonGreenSolid: '#18742c',

    // Brand accent yellow for display highlights (From styles.xml: #FFE100)
    accentYellow: '#FFE100',
    accentYellowVibrant: '#FFE100',
    white: '#FFFFFF',

    // Text hierarchy
    textPrimary: '#1E242B',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',

    // Card surfaces
    cardBackground: '#FFFFFF',
    imagePlaceholder: '#F1F5F9',
    cardBorder: '#F1F5F9',

    // Favorite button
    favoriteBackground: 'rgba(0, 0, 0, 0.28)',
    favoriteActive: '#EF4444',
    favoriteInactive: '#FFFFFF',

    // Rating star
    starGold: '#EAB308',
  },

  radius: {
    card: 26,
    media: 26,
    ribbon: 5,
  },

  media: {
    // Matching ~153 / 186 reference ratio
    aspectRatio: 153 / 186,
  },

  sizes: {
    small: {
      width: 140,
      titleFontSize: 13,
      metaFontSize: 10,
      highlightFontSize: 17,
      brandFontSize: 10,
      offerFontSize: 18,
      ribbonScale: 0.70,
      favoriteSize: 28,
      favoriteIconSize: 14,
    },
    medium: {
      width: 165,
      titleFontSize: 14.5,
      metaFontSize: 11,
      highlightFontSize: 21,
      brandFontSize: 11,
      offerFontSize: 22,
      ribbonScale: 0.80,
      favoriteSize: 34,
      favoriteIconSize: 17,
    },
    large: {
      width: 200,
      titleFontSize: 16,
      metaFontSize: 12,
      highlightFontSize: 25,
      brandFontSize: 13,
      offerFontSize: 26,
      ribbonScale: 0.90,
      favoriteSize: 38,
      favoriteIconSize: 19,
    },
  },

  typography: {
    fontDisplay: Fonts.CoolveticaRegular,
    fontPrimaryBold: Fonts.SFProBold,
    fontPrimarySemiBold: Fonts.SFProSemiBold,
    fontPrimaryMedium: Fonts.SFProMedium,
    fontPrimaryRegular: Fonts.SFProRegular,
  },
} as const;
