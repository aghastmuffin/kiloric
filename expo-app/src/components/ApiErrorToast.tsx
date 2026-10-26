import type { ApiErrorSource } from '@/lib/apiErrors'
import { triggerNotificationHaptic, triggerSelectionHaptic } from '@/lib/haptics'
import { useTheme } from '@/lib/theme/ThemeContext'
import type { ThemeColors } from '@/lib/theme/tokens'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const AUTO_DISMISS_MS = 5500

export type ApiErrorToastPayload = {
  id: number
  message: string
  source: ApiErrorSource
}

type Props = {
  error: ApiErrorToastPayload | null
  onDismiss: () => void
}

const SOURCE_LABEL: Record<ApiErrorSource, string> = {
  oracle: 'Backend',
  server: 'Server',
}

export function ApiErrorToast({ error, onDismiss }: Props) {
  const insets = useSafeAreaInsets()
  const styles = useThemedStyles(makeStyles)
  const { colors } = useTheme()
  const [visible, setVisible] = useState<ApiErrorToastPayload | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const translateY = useSharedValue(-120)
  const opacity = useSharedValue(0)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const finishDismiss = useCallback(() => {
    setVisible(null)
    onDismiss()
  }, [onDismiss])

  const animateOut = useCallback(() => {
    clearTimer()
    translateY.value = withTiming(-120, {
      duration: 260,
      easing: Easing.in(Easing.cubic),
    })
    opacity.value = withTiming(0, { duration: 220 }, (finished) => {
      if (finished) scheduleOnRN(finishDismiss)
    })
  }, [clearTimer, finishDismiss, opacity, translateY])

  const animateIn = useCallback(() => {
    translateY.value = -120
    opacity.value = 0
    translateY.value = withTiming(0, {
      duration: 340,
      easing: Easing.out(Easing.cubic),
    })
    opacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    })
  }, [opacity, translateY])

  useEffect(() => {
    if (!error) return undefined

    triggerNotificationHaptic('error')
    setVisible(error)
    animateIn()

    const timeoutId = setTimeout(animateOut, AUTO_DISMISS_MS)
    timerRef.current = timeoutId

    return () => {
      clearTimeout(timeoutId)
      if (timerRef.current === timeoutId) timerRef.current = null
    }
  }, [animateIn, animateOut, error])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  if (!visible) return null

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        style={[styles.toast, { marginTop: insets.top + 8 }, animatedStyle]}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="alert-circle" size={22} color={colors.danger} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{SOURCE_LABEL[visible.source]} error</Text>
          <Text style={styles.message} numberOfLines={4}>
            {visible.message}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss error"
          accessibilityHint="Closes this error notification"
          hitSlop={8}
          onPress={() => {
            triggerSelectionHaptic()
            animateOut()
          }}
          style={styles.dismissButton}
        >
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </Pressable>
      </Animated.View>
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: c.surface,
    borderColor: c.danger,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.45)',
      },
    }),
  },
  iconWrap: {
    paddingTop: 1,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: c.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  message: {
    color: c.text,
    fontSize: 14,
    lineHeight: 20,
  },
  dismissButton: {
    padding: 2,
  },
})
