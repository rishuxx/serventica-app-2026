/**
 * SERVENTICA DESIGN SYSTEM TOKENS
 * Canonical brand color palette, spacing scale, typography, and elevation.
 */

export const ServenticaTokens = {
  colors: {
    // Brand Obsidian Palette
    backgroundPrimary: '#161616',
    backgroundSecondary: '#202020',
    backgroundElevated: '#282828',
    backgroundSurface: '#303030',

    // Signature Brand Accent
    brandGold: '#f7ca49',
    brandGoldHover: '#e5b93b',
    brandGoldSubtle: '#2b2612',

    // Functional State Colors
    success: '#22c55e',
    successSubtle: '#0f291e',
    warning: '#f59e0b',
    error: '#ef4444',
    errorSubtle: '#2b1414',
    info: '#3b82f6',

    // Neutral Text Hierarchy
    textPrimary: '#ffffff',
    textSecondary: '#a0a0a0',
    textMuted: '#666666',
    textInverse: '#161616',

    // Borders & Dividers
    borderSubtle: '#2a2a2a',
    borderProminent: '#3d3d3d',
    borderGold: '#f7ca49',
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
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  typography: {
    titleLarge: { fontSize: 26, fontWeight: '900' as const, letterSpacing: 1.5 },
    titleMedium: { fontSize: 20, fontWeight: '700' as const },
    bodyRegular: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
    bodyMedium: { fontSize: 14, fontWeight: '600' as const },
    badge: { fontSize: 11, fontWeight: '800' as const, letterSpacing: 0.8 },
  },
} as const;
