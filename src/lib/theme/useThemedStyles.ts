import { useTheme } from '@/lib/theme/ThemeContext'
import type { OnboardingColors, ThemeColors } from '@/lib/theme/tokens'
import { useMemo } from 'react'

/**
 * Builds a StyleSheet from the active theme colors, memoized so the sheet is
 * only rebuilt when the palette changes.
 *
 *   const styles = useThemedStyles((c) => StyleSheet.create({ ... }))
 */
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme()
  return useMemo(() => factory(colors), [colors, factory])
}

export function useOnboardingStyles<T>(factory: (colors: OnboardingColors) => T): T {
  const { onboardingColors } = useTheme()
  return useMemo(() => factory(onboardingColors), [factory, onboardingColors])
}
