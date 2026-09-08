import React from 'react';
import {
  AirVent,
  Sparkles,
  Zap,
  Droplets,
  Paintbrush,
  Waves,
  Lamp,
  Hammer,
  Bug,
  Sofa,
  WashingMachine,
  Truck,
  Wrench,
  Scissors,
  Flower,
  LayoutGrid,
} from 'lucide-react-native';

interface CategoryIconProps {
  name?: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name = '',
  size = 21,
  color = '#FFFFFF',
  strokeWidth = 1.6,
}) => {
  const iconProps = { size, color, strokeWidth };

  const normalized = (name || '').trim().toLowerCase();

  switch (normalized) {
    case 'airvent':
    case 'snowflake':
      return <AirVent {...iconProps} />;
    case 'sparkles':
      return <Sparkles {...iconProps} />;
    case 'zap':
      return <Zap {...iconProps} />;
    case 'droplets':
      return <Droplets {...iconProps} />;
    case 'paintbrush':
      return <Paintbrush {...iconProps} />;
    case 'waves':
      return <Waves {...iconProps} />;
    case 'hammer':
      return <Hammer {...iconProps} />;
    case 'bug':
      return <Bug {...iconProps} />;
    case 'lamp':
      return <Lamp {...iconProps} />;
    case 'sofa':
      return <Sofa {...iconProps} />;
    case 'washingmachine':
      return <WashingMachine {...iconProps} />;
    case 'truck':
      return <Truck {...iconProps} />;
    case 'wrench':
      return <Wrench {...iconProps} />;
    case 'scissors':
    case 'beauty':
      return <Scissors {...iconProps} />;
    case 'flower':
    case 'gardening':
      return <Flower {...iconProps} />;
    default:
      return <LayoutGrid {...iconProps} />;
  }
};
