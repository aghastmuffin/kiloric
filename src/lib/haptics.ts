import * as Haptics from 'expo-haptics';

export function triggerSelectionHaptic() {
  void Haptics.selectionAsync().catch(() => undefined);
}

export function triggerImpactHaptic() {
  void Haptics.impactAsync().catch(() => undefined);
}

export function triggerNotificationHaptic(type: 'success' | 'warning' | 'error') {
  let nativeType = Haptics.NotificationFeedbackType.Success;
  if (type === 'warning') nativeType = Haptics.NotificationFeedbackType.Warning;
  if (type === 'error') nativeType = Haptics.NotificationFeedbackType.Error;
  void Haptics.notificationAsync(nativeType).catch(() => undefined);
}
