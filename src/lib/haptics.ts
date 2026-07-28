let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  // Silent fallback
}

export function triggerSelectionHaptic() {
  if (Haptics && Haptics.selectionAsync) {
    Haptics.selectionAsync().catch(() => {});
  }
}

export function triggerImpactHaptic() {
  if (Haptics && Haptics.impactAsync) {
    Haptics.impactAsync().catch(() => {});
  }
}

export function triggerNotificationHaptic(type: 'success' | 'warning' | 'error') {
  if (Haptics && Haptics.notificationAsync && Haptics.NotificationFeedbackType) {
    let nativeType = Haptics.NotificationFeedbackType.Success;
    if (type === 'warning') nativeType = Haptics.NotificationFeedbackType.Warning;
    if (type === 'error') nativeType = Haptics.NotificationFeedbackType.Error;
    Haptics.notificationAsync(nativeType).catch(() => {});
  }
}
