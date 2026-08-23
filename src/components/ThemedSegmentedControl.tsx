import { triggerSelectionHaptic } from '@/lib/haptics'
import { useTheme } from '@/lib/theme/ThemeContext'
import { SegmentedControl as ExpoSegmentedControl } from '@expo/ui/community/segmented-control'
import type { StyleProp, ViewStyle } from 'react-native'

type ThemedSegmentedControlProps = {
  values: string[]
  selectedIndex: number
  onChange: (index: number) => void
  enabled?: boolean
  accessibilityLabel?: string
  accessibilityHint?: string
  style?: StyleProp<ViewStyle>
}

/**
 * Native segmented control (SwiftUI / Jetpack Compose, with a vendored web
 * fallback) wired to the active theme's accent + light/dark appearance,
 * with tactile haptic selection feedback.
 */
export function ThemedSegmentedControl({
  values,
  selectedIndex,
  onChange,
  enabled = true,
  accessibilityLabel,
  accessibilityHint,
  style,
}: ThemedSegmentedControlProps) {
  const { colors, scheme } = useTheme()

  const selectedValue = values[selectedIndex] ?? ''

  return (
    <ExpoSegmentedControl
      values={values}
      selectedIndex={selectedIndex}
      enabled={enabled}
      appearance={scheme}
      tintColor={colors.brand}
      accessibilityLabel={accessibilityLabel ?? (selectedValue ? `Selected segment: ${selectedValue}` : undefined)}
      accessibilityHint={accessibilityHint}
      onChange={(event) => {
        triggerSelectionHaptic()
        onChange(event.nativeEvent.selectedSegmentIndex)
      }}
      style={style}
    />
  )
}
