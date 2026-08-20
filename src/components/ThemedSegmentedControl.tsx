import { useTheme } from '@/lib/theme/ThemeContext'
import { SegmentedControl as ExpoSegmentedControl } from '@expo/ui/community/segmented-control'
import type { StyleProp, ViewStyle } from 'react-native'

type ThemedSegmentedControlProps = {
  values: string[]
  selectedIndex: number
  onChange: (index: number) => void
  enabled?: boolean
  style?: StyleProp<ViewStyle>
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
}: ThemedSegmentedControlProps) {
  const { colors, scheme } = useTheme()

  return (
    <ExpoSegmentedControl
      values={values}
      selectedIndex={selectedIndex}
      enabled={enabled}
      appearance={scheme}
      tintColor={colors.brand}
      onChange={(event) => onChange(event.nativeEvent.selectedSegmentIndex)}
      style={style}
    />
  )
}
