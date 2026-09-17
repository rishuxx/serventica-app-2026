export interface NavigationTheme {
  gradientColors: string[];
  gradientStart: string;
  gradientEnd: string;
  isDark: boolean;
  textColor: string;
  subtextColor: string;
  iconColor: string;
  activePillBg: string;
  activeBorder: string;
  activeFill: string;
  activeStroke: string;
}

export interface INavigationThemeStrategy {
  resolveTheme(slug?: string, isDarkOverride?: boolean, customGradient?: string[]): NavigationTheme;
}

export class CategoryAdaptiveThemeStrategy implements INavigationThemeStrategy {
  private static readonly DEFAULT_THEME: NavigationTheme = {
    gradientColors: ['#0369A1', '#0284C7', '#0EA5E9', '#38BDF8'],
    gradientStart: '#0284C7',
    gradientEnd: '#38BDF8',
    isDark: true,
    textColor: '#FFFFFF',
    subtextColor: 'rgba(255, 255, 255, 0.90)',
    iconColor: '#FFFFFF',
    activePillBg: 'rgba(255, 255, 255, 0.24)',
    activeBorder: 'rgba(255, 255, 255, 0.45)',
    activeFill: '#FACC15',
    activeStroke: '#111111',
  };

  resolveTheme(slug?: string, isDarkOverride?: boolean, customGradient?: string[]): NavigationTheme {
    if (customGradient && customGradient.length >= 2) {
      const isDark = isDarkOverride !== undefined ? isDarkOverride : true;
      return {
        gradientColors: customGradient,
        gradientStart: customGradient[0],
        gradientEnd: customGradient[customGradient.length - 1],
        isDark,
        textColor: isDark ? '#FFFFFF' : '#1E242B',
        subtextColor: isDark ? 'rgba(255, 255, 255, 0.90)' : '#333333',
        iconColor: isDark ? '#FFFFFF' : '#1E242B',
        activePillBg: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.10)',
        activeBorder: isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.15)',
        activeFill: isDark ? '#FACC15' : '#D97706',
        activeStroke: isDark ? '#111111' : '#1E242B',
      };
    }

    switch (slug) {
      case 'electrician':
      case 'electrical':
        return {
          gradientColors: ['#B45309', '#D97706', '#F59E0B', '#FBBF24'],
          gradientStart: '#D97706',
          gradientEnd: '#FBBF24',
          isDark: true,
          textColor: '#FFFFFF',
          subtextColor: 'rgba(255, 255, 255, 0.92)',
          iconColor: '#FFFFFF',
          activePillBg: 'rgba(255, 255, 255, 0.25)',
          activeBorder: 'rgba(255, 255, 255, 0.45)',
          activeFill: '#FFFFFF',
          activeStroke: '#B45309',
        };

      case 'plumbing':
        return {
          gradientColors: [
            '#D9B3E2',
            '#D2A4E3',
            '#CA94E2',
            '#C183E1',
            '#B673DE',
            '#AA63DA',
            '#9D54D5',
            '#9047CE',
            '#833CC7',
            '#7533BF',
            '#692EB7',
            '#5D2BAE',
            '#522CA4',
          ],
          gradientStart: '#D9B3E2',
          gradientEnd: '#522CA4',
          isDark: true,
          textColor: '#FFFFFF',
          subtextColor: 'rgba(255, 255, 255, 0.92)',
          iconColor: '#FFFFFF',
          activePillBg: 'rgba(255, 255, 255, 0.24)',
          activeBorder: 'rgba(255, 255, 255, 0.45)',
          activeFill: '#FACC15',
          activeStroke: '#4C1D95',
        };

      case 'home-cleaning':
      case 'cleaning':
        return {
          gradientColors: ['#334155', '#475569', '#64748B', '#94A3B8'],
          gradientStart: '#475569',
          gradientEnd: '#94A3B8',
          isDark: true,
          textColor: '#FFFFFF',
          subtextColor: 'rgba(255, 255, 255, 0.92)',
          iconColor: '#FFFFFF',
          activePillBg: 'rgba(255, 255, 255, 0.22)',
          activeBorder: 'rgba(255, 255, 255, 0.45)',
          activeFill: '#38BDF8',
          activeStroke: '#0F172A',
        };

      case 'painting':
        return {
          gradientColors: ['#881337', '#9F1239', '#BE185D', '#E11D48', '#F43F5E'],
          gradientStart: '#9F1239',
          gradientEnd: '#F43F5E',
          isDark: true,
          textColor: '#FFFFFF',
          subtextColor: 'rgba(255, 255, 255, 0.92)',
          iconColor: '#FFFFFF',
          activePillBg: 'rgba(255, 255, 255, 0.24)',
          activeBorder: 'rgba(255, 255, 255, 0.45)',
          activeFill: '#FACC15',
          activeStroke: '#881337',
        };

      case 'ro-water':
        return {
          gradientColors: ['#0369A1', '#0284C7', '#0EA5E9', '#06B6D4', '#22D3EE'],
          gradientStart: '#0284C7',
          gradientEnd: '#06B6D4',
          isDark: true,
          textColor: '#FFFFFF',
          subtextColor: 'rgba(255, 255, 255, 0.92)',
          iconColor: '#FFFFFF',
          activePillBg: 'rgba(255, 255, 255, 0.24)',
          activeBorder: 'rgba(255, 255, 255, 0.45)',
          activeFill: '#FACC15',
          activeStroke: '#0369A1',
        };

      case 'carpentry':
        return {
          gradientColors: ['#78350F', '#92400E', '#B45309', '#D97706'],
          gradientStart: '#78350F',
          gradientEnd: '#D97706',
          isDark: true,
          textColor: '#FFFFFF',
          subtextColor: 'rgba(255, 255, 255, 0.92)',
          iconColor: '#FFFFFF',
          activePillBg: 'rgba(255, 255, 255, 0.24)',
          activeBorder: 'rgba(255, 255, 255, 0.45)',
          activeFill: '#FBBF24',
          activeStroke: '#78350F',
        };

      case 'pest-control':
        return {
          gradientColors: ['#14532D', '#166534', '#15803D', '#22C55E'],
          gradientStart: '#14532D',
          gradientEnd: '#22C55E',
          isDark: true,
          textColor: '#FFFFFF',
          subtextColor: 'rgba(255, 255, 255, 0.92)',
          iconColor: '#FFFFFF',
          activePillBg: 'rgba(255, 255, 255, 0.24)',
          activeBorder: 'rgba(255, 255, 255, 0.45)',
          activeFill: '#FACC15',
          activeStroke: '#14532D',
        };

      case 'laundry':
        return {
          gradientColors: ['#1E3A8A', '#1E40AF', '#2563EB', '#60A5FA'],
          gradientStart: '#1E3A8A',
          gradientEnd: '#60A5FA',
          isDark: true,
          textColor: '#FFFFFF',
          subtextColor: 'rgba(255, 255, 255, 0.92)',
          iconColor: '#FFFFFF',
          activePillBg: 'rgba(255, 255, 255, 0.24)',
          activeBorder: 'rgba(255, 255, 255, 0.45)',
          activeFill: '#FACC15',
          activeStroke: '#1E3A8A',
        };

      case 'home-decor':
        return {
          gradientColors: ['#FFDDE1', '#F7BCC4', '#EE9CA7'],
          gradientStart: '#FFDDE1',
          gradientEnd: '#EE9CA7',
          isDark: false,
          textColor: '#1E242B',
          subtextColor: '#333333',
          iconColor: '#1E242B',
          activePillBg: 'rgba(0, 0, 0, 0.08)',
          activeBorder: 'rgba(0, 0, 0, 0.16)',
          activeFill: '#DB2777',
          activeStroke: '#1E242B',
        };

      case 'ac-appliances':
      default:
        return CategoryAdaptiveThemeStrategy.DEFAULT_THEME;
    }
  }
}

export const navigationThemeStrategy = new CategoryAdaptiveThemeStrategy();
