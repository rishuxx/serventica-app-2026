import { CategoryItem, ServiceDetailItem } from './category.types';

export interface CategoryPalette {
  primary: string;
  secondary: string;
  tertiary?: string;
  gradientStart: string;
  gradientEnd: string;
  gradientColors?: string[];
  textColor: string;
  isDark: boolean;
}

export interface CategoryHeroData {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  imageUrl: string;
  mobileImageUrl?: string;
  palette: CategoryPalette;
}

export interface CategoryThemeData {
  primaryColor: string;
  secondaryColor: string;
  surfaceColor?: string;
  accentColor?: string;
  textColor: string;
  mutedTextColor?: string;
  buttonColor: string;
  buttonTextColor: string;
  gradientStart: string;
  gradientEnd: string;
  gradientColors?: string[];
  isDark: boolean;
}

export interface CatalogSectionData {
  id: string;
  title: string;
  services: ServiceDetailItem[];
}

export interface CategoryExperience {
  category: CategoryItem;
  hero: CategoryHeroData;
  theme: CategoryThemeData;
  catalog: {
    sections: CatalogSectionData[];
    totalServices: number;
  };
}
