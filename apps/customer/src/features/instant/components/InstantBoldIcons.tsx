/**
 * SERVENTICA — Instant Bold Outlined Vector Icons
 * Cheerful pop-art vector icons featuring vivid multi-tone fills with crisp solid outlines.
 */

import React from 'react';
import Svg, { Path, Circle, Rect, Polygon, G, Line } from 'react-native-svg';

export interface IconProps {
  size?: number;
  inactive?: boolean;
}

export {
  AnimatedHelpingHandIcon as BoldWrenchIcon,
  AnimatedRoadHelpIcon as BoldCarIcon,
  AnimatedLaundryIcon as BoldShirtIcon,
  AnimatedPackMoveIcon as BoldBoxIcon,
} from './AnimatedInstantIcons';

// -------------------------------------------------------------
// 1. TASK CHIP ICONS (Bold Outlined Pop-Art)
// -------------------------------------------------------------

export const BoldCleaningIcon: React.FC<IconProps> = ({ size = 20, inactive }) => {
  const stroke = inactive ? '#64748B' : '#000000';
  const bottleFill = inactive ? '#E2E8F0' : '#38BDF8';
  const fluidFill = inactive ? '#CBD5E1' : '#0284C7';
  const nozzleFill = inactive ? '#CBD5E1' : '#0EA5E9';
  const sparkle = inactive ? '#CBD5E1' : '#FACC15';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M10 10 L14 10 L14 12 L16.5 14 L16.5 20.5 C16.5 21.3 15.8 22 15 22 L9 22 C8.2 22 7.5 21.3 7.5 20.5 L7.5 14 L10 12 Z"
        fill={bottleFill}
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path
        d="M7.5 15.5 L16.5 15.5 L16.5 20.5 C16.5 21.3 15.8 22 15 22 L9 22 C8.2 22 7.5 21.3 7.5 20.5 Z"
        fill={fluidFill}
      />
      <Path
        d="M12 6.5 L6.5 6.5 C5.8 6.5 5.5 7.2 5.8 7.8 L6.8 9.5 L12 9.5 Z"
        fill={nozzleFill}
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M12 4.5 C12 3.8 12.8 3.2 13.6 3.2 L14.5 3.2 C15.5 3.2 16.2 3.9 16.2 4.9 L16.2 8.5 C16.2 9 15.8 9.5 15.2 9.5 L12 9.5 Z"
        fill={nozzleFill}
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M10 9.5 C10 12 8 12.5 8 14"
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M3.5 1.5 L4.2 3.2 L6 3.8 L4.2 4.4 L3.5 6.2 L2.8 4.4 L1 3.8 L2.8 3.2 Z"
        fill={sparkle}
        stroke={stroke}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export const BoldBroomIcon = BoldCleaningIcon;
export const BoldSparklesIcon = BoldCleaningIcon;

export const BoldDishesIcon: React.FC<IconProps> = ({ size = 20, inactive }) => {
  const stroke = inactive ? '#64748B' : '#000000';
  const plateBg = inactive ? '#E2E8F0' : '#BAE6FD';
  const plateInner = inactive ? '#CBD5E1' : '#38BDF8';
  const cutlery = inactive ? '#94A3B8' : '#0284C7';
  const shine = inactive ? '#CBD5E1' : '#FACC15';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="7.5" fill={plateBg} stroke={stroke} strokeWidth={2} />
      <Circle cx="12" cy="12" r="4.5" fill="#FFFFFF" stroke={plateInner} strokeWidth={1.4} />
      <Path
        d="M4.5 4 C3 4 2 5.8 2 8 C2 10.2 3 11.5 4.5 11.5 C6 11.5 7 10.2 7 8 C7 5.8 6 4 4.5 4 Z"
        fill={cutlery}
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Line x1="4.5" y1="11.5" x2="4.5" y2="20" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Path
        d="M19.5 4 C17.8 4 17 6.5 17 11.5 L20 11.5 L20 4.5 C20 4.2 19.8 4 19.5 4 Z"
        fill={cutlery}
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Line x1="19.5" y1="11.5" x2="19.5" y2="20" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="15.5" cy="7" r="1.8" fill={shine} stroke={stroke} strokeWidth={1} />
    </Svg>
  );
};

export const BoldChefHatIcon: React.FC<IconProps> = ({ size = 20, inactive }) => {
  const stroke = inactive ? '#64748B' : '#000000';
  const toque = inactive ? '#E2E8F0' : '#FFFFFF';
  const brim = inactive ? '#CBD5E1' : '#F97316';
  const fold = inactive ? '#94A3B8' : '#CBD5E1';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M6 15.5 C3.8 15.5 2.5 13.5 2.8 11.2 C3.1 9 5 7.8 7 8 C7.5 5.5 10 3.5 12.5 3.5 C15.2 3.5 17.5 5.5 17.8 8 C19.8 7.8 21.8 9 22 11.2 C22.3 13.5 21 15.5 18.8 15.5 Z"
        fill={toque}
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d="M9.5 8.5 C10 11 10 13 9.5 15" stroke={fold} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M14.5 8.5 C14 11 14 13 14.5 15" stroke={fold} strokeWidth={1.5} strokeLinecap="round" />
      <Rect x="5" y="15.5" width="14" height="4.5" rx="1.5" fill={brim} stroke={stroke} strokeWidth={2} />
    </Svg>
  );
};

export const BoldPackageIcon: React.FC<IconProps> = ({ size = 20, inactive }) => {
  const stroke = inactive ? '#64748B' : '#000000';
  const top = inactive ? '#E2E8F0' : '#FDE047';
  const left = inactive ? '#CBD5E1' : '#F59E0B';
  const right = inactive ? '#94A3B8' : '#D97706';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polygon points="12,3 21,7.5 12,12 3,7.5" fill={top} stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
      <Polygon points="3,7.5 12,12 12,21 3,16.5" fill={left} stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
      <Polygon points="12,12 21,7.5 21,16.5 12,21" fill={right} stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
};

export const BoldMovingLiftingIcon: React.FC<IconProps> = ({ size = 20, inactive }) => {
  const stroke = inactive ? '#64748B' : '#000000';
  const box = inactive ? '#E2E8F0' : '#F59E0B';
  const tape = inactive ? '#CBD5E1' : '#FDE047';
  const cutout = inactive ? '#94A3B8' : '#78350F';
  const arrow = inactive ? '#94A3B8' : '#7C3AED';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="4.5" y="4" width="15" height="11" rx="2" fill={box} stroke={stroke} strokeWidth={2} />
      <Line x1="12" y1="4" x2="12" y2="15" stroke={tape} strokeWidth={2} />
      <Rect x="8.5" y="8" width="7" height="2.5" rx="1.2" fill={cutout} />
      <Path d="M2.5 13.5 C2.5 17 4.5 19.5 7.5 19.5 L9.5 18.5" stroke={stroke} strokeWidth={2} strokeLinecap="round" fill="none" />
      <Path d="M21.5 13.5 C21.5 17 19.5 19.5 16.5 19.5 L14.5 18.5" stroke={stroke} strokeWidth={2} strokeLinecap="round" fill="none" />
      <Path d="M10.5 20.5 L12 18.5 L13.5 20.5" stroke={arrow} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
};

export const BoldDumbbellIcon = BoldMovingLiftingIcon;

export const BoldClosetIcon: React.FC<IconProps> = ({ size = 20, inactive }) => {
  const stroke = inactive ? '#64748B' : '#000000';
  const body = inactive ? '#CBD5E1' : '#EC4899';
  const knob = inactive ? '#FFFFFF' : '#FCE7F3';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="4" y="3" width="16" height="18" rx="2" fill={body} stroke={stroke} strokeWidth={2} />
      <Line x1="12" y1="3" x2="12" y2="21" stroke={stroke} strokeWidth={1.8} />
      <Circle cx="9" cy="12" r="1.3" fill={knob} stroke={stroke} strokeWidth={1.2} />
      <Circle cx="15" cy="12" r="1.3" fill={knob} stroke={stroke} strokeWidth={1.2} />
    </Svg>
  );
};

export const BoldToolsIcon: React.FC<IconProps> = ({ size = 20, inactive }) => {
  const stroke = inactive ? '#64748B' : '#000000';
  const fill = inactive ? '#CBD5E1' : '#EF4444';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// -------------------------------------------------------------
// 2. DURATION CLOCK ICON
// -------------------------------------------------------------

export const BoldClockIcon: React.FC<IconProps> = ({ size = 18, inactive }) => {
  const stroke = inactive ? '#64748B' : '#000000';
  const fill = inactive ? '#CBD5E1' : '#FDE047';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9.5" fill={fill} stroke={stroke} strokeWidth={2.2} />
      <Path d="M12 7 L12 12 L15.5 14" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

// -------------------------------------------------------------
// 3. ROAD HELP BOLD ICONS
// -------------------------------------------------------------

export const BoldFuelPumpIcon: React.FC<IconProps> = ({ size = 20, inactive }) => {
  const stroke = inactive ? '#64748B' : '#000000';
  const body = inactive ? '#CBD5E1' : '#EF4444';
  const gauge = inactive ? '#E2E8F0' : '#FEF08A';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="4" y="3" width="10" height="18" rx="2" fill={body} stroke={stroke} strokeWidth={2} />
      <Rect x="6" y="5.5" width="6" height="5" rx="1" fill={gauge} stroke={stroke} strokeWidth={1.5} />
      <Path d="M14 8 C17 8 18 10 18 13 L18 17 C18 18 19 19 20 19" stroke={stroke} strokeWidth={2} strokeLinecap="round" fill="none" />
    </Svg>
  );
};

export const BoldBreakdownIcon: React.FC<IconProps> = ({ size = 20, inactive }) => {
  const stroke = inactive ? '#64748B' : '#000000';
  const cone = inactive ? '#CBD5E1' : '#A855F7';
  const light = inactive ? '#E2E8F0' : '#DDD6FE';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M14.7 6.3 L17.7 9.3 L10.7 16.3 C9.5 17.5 7.5 17.5 6.3 16.3 C5.1 15.1 5.1 13.1 6.3 11.9 Z"
        fill={cone}
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Circle cx="17.5" cy="6.5" r="3" fill={light} stroke={stroke} strokeWidth={2} />
    </Svg>
  );
};

export const BoldTyreIcon: React.FC<IconProps> = ({ size = 20, inactive }) => {
  const stroke = inactive ? '#64748B' : '#000000';
  const tire = inactive ? '#94A3B8' : '#1E293B';
  const rim = inactive ? '#CBD5E1' : '#06B6D4';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9.5" fill={tire} stroke={stroke} strokeWidth={2.2} />
      <Circle cx="12" cy="12" r="5" fill={rim} stroke={stroke} strokeWidth={1.8} />
      <Circle cx="12" cy="12" r="2" fill="#FFFFFF" stroke={stroke} strokeWidth={1.2} />
    </Svg>
  );
};

export const BoldBatteryIcon: React.FC<IconProps> = ({ size = 20, inactive }) => {
  const stroke = inactive ? '#64748B' : '#000000';
  const body = inactive ? '#CBD5E1' : '#10B981';
  const bolt = inactive ? '#E2E8F0' : '#FACC15';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="3" y="6" width="16" height="13" rx="2" fill={body} stroke={stroke} strokeWidth={2} />
      <Rect x="19" y="10" width="2.5" height="5" rx="1" fill={stroke} stroke={stroke} strokeWidth={1} />
      <Polygon points="12,8 9,13 12,13 10,17 14,12 11,12" fill={bolt} stroke={stroke} strokeWidth={1} />
    </Svg>
  );
};

// -------------------------------------------------------------
// 4. PACK & MOVE BOLD ICONS
// -------------------------------------------------------------

export const BoldTruckIcon: React.FC<IconProps> = ({ size = 20, inactive }) => {
  const stroke = inactive ? '#64748B' : '#000000';
  const cargo = inactive ? '#CBD5E1' : '#3B82F6';
  const cab = inactive ? '#E2E8F0' : '#60A5FA';
  const wheels = inactive ? '#94A3B8' : '#FDE047';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="2" y="6" width="12" height="11" rx="1.5" fill={cargo} stroke={stroke} strokeWidth={2} />
      <Path d="M14 9 L18 9 L21 13 L21 17 L14 17 Z" fill={cab} stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
      <Circle cx="6" cy="18" r="2.2" fill={wheels} stroke={stroke} strokeWidth={1.6} />
      <Circle cx="17.5" cy="18" r="2.2" fill={wheels} stroke={stroke} strokeWidth={1.6} />
    </Svg>
  );
};

export const BoldSofaIcon: React.FC<IconProps> = ({ size = 20, inactive }) => {
  const stroke = inactive ? '#64748B' : '#000000';
  const body = inactive ? '#CBD5E1' : '#8B5CF6';
  const arm = inactive ? '#E2E8F0' : '#C4B5FD';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="5" y="8" width="14" height="9" rx="2" fill={body} stroke={stroke} strokeWidth={2} />
      <Rect x="2" y="11" width="4" height="7" rx="1.5" fill={arm} stroke={stroke} strokeWidth={1.8} />
      <Rect x="18" y="11" width="4" height="7" rx="1.5" fill={arm} stroke={stroke} strokeWidth={1.8} />
      <Line x1="6" y1="18" x2="6" y2="21" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Line x1="18" y1="18" x2="18" y2="21" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
};

export const BoldRefreshIcon: React.FC<IconProps> = ({ size = 20, inactive }) => {
  const stroke = inactive ? '#64748B' : '#000000';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M21 12 A9 9 0 0 0 6 5.3 L3 8 M3 3 L3 8 L8 8 M3 12 A9 9 0 0 0 18 18.7 L21 16 M21 21 L21 16 L16 16"
        stroke={stroke}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
};

// -------------------------------------------------------------
// 5. LAUNDRY BOLD ICONS
// -------------------------------------------------------------

export const BoldLaundryBasketIcon: React.FC<IconProps> = ({ size = 20, inactive }) => {
  const stroke = inactive ? '#64748B' : '#000000';
  const basket = inactive ? '#CBD5E1' : '#F59E0B';
  const slats = inactive ? '#E2E8F0' : '#FEF3C7';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 9 L20 9 L18 20 L6 20 Z"
        fill={basket}
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d="M7 9 C7 5 17 5 17 9" stroke={stroke} strokeWidth={2} strokeLinecap="round" fill="none" />
      <Line x1="10" y1="12" x2="10" y2="17" stroke={slats} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1="14" y1="12" x2="14" y2="17" stroke={slats} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
};

export const BoldScaleIcon: React.FC<IconProps> = ({ size = 20, inactive }) => {
  const stroke = inactive ? '#64748B' : '#000000';
  const pan = inactive ? '#CBD5E1' : '#38BDF8';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1="12" y1="3" x2="12" y2="21" stroke={stroke} strokeWidth={2.2} />
      <Line x1="4" y1="7" x2="20" y2="7" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
      <Polygon points="4,7 2,13 6,13" fill={pan} stroke={stroke} strokeWidth={1.6} />
      <Polygon points="20,7 18,13 22,13" fill={pan} stroke={stroke} strokeWidth={1.6} />
    </Svg>
  );
};

export const BoldUsersIcon: React.FC<IconProps> = ({ size = 20, inactive }) => {
  const stroke = inactive ? '#64748B' : '#000000';
  const head1 = inactive ? '#E2E8F0' : '#FDE047';
  const body1 = inactive ? '#CBD5E1' : '#A855F7';
  const head2 = inactive ? '#E2E8F0' : '#67E8F9';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="8" cy="8" r="4" fill={head1} stroke={stroke} strokeWidth={2} />
      <Path d="M2 19 C2 15.5 5 13.5 8 13.5 C11 13.5 14 15.5 14 19 Z" fill={body1} stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
      <Circle cx="16" cy="7" r="3" fill={head2} stroke={stroke} strokeWidth={1.8} />
      <Path d="M14 14 C15.5 13.5 17 13.5 18.5 14 C20.5 14.8 22 16.5 22 19" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </Svg>
  );
};

export const BoldBikeIcon: React.FC<IconProps> = ({ size = 20, inactive }) => {
  const stroke = inactive ? '#64748B' : '#000000';
  const wheels = inactive ? '#CBD5E1' : '#06B6D4';
  const tank = inactive ? '#E2E8F0' : '#EF4444';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="6" cy="16" r="4" fill={wheels} stroke={stroke} strokeWidth={2} />
      <Circle cx="18" cy="16" r="4" fill={wheels} stroke={stroke} strokeWidth={2} />
      <Path d="M6 16 L10 9 L15 9 L18 16 M10 9 L14 16" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="14" y1="7" x2="17" y2="7" stroke={tank} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
};

export const BoldDownloadBoxIcon: React.FC<IconProps> = ({ size = 20, inactive }) => {
  const stroke = inactive ? '#64748B' : '#000000';
  const arrow = inactive ? '#CBD5E1' : '#F59E0B';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 17 L4 20 L20 20 L20 17" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M12 4 L12 15 M7 10 L12 15 L17 10" stroke={arrow} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};
