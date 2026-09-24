import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Switch,
} from 'react-native';
import { ArrowLeft, Volume2, Square, Play, Sparkles, Check, AlertTriangle, XCircle, CheckCircle } from 'lucide-react-native';
import { alertVibration, playAlert, stopAlert, setVibrationEnabled } from '../../../../src/utils/alertVibration';

interface VibrationSandboxScreenProps {
  onBack: () => void;
}

const PATTERNS_LIST = [
  { key: 'partnerFound', name: 'Partner Found', desc: 'Distinct 3-pulse rhythm when technician is matched', icon: Sparkles, color: '#10B981' },
  { key: 'bookingConfirmed', name: 'Booking Confirmed', desc: 'Double pulse for order confirmation', icon: CheckCircle, color: '#2563EB' },
  { key: 'partnerArrived', name: 'Partner Arrived', desc: 'Triple short pulse on doorstep arrival', icon: Check, color: '#8B5CF6' },
  { key: 'cancelled', name: 'Booking Cancelled', desc: 'Single long 700ms rumble', icon: XCircle, color: '#EF4444' },
  { key: 'warning', name: 'System Warning', desc: 'Staccato alert for timeouts/unresponsive state', icon: AlertTriangle, color: '#F59E0B' },
  { key: 'error', name: 'Payment Error', desc: 'Heavy double pulse for transaction failures', icon: XCircle, color: '#DC2626' },
  { key: 'success', name: 'Payment Success', desc: 'Light double tap for successful pay', icon: CheckCircle, color: '#059669' },
  { key: 'tap', name: 'Button Tap', desc: 'Subtle 30ms haptic feedback', icon: Play, color: '#64748B' },
];

export const VibrationSandboxScreen: React.FC<VibrationSandboxScreenProps> = ({ onBack }) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [activePattern, setActivePattern] = useState<string | null>(null);

  const handleToggle = (val: boolean) => {
    setIsEnabled(val);
    setVibrationEnabled(val);
  };

  const handlePlay = (key: string) => {
    setActivePattern(key);
    playAlert(key);
    setTimeout(() => {
      setActivePattern(null);
    }, 1500);
  };

  const handleStop = () => {
    setActivePattern(null);
    stopAlert();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vibration Alert Sandbox</Text>
        <TouchableOpacity style={styles.stopBtn} onPress={handleStop} activeOpacity={0.7}>
          <Square size={16} color="#EF4444" fill="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerIconCircle}>
            <Volume2 size={24} color="#2563EB" />
          </View>
          <View style={styles.bannerTextCol}>
            <Text style={styles.bannerTitle}>Haptic Pattern Tester</Text>
            <Text style={styles.bannerSub}>
              {Platform.OS === 'android'
                ? 'Android Native Vibration Patterns'
                : 'iOS Timed Pulse Simulation Mode'}
            </Text>
          </View>
        </View>

        {/* Global Toggle */}
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleTitle}>Enable Haptic Alerts</Text>
            <Text style={styles.toggleSub}>Controls global alertVibration.setEnabled()</Text>
          </View>
          <Switch
            value={isEnabled}
            onValueChange={handleToggle}
            trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
            thumbColor={isEnabled ? '#2563EB' : '#94A3B8'}
          />
        </View>

        {/* Pattern List */}
        <Text style={styles.sectionTitle}>Available Event Patterns</Text>
        {PATTERNS_LIST.map((item) => {
          const IconComp = item.icon;
          const isActive = activePattern === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.patternCard, isActive && styles.patternCardActive]}
              onPress={() => handlePlay(item.key)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: `${item.color}15` }]}>
                <IconComp size={20} color={item.color} />
              </View>
              <View style={styles.patternMeta}>
                <Text style={styles.patternName}>{item.name}</Text>
                <Text style={styles.patternDesc}>{item.desc}</Text>
                <Text style={styles.patternKey}>pattern: '{item.key}'</Text>
              </View>
              <View style={[styles.playBadge, isActive && styles.playBadgeActive]}>
                <Play size={14} color={isActive ? '#FFFFFF' : '#2563EB'} fill={isActive ? '#FFFFFF' : 'transparent'} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  stopBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  bannerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
  },
  bannerSub: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  toggleSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  patternCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  patternCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#F0F6FF',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  patternMeta: {
    flex: 1,
  },
  patternName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  patternDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  patternKey: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#2563EB',
    marginTop: 3,
  },
  playBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadgeActive: {
    backgroundColor: '#2563EB',
  },
});

export default VibrationSandboxScreen;
