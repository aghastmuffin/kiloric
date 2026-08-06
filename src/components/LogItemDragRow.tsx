import type { MealType } from '@/lib/meals'
import { useTheme } from '@/lib/theme/ThemeContext'
import * as Haptics from 'expo-haptics'
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

/* Gesture callbacks close over handler refs and only run on the UI/event path.
   React Compiler's refs rule cannot model that pattern yet. */
/* eslint-disable react-hooks/refs */

const LONG_PRESS_MS = 420
const JIGGLE_DEG = 2.4

type Props = {
  children: ReactNode
  enabled?: boolean
  findDropTarget: (x: number, y: number) => MealType | null
  onDragStart: () => void
  onDragHover: (target: MealType | null) => void
  onDragEnd: (target: MealType | null) => void
}

/**
 * iOS home-screen style rearrange: hold until the row jiggles, then drag
 * freely and drop onto another meal section.
 */
export function LogItemDragRow({
  children,
  enabled = true,
  findDropTarget,
  onDragStart,
  onDragHover,
  onDragEnd,
}: Props) {
  const { colors } = useTheme()
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const scale = useSharedValue(1)
  const rotate = useSharedValue(0)
  const lifting = useSharedValue(0)
  const active = useSharedValue(false)

  const findDropTargetRef = useRef(findDropTarget)
  const onDragStartRef = useRef(onDragStart)
  const onDragHoverRef = useRef(onDragHover)
  const onDragEndRef = useRef(onDragEnd)
  const lastHoverRef = useRef<MealType | null | undefined>(undefined)

  useEffect(() => {
    findDropTargetRef.current = findDropTarget
    onDragStartRef.current = onDragStart
    onDragHoverRef.current = onDragHover
    onDragEndRef.current = onDragEnd
  }, [findDropTarget, onDragEnd, onDragHover, onDragStart])

  const startJiggle = useCallback(() => {
    rotate.value = withRepeat(
      withSequence(
        withTiming(-JIGGLE_DEG, { duration: 70 }),
        withTiming(JIGGLE_DEG, { duration: 140 }),
        withTiming(-JIGGLE_DEG, { duration: 140 }),
      ),
      -1,
      true,
    )
  }, [rotate])

  const stopJiggle = useCallback(() => {
    rotate.value = withTiming(0, { duration: 120 })
  }, [rotate])

  const callStart = useCallback(() => {
    lastHoverRef.current = undefined
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    startJiggle()
    onDragStartRef.current()
  }, [startJiggle])

  const callHover = useCallback((absoluteX: number, absoluteY: number) => {
    const target = findDropTargetRef.current(absoluteX, absoluteY)
    if (target === lastHoverRef.current) return
    lastHoverRef.current = target
    onDragHoverRef.current(target)
    if (target) {
      void Haptics.selectionAsync()
    }
  }, [])

  const callEnd = useCallback(
    (absoluteX: number, absoluteY: number) => {
      const target = findDropTargetRef.current(absoluteX, absoluteY)
      lastHoverRef.current = undefined
      stopJiggle()
      onDragEndRef.current(target)
    },
    [stopJiggle],
  )

  const callCancel = useCallback(() => {
    lastHoverRef.current = undefined
    stopJiggle()
    onDragEndRef.current(null)
  }, [stopJiggle])

  const gesture = useMemo(() => {
    if (!enabled) {
      return Gesture.Pan().enabled(false)
    }

    return Gesture.Pan()
      .activateAfterLongPress(LONG_PRESS_MS)
      .maxPointers(1)
      .onStart(() => {
        'worklet'
        active.value = true
        lifting.value = withTiming(1, { duration: 160 })
        scale.value = withSpring(1.06, { damping: 16, stiffness: 220 })
        runOnJS(callStart)()
      })
      .onUpdate((event) => {
        'worklet'
        translateX.value = event.translationX
        translateY.value = event.translationY
        runOnJS(callHover)(event.absoluteX, event.absoluteY)
      })
      .onEnd((event) => {
        'worklet'
        translateX.value = withSpring(0, { damping: 18, stiffness: 220 })
        translateY.value = withSpring(0, { damping: 18, stiffness: 220 })
        scale.value = withSpring(1, { damping: 16, stiffness: 220 })
        lifting.value = withTiming(0, { duration: 160 })
        active.value = false
        runOnJS(callEnd)(event.absoluteX, event.absoluteY)
      })
      .onFinalize((_event, success) => {
        'worklet'
        if (!success && active.value) {
          translateX.value = withSpring(0, { damping: 18, stiffness: 220 })
          translateY.value = withSpring(0, { damping: 18, stiffness: 220 })
          scale.value = withSpring(1, { damping: 16, stiffness: 220 })
          lifting.value = withTiming(0, { duration: 160 })
          active.value = false
          runOnJS(callCancel)()
        }
      })
  }, [active, callCancel, callEnd, callHover, callStart, enabled, lifting, scale, translateX, translateY])

  const animatedStyle = useAnimatedStyle(() => ({
    zIndex: active.value ? 40 : 0,
    elevation: active.value ? 16 : 0,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22 * lifting.value,
    shadowRadius: 14 * lifting.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }))

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.wrap, animatedStyle]}>
        <View pointerEvents="box-none">{children}</View>
      </Animated.View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'transparent',
  },
})
