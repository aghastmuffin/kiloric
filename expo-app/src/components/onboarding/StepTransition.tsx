import type { OnboardingColors } from '@/lib/theme/tokens'
import { useOnboardingStyles } from '@/lib/theme/useThemedStyles'
import { type ReactNode, useEffect } from 'react'
import { StyleSheet } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

type StepTransitionProps = {
  stepKey: string
  direction: 'forward' | 'back'
  children: ReactNode
}

export function StepTransition({ stepKey, direction, children }: StepTransitionProps) {
  const styles = useOnboardingStyles(makeStyles)
  const translateX = useSharedValue(direction === 'forward' ? 48 : -48)
  const opacity = useSharedValue(0)

  useEffect(() => {
    translateX.value = direction === 'forward' ? 48 : -48
    opacity.value = 0
    translateX.value = withTiming(0, {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    })
    opacity.value = withTiming(1, {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    })
  }, [stepKey, direction, opacity, translateX])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }))

  return (
    <Animated.View key={stepKey} style={[styles.container, animatedStyle]}>
      {children}
    </Animated.View>
  )
}

const makeStyles = (onboardingColors: OnboardingColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: onboardingColors.background,
  },
})
