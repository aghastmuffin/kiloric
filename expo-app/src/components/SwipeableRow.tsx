import { useTheme } from '@/lib/theme/ThemeContext'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable'

type SwipeableMethods = { close: () => void }

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

  const run = async (action: SwipeAction, methods: SwipeableMethods) => {
    methods.close()
    await Haptics.impactAsync(
      action.destructive
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light,
    )
    await action.onPress()
  }

  const renderAction = (
    action: SwipeAction,
    methods: SwipeableMethods,
  ) => {
    const backgroundColor = action.destructive ? colors.danger : colors.accent

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action.label}
        onPress={() => void run(action, methods)}
        style={[styles.action, { backgroundColor }]}
      >
        <View style={styles.actionInner}>
          <Ionicons name={action.icon} size={20} color={colors.onAccent} />
          <Text style={[styles.actionText, { color: colors.onAccent }]}>{action.label}</Text>
        </View>
      </Pressable>
    )
  }

  return (
    <View style={styles.clip}>
      <ReanimatedSwipeable
        friction={1.8}
        overshootLeft={false}
        overshootRight={false}
        leftThreshold={44}
        rightThreshold={44}
        renderLeftActions={
          swipeRight
            ? (_progress, _translation, methods) => renderAction(swipeRight, methods)
            : undefined
        }
        renderRightActions={
          swipeLeft
            ? (_progress, _translation, methods) => renderAction(swipeLeft, methods)
            : undefined
        }
      >
        <View>{children}</View>
      </ReanimatedSwipeable>
    </View>
  )
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  action: { width: 112, alignItems: 'center', justifyContent: 'center' },
  actionInner: { alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  actionText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
})
