import { triggerSelectionHaptic } from '@/lib/haptics'
import { useTheme } from '@/lib/theme/ThemeContext'
import { SegmentedControl as ExpoSegmentedControl } from '@expo/ui/community/segmented-control'
import type { StyleProp, ViewStyle } from 'react-native'

type ThemedSegmentedControlProps = {
  values: string[]
  selectedIndex: number
  onChange: (index: number) => void
  enabled?: boolean
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
  accessibilityHint?: string
}

/**
 * Native segmented control (SwiftUI / Jetpack Compose, with a vendored web
 * fallback) wired to the active theme's accent + light/dark appearance.
 */
export function ThemedSegmentedControl({
  values,
  selectedIndex,
  onChange,
  enabled = true,
  style,
  accessibilityLabel,
  accessibilityHint,
}: ThemedSegmentedControlProps) {
  const { colors, scheme } = useTheme()

  const handleChange = (index: number) => {
    if (index !== selectedIndex) {
      triggerSelectionHaptic()
    }
    onChange(index)
  }

  return (
    <ExpoSegmentedControl
      values={values}
      selectedIndex={selectedIndex}
      enabled={enabled}
      appearance={scheme}
      tintColor={colors.brand}
      onChange={(event) => handleChange(event.nativeEvent.selectedSegmentIndex)}
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    />
  )
}
