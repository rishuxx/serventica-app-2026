import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const HAPTICS_STORAGE_KEY = '@serventica_haptics_enabled';

const HAPTIC_OPTIONS = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

let RNReactNativeHapticFeedback: any = null;
try {
  RNReactNativeHapticFeedback = require('react-native-haptic-feedback').default;
} catch (e) {
  // Native module not linked in current binary build yet
}

/**
 * Safely trigger haptics with Android guard & availability check
 */
export const triggerHaptic = (type: string) => {
  try {
    if (RNReactNativeHapticFeedback && typeof RNReactNativeHapticFeedback.trigger === 'function') {
      RNReactNativeHapticFeedback.trigger(type, HAPTIC_OPTIONS);
    } else {
      // Fallback to standard Vibration API if native module is unavailable in binary
      if (type === 'impactMedium' || type === 'notificationWarning') {
        Vibration.vibrate(40);
      } else if (type === 'notificationSuccess') {
        Vibration.vibrate([0, 30, 50, 30]);
      } else if (type === 'notificationError') {
        Vibration.vibrate([0, 50, 50, 100]);
      } else {
        Vibration.vibrate(20);
      }
    }
  } catch (err) {
    // No-op on platforms or devices without haptic engine support
  }
};

/**
 * Hook to manage Haptics setting (default ON, persisted via AsyncStorage)
 */
export function useHapticSettings() {
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(HAPTICS_STORAGE_KEY)
      .then((val) => {
        if (val !== null) {
          setHapticsEnabled(val === 'true');
        }
      })
      .catch(() => {});
  }, []);

  const toggleHaptics = useCallback(async (enabled: boolean) => {
    setHapticsEnabled(enabled);
    try {
      await AsyncStorage.setItem(HAPTICS_STORAGE_KEY, String(enabled));
    } catch (e) {}
  }, []);

  return { hapticsEnabled, toggleHaptics };
}

/**
 * Hook: useEventHaptics(status)
 * Creates event-driven haptic triggers strictly when status VALUE CHANGES (diff prev vs current).
 * Guarded by user settings toggle and debounced to prevent duplicate vibrations.
 *
 * Events and patterns mapped:
 * - PARTNER_ASSIGNED / PARTNER_ACCEPTED -> "impactMedium"
 * - PARTNER_EN_ROUTE / status change -> "impactLight"
 * - PARTNER_ARRIVING / PARTNER_ARRIVED (or within ~2 min) -> "notificationWarning"
 * - SERVICE_COMPLETED / CLOSED / order_completed -> "notificationSuccess"
 * - CANCELLED / CANCELLED_BY_CUSTOMER / order_cancelled -> "notificationError"
 */
export function useEventHaptics(status?: string | null) {
  const { hapticsEnabled } = useHapticSettings();
  const prevStatusRef = useRef<string | null>(null);
  const lastTriggeredStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!status) return;

    // Rule 1: Fire only when status VALUE CHANGES (diff previous vs current)
    const isStatusChanged = prevStatusRef.current !== null && prevStatusRef.current !== status;
    
    prevStatusRef.current = status;

    // Skip if status hasn't changed
    if (!isStatusChanged) return;

    // Rule 2: User settings toggle "Haptics" (default ON); skip all triggers when off
    if (!hapticsEnabled) return;

    // Rule 4: Keep triggers debounced — same event must not vibrate twice even if status re-emits
    if (lastTriggeredStatusRef.current === status) return;

    // Normalize status string for matching
    const s = String(status).toUpperCase();

    let patternToTrigger: string | null = null;

    if (s.includes('ASSIGNED') || s.includes('ACCEPTED') || s === 'PARTNER_ASSIGNED') {
      patternToTrigger = 'impactMedium';
    } else if (s.includes('EN_ROUTE') || s === 'PARTNER_EN_ROUTE' || s === 'STATUS_CHANGE') {
      patternToTrigger = 'impactLight';
    } else if (s.includes('ARRIV') || s === 'PARTNER_ARRIVING' || s === 'PARTNER_ARRIVED') {
      patternToTrigger = 'notificationWarning';
    } else if (s.includes('COMPLET') || s.includes('CLOSED') || s === 'ORDER_COMPLETED') {
      patternToTrigger = 'notificationSuccess';
    } else if (s.includes('CANCEL') || s === 'ORDER_CANCELLED') {
      patternToTrigger = 'notificationError';
    }

    if (patternToTrigger) {
      lastTriggeredStatusRef.current = status;
      triggerHaptic(patternToTrigger);
    }
  }, [status, hapticsEnabled]);

  return { hapticsEnabled };
}

export default useEventHaptics;
