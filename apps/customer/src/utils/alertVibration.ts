import { triggerHaptic } from '../hooks/useEventHaptics';

export let isVibrationEnabled = true;

export const setVibrationEnabled = (enabled: boolean) => {
  isVibrationEnabled = enabled;
};

export const playAlert = (patternKey: string) => {
  if (!isVibrationEnabled) return;

  switch (patternKey) {
    case 'partnerFound':
      triggerHaptic('impactMedium');
      break;
    case 'bookingConfirmed':
    case 'success':
      triggerHaptic('notificationSuccess');
      break;
    case 'partnerArrived':
    case 'warning':
      triggerHaptic('notificationWarning');
      break;
    case 'cancelled':
    case 'error':
      triggerHaptic('notificationError');
      break;
    case 'tap':
    default:
      triggerHaptic('impactLight');
      break;
  }
};

export const stopAlert = () => {};

export const alertVibration = {
  playAlert,
  stopAlert,
  setVibrationEnabled,
};

export default alertVibration;
