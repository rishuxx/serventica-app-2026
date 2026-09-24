import { Vibration, Platform } from 'react-native';

const IS_ANDROID = Platform.OS === 'android';

// Android-style patterns: [waitMs, buzzMs, waitMs, buzzMs, ...]
const PATTERNS = {
  partnerFound:     [0, 300, 150, 300, 150, 500],
  bookingConfirmed: [0, 250, 120, 250],
  partnerArrived:   [0, 200, 100, 200, 100, 200],
  cancelled:        [0, 700],
  warning:          [0, 150, 100, 150, 100, 150],
  error:            [0, 400, 150, 400],
  success:          [0, 120, 80, 120],
  tap:              [0, 30],
};

let enabled = true;
let iosTimers = [];
const clearIOSTimers = () => { iosTimers.forEach(clearTimeout); iosTimers = []; };

// iOS ignores pattern arrays (fixed ~400ms buzz), so fake patterns with scheduled buzzes
function vibrateIOSPattern(pattern) {
  clearIOSTimers();
  let t = 0;
  for (let i = 0; i < pattern.length; i += 2) {
    t += pattern[i] ?? 0;
    if ((pattern[i + 1] ?? 0) > 0) {
      const at = t;
      iosTimers.push(setTimeout(() => Vibration.vibrate(), at));
    }
    t += pattern[i + 1] ?? 0;
  }
}

export function playAlert(name) {
  if (!enabled) return;
  const pattern = PATTERNS[name];
  if (!pattern) { console.warn(`[alertVibration] unknown pattern: ${name}`); return; }
  stopAlert();
  if (IS_ANDROID) Vibration.vibrate(pattern);
  else vibrateIOSPattern(pattern);
}

export function stopAlert() {
  Vibration.cancel();
  if (!IS_ANDROID) clearIOSTimers();
}

export function setVibrationEnabled(v) { enabled = v; if (!v) stopAlert(); }
export const alertVibration = { play: playAlert, stop: stopAlert, setEnabled: setVibrationEnabled };
export default alertVibration;
