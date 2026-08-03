import { useTheme } from '@/lib/theme/ThemeContext'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { type ReactNode, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { RectButton, Swipeable } from 'react-native-gesture-handler'

export type SwipeAction = {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void | Promise<void>
  destructive?: boolean
}

export function SwipeableRow({
  children,
  swipeLeft,
  swipeRight,
}: {
  children: ReactNode
  /** Revealed when the row is swiped left. */
  swipeLeft?: SwipeAction
  /** Revealed when the row is swiped right. */
  swipeRight?: SwipeAction
}) {
  const { colors } = useTheme()
  const ref = useRef<Swipeable>(null)

  const run = async (action: SwipeAction) => {
    ref.current?.close()
    await Haptics.impactAsync(
      action.destructive
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light,
    )
    await action.onPress()
  }

  const renderAction = (
    action: SwipeAction,
    progress: Animated.AnimatedInterpolation<number>,
    edge: 'left' | 'right',
  ) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [edge === 'left' ? -24 : 24, 0],
    })
    const backgroundColor = action.destructive ? colors.danger : colors.accent

    return (
      <RectButton
        accessibilityRole="button"
        accessibilityLabel={action.label}
        onPress={() => void run(action)}
        style={[styles.action, { backgroundColor }]}
      >
        <Animated.View style={[styles.actionInner, { transform: [{ translateX }] }]}>
          <Ionicons name={action.icon} size={20} color={colors.onAccent} />
          <Text style={[styles.actionText, { color: colors.onAccent }]}>{action.label}</Text>
        </Animated.View>
      </RectButton>
    )
  }

  return (
    <View style={styles.clip}>
      <Swipeable
        ref={ref}
        friction={1.8}
        overshootLeft={false}
        overshootRight={false}
        leftThreshold={44}
        rightThreshold={44}
        renderLeftActions={
          swipeRight
            ? (progress) => renderAction(swipeRight, progress, 'left')
            : undefined
        }
        renderRightActions={
          swipeLeft
            ? (progress) => renderAction(swipeLeft, progress, 'right')
            : undefined
        }
      >
        <View>{children}</View>
      </Swipeable>
    </View>
  )
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  action: { width: 112, alignItems: 'center', justifyContent: 'center' },
  actionInner: { alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  actionText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
})
