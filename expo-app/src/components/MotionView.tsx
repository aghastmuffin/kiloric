import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

type MotionState = {
  opacity?: number
  width?: number | `${number}%`
  height?: number
  translateX?: number
  translateY?: number
  scale?: number
  rotate?: string
}

type MotionTransition = {
  type?: 'spring' | 'timing'
  duration?: number
  delay?: number
  damping?: number
  stiffness?: number
  loop?: boolean
}

let reduceMotionEnabled = false
let reduceMotionSubscription: { remove: () => void } | null = null
const reduceMotionListeners = new Set<() => void>()

function updateReduceMotion(value: boolean) {
  if (reduceMotionEnabled === value) return
  reduceMotionEnabled = value
  reduceMotionListeners.forEach((listener) => listener())
}

function subscribeToReduceMotion(listener: () => void) {
  reduceMotionListeners.add(listener)
  if (!reduceMotionSubscription) {
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => updateReduceMotion(Boolean(value)))
    reduceMotionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      updateReduceMotion,
    )
  }

  return () => {
    reduceMotionListeners.delete(listener)
    if (reduceMotionListeners.size === 0) {
      reduceMotionSubscription?.remove()
      reduceMotionSubscription = null
    }
  }
}

/** Lightweight declarative motion with a reduced-motion-safe React Native driver. */
export function MotionView({
  children,
  from = {},
  animate = {},
  transition = {},
  style,
}: {
  children?: ReactNode
  from?: MotionState
  animate?: MotionState
  transition?: MotionTransition
  style?: StyleProp<ViewStyle>
}) {
  const [progress] = useState(() => new Animated.Value(0))
  const [useNativeDriver] = useState(() =>
    Platform.OS !== 'web' &&
    from.width == null &&
    animate.width == null &&
    from.height == null &&
    animate.height == null,
  )
  const reduceMotion = useSyncExternalStore(
    subscribeToReduceMotion,
    () => reduceMotionEnabled,
    () => false,
  )

  useEffect(() => {
    progress.stopAnimation()
    progress.setValue(reduceMotion ? 1 : 0)
    if (reduceMotion) return

    const makeForward = () => transition.type === 'spring'
      ? Animated.spring(progress, {
          toValue: 1,
          damping: transition.damping ?? 20,
          stiffness: transition.stiffness ?? 180,
          mass: 0.8,
          useNativeDriver,
        })
      : Animated.timing(progress, {
          toValue: 1,
          duration: transition.duration ?? 280,
          useNativeDriver,
        })

    const start = transition.delay
      ? Animated.sequence([Animated.delay(transition.delay), makeForward()])
      : makeForward()
    const animation = transition.loop
      ? Animated.loop(Animated.sequence([
          start,
          Animated.timing(progress, {
            toValue: 0,
            duration: transition.duration ?? 280,
            useNativeDriver,
          }),
        ]))
      : start

    animation.start()
    return () => animation.stop()
  }, [
    progress,
    reduceMotion,
    transition.damping,
    transition.delay,
    transition.duration,
    transition.loop,
    transition.stiffness,
    transition.type,
    useNativeDriver,
  ])

  const interpolateNumber = (start: number, end: number) =>
    progress.interpolate({ inputRange: [0, 1], outputRange: [start, end] })
  const interpolateString = (start: string, end: string) =>
    progress.interpolate({ inputRange: [0, 1], outputRange: [start, end] })

  const animatedStyle: Record<string, unknown> = {}
  if (from.opacity != null || animate.opacity != null) {
    animatedStyle.opacity = interpolateNumber(from.opacity ?? 1, animate.opacity ?? 1)
  }
  if (from.width != null || animate.width != null) {
    const target = animate.width ?? from.width ?? 0
    const start = from.width ?? (typeof target === 'string' ? '0%' : 0)
    animatedStyle.width = typeof target === 'string'
      ? interpolateString(String(start), target)
      : interpolateNumber(Number(start), target)
  }
  if (from.height != null || animate.height != null) {
    animatedStyle.height = interpolateNumber(from.height ?? 0, animate.height ?? from.height ?? 0)
  }

  const transforms: Record<string, unknown>[] = []
  if (from.translateX != null || animate.translateX != null) {
    transforms.push({ translateX: interpolateNumber(from.translateX ?? 0, animate.translateX ?? 0) })
  }
  if (from.translateY != null || animate.translateY != null) {
    transforms.push({ translateY: interpolateNumber(from.translateY ?? 0, animate.translateY ?? 0) })
  }
  if (from.scale != null || animate.scale != null) {
    transforms.push({ scale: interpolateNumber(from.scale ?? 1, animate.scale ?? 1) })
  }
  if (from.rotate != null || animate.rotate != null) {
    transforms.push({ rotate: interpolateString(from.rotate ?? '0deg', animate.rotate ?? '0deg') })
  }
  if (transforms.length) animatedStyle.transform = transforms

  return (
    <Animated.View style={[style, animatedStyle as Animated.WithAnimatedObject<ViewStyle>]}>
      {children}
    </Animated.View>
  )
}
