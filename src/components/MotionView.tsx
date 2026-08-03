import type { ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated'

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

/**
 * Expo 56-safe motion primitive. It keeps the declarative Moti-shaped API used
 * by the UI while relying directly on Reanimated, avoiding Moti's legacy web
 * dependency graph during Expo Router static rendering.
 */
export function MotionView({
  children,
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
  let entering = FadeInDown
    .duration(transition.duration ?? 320)
    .delay(transition.delay ?? 0)

  if (transition.type === 'spring') {
    entering = entering
      .springify()
      .damping(transition.damping ?? 18)
      .stiffness(transition.stiffness ?? 170)
  }

  const transforms = [
    ...(animate.translateX != null ? [{ translateX: animate.translateX }] : []),
    ...(animate.translateY != null ? [{ translateY: animate.translateY }] : []),
    ...(animate.scale != null ? [{ scale: animate.scale }] : []),
    ...(animate.rotate != null ? [{ rotate: animate.rotate }] : []),
  ] as NonNullable<ViewStyle['transform']>

  const targetStyle: ViewStyle = {
    opacity: animate.opacity,
    width: animate.width,
    height: animate.height,
    transform: transforms.length ? transforms : undefined,
  }

  return (
    <Animated.View
      entering={entering}
      layout={LinearTransition.springify().damping(22)}
      style={[style, targetStyle]}
    >
      {children}
    </Animated.View>
  )
}
