import { triggerImpactHaptic, triggerSelectionHaptic } from '@/lib/haptics'
import { useTheme } from '@/lib/theme/ThemeContext'
import type { OnboardingColors } from '@/lib/theme/tokens'
import { useOnboardingStyles } from '@/lib/theme/useThemedStyles'
import { useCallback, useEffect } from 'react'
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

type ConfirmDialogProps = {
  visible: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const styles = useOnboardingStyles(makeStyles)
  const { colors, onboardingColors } = useTheme()
  const backdropOpacity = useSharedValue(0)
  const cardScale = useSharedValue(0.94)
  const cardOpacity = useSharedValue(0)

  useEffect(() => {
    if (!visible) return

    backdropOpacity.value = 0
    cardScale.value = 0.94
    cardOpacity.value = 0
    backdropOpacity.value = withTiming(1, { duration: 220 })
    cardOpacity.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) })
    cardScale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
  }, [visible, backdropOpacity, cardOpacity, cardScale])

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }))

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }))

  const handleCancel = useCallback(() => {
    triggerSelectionHaptic()
    onCancel()
  }, [onCancel])

  const handleConfirm = useCallback(() => {
    triggerImpactHaptic()
    onConfirm()
  }, [onConfirm])

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleCancel}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss dialog"
            style={StyleSheet.absoluteFill}
            onPress={loading ? undefined : handleCancel}
          />
        </Animated.View>

        <Animated.View
          accessibilityRole="alertdialog"
          accessibilityViewIsModal={true}
          style={[styles.card, cardStyle]}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              accessibilityHint="Dismisses the dialog"
              disabled={loading}
              onPress={handleCancel}
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={loading ? `${confirmLabel}, loading` : confirmLabel}
              accessibilityHint={destructive ? `Permanently performs action: ${title}` : `Confirms action: ${title}`}
              accessibilityState={{ disabled: loading, busy: loading }}
              disabled={loading}
              onPress={handleConfirm}
              style={({ pressed }) => [
                styles.button,
                destructive ? styles.destructiveButton : styles.confirmButton,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={destructive ? onboardingColors.danger : colors.onAccent} size="small" />
              ) : (
                <Text
                  style={destructive ? styles.destructiveButtonText : styles.confirmButtonText}
                >
                  {confirmLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const makeStyles = (c: OnboardingColors) => StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: c.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
      web: {
        boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.45)',
      },
    }),
  },
  title: {
    color: c.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    color: c.textSoft,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  cancelButtonText: {
    color: c.textSoft,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: c.accent,
  },
  confirmButtonText: {
    color: c.onAccent,
    fontSize: 16,
    fontWeight: '700',
  },
  destructiveButton: {
    backgroundColor: 'rgba(255, 114, 114, 0.18)',
    borderWidth: 1,
    borderColor: c.danger,
  },
  destructiveButtonText: {
    color: c.danger,
    fontSize: 16,
    fontWeight: '700',
  },
})
