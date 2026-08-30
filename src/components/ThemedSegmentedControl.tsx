import { triggerSelectionHaptic } from '@/lib/haptics'
import { useTheme } from '@/lib/theme/ThemeContext'
import type { ThemeColors } from '@/lib/theme/tokens'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { SegmentedControl as ExpoSegmentedControl } from '@expo/ui/community/segmented-control'
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

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
  const styles = useThemedStyles(makeStyles)

  if (Platform.OS === 'web') {
    return (
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={[styles.control, style]}
      >
        {values.map((value, index) => {
          const selected = index === selectedIndex
          return (
            <Pressable
              key={value}
              aria-checked={selected}
              accessibilityRole="radio"
              accessibilityLabel={accessibilityLabel ? `${accessibilityLabel}: ${value}` : value}
              accessibilityState={{ checked: selected, disabled: !enabled }}
              disabled={!enabled}
              onPress={() => onChange(index)}
              style={({ pressed }) => [
                styles.segment,
                selected && styles.segmentSelected,
                pressed && styles.segmentPressed,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[styles.label, selected && styles.labelSelected]}
              >
                {value}
              </Text>
            </Pressable>
          )
        })}
      </View>
    )
  }

  return (
    <ExpoSegmentedControl
      values={values}
      selectedIndex={selectedIndex}
      enabled={enabled}
      appearance={scheme}
      tintColor={colors.brand}
      onChange={(event) => {
        const index = event.nativeEvent.selectedSegmentIndex
        if (index !== selectedIndex) triggerSelectionHaptic()
        onChange(index)
      }}
      style={style}
    />
  )
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    control: {
      backgroundColor: c.surfaceAlt,
      borderRadius: 999,
      flexDirection: 'row',
      gap: 2,
      padding: 3,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      width: '100%',
    },
    segment: {
      alignItems: 'center',
      borderRadius: 999,
      flex: 1,
      justifyContent: 'center',
      minHeight: 36,
      paddingHorizontal: 10,
    },
    segmentSelected: {
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderStrong,
    },
    segmentPressed: {
      opacity: 0.72,
    },
    label: {
      color: c.textMuted,
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
    },
    labelSelected: {
      color: c.brand,
      fontWeight: '700',
    },
  })
