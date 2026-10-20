import { CongressionalNote } from '@/components/onboarding/ResidencyNotices'
import { useTheme } from '@/lib/theme/ThemeContext'
import type { ThemeColors } from '@/lib/theme/tokens'
import { typography } from '@/lib/theme/typography'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const PLAN_PARTS = ['CAL', 'PRO', 'CARB', 'FAT'] as const

export default function OnboardingSuccess() {
  const router = useRouter()
  const { colors } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const wide = width >= 760
  const plateSize = Math.min(wide ? 340 : 286, width - 64)
  const platePartSize = (plateSize - 20) / 2
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null)

  const copyOpacity = useSharedValue(0)
  const copyY = useSharedValue(14)
  const plateOpacity = useSharedValue(0)
  const plateScale = useSharedValue(0.94)
  const ruleScale = useSharedValue(0)

  useEffect(() => {
    let active = true
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled)
      })
      .catch(() => {
        if (active) setReduceMotion(true)
      })
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => {
      active = false
      subscription.remove()
    }
  }, [])

  useEffect(() => {
    if (reduceMotion == null) return

    if (reduceMotion) {
      copyOpacity.value = 1
      copyY.value = 0
      plateOpacity.value = 1
      plateScale.value = 1
      ruleScale.value = 1
      return
    }

    plateOpacity.value = withTiming(1, { duration: 420 })
    plateScale.value = withTiming(1, {
      duration: 620,
      easing: Easing.out(Easing.cubic),
    })
    ruleScale.value = withDelay(
      180,
      withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
    )
    copyOpacity.value = withDelay(220, withTiming(1, { duration: 420 }))
    copyY.value = withDelay(
      220,
      withTiming(0, { duration: 480, easing: Easing.out(Easing.cubic) }),
    )
  }, [copyOpacity, copyY, plateOpacity, plateScale, reduceMotion, ruleScale])

  const copyStyle = useAnimatedStyle(() => ({
    opacity: copyOpacity.value,
    transform: [{ translateY: copyY.value }],
  }))
  const plateStyle = useAnimatedStyle(() => ({
    opacity: plateOpacity.value,
    transform: [{ scale: plateScale.value }],
  }))
  const ruleStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: ruleScale.value }],
  }))

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          minHeight: '100%',
          paddingTop: insets.top + 28,
          paddingBottom: insets.bottom + 24,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.masthead}>
        <Text style={styles.wordmark}>CALCOUNT</Text>
        <Text style={styles.issue}>PLAN · 01</Text>
      </View>

      <View style={[styles.hero, wide && styles.heroWide]}>
        <Animated.View
          accessible
          accessibilityLabel="A balanced daily plan for calories, protein, carbohydrates, and fat"
          style={[styles.plateStage, wide && styles.plateStageWide, plateStyle]}
        >
          <View style={[styles.plate, { width: plateSize, height: plateSize, borderRadius: plateSize / 2 }]}>
            {PLAN_PARTS.map((part, index) => (
              <View
                key={part}
                style={[
                  styles.platePart,
                  {
                    width: platePartSize,
                    height: platePartSize,
                    backgroundColor: index % 2 === 0 ? colors.brandSoft : colors.accentSoft,
                  },
                ]}
              >
                <Text style={styles.platePartText}>{part}</Text>
              </View>
            ))}
            <View style={styles.plateCenter}>
              <Ionicons name="leaf-outline" size={28} color={colors.brand} />
              <Text style={styles.plateCenterText}>READY</Text>
            </View>
          </View>
          <Animated.View style={[styles.celebrationRule, ruleStyle]} />
          <Text style={styles.figureCaption}>A daily framework, shaped around you.</Text>
        </Animated.View>

        <Animated.View style={[styles.copy, wide && styles.copyWide, copyStyle]}>
          <View style={styles.readyLine}>
            <Ionicons name="checkmark-circle" size={18} color={colors.brand} />
            <Text style={styles.readyText}>PROFILE & TARGETS SAVED</Text>
          </View>
          <Text accessibilityRole="header" style={styles.title}>Your plan is ready.</Text>
          <Text style={styles.subtitle}>
            Your calorie, macro, and hydration targets are set. Start with today’s meals and let
            the pattern build from there.
          </Text>
          <CongressionalNote />

          <View style={styles.planLedger}>
            <View style={styles.ledgerRow}>
              <Text style={styles.ledgerLabel}>DAILY ENERGY</Text>
              <Text style={styles.ledgerValue}>PERSONALIZED</Text>
            </View>
            <View style={styles.ledgerRow}>
              <Text style={styles.ledgerLabel}>MACRO BALANCE</Text>
              <Text style={styles.ledgerValue}>CALCULATED</Text>
            </View>
            <View style={styles.ledgerRow}>
              <Text style={styles.ledgerLabel}>HYDRATION</Text>
              <Text style={styles.ledgerValue}>READY</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/(tabs)')}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>Start tracking</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.onBrand} />
          </Pressable>
        </Animated.View>
      </View>
    </ScrollView>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  masthead: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.borderStrong,
  },
  wordmark: {
    ...typography.overline,
    color: c.text,
  },
  issue: {
    ...typography.overline,
    color: c.brand,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    gap: 36,
    paddingVertical: 36,
  },
  heroWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 64,
    paddingVertical: 56,
  },
  plateStage: {
    alignItems: 'center',
  },
  plateStageWide: {
    flex: 1,
  },
  plate: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
    borderWidth: 10,
    borderColor: c.surface,
    backgroundColor: c.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
  },
  platePart: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  platePartText: {
    ...typography.overline,
    color: c.textMuted,
  },
  plateCenter: {
    position: 'absolute',
    left: '32%',
    right: '32%',
    top: '32%',
    bottom: '32%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderStrong,
    gap: 4,
  },
  plateCenterText: {
    ...typography.labelTiny,
    color: c.textMuted,
    letterSpacing: 1,
  },
  celebrationRule: {
    width: '74%',
    height: 2,
    marginTop: 24,
    backgroundColor: c.brand,
  },
  figureCaption: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: 10,
    textAlign: 'center',
  },
  copy: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  copyWide: {
    flex: 1,
    width: 'auto',
  },
  readyLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  readyText: {
    ...typography.overline,
    color: c.brand,
  },
  title: {
    ...typography.display,
    color: c.text,
    marginBottom: 14,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: c.textMuted,
    marginBottom: 28,
  },
  planLedger: {
    borderTopWidth: 1,
    borderTopColor: c.borderStrong,
    marginBottom: 28,
  },
  ledgerRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  ledgerLabel: {
    ...typography.labelTiny,
    color: c.textMuted,
  },
  ledgerValue: {
    ...typography.labelTiny,
    color: c.text,
  },
  button: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    borderRadius: 999,
    paddingHorizontal: 22,
    backgroundColor: c.brand,
  },
  buttonPressed: {
    opacity: 0.84,
    transform: [{ translateY: 1 }],
  },
  buttonText: {
    ...typography.label,
    color: c.onBrand,
  },
})
