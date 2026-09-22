import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  ImageSourcePropType,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import {
  Check,
  X,
  Clock,
  MapPin,
  Wrench,
  Calendar,
  User,
  Info,
  CheckCircle2,
  XCircle,
  Phone,
  Navigation,
  Radio,
  LucideIcon,
} from 'lucide-react-native';
import { Fonts } from '../../../../packages/design-system/src';

const CORNER = 26;
const NOTCH_R = 15;

export interface ThemeColors {
  from: string;
  to: string;
  soft: string;
  badgeFg: string;
}

export const THEMES: Record<string, ThemeColors> = {
  green: {
    from: '#34D399', // emerald
    to: '#065F46', // deep emerald
    soft: 'rgba(232,255,240,0.82)',
    badgeFg: '#065F46',
  },
  purple: {
    from: '#8B5CF6', // violet
    to: '#4C1D95', // deep purple
    soft: 'rgba(242,235,255,0.82)',
    badgeFg: '#5B21B6',
  },
  red: {
    from: '#F87171', // red
    to: '#991B1B', // deep red
    soft: 'rgba(255,236,236,0.84)',
    badgeFg: '#991B1B',
  },
  dark: {
    from: '#1E293B',
    to: '#0F172A',
    soft: 'rgba(226,232,240,0.80)',
    badgeFg: '#0F172A',
  },
};

const STATUS_CONFIG: Record<string, { label: string; Icon: LucideIcon }> = {
  completed: { label: 'SERVICE COMPLETED', Icon: Check },
  service_completed: { label: 'SERVICE COMPLETED', Icon: Check },
  confirmed: { label: 'CONFIRMED', Icon: Check },
  searching: { label: 'CONFIRMED', Icon: Check },
  searching_partner: { label: 'CONFIRMED', Icon: Check },
  partner_assigned: { label: 'PARTNER ASSIGNED', Icon: Check },
  partner_accepted: { label: 'PARTNER ASSIGNED', Icon: Check },
  partner_en_route: { label: 'PARTNER EN ROUTE', Icon: Navigation },
  partner_arrived: { label: 'PARTNER ARRIVED', Icon: MapPin },
  service_started: { label: 'SERVICE STARTED', Icon: Wrench },
  upcoming: { label: 'UPCOMING', Icon: Clock },
  cancelled: { label: 'CANCELLED', Icon: X },
  in_progress: { label: 'IN PROGRESS', Icon: Wrench },
};

const META_ICONS: Record<string, LucideIcon> = {
  clock: Clock,
  pin: MapPin,
  wrench: Wrench,
  calendar: Calendar,
  user: User,
  info: Info,
};

/* Pulsing indicator — pass any centered content (dot, X, …) */
export const PulseIndicator: React.FC<{ color?: string; children?: React.ReactNode }> = ({
  color = '#FFFFFF',
  children,
}) => {
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(p, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(p, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [p]);

  const scale = p.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] });
  const opacity = p.interpolate({ inputRange: [0, 1], outputRange: [0.65, 0] });

  return (
    <View style={pulseStyles.wrap}>
      <Animated.View
        style={[pulseStyles.ring, { borderColor: color, transform: [{ scale }], opacity }]}
      />
      {children ?? <View style={[pulseStyles.dot, { backgroundColor: color }]} />}
    </View>
  );
};

export const PulseDot = PulseIndicator;

const pulseStyles = StyleSheet.create({
  wrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
});

export interface BookingMetaItem {
  icon: 'clock' | 'pin' | 'wrench' | 'calendar' | 'user' | 'info';
  text: string;
}

export interface BookingTechnician {
  name: string;
  role?: string;
  avatar?: ImageSourcePropType | string | null;
  phone?: string;
  onCall?: () => void;
  onTrack?: () => void;
}

export interface BookingAssigningState {
  title: string;
  subtitle: string;
}

export interface BookingCancelInfoState {
  title: string;
  reason: string;
}

export interface BookingTicketProps {
  theme?: 'purple' | 'green' | 'red' | 'dark' | ThemeColors;
  status?: string;
  bookingId?: string;
  datetime?: string;
  thumbnail?: ImageSourcePropType;
  title: string;
  meta?: BookingMetaItem[];
  totalLabel?: string;
  total: string | number;
  technician?: BookingTechnician;
  assigning?: BookingAssigningState;
  cancelInfo?: BookingCancelInfoState;
  cancellationReason?: string;
  stubRatio?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

/**
 * Premium horizontal ticket card with true transparent C-cut SVG notches + dotted dashed divider + full Lexend typography.
 */
export const BookingTicket: React.FC<BookingTicketProps> = ({
  theme = 'purple',
  status = 'confirmed',
  bookingId,
  datetime,
  thumbnail,
  title,
  meta = [],
  totalLabel = 'TOTAL',
  total,
  technician,
  assigning,
  cancelInfo,
  cancellationReason,
  stubRatio = 0.33,
  style,
  onPress,
}) => {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const gradId = useRef(`tg-${Math.random().toString(36).slice(2, 9)}`).current;

  const isCancelled = status.toLowerCase().includes('cancel');

  const t: ThemeColors =
    typeof theme === 'string'
      ? THEMES[theme] || (isCancelled ? THEMES.red : THEMES.purple)
      : { ...THEMES.purple, ...theme };

  const normalizedStatus = status.toLowerCase().replace(/-/g, '_');
  const st = isCancelled
    ? { label: 'CANCELLED', Icon: X }
    : STATUS_CONFIG[normalizedStatus] || {
        label: status.replace(/_/g, ' ').toUpperCase(),
        Icon: Check,
      };

  const onLayout = (e: any) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w > 0 && h > 0) {
      setSize((s) =>
        s && Math.abs(s.w - w) < 0.5 && Math.abs(s.h - h) < 0.5 ? s : { w, h }
      );
    }
  };

  /**
   * Continuous SVG Path carving out true transparent C-cuts on:
   * 1. Top perforation notch (px)
   * 2. Right side middle notch (my)
   * 3. Bottom perforation notch (px)
   * 4. Left side middle notch (my)
   */
  const ticketPath = (w: number, h: number) => {
    const px = w * (1 - stubRatio);
    const r = CORNER;
    const n = NOTCH_R;
    const my = h / 2;

    return (
      `M ${r} 0 ` +
      `H ${px - n} A ${n} ${n} 0 0 0 ${px + n} 0 ` + // Top perforation C-cut
      `H ${w - r} Q ${w} 0 ${w} ${r} ` +
      `V ${my - n} A ${n} ${n} 0 0 0 ${w} ${my + n} ` + // Right edge C-cut
      `V ${h - r} Q ${w} ${h} ${w - r} ${h} ` +
      `H ${px + n} A ${n} ${n} 0 0 0 ${px - n} ${h} ` + // Bottom perforation C-cut
      `H ${r} Q 0 ${h} 0 ${h - r} ` +
      `V ${my + n} A ${n} ${n} 0 0 0 0 ${my - n} ` + // Left edge C-cut
      `V ${r} Q 0 0 ${r} 0 Z`
    );
  };

  const px = size ? size.w * (1 - stubRatio) : 0;
  const Body: any = onPress ? TouchableOpacity : View;

  // Resolve cancellation info
  const effectiveCancelInfo = cancelInfo || (isCancelled || cancellationReason ? {
    title: 'Booking Cancelled',
    reason: cancellationReason || 'Need to change date or time slot',
  } : undefined);

  return (
    <Body
      activeOpacity={0.94}
      onPress={onPress}
      onLayout={onLayout}
      style={[styles.wrap, style]}
    >
      {size && (
        <Svg
          width={size.w}
          height={size.h}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={t.from} />
              <Stop offset="1" stopColor={t.to} />
            </LinearGradient>
          </Defs>
          {/* Card body with real transparent SVG notch cutouts */}
          <Path d={ticketPath(size.w, size.h)} fill={`url(#${gradId})`} />

          {/* Dotted dashed divider line aligned between top and bottom perforation cuts */}
          <Line
            x1={px}
            y1={NOTCH_R + 3}
            x2={px}
            y2={size.h - NOTCH_R - 3}
            stroke="rgba(255, 255, 255, 0.40)"
            strokeWidth={1.5}
            strokeDasharray="3.5 3.5"
          />
        </Svg>
      )}

      <View style={styles.content}>
        {/* Left main section */}
        <View style={styles.main}>
          <View style={styles.badge}>
            <st.Icon size={11} color={t.badgeFg} strokeWidth={2.8} />
            <Text style={[styles.badgeText, { color: t.badgeFg }]}>{st.label}</Text>
          </View>

          {(bookingId || datetime) && (
            <Text style={[styles.idLine, { color: t.soft }]} numberOfLines={1}>
              {bookingId ? `${bookingId}` : ''}
              {bookingId && datetime ? '  •  ' : ''}
              {datetime || ''}
            </Text>
          )}

          <View style={styles.infoRow}>
            {!!thumbnail && (
              <Image source={thumbnail} style={styles.thumb} resizeMode="cover" />
            )}
            <View style={styles.infoText}>
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
              {meta.map((m, i) => {
                const Icon = META_ICONS[m.icon] || Info;
                return (
                  <View key={i} style={styles.metaRow}>
                    <Icon size={12} color={t.soft} strokeWidth={1.7} />
                    <Text style={[styles.metaText, { color: t.soft }]} numberOfLines={1}>
                      {m.text}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Right stub section */}
        <View style={[styles.stub, { width: size ? size.w * stubRatio : '33%' }]}>
          <Text style={[styles.totalLabel, { color: t.soft }]}>{totalLabel}</Text>
          <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
            {total}
          </Text>

          {/* 1. Assigned Technician State */}
          {technician ? (
            <View style={styles.tech}>
              {technician.avatar ? (
                typeof technician.avatar === 'string' ? (
                  <Image source={{ uri: technician.avatar }} style={styles.avatar} resizeMode="cover" />
                ) : (
                  <Image source={technician.avatar} style={styles.avatar} resizeMode="cover" />
                )
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>
                    {technician.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'SP'}
                  </Text>
                </View>
              )}
              <Text style={styles.techName} numberOfLines={1}>
                {technician.name}
              </Text>
              {!!technician.role && (
                <Text style={[styles.techRole, { color: t.soft }]} numberOfLines={2}>
                  {technician.role}
                </Text>
              )}

              {/* Real-time Technician Quick Action Buttons (Call & Live Location) */}
              {(technician.onCall || technician.onTrack) && (
                <View style={styles.techActions}>
                  {!!technician.onCall && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={technician.onCall}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Call technician"
                    >
                      <Phone size={17} color={t.badgeFg} strokeWidth={2.4} />
                    </TouchableOpacity>
                  )}
                  {!!technician.onTrack && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={technician.onTrack}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Live tracking"
                    >
                      <Navigation size={17} color={t.badgeFg} strokeWidth={2.4} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ) : effectiveCancelInfo ? (
            /* 2. Cancellation state with pulsing X indicator */
            <View style={styles.assigning}>
              <PulseIndicator color="#FFFFFF">
                <X size={18} color="#FFFFFF" strokeWidth={2.8} />
              </PulseIndicator>
              <Text style={styles.assignTitle} numberOfLines={1}>
                {effectiveCancelInfo.title}
              </Text>
              <Text style={[styles.assignSub, { color: t.soft }]} numberOfLines={2}>
                {effectiveCancelInfo.reason}
              </Text>
            </View>
          ) : assigning ? (
            /* 3. Dynamic Searching Radar State */
            <View style={styles.assigning}>
              <PulseIndicator color="#34D399" />
              <Text style={styles.assignTitle} numberOfLines={1}>
                {assigning.title}
              </Text>
              <Text style={[styles.assignSub, { color: t.soft }]} numberOfLines={2}>
                {assigning.subtitle}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Body>
  );
};

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'transparent',
    overflow: 'visible',
    marginBottom: 16,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 172,
  },
  main: {
    flex: 1,
    paddingVertical: 16,
    paddingLeft: 22,
    paddingRight: 10,
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    gap: 4.5,
  },
  badgeText: {
    fontSize: 9.5,
    fontFamily: Fonts.Bold,
    letterSpacing: 0.6,
  },
  idLine: {
    marginTop: 7,
    fontSize: 11,
    fontFamily: Fonts.Light,
    letterSpacing: 0.1,
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
  },
  thumb: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    fontSize: 17,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
    lineHeight: 21,
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3.5,
    gap: 5,
  },
  metaText: {
    flex: 1,
    fontSize: 11,
    fontFamily: Fonts.Light,
    letterSpacing: 0.1,
  },
  stub: {
    paddingVertical: 14,
    paddingRight: 18,
    paddingLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalLabel: {
    fontSize: 10,
    fontFamily: Fonts.SemiBold,
    letterSpacing: 1.8,
  },
  total: {
    marginTop: 1,
    fontSize: 28,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  tech: {
    marginTop: 8,
    alignItems: 'center',
    width: '100%',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 14,
    fontFamily: Fonts.Bold,
    color: '#FFFFFF',
  },
  techName: {
    marginTop: 5,
    fontSize: 12,
    fontFamily: Fonts.SemiBold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  techRole: {
    marginTop: 1.5,
    fontSize: 10,
    fontFamily: Fonts.Light,
    textAlign: 'center',
  },
  techActions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  assigning: {
    marginTop: 6,
    alignItems: 'center',
    width: '100%',
  },
  assignTitle: {
    marginTop: 3,
    fontSize: 11.5,
    fontFamily: Fonts.SemiBold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  assignSub: {
    marginTop: 1.5,
    fontSize: 10,
    fontFamily: Fonts.Light,
    textAlign: 'center',
  },
});
