import type { OnboardingStep } from '@/components/onboarding/types'
import { makeOnboardingStyles } from '@/components/onboarding/styles'
import type { OnboardingColors } from '@/lib/theme/tokens'
import { useOnboardingStyles } from '@/lib/theme/useThemedStyles'
import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const STEP_LABELS: Record<OnboardingStep, string> = {
  email: 'Your email',
  password: 'Your password',
  welcome: 'Welcome',
  body: 'About you',
  lifestyle: 'Activity & goals',
  diet: 'Eating style',
  plan: 'Your plan',
}

type ProgressHeaderProps = {
  step: OnboardingStep
  steps: OnboardingStep[]
  isRequired: boolean
}

export function ProgressHeader({ step, steps, isRequired }: ProgressHeaderProps) {
  const insets = useSafeAreaInsets()
  const styles = useOnboardingStyles(makeStyles)
  const onboardingStyles = useOnboardingStyles(makeOnboardingStyles)
  const stepIndex = steps.indexOf(step)
  const targetProgress = stepIndex >= 0 ? (stepIndex + 1) / steps.length : 0
  const progress = useSharedValue(targetProgress)
  const titleOpacity = useSharedValue(1)
  const titleY = useSharedValue(0)

  useEffect(() => {
    progress.value = withTiming(targetProgress, {
      duration: 520,
      easing: Easing.out(Easing.cubic),
    })
    titleOpacity.value = 0
    titleY.value = 8
    titleOpacity.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) })
    titleY.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) })
  }, [step, targetProgress, progress, titleOpacity, titleY])

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }))

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }))

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.eyebrow}>
        {isRequired ? 'Setup' : 'Your vitality'} · Step {stepIndex + 1} of {steps.length}
      </Text>
      <Animated.Text style={[onboardingStyles.stepTitle, titleStyle]}>
        {STEP_LABELS[step]}
      </Animated.Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
    </View>
  )
}

const makeStyles = (onboardingColors: OnboardingColors) => StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: onboardingColors.background,
  },
  eyebrow: {
    color: onboardingColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  track: {
    height: 6,
    borderRadius: 99,
    backgroundColor: onboardingColors.border,
    overflow: 'hidden',
    marginTop: 4,
  },
  fill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: onboardingColors.accent,
  },
})
